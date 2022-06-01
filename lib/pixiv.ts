import { fetch } from 'chooksie/fetch'
import { MessageAttachment } from 'discord.js'
import { exec } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { cpus, tmpdir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { Open } from 'unzipper'

const cpuCount = cpus().length

export interface IllustUrls {
  mini: string
  thumb: string
  small: string
  regular: string
  original: string
}

export interface IllustDetails {
  pageCount: number
  urls: IllustUrls
  id: string
  title: string
  description: string
  createDate: string
  uploadDate: string
  userId: string
  userName: string
  bookmarkCount: number
  likeCount: number
  commentCount: number
  responseCount: number
  viewCount: number
}

export interface IllustAuthor {
  id: string
  name: string
  iconUrl: string | null
}

export interface UgoiraFrame {
  file: string
  delay: number
}

export interface UgoiraMeta {
  src: string
  originalSrc: string
  mime_type: string
  frames: UgoiraFrame[]
}

export interface BaseIllust {
  type: 'illust' | 'ugoira'
  illust: IllustDetails
  author: IllustAuthor
}

export interface IllustArtwork extends BaseIllust {
  type: 'illust'
}

export interface UgoiraArtwork extends BaseIllust {
  type: 'ugoira'
  meta: UgoiraMeta
}

export type Artwork = IllustArtwork | UgoiraArtwork

function getIllust(id: string): Promise<{ body: IllustDetails }> {
  return fetch<{ body: IllustDetails }>(`https://www.pixiv.net/ajax/illust/${id}`, {
    credentials: 'include',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'x-user-id': process.env.PIXIV_ID,
    },
  }).json()
}

function getUgoira(id: string): Promise<{ body: UgoiraMeta }> {
  return fetch<{ body: UgoiraMeta }>(`https://www.pixiv.net/ajax/illust/${id}/ugoira_meta`, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'x-user-id': process.env.PIXIV_ID,
      'Cookie': `PHPSESSID=${process.env.PIXIV_KEY}`,
    },
  }).json()
}

async function getAuthorIcon(userId: string): Promise<string | null> {
  const html = await fetch(`https://www.pixiv.net/en/users/${userId}`).text()
  const match = /meta property="og:image" content="(?<icon>[^"]+)"/.exec(html)
  return match?.groups?.icon ?? null
}

export interface Stream {
  width: number
  height: number
}

async function getImageSize(file: string) {
  const ffprobe = exec(`ffprobe -show_entries stream=width,height -of json ${file}`)

  let data = ''
  ffprobe.stdout!.on('data', chunk => {
    data += chunk
  })

  await once(ffprobe, 'close')
  const parsed = JSON.parse(data) as { streams: Stream[] }
  return parsed.streams[0]
}

async function resizeIcon(file: string, outfile: string) {
  const size = await getImageSize(file)

  const min = Math.min(size.width, size.height)
  const dx = size.width - min
  const dy = size.height - min

  const ffmpeg = exec(`ffmpeg -y -i ${file} -vf crop=${min}:${min}:${dx / 2}:${dy / 2} ${outfile}`)
  await once(ffmpeg, 'close')
}

async function downloadAuthorIcon(userId: string, iconUrl: string): Promise<string> {
  const tmp = join(tmpdir(), userId)
  const mkd = mkdir(tmp, { recursive: true })

  const icon = await fetch(iconUrl, {
    headers: {
      Referer: 'https://www.pixiv.net/',
    },
  }).arrayBuffer()

  const filename = basename(iconUrl)
  const filepath = join(tmp, filename)
  const ext = extname(filename)
  const out = join(tmp, `${userId}${ext}`)

  await mkd
  await writeFile(filepath, Buffer.from(icon))
  await resizeIcon(filepath, out)

  void rm(filepath, { force: true })
  return out
}

async function getArtwork(id: string): Promise<Artwork> {
  const illust = await getIllust(id)
  const author: IllustAuthor = {
    id: illust.body.userId,
    name: illust.body.userName,
    iconUrl: await getAuthorIcon(illust.body.userId),
  }

  if (illust.body.urls.original.includes('ugoira')) {
    const ugoira = await getUgoira(id)
    return {
      type: 'ugoira',
      author,
      illust: illust.body,
      meta: ugoira.body,
    }
  }

  return {
    type: 'illust',
    author,
    illust: illust.body,
  }
}

function framesToConcat(frames: UgoiraFrame[]): string {
  let file = 'ffconcat version 1.0'
  for (let i = 0, n = frames.length; i < n; i++) {
    const frame = frames[i]
    file += `\nfile '${frame.file}'\nduration ${frame.delay / 1000}`
  }
  return file
}

async function downloadUgoira(id: string, ugoira: UgoiraMeta, outpath: string): Promise<string> {
  const arrayBuf = await fetch(ugoira.originalSrc, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Encoding': 'gzip, deflate, br',
      'x-user-id': process.env.PIXIV_ID,
      'Cookie': `PHPSESSID=${process.env.PIXIV_KEY}`,
      'Referer': `https://www.pixiv.net/artworks/${id}`,
    },
  }).arrayBuffer()

  const zip = Buffer.from(arrayBuf)
  const tmp = join(outpath, 'tmp')
  await mkdir(tmp, { recursive: true })

  const concatFile = join(tmp, 'ffconcat.txt')
  const concatData = framesToConcat(ugoira.frames)
  await writeFile(concatFile, concatData)

  const gallery = await Open.buffer(zip)
  await gallery.extract({ path: tmp, concurrency: cpuCount })

  return tmp
}

async function processUgoira(id: string, inpath: string, outpath: string): Promise<string> {
  const filepath = join(outpath, `${id}.mp4`)
  const ffmpeg = exec(`ffmpeg -y -i ffconcat.txt -pix_fmt yuv420p ${filepath}`, {
    cwd: inpath,
  })

  // @todo: progress tracking
  await once(ffmpeg, 'close')
  void rm(inpath, { recursive: true })

  return filepath
}

async function getImg(url: string) {
  const arrayBuf = await fetch(url, {
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.pixiv.net/',
    },
  }).arrayBuffer()

  return Buffer.from(arrayBuf)
}

async function* downloadIllust(illust: IllustDetails): AsyncGenerator<MessageAttachment> {
  const url = illust.urls.original
  const ext = extname(url)
  const baseUrl = dirname(url)

  for (let i = 0; i < illust.pageCount; i++) {
    const filename = `${illust.id}_p${i}${ext}`
    const img = await getImg(`${baseUrl}/${filename}`)

    const attachment = new MessageAttachment(img, filename)
    attachment.size = img.length

    yield attachment
  }
}

export { getArtwork, downloadUgoira, processUgoira, downloadIllust, getAuthorIcon, downloadAuthorIcon }
