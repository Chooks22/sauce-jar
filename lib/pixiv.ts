import { fetch } from 'chooksie/fetch'
import { MessageAttachment } from 'discord.js'
import { exec } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { cpus } from 'node:os'
import { dirname, extname, join } from 'node:path'
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

export interface IllustArtwork {
  type: 'illust'
  illust: IllustDetails
}

export interface UgoiraArtwork {
  type: 'ugoira'
  illust: IllustDetails
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

async function getArtwork(id: string): Promise<Artwork> {
  const illust = await getIllust(id)

  if (illust.body.urls.original.includes('ugoira')) {
    const ugoira = await getUgoira(id)
    return {
      type: 'ugoira',
      illust: illust.body,
      meta: ugoira.body,
    }
  }

  return {
    type: 'illust',
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

export { getArtwork, downloadUgoira, processUgoira, downloadIllust }
