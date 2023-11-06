class Cache extends Map<string, VxTwitterResponse> {
  public constructor(private ttl: number) {
    super()
  }
  public set(key: string, value: VxTwitterResponse): this {
    super.set(key, value)
    setTimeout(() => {
      super.delete(key)
    }, this.ttl * 1000)
    return this
  }
}

interface Size {
  height: number
  width: number
}

export interface MediaExtended {
  altText: string
  duration_millis?: number
  size: Size
  thumbnail_url: string
  type: 'image' | 'video'
  url: string
}

export interface VxTwitterResponse {
  date: string
  date_epoch: number
  hashtags: string[]
  likes: number
  mediaURLs: string[]
  media_extended: MediaExtended[]
  replies: number
  retweets: number
  text: string
  tweetID: string
  tweetURL: string
  user_name: string
  user_screen_name: string
}

async function fetchTweet(id: string) {
  const res = await fetch(`https://api.vxtwitter.com/Twitter/status/${id}`)
  return res.json() as Promise<VxTwitterResponse>
}

export const newTwitterClient = (): (id: string) => Promise<VxTwitterResponse> => {
  const cache = new Cache(15 * 60)

  return async id => {
    if (cache.has(id)) {
      return cache.get(id)!
    }

    const data = await fetchTweet(id)
    cache.set(id, data)

    return data
  }
}

export default newTwitterClient()
