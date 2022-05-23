import type { Logger } from 'chooksie'
import type { Message, WebhookMessageOptions } from 'discord.js'
import { MessageAttachment, MessageEmbed } from 'discord.js'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import type { Artwork } from '../pixiv'
import { processUgoira } from '../pixiv'
import { downloadIllust, downloadUgoira, getArtwork } from '../pixiv'
import { createWebhook, deleteButton, getUploadLimit, row } from '../utils'
import { tests } from './consts'

const newPixivEmbed = (file: MessageAttachment, createdAt: Date) => {
  return new MessageEmbed()
    .setColor('#0097fa')
    .setURL('https://www.twitter.com/')
    .setImage(`attachment://${file.name}`)
    .setFooter({
      text: 'Pixiv',
      iconURL: 'https://www.pixiv.net/favicon.ico',
    })
    .setTimestamp(createdAt)
}

function* getPixivIds(content: string): Generator<string> {
  for (const matched of content.matchAll(tests.pixiv)) {
    yield matched[1]
  }
}

async function* illustToEmbeds(artwork: Artwork, sizeLimit: number): AsyncGenerator<WebhookMessageOptions> {
  const downloads = downloadIllust(artwork.illust)
  const createdAt = new Date(artwork.illust.createDate)

  const first = await downloads.next()
  const mainEmbed = newPixivEmbed(first.value as MessageAttachment, createdAt)
    .setURL(`https://www.pixiv.net/artworks/${artwork.illust.id}`)
    .setAuthor({
      name: artwork.illust.userName,
      url: `https://www.pixiv.net/users/${artwork.illust.userId}`,
    })

  yield {
    embeds: [mainEmbed],
    files: [first.value],
  }

  let embeds: MessageEmbed[] = []
  let files: MessageAttachment[] = []
  let size = 0
  let count = 0

  for await (const file of downloads) {
    if (++count > 3 || size + file.size > sizeLimit) {
      yield { embeds, files }
      embeds = []
      files = []
      size = 0
      count = 0
    }

    embeds.push(newPixivEmbed(file, createdAt))
    files.push(file)
    size += file.size
    count++
  }

  if (embeds.length > 0) {
    yield { embeds, files }
  }
}

export default async function handlePixiv(message: Message, logger: Logger): Promise<void> {
  await message.react('⌛')
  const wh = await createWebhook(message)
  const components = [row(deleteButton(message.author.id))]

  for (const id of getPixivIds(message.content)) {
    logger.info('getting artwork info...')
    const artwork = await getArtwork(id)
    logger.info(`got artwork type: ${artwork.type}`)

    if (artwork.type === 'illust') {
      logger.info(`downloading ${artwork.illust.pageCount} illusts...`)
      const responses = illustToEmbeds(artwork, getUploadLimit(message.guild))

      // @todo: continue download while uploading message
      await wh.send({
        ...await responses.next(),
        content: message.content,
        components,
      })

      for await (const response of responses) {
        await wh.send(response)
      }

      logger.info('finished downloading illusts')
    }

    if (artwork.type === 'ugoira') {
      const outpath = join(tmpdir(), artwork.illust.id)
      await mkdir(outpath, { recursive: true })

      logger.info('downloading ugoira...')
      const downloadPath = await downloadUgoira(artwork.illust.id, artwork.meta, outpath)

      logger.info('processing ugoira...')
      const file = await processUgoira(artwork.illust.id, downloadPath, outpath)
      logger.info('finished processing ugoira')

      const filename = basename(file)
      const attachment = new MessageAttachment(file, filename)

      await wh.send({
        content: message.content,
        files: [attachment],
        components,
      })
    }
  }

  await wh.destroy()
}
