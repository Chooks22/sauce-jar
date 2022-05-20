import type { Logger } from 'chooksie'
import { defineEvent } from 'chooksie'
import type { Message, TextChannel, WebhookMessageOptions } from 'discord.js'
import { MessageAttachment, MessageEmbed } from 'discord.js'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const twitRe = /https?:\/\/(?:mobile\.|www\.)?twitter\.com\/(\w{1,15}\/status)\/(\d+)(?:\?\S+)?/i

export default defineEvent({
  name: 'messageCreate',
  setup: async () => {
    const { getArtwork, downloadIllust, downloadUgoira } = await import('../lib/pixiv')
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

    const handlePixiv = async (id: string, logger: Logger): Promise<WebhookMessageOptions[]> => {
      logger.info('getting artwork info...')
      const artwork = await getArtwork(id)
      const createdAt = new Date(artwork.illust.createDate)
      logger.info(`got artwork type: ${artwork.type}`)

      if (artwork.type === 'illust') {
        const SIZE_LIMIT = 8 * 1024 * 1024

        const newEmbed = (file: MessageAttachment) => new MessageEmbed()
          .setColor('#0097fa')
          .setURL('https://www.twitter.com/')
          .setImage(`attachment://${file.name}`)
          .setFooter({
            text: 'Pixiv',
            iconURL: 'https://www.pixiv.net/favicon.ico',
          })
          .setTimestamp(createdAt)

        logger.info('downloading images...')
        const illusts = downloadIllust(artwork.illust)
        const first = await illusts.next()

        const attachment = first.value as MessageAttachment
        const embed = newEmbed(attachment)
          .setURL(`https://www.pixiv.net/artworks/${id}`)
          .setAuthor({
            name: artwork.illust.userName,
            url: `https://www.pixiv.net/users/${artwork.illust.userId}`,
          })
          .setTitle(artwork.illust.title)

        const responses: WebhookMessageOptions[] = [
          {
            embeds: [embed],
            files: [attachment],
          },
        ]

        let embeds: MessageEmbed[] = []
        let files: MessageAttachment[] = []

        let size = 0
        let count = 0

        // @todo: large single file checking
        // @todo: separate attachments to allow embedding using urls
        for await (const file of illusts) {
          if (count++ === 4 || size + file.size > SIZE_LIMIT) {
            responses.push({ embeds, files })
            embeds = []
            files = []
          }

          size += file.size
          embeds.push(newEmbed(file))
          files.push(file)
        }

        if (embeds.length > 0) {
          responses.push({ embeds, files })
        }

        logger.info(`downloaded ${artwork.illust.pageCount} images`)
        return responses
      }

      const outpath = join(tmpdir(), id)
      await mkdir(outpath, { recursive: true })

      logger.info('downloading ugoira...')
      const file = await downloadUgoira(id, artwork.meta, outpath)
      const filename = basename(file)

      logger.info('ugoira downloaded')
      const attachment = new MessageAttachment(file, filename)
      return [{ files: [attachment] }]
    }

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
      const [{ embeds, files }, ...rest] = await this.handlePixiv(id, ctx.logger)

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

      const id = matched[2]
      const msg = await message.fetch()
      const data = this.handleTwitter(msg, id)

      if (data === null) {
        return
      } else if (typeof data !== 'string') {
        await msg.react('⌛')
      }

      const wh = await this.createWebhook(message)
      await wh.sendOnce(await data)

      void rm(join(tmpdir(), id), {
        recursive: true,
        force: true,
      })
    }
  },
})
