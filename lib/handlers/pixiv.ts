import type { Logger } from 'chooksie'
import type { Message, WebhookMessageOptions } from 'discord.js'
import { MessageAttachment, MessageEmbed } from 'discord.js'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import type { IllustArtwork, IllustAuthor, IllustDetails, UgoiraArtwork } from '../pixiv'
import { downloadAuthorIcon, downloadIllust, downloadUgoira, getArtwork, processUgoira } from '../pixiv'
import { createWebhook, deleteButton, getUploadLimit, row } from '../utils'

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

async function* illustToEmbeds(artwork: IllustArtwork, sizeLimit: number): AsyncGenerator<WebhookMessageOptions> {
  const downloads = downloadIllust(artwork.illust)
  const createdAt = new Date(artwork.illust.createDate)

  let userIcon: MessageAttachment | undefined
  if (artwork.author.iconUrl) {
    const icon = await downloadAuthorIcon(artwork.author.id, artwork.author.iconUrl)
    userIcon = new MessageAttachment(icon, basename(icon))
  }

  const details: EmbedDetails = {
    icon: userIcon,
    author: artwork.author,
    illust: artwork.illust,
    timestamp: createdAt,
  }

  const first = (await downloads.next()).value as MessageAttachment
  const mainEmbed = newPixivEmbed(first, details)
    .addField('Likes', String(details.illust.likeCount), true)
    .addField('Bookmarks', String(details.illust.bookmarkCount), true)

  let embeds: MessageEmbed[] = [mainEmbed]
  let files: MessageAttachment[] = userIcon
    ? [userIcon, first]
    : [first]

  let size = first.size
  let count = 1

  for await (const file of downloads) {
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

  if (embeds.length > 0) {
    yield { embeds, files }
  }
}

async function ugoiraToEmbed(artwork: UgoiraArtwork, logger: Logger) {
  const id = artwork.illust.id

  logger.info('downloading ugoira...')
  const outpath = join(tmpdir(), id)
  await mkdir(outpath, { recursive: true })
  const output = await downloadUgoira(id, artwork.meta, outpath)

  logger.info('processing ugoira...')
  const file = await processUgoira(id, output, outpath)
  const filename = basename(file)
  logger.info('finished processing ugoira')

  return new MessageAttachment(file, filename)
}

async function* processPixiv(id: string, sizeLimit: number, logger: Logger): AsyncGenerator<WebhookMessageOptions> {
  logger.info('getting artwork info...')
  const artwork = await getArtwork(id)

  if (artwork.type === 'illust') {
    logger.info('got illust artwork')
    yield* illustToEmbeds(artwork, sizeLimit)
  }

  if (artwork.type === 'ugoira') {
    logger.info('got ugoira artwork')
    const ugoira = await ugoiraToEmbed(artwork, logger)
    yield { files: [ugoira] }
  }
}

export default async function handlePixiv(message: Message, logger: Logger): Promise<void> {
  await message.react('⌛')
  const wh = await createWebhook(message)
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
