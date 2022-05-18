import { defineEvent } from 'chooksie'
import type { Message, MessageAttachment, TextChannel, WebhookMessageOptions } from 'discord.js'
import { MessageEmbed } from 'discord.js'
import { basename } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const twitRe = /https?:\/\/(?:mobile\.|www\.)?twitter\.com\/\w{1,15}\/status(?:es)?\/(\d+)/i

export default defineEvent({
  name: 'messageCreate',
  setup: async () => {
    const { pixiv } = await import('../lib/pixiv')
    const { default: twitter } = await import('../lib/twitter')

    const createWebhook = async (message: Message) => {
      const channel = message.channel as TextChannel
      const author = message.author
      console.log(`creating webhook with name: "${author.username}" and icon: "${author.displayAvatarURL()}"...`)
      const wh = await channel.createWebhook(author.username, {
        avatar: author.displayAvatarURL(),
      })
      console.log('webhook created.')

      return async (payload: string | WebhookMessageOptions) => {
        await wh.send(payload)
        await message.delete()
        await wh.delete()
      }
    }

    const handlePixiv = async (id: string) => {
      const px = pixiv(id)
      let res = await px.next()

      const embeds: MessageEmbed[] = []
      const files: MessageAttachment[] = []
      while (!res.done) {
        const file = res.value
        files.push(file)

        const embed = new MessageEmbed()
          .setColor('#0097fa')
          .setURL('https://www.twitter.com/')
          .setImage(`attachment://${file.name}`)
          .setFooter({
            iconURL: 'https://www.pixiv.net/favicon.ico',
            text: 'Pixiv',
          })

        embeds.push(embed)
        res = await px.next()
      }

      const { title, userId, userName, createDate } = res.value
      embeds[0]
        .setURL(`https://www.pixiv.net/artworks/${id}`)
        .setAuthor({
          name: userName,
          url: `https://www.pixiv.net/users/${userId}`,
        })
        .setTitle(title)

      const createdAt = new Date(createDate)
      embeds.forEach(embed => {
        embed.setTimestamp(createdAt)
      })

      return { embeds, files }
    }

    const handleTwitter = async (message: Message, id: string): Promise<string | WebhookMessageOptions | null> => {
      const content = message.content
      if (message.embeds.length > 0) {
        // replace links if one of them has the shitty twitter video player
        return message.embeds.some(embed => embed.video !== null)
          ? content.replaceAll('twitter.com', 'vxtwitter.com')
          : null
      }

      const res = await twitter(id)
      const embeds: MessageEmbed[] = []
      const { tweet, author } = res

      for (const media of tweet.media) {
        const embed = new MessageEmbed()
          .setURL('https://www.twitter.com/')
          .setImage(media.url)
        embeds.push(embed)
      }

      embeds[0]
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

      return { content, embeds }
    }

    return { createWebhook, handlePixiv, handleTwitter }
  },
  async execute(ctx, message) {
    if (message.author.bot || message.webhookId) {
      return
    }

    const content = message.content
    if (content.includes('pixiv.net') && content.includes('artworks')) {
      const id = basename(content)
      const { embeds, files } = await this.handlePixiv(id)
      const send = await this.createWebhook(message)
      await send({ content, embeds, files })
      return
    }

    const matched = twitRe.exec(content)
    if (matched !== null) {
      await sleep(500)

      const id = matched[1]
      const msg = await message.fetch()
      const data = await this.handleTwitter(msg, id)

      if (data !== null) {
        const send = await this.createWebhook(message)
        await send(data)
      }
    }
  },
})
