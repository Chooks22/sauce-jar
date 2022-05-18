import type { PublicMetrics, RawTwitterResponse, Tweet, TwitterMedia, TwitterResponse, TwitterUser } from './types'

const twitterParams = new URLSearchParams({
  'expansions': 'attachments.media_keys,author_id',
  'tweet.fields': 'possibly_sensitive,public_metrics,created_at',
  'media.fields': 'type,url',
  'user.fields': 'id,profile_image_url',
}).toString()

class Cache extends Map<string, TwitterResponse> {
  public constructor(private ttl: number) {
    super()
  }
  public set(key: string, value: TwitterResponse): this {
    super.set(key, value)
    setTimeout(() => {
      super.delete(key)
    }, this.ttl * 1000)
    return this
  }
}

function parseRawResponse(body: RawTwitterResponse): TwitterResponse {
  const { data, includes } = body
  const metrics: PublicMetrics = {
    retweets: data.public_metrics.retweet_count,
    replies: data.public_metrics.reply_count,
    likes: data.public_metrics.like_count,
    quotes: data.public_metrics.quote_count,
  }

  const media = includes.media.map<TwitterMedia>(raw => ({
    mediaKey: raw.media_key,
    type: raw.type,
    url: raw.url,
  }))

  // remove unnecessary url
  const sep = data.text.lastIndexOf(' ')
  const content = sep === -1
    ? ''
    : data.text.slice(0, sep)

  const tweet: Tweet = {
    id: data.id,
    authorId: data.author_id,
    content,
    createdAt: new Date(data.created_at),
    isNsfw: data.possibly_sensitive,
    metrics,
    media,
  }

  const users = includes.users.map<TwitterUser>(raw => ({
    id: raw.id,
    name: raw.name,
    username: raw.username,
    avatar: raw.profile_image_url,
  }))

  const author = users.find(user => user.id === tweet.authorId)!

  return { tweet, author, users, raw: body }
}

async function fetchTweet(id: string, token: string) {
  const input = `https://api.twitter.com/2/tweets/${id}?${twitterParams}`
  const res = await fetch(input, {
    headers: { Authorization: token },
  })

  const raw = await res.json() as RawTwitterResponse
  return parseRawResponse(raw)
}

export const newTwitterClient = (credentials: string): (id: string) => Promise<TwitterResponse> => {
  const token = `Bearer: ${credentials}`
  const cache = new Cache(15 * 60)

  return async id => {
    if (cache.has(id)) {
      return cache.get(id)!
    }

    const data = await fetchTweet(id, token)
    cache.set(id, data)

    return data
  }
}

export default newTwitterClient(process.env.TWITTER_TOKEN)
