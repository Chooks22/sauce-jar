import type { Logger } from 'chooksie'
import type { Message, WebhookMessageOptions } from 'discord.js'
import { MessageAttachment, MessageEmbed } from 'discord.js'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import type { IllustArtwork, IllustAuthor, IllustDetails, UgoiraArtwork } from '../pixiv'
import { downloadAuthorIcon, downloadIllust, downloadUgoira, getArtwork, processUgoira } from '../pixiv'
import type { WebhookHandler } from '../utils'
import { deleteButton, getUploadLimit, row } from '../utils'

interface EmbedDetails {
  icon?: MessageAttachment
  author: IllustAuthor
  illust: IllustDetails
  timestamp: Date
}

const newPixivEmbed = (file: MessageAttachment, details: EmbedDetails) => new MessageEmbed()
  .setColor('#0097fa')
  .setURL(`https://www.pixiv.net/artworks/${details.illust.id}`)
  .setTitle(details.illust.title)
  .setAuthor({
    name: details.author.name,
    iconURL: details.icon && `attachment://${details.icon.name}`,
    url: `https://www.pixiv.net/users/${details.author.id}`,
  })
  .setImage(`attachment://${file.name}`)
  .setFooter({
    text: 'Pixiv',
    iconURL: 'https://www.pixiv.net/favicon.ico',
  })
  .setTimestamp(details.timestamp)

function* getPixivIds(content: string): Generator<string> {
  const re = /https?:\/\/(?:www\.)?pixiv\.net\/(?:en\/)?artworks\/(\d+)(?:\?\S+)?/gi
  for (const matched of content.matchAll(re)) {
    yield matched[1]
  }
}

async function* illustToEmbeds(
  artwork: IllustArtwork,
  sizeLimit: number,
  logger: Logger,
): AsyncGenerator<WebhookMessageOptions> {
  const downloads = downloadIllust(artwork.illust, sizeLimit)
  const createdAt = new Date(artwork.illust.createDate)

  let userIcon: MessageAttachment | undefined
  if (artwork.author.iconUrl) {
    logger.info('downloading author icon...')
    const icon = await downloadAuthorIcon(artwork.author.id, artwork.author.iconUrl)
    userIcon = new MessageAttachment(icon, basename(icon))
    logger.info('got author icon')
  }

  const details: EmbedDetails = {
    icon: userIcon,
    author: artwork.author,
    illust: artwork.illust,
    timestamp: createdAt,
  }

  logger.info('downloading illust...')
  let large = 0
  let page = 1
  let count = 1

  let first = (await downloads.next()).value as MessageAttachment | null
  logger.info(`got page ${page} of ${artwork.illust.pageCount}`)

  while (first === null) {
    large++
    logger.info('illust skipped. too large to upload')
    first = (await downloads.next()).value as MessageAttachment | null
    logger.info(`got page ${++count} of ${artwork.illust.pageCount}`)
  }

  const mainEmbed = newPixivEmbed(first, details)
    .addField('Likes', String(details.illust.likeCount), true)
    .addField('Bookmarks', String(details.illust.bookmarkCount), true)

  let embeds: MessageEmbed[] = [mainEmbed]
  let files: MessageAttachment[] = userIcon
    ? [userIcon, first]
    : [first]

  let size = first.size

  for await (const file of downloads) {
    logger.info(`got page ${++page} of ${artwork.illust.pageCount}`)
    if (file === null) {
      large++
      logger.info('illust skipped. too large to upload')
      continue
    }

    count++
    size += file.size

    if (count > 4 || size > sizeLimit) {
      yield { embeds, files }
      embeds = []
      files = []
      size = 0
      count = 0
    }

    embeds.push(newPixivEmbed(file, details))
    files.push(file)
  }

  logger.info('finished downloading illust')
  if (embeds.length > 0) {
    yield { embeds, files }
  }

  if (large > 0) {
    logger.info('got skipped pages')
    yield {
      content: `> ${large} of ${artwork.illust.pageCount} images were too large to upload.`,
    }
  }
}

async function ugoiraToEmbed(artwork: UgoiraArtwork, logger: Logger) {
  const id = artwork.illust.id

  const outpath = join(tmpdir(), id)
  await mkdir(outpath, { recursive: true })

  logger.info(`downloading ugoira ${id}...`)
  const rawUgoira = await downloadUgoira(id, outpath)

  logger.info(`processing ugoira ${id}...`)
  const videoPath = await processUgoira(id, rawUgoira, outpath)

  logger.info(`ugoira ${id} processed!`)
  return new MessageAttachment(videoPath, basename(videoPath))
}

async function* processPixiv(id: string, sizeLimit: number, logger: Logger): AsyncGenerator<WebhookMessageOptions> {
  logger.info('getting artwork info...')
  const artwork = await getArtwork(id)

  if (artwork.type === 'illust') {
    logger.info('got illust artwork')
    yield* illustToEmbeds(artwork, sizeLimit, logger)
  }

  if (artwork.type === 'ugoira') {
    logger.info('got ugoira artwork')
    const ugoira = await ugoiraToEmbed(artwork, logger)
    yield { files: [ugoira] }
  }
}

export default async function handlePixiv(message: Message, wh: WebhookHandler, logger: Logger): Promise<void> {
  await message.react('⌛')
  const components = [row(deleteButton(message.author.id))]
  const sizeLimit = getUploadLimit(message.guild)

  const ids = getPixivIds(message.content)
  const sendResponses = async (responses: AsyncGenerator<WebhookMessageOptions>) => {
    // @todo: continue download while uploading message
    for await (const response of responses) {
      await wh.send(response)
    }
  }

  const firstId = ids.next().value as string
  const responses = processPixiv(firstId, sizeLimit, logger)
  const first = await responses.next()

  await wh.send({
    ...first.value as WebhookMessageOptions,
    content: message.content,
    components,
  })

  await sendResponses(responses)

  for (const id of ids) {
    await sendResponses(processPixiv(id, sizeLimit, logger))
  }

  await wh.destroy()
}
