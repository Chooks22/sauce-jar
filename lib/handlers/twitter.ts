import type { Logger } from 'chooksie'
import type { Message, WebhookMessageOptions } from 'discord.js'
import { MessageEmbed } from 'discord.js'
import { setTimeout as sleep } from 'timers/promises'
import getTweetData from '../twitter'
import type { Tweet, TwitterMedia, TwitterUser } from '../twitter/types'
import { createWebhook, deleteButton, row } from '../utils'

const newTwitterEmbed = (medium: TwitterMedia) => new MessageEmbed()
  .setURL('https://www.twitter.com/')
  .setImage(medium.url)

function tweetToEmbeds(tweet: Tweet, author: TwitterUser) {
  const media = tweet.media.values()
  const first = media.next()

  const mainEmbed = newTwitterEmbed(first.value as TwitterMedia)
    .setColor('#00acee')
    .setAuthor({
      name: author.name,
      iconURL: author.avatar,
      url: `https://twitter.com/${author.username}`,
    })
    .setDescription(tweet.content)
    .addField('Likes', String(tweet.metrics.likes), true)
    .addField('Retweets', String(tweet.metrics.retweets), true)
    .setFooter({
      iconURL: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
      text: 'Twitter',
    })
    .setTimestamp(tweet.createdAt)

  const embeds = [mainEmbed]
  for (const medium of media) {
    embeds.push(newTwitterEmbed(medium))
  }

  return embeds
}

async function isHandled(message: Message, expecting: number): Promise<boolean> {
  // discord could take time to get embed, wait longer
  await sleep(1000)
  const msg = await message.fetch()

  // always handle if some tweets are videos
  if (msg.embeds.some(embed => embed.video !== null)) {
    return false
  }

  // if # embeds with author == # links, twitter sent all tweets correctly
  const count = msg.embeds.reduce((total, embed) => total + Number(embed.author !== null), 0)
  return count === expecting
}

export default async function handleTwitter(message: Message, logger: Logger): Promise<void> {
  let content = message.content
  const re = /https?:\/\/(?:mobile\.|www\.)?twitter\.com\/(\w{1,15}\/status)\/(\d+)(?:\?\S+)?/gi
  const matched = [...content.matchAll(re)]

  if (await isHandled(message, matched.length)) {
    logger.info('all links were handled. skipping')
    return
  }

  await message.react('⌛')
  const components = [row(deleteButton(message.author.id))]
  const wh = await createWebhook(message)
  const responses: WebhookMessageOptions[] = []

  let hasVideo = false
  for (const [link, subpath, tweetId] of matched) {
    logger.info('downloading tweet data...')
    const { tweet, author } = await getTweetData(tweetId)

    if (tweet.media.some(medium => medium.type === 'video')) {
      logger.info('got video tweet')
      hasVideo = true
      content = content.replace(link, `https://vxtwitter.com/${subpath}/${tweetId}`)
    } else {
      logger.info('got regular tweet')
      responses.push({ embeds: tweetToEmbeds(tweet, author) })
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
