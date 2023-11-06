import type { Logger } from 'chooksie'
import type { Message, WebhookMessageOptions } from 'discord.js'
import { MessageEmbed } from 'discord.js'
import { setTimeout as sleep } from 'timers/promises'
import getTweetData, { type VxTwitterResponse } from '../twitter'
import type { WebhookHandler } from '../utils'
import { deleteButton, row } from '../utils'

const newTwitterEmbed = (url: string) => new MessageEmbed()
  .setURL('https://www.twitter.com/')
  .setImage(url)

function tweetToEmbeds(tweet: VxTwitterResponse) {
  const [first, ...media] = tweet.mediaURLs

  const mainEmbed = newTwitterEmbed(first)
    .setColor('#00acee')
    .setAuthor({
      name: `${tweet.user_name} (@${tweet.user_screen_name})`,
      url: `https://twitter.com/${tweet.user_name}`,
      // @todo: add back user avatar
    })
    .setDescription(tweet.text.replace(/https?:\/\/t\.co\S+/, '').trim())
    .addFields([
      { name: 'Likes', value: String(tweet.likes), inline: true },
      { name: 'Retweets', value: String(tweet.retweets), inline: true },
    ])
    .setFooter({
      iconURL: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
      text: 'Twitter',
    })
    .setTimestamp(new Date(tweet.date_epoch * 1000))

  const embeds = [mainEmbed]
  for (const url of media) {
    embeds.push(newTwitterEmbed(url))
  }

  return embeds
}

const waitTimeout = Number(process.env.WAIT_TIMEOUT ?? '0')

async function isHandled(message: Message, expecting: number): Promise<boolean> {
  // discord could take time to get embed, wait longer
  await sleep(waitTimeout)
  const msg = await message.fetch()

  // always handle if some tweets are videos
  if (msg.embeds.some(embed => embed.video !== null)) {
    return false
  }

  // if # embeds with author == # links, twitter sent all tweets correctly
  const count = msg.embeds.reduce((total, embed) => total + Number(embed.author !== null), 0)
  return count === expecting
}

export default async function handleTwitter(message: Message, wh: WebhookHandler, logger: Logger): Promise<void> {
  let content = message.content
  const re = /https?:\/\/(?:mobile\.|www\.)?twitter\.com\/(\w{1,15}\/status)\/(\d+)(?:\?\S+)?/gi
  const matched = [...content.matchAll(re)]

  if (await isHandled(message, matched.length)) {
    logger.info('all links were handled. skipping')
    return
  }

  await message.react('⌛')
  const components = [row(deleteButton(message.author.id))]
  const responses: WebhookMessageOptions[] = []

  let hasVideo = false
  for (const [link, subpath, tweetId] of matched) {
    logger.info('downloading tweet data...')
    const tweet = await getTweetData(tweetId)

    if (tweet.media_extended.some(medium => medium.type === 'video')) {
      logger.info('got video tweet')
      hasVideo = true
      content = content.replace(link, `https://vxtwitter.com/${subpath}/${tweetId}`)
    } else {
      logger.info('got regular tweet')
      responses.push({ embeds: tweetToEmbeds(tweet) })
      content = content.replace(link, `<${link}>`)
    }
  }

  if (hasVideo) {
    await wh.send({
      content,
      components,
    })
  } else {
    await wh.send({
      ...responses.shift(),
      content,
      components,
    })
  }

  for (const response of responses) {
    await wh.send(response)
  }

  await wh.destroy()
}
