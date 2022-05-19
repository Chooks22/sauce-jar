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
      const wh = await channel.createWebhook(author.username, {
        avatar: author.displayAvatarURL(),
      })

      const sendOnce = async (payload: string | WebhookMessageOptions) => {
        await wh.send(payload)
        await message.delete()
        await wh.delete()
      }

      const send = async (payload: string | WebhookMessageOptions) => {
        await wh.send(payload)
      }

      const destroy = async () => {
        await message.delete()
        await wh.delete()
      }

      return { sendOnce, send, destroy }
    }

    const handlePixiv = async (id: string) => {
      const px = pixiv(id)
      let result = await px.next()

      let size = 0
      const responses: WebhookMessageOptions[] = []

      const embeds: MessageEmbed[] = []
      const files: MessageAttachment[] = []

      while (!result.done) {
        const file = result.value

        const embed = new MessageEmbed()
          .setColor('#0097fa')
          .setURL('https://www.twitter.com/')
          .setImage(`attachment://${file.name}`)
          .setFooter({
            iconURL: 'https://www.pixiv.net/favicon.ico',
            text: 'Pixiv',
          })

        if (size + file.size > 8 * 1024 * 1024) {
          size = 0
          responses.push({
            embeds: embeds.splice(0),
            files: files.splice(0),
          })
        }

        embeds.push(embed)
        files.push(file)
        size += file.size

        result = await px.next()
      }

      if (embeds.length > 0) {
        responses.push({ embeds, files })
      }

      const { title, userId, userName, createDate } = result.value
      const main = responses[0].embeds![0] as MessageEmbed
      main
        .setURL(`https://www.pixiv.net/artworks/${id}`)
        .setAuthor({
          name: userName,
          url: `https://www.pixiv.net/users/${userId}`,
        })
        .setTitle(title)

      const createdAt = new Date(createDate)
      responses
        .flatMap(res => res.embeds as MessageEmbed[])
        .forEach(embed => {
          embed.setTimestamp(createdAt)
        })

      return responses
    }

    const getTwitter = async (content: string, id: string) => {
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

    const handleTwitter = (message: Message, id: string): Promise<WebhookMessageOptions> | string | null => {
      const content = message.content
      if (message.embeds.length > 0) {
        // replace links if one of them has the shitty twitter video player
        return message.embeds.some(embed => embed.video !== null)
          ? content.replaceAll('twitter.com', 'vxtwitter.com')
          : null
      }
      return getTwitter(content, id)
    }

    return { createWebhook, handlePixiv, handleTwitter }
  },
  async execute(ctx, message) {
    if (message.author.bot || message.webhookId) {
      return
    }

    const content = message.content
    if (content.includes('pixiv.net') && content.includes('artworks')) {
      await message.react('⌛')
      const id = basename(content)
      const [{ embeds, files }, ...rest] = await this.handlePixiv(id)

      const wh = await this.createWebhook(message)
      await wh.send({ content, embeds, files })

      for (const res of rest) {
        await wh.send(res)
      }

      await wh.destroy()
      return
    }

    const matched = twitRe.exec(content)
    if (matched !== null) {
      // discord could take time to get embed, wait longer
      await sleep(750)

      const id = matched[1]
      const msg = await message.fetch()
      const data = this.handleTwitter(msg, id)

      if (data === null) {
        return
      } else if (typeof data !== 'string') {
        await msg.react('⌛')
      }

      const wh = await this.createWebhook(message)
      await wh.sendOnce(await data)
    }
  },
})
