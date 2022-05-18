export interface RawTwitterUser {
  id: string
  name: string
  username: string
  profile_image_url: string
}

export interface TwitterUser {
  id: string
  name: string
  username: string
  avatar: string
}

export interface RawTwitterMedia {
  media_key: string
  type: 'photo' | 'video'
  url: string
}

export interface TwitterMedia {
  mediaKey: string
  type: 'photo' | 'video'
  url: string
}

export interface RawTwitterExtensions {
  media: RawTwitterMedia[]
  users: RawTwitterUser[]
}

export interface RawPublicMetrics {
  retweet_count: number
  reply_count: number
  like_count: number
  quote_count: number
}

export interface PublicMetrics {
  retweets: number
  replies: number
  likes: number
  quotes: number
}

export interface RawTweet {
  id: string
  author_id: string
  possibly_sensitive: boolean
  created_at: string
  text: string
  public_metrics: RawPublicMetrics
}

export interface Tweet {
  id: string
  authorId: string
  isNsfw: boolean
  createdAt: Date
  content: string
  metrics: PublicMetrics
  media: TwitterMedia[]
}

export interface RawTwitterResponse {
  includes: RawTwitterExtensions
  data: RawTweet
}

export interface TwitterResponse {
  tweet: Tweet
  author: TwitterUser
  users: TwitterUser[]
  raw: RawTwitterResponse
}
