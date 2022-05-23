import { defineEvent } from 'chooksie'
import type { Message, WebhookMessageOptions } from 'discord.js'
import { MessageActionRow, MessageButton, MessageEmbed } from 'discord.js'
import { setTimeout as sleep } from 'node:timers/promises'

const twitRe = /https?:\/\/(?:mobile\.|www\.)?twitter\.com\/(\w{1,15}\/status)\/(\d+)(?:\?\S+)?/i

export default defineEvent({
  name: 'messageCreate',
  setup: async () => {
    const { default: twitter } = await import('../lib/twitter')
    const { createWebhook } = await import('../lib/utils')
    const { getHandler } = await import('../lib/handlers')

    const getTwitter = async (content: string, id: string) => {
      const res = await twitter(id)
      const embeds: MessageEmbed[] = []
      const { tweet, author } = res

      if (tweet.media.some(media => media.type === 'video')) {
        return {
          content: content.replace(twitRe, 'https://vxtwitter.com/$1/$2'),
        }
      }

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

    const deleteButton = (userId: string) => {
      const button = new MessageButton()
        .setCustomId(`msg-delete:${userId}`)
        .setEmoji('🗑️')
        .setStyle('DANGER')

      return [new MessageActionRow().addComponents(button)]
    }

    return { createWebhook, getHandler, handleTwitter, deleteButton }
  },
  async execute(ctx, message) {
    if (message.author.bot || message.webhookId) {
      return
    }

    const content = message.content
    const matched = twitRe.exec(content)

    if (matched !== null) {
      // discord could take time to get embed, wait longer
      await sleep(750)

      const id = matched[2]
      const msg = await message.fetch()
      const data = this.handleTwitter(msg, id)

      if (data === null) {
        return
      }

      const wh = await this.createWebhook(message)

      if (typeof data === 'string') {
        await wh.sendOnce({
          content: data,
          components: this.deleteButton(message.author.id),
        })
      } else {
        await msg.react('⌛')
        await wh.sendOnce({
          ...await data,
          components: this.deleteButton(message.author.id),
        })
      }
    }

    const handler = this.getHandler(message)
    if (handler !== null) {
      await handler(ctx.logger)
    }
  },
})
