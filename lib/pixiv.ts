import { MessageAttachment } from 'discord.js'
import { basename, extname } from 'node:path'

interface PixivBodyUrls {
  mini: string
  thumb: string
  small: string
  regular: string
  original: string
}

interface PixivBody {
  pageCount: number
  urls: PixivBodyUrls
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

async function getPage(id: string): Promise<{ body: PixivBody }> {
  const res = await fetch(`https://www.pixiv.net/ajax/illust/${id}`, {
    credentials: 'include',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json',
      'x-user-id': '28861962',
    },
  })

  return res.json() as Promise<{ body: PixivBody }>
}

async function getImg(url: string) {
  const res = await fetch(url, {
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.pixiv.net/',
    },
  })

  const img = await res.arrayBuffer()
  return Buffer.from(img)
}

export async function* pixiv(id: string): AsyncGenerator<MessageAttachment, PixivBody> {
  const { body } = await getPage(id)
  const sep = body.urls.original.lastIndexOf('_')
  const url = body.urls.original.slice(0, sep)
  const ext = extname(body.urls.original)

  // @todo: Pagination
  for (let i = 0, n = Math.min(body.pageCount, 5); i < n; i++) {
    const uri = `${url}_p${i}${ext}`
    const img = await getImg(uri)
    const name = basename(uri)

    const attachment = new MessageAttachment(img, name)
    attachment.size = img.byteLength

    yield attachment
  }

  return body
}
