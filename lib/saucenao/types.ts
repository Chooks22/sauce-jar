import { basename } from 'node:path'
import { escape } from 'node:querystring'

export interface SauceResponse {
  header: SauceHeader
  results: SauceEntryRaw[]
}

export interface SauceHeaderIndex {
  status: number
  parent_id: number
  id: number
  results: number
}

export interface SauceHeader {
  user_id: string
  account_type: string
  short_limit: string
  long_limit: string
  long_remaining: number
  short_remaining: number
  status: number
  results_requested: string
  index: Record<number, SauceHeaderIndex>
  search_dept: string
  minimum_similarity: number
  query_image_display: string
  query_image: string
  results_returned: number
}

export interface SauceResultHeaderRaw {
  similarity: string
  thumbnail: string
  index_id: number
  index_name: string
  dupes: number
  hidden: number
}

export interface SauceEntryRaw {
  header: SauceResultHeaderRaw
  data: SauceResultRaw
}

export type RawUrl = Record<number, string>

export interface BaseResultRaw {
  ext_urls: RawUrl
}

export interface Creator {
  id: string
  name: string
  link: string
}

export interface Artwork {
  id: string
  title: string | null
  creator: Creator | null
  link: string
}

export interface BaseResult {
  urls: string[]
  creator: Creator | null
  artwork: Artwork
  raw: SauceResultRaw
}

export type SauceDB = keyof typeof SauceDBIndex
export enum SauceDBIndex {
  Pixiv = 5,
  PixivHistorical = 6,
  NicoSeiga = 8,
  Danbooru = 9,
  Drawr = 10,
  Nijie = 11,
  'Yande.re' = 12,
  Fakku = 16,
  'H-Misc1' = 18,
  'H-Misc2' = 38,
  '2D-Market' = 19,
  Anime = 21,
  'H-Anime' = 22,
  Gelbooru = 25,
  Konachan = 26,
  'Sankaku Channel' = 27,
  'Anime-Pictures' = 28,
  'e621' = 29,
  'Idol Complex' = 30,
  'bcy.net Illust' = 31,
  'bcy.net Cosplay' = 32,
  DeviantArt = 34,
  Pawoo = 35,
  Madokami = 36,
  MangaDex = 37,
  ArtStation = 39,
  FurAffinity = 40,
  Twitter = 41,
  'Furry Network' = 42,
  Kemono = 43,
  Skeb = 44,
  All = 999,
}

export class Sauce<T extends SauceResultRaw = SauceResultRaw> implements BaseResult {
  public urls: string[] = []
  public creator: Creator | null = null
  public artwork!: Artwork
  public index!: SauceDB
  public indexId!: SauceDBIndex
  public similarity!: number
  public raw: T
  public constructor(public entry: SauceEntryRaw) {
    this.raw = entry.data as T
    this.similarity = Number(entry.header.similarity)
    switch (entry.header.index_id) {
      case SauceDBIndex.Skeb: {
        const data = entry.data as SkebResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: data.creator,
          name: data.creator_name,
          link: data.author_url,
        }
        this.artwork = {
          id: data.path,
          title: null,
          creator: this.creator,
          link: this.urls[0],
        }
        break
      }
      case SauceDBIndex.DeviantArt: {
        const data = entry.data as DeviantArtResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: data.author_name.toLowerCase(),
          name: data.author_name,
          link: data.author_url,
        }
        this.artwork = {
          id: data.da_id,
          title: data.title,
          creator: this.creator,
          link: this.urls[0],
        }
        break
      }
      case SauceDBIndex.Pixiv: {
        const data = entry.data as PixivResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: data.member_id,
          name: data.member_name,
          link: `https://www.pixiv.net/users/${data.member_id}`,
        }
        const id = String(data.pixiv_id)
        this.artwork = {
          id,
          title: data.title,
          creator: this.creator,
          link: `https://www.pixiv.net/artworks/${id}`,
        }
        break
      }
      case SauceDBIndex.Anime: {
        const data = entry.data as AnimeResultRaw
        this.urls = Object.values(data.ext_urls)
        const id = String(data.anidb_aid)
        this.artwork = {
          id,
          title: data.source,
          creator: null,
          link: `https://anidb.net/anime/${id}`,
        }
        break
      }
      case SauceDBIndex.FurAffinity: {
        const data = entry.data as FurAffinityResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: basename(data.author_url),
          name: data.author_name,
          link: data.author_url,
        }
        this.artwork = {
          id: String(data.fa_id),
          title: data.title,
          creator: this.creator,
          link: this.urls[0],
        }
        break
      }
      case SauceDBIndex.PixivHistorical: {
        const data = entry.data as PixivHistoricalResultRaw
        this.urls = Object.values(data.ext_urls)
        const creatorId = String(data.member_id)
        const artworkId = String(data.pixiv_id)
        this.creator = {
          id: creatorId,
          name: data.member_name,
          link: `https://www.pixiv.net/users/${artworkId}`,
        }
        this.artwork = {
          id: artworkId,
          title: data.title,
          creator: this.creator,
          link: `https://www.pixiv.net/artworks/${artworkId}`,
        }
        break
      }
      case SauceDBIndex.Twitter: {
        const data = entry.data as TwitterResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: data.twitter_user_id,
          name: data.twitter_user_handle,
          link: `https://twitter.com/${data.twitter_user_handle}`,
        }
        this.artwork = {
          id: data.tweet_id,
          title: null,
          creator: this.creator,
          link: `https://twitter.com/${data.twitter_user_handle}/status/${data.tweet_id}`,
        }
        break
      }
      case SauceDBIndex['H-Misc1']:
      case SauceDBIndex['H-Misc2']: {
        const data = entry.data as HMiscResultRaw
        this.urls = []
        this.creator = {
          id: '',
          name: Object.values(data.creator).join(','),
          link: '',
        }
        this.artwork = {
          id: '',
          title: data.eng_name || data.jp_name,
          creator: this.creator,
          link: '',
        }
        break
      }
      case SauceDBIndex['bcy.net Cosplay']:
      case SauceDBIndex['bcy.net Illust']: {
        const data = entry.data as BcyNetResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: String(data.member_id),
          name: data.member_name,
          link: `https://bcy.net/u/${data.member_link_id}`,
        }
        this.artwork = {
          id: String(data.member_link_id),
          title: data.title,
          creator: this.creator,
          link: this.urls[0],
        }
        break
      }
      case SauceDBIndex['Furry Network']: {
        const data = entry.data as FurryNetworkResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: data.author_name,
          name: data.author_name,
          link: data.author_url,
        }
        this.artwork = {
          id: String(data.fn_id),
          title: data.title,
          creator: this.creator,
          link: this.urls[0],
        }
        break
      }
      case SauceDBIndex.Pawoo: {
        const data = entry.data as PawooResultRaw
        this.urls = Object.values(data.ext_urls)
        const creatorId = `@${data.pawoo_user_acct}`
        const artworkId = String(data.pawoo_id)
        this.creator = {
          id: creatorId,
          name: data.pawoo_user_display_name,
          link: `https://pawoo.net/${creatorId}`,
        }
        this.artwork = {
          id: artworkId,
          title: null,
          creator: this.creator,
          link: `https://pawoo.net/${creatorId}/${artworkId}`,
        }
        break
      }
      case SauceDBIndex.NicoSeiga: {
        const data = entry.data as NicoSeigaResultRaw
        this.urls = Object.values(data.ext_urls)
        const creatorId = String(data.member_id)
        const artworkId = String(data.seiga_id)
        this.creator = {
          id: creatorId,
          name: data.member_name,
          link: `https://seiga.nicovideo.jp/user/illust/${creatorId}`,
        }
        this.artwork = {
          id: artworkId,
          title: data.title,
          creator: this.creator,
          link: `https://seiga.nicovideo.jp/seiga/im${artworkId}`,
        }
        break
      }
      case SauceDBIndex.Danbooru: {
        const data = entry.data as DanbooruResultRaw
        this.urls = Object.values(data.ext_urls)
        const artworkId = String(data.danbooru_id)
        this.creator = {
          id: data.creator,
          name: data.creator,
          link: `https://danbooru.donmai.us/posts?tags=${data.creator}&z=1`,
        }
        this.artwork = {
          id: artworkId,
          creator: this.creator,
          link: `https://danbooru.donmai.us/post/show/${artworkId}`,
          title: data.material
            ? `${data.characters} (${data.material}) drawn by ${this.creator.name}`
            : `${data.characters} drawn by ${this.creator.name}`,
        }
        break
      }
      case SauceDBIndex.Nijie: {
        const data = entry.data as NijieResultRaw
        this.urls = Object.values(data.ext_urls)
        const creatorId = String(data.member_id)
        const artworkId = String(data.nijie_id)
        this.creator = {
          id: artworkId,
          name: data.member_name,
          link: `https://nijie.info/members.php?id=${creatorId}`,
        }
        this.artwork = {
          id: artworkId,
          creator: this.creator,
          title: data.title,
          link: `https://nijie.info/view.php?id=${artworkId}`,
        }
        break
      }
      case SauceDBIndex['Yande.re']: {
        const data = entry.data as YandereResultRaw
        this.urls = Object.values(data.ext_urls)
        const artworkId = String(data.yandere_id)
        this.creator = {
          id: data.creator,
          name: data.creator,
          link: `https://yande.re/post?tags=${data.creator}`,
        }
        this.artwork = {
          id: artworkId,
          creator: this.creator,
          title: [data.creator, data.material, data.characters]
            .filter(Boolean)
            .join(' '),
          link: `https://yande.re/post/show/${artworkId}`,
        }
        break
      }
      case SauceDBIndex['Sankaku Channel']: {
        const data = entry.data as SankakuResultRaw
        this.urls = Object.values(data.ext_urls)
        const artworkId = String(data.sankaku_id)
        this.creator = {
          id: data.creator,
          name: data.creator,
          link: `https://chan.sankakucomplex.com/?tags=${data.creator}`,
        }
        this.artwork = {
          id: artworkId,
          creator: this.creator,
          title: [data.material, data.characters, data.creator]
            .filter(Boolean)
            .join(', '),
          link: `https://chan.sankakucomplex.com/post/show/${artworkId}`,
        }
        break
      }
      case SauceDBIndex.Madokami: {
        const data = entry.data as MadokamiResultRaw
        this.urls = Object.values(data.ext_urls)
        const artworkId = String(data.mu_id)
        const link = `https://www.mangaupdates.com/series.html?id=${artworkId}`
        this.creator = {
          id: data.source,
          name: data.source,
          link,
        }
        this.artwork = {
          id: artworkId,
          title: data.source,
          creator: this.creator,
          link,
        }
        break
      }
      case SauceDBIndex.MangaDex: {
        const data = entry.data as MangaDexResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: data.author,
          name: data.author,
          link: `https://mangadex.org/search?tab=authors&q=${data.author.replaceAll(' ', '+')}`,
        }
        this.artwork = {
          id: data.md_id,
          creator: this.creator,
          title: data.source + data.part,
          link: `https://mangadex.org/chapter/${data.md_id}`,
        }
        break
      }
      case SauceDBIndex.Drawr: {
        const data = entry.data as DrawrResultRaw
        this.urls = Object.values(data.ext_urls)
        const creatorId = String(data.member_id)
        const artworkId = String(data.drawr_id)
        this.creator = {
          id: creatorId,
          name: data.member_name,
          link: 'https://drawr.net',
        }
        this.artwork = {
          id: artworkId,
          title: data.title,
          creator: this.creator,
          link: `https://drawr.net/show.php?id=${artworkId}`,
        }
        break
      }
      case SauceDBIndex.ArtStation: {
        const data = entry.data as ArtStationResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: data.author_name,
          name: data.author_name,
          link: data.author_url,
        }
        this.artwork = {
          id: data.as_project,
          title: data.title,
          creator: this.creator,
          link: `https://www.artstation.com/${data.as_project}`,
        }
        break
      }
      case SauceDBIndex.e621: {
        const data = entry.data as E621NetResultRaw
        this.urls = Object.values(data.ext_urls)
        const artworkId = String(data.e621_id)
        this.creator = {
          id: data.creator,
          name: data.creator,
          link: `https://e621.net/posts?tags=${data.creator}`,
        }
        this.artwork = {
          id: artworkId,
          title: [data.creator, data.material, data.characters]
            .filter(Boolean)
            .join(', '),
          creator: this.creator,
          link: `https://e621.net/post/show/${artworkId}`,
        }
        break
      }
      case SauceDBIndex.Gelbooru: {
        const data = entry.data as GelbooruResultRaw
        this.urls = Object.values(data.ext_urls)
        const artworkId = String(data.gelbooru_id)
        this.creator = {
          id: data.creator,
          name: data.creator,
          link: `https://gelbooru.com/index.php?page=post&s=list&tags=${escape(data.creator).replaceAll(' ', '+')}`,
        }
        this.artwork = {
          id: artworkId,
          title: [data.creator, data.material, data.characters]
            .filter(Boolean)
            .join(', '),
          creator: this.creator,
          link: `https://gelbooru.com/index.php?page=post&s=view&id=${artworkId}`,
        }
        break
      }
      case SauceDBIndex.Konachan: {
        const data = entry.data as KonachanResultRaw
        this.urls = Object.values(data.ext_urls)
        const artworkId = String(data.konachan_id)
        this.creator = {
          id: data.creator,
          name: data.creator,
          link: `https://konachan.com/post?tags=${data.creator}`,
        }
        this.artwork = {
          id: artworkId,
          title: [data.creator, data.material, data.characters]
            .filter(Boolean)
            .join(', '),
          creator: this.creator,
          link: `https://konachan.com/post/show/${artworkId}`,
        }
        break
      }
      case SauceDBIndex.Kemono: {
        const data = entry.data as KemonoResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: data.user_id,
          name: data.user_name,
          link: `https://kemono.party/${data.service}/user/${data.user_id}`,
        }
        this.artwork = {
          id: data.id,
          title: data.title,
          creator: this.creator,
          link: `${this.creator.link}/post/${data.id}`,
        }
        break
      }
      case SauceDBIndex.Fakku: {
        const data = entry.data as FakkuResultRaw
        this.urls = Object.values(data.ext_urls)
        const artworkId = data.source.toLowerCase()
        this.creator = {
          id: data.creator,
          name: data.creator,
          link: `https://www.fakku.net/artists/${data.creator.toLowerCase()}`,
        }
        this.artwork = {
          id: artworkId,
          title: data.source,
          creator: this.creator,
          link: this.urls[0],
        }
        break
      }
      case SauceDBIndex['2D-Market']: {
        const data = entry.data as TwoDMarketResultRaw
        this.urls = Object.values(data.ext_urls)
        this.creator = {
          id: data.creator,
          name: data.creator,
          link: `https://2d-market.com/Search?type=all&search_value=${data.creator}`,
        }
        this.artwork = {
          id: this.urls[0].slice(this.urls[0].lastIndexOf('/') + 1),
          title: data.source,
          creator: this.creator,
          link: this.urls[0],
        }
        break
      }
    }
  }
  public isParsed(): boolean {
    return this.artwork !== undefined
  }
  public isSkeb(): this is Sauce<SkebResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Skeb
  }
  public isDeviantArt(): this is Sauce<DeviantArtResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.DeviantArt
  }
  public isPixiv(): this is Sauce<PixivResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Pixiv
        || this.entry.header.index_id === SauceDBIndex.PixivHistorical
  }
  public isPixivHistorical(): this is Sauce<PixivHistoricalResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.PixivHistorical
  }
  public isAnime(): this is Sauce<AnimeResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Anime
  }
  public isFurAffinity(): this is Sauce<FurAffinityResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.FurAffinity
  }
  public isTwitter(): this is Sauce<TwitterResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Twitter
  }
  public isHMisc(): this is Sauce<HMiscResultRaw> {
    return this.entry.header.index_id === SauceDBIndex['H-Misc1']
        || this.entry.header.index_id === SauceDBIndex['H-Misc2']
  }
  public isBcyNetIllust(): this is Sauce<BcyNetResultRaw> {
    return this.entry.header.index_id === SauceDBIndex['bcy.net Illust']
  }
  public isBcyNetCosplay(): this is Sauce<BcyNetResultRaw> {
    return this.entry.header.index_id === SauceDBIndex['bcy.net Cosplay']
  }
  public isBcyNet(): this is Sauce<BcyNetResultRaw> {
    return this.isBcyNetIllust() || this.isBcyNetCosplay()
  }
  public isFurryNetwork(): this is Sauce<FurryNetworkResultRaw> {
    return this.entry.header.index_id === SauceDBIndex['Furry Network']
  }
  public isPawoo(): this is Sauce<PawooResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Pawoo
  }
  public isNicoSeiga(): this is Sauce<NicoSeigaResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.NicoSeiga
  }
  public isSankaku(): this is Sauce<SankakuResultRaw> {
    return this.entry.header.index_id === SauceDBIndex['Sankaku Channel']
  }
  public isMadokami(): this is Sauce<MadokamiResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Madokami
  }
  public isMangaDex(): this is Sauce<MangaDexResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.MangaDex
  }
  public isDrawr(): this is Sauce<DrawrResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Drawr
  }
  public isArtStation(): this is Sauce<ArtStationResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.ArtStation
  }
  public isE621(): this is Sauce<E621NetResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.e621
  }
  public isGelbooru(): this is Sauce<GelbooruResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Gelbooru
  }
  public isKonachan(): this is Sauce<KonachanResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Konachan
  }
  public isKemono(): this is Sauce<KemonoResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Kemono
  }
  public isFakku(): this is Sauce<FakkuResultRaw> {
    return this.entry.header.index_id === SauceDBIndex.Fakku
  }
  public is2DMarket(): this is Sauce<TwoDMarketResultRaw> {
    return this.entry.header.index_id === SauceDBIndex['2D-Market']
  }
}

export type SauceResultRaw =
/* 5     */| PixivResultRaw
/* 6     */| PixivHistoricalResultRaw
/* 8     */| NicoSeigaResultRaw
/* 9     */| DanbooruResultRaw
/* 10    */| DrawrResultRaw
/* 11    */| NijieResultRaw
/* 16    */| FakkuResultRaw
/* 18,38 */| HMiscResultRaw
/* 21    */| AnimeResultRaw
/* 25    */| GelbooruResultRaw
/* 26    */| KonachanResultRaw
/* 27    */| SankakuResultRaw
/* 29    */| E621NetResultRaw
/* 31,32 */| BcyNetResultRaw
/* 34    */| DeviantArtResultRaw
/* 35    */| PawooResultRaw
/* 36    */| MadokamiResultRaw
/* 37    */| MangaDexResultRaw
/* 39    */| ArtStationResultRaw
/* 40    */| FurAffinityResultRaw
/* 41    */| TwitterResultRaw
/* 42    */| FurryNetworkResultRaw
/* 43    */| KemonoResultRaw
/* 44    */| SkebResultRaw

/** index: 5 */
export interface PixivResultRaw extends BaseResultRaw {
  title: string
  pixiv_id: number
  member_name: string
  member_id: string
}

/** index: 6 */
export interface PixivHistoricalResultRaw extends BaseResultRaw {
  title: string
  pixiv_id: number
  member_name: string
  member_id: number
}

/** index: 8 */
export interface NicoSeigaResultRaw extends BaseResultRaw {
  title: string
  seiga_id: number
  member_name: string
  member_id: number
}

/** index: 9 */
export interface DanbooruResultRaw extends BaseResultRaw {
  danbooru_id: number
  gelbooru_id: number
  creator: string
  material: string
  characters: string
  source: string
}

/** index: 10 */
export interface DrawrResultRaw extends BaseResultRaw {
  title: string
  drawr_id: number
  member_name: string
  member_id: number
}

/** index: 11 */
export interface NijieResultRaw extends BaseResultRaw {
  title: string
  nijie_id: string
  member_name: string
  member_id: string
}

/** index: 16 */
export interface FakkuResultRaw extends BaseResultRaw {
  source: string
  creator: string
}

/** index: 12 */
export interface YandereResultRaw extends BaseResultRaw {
  danbooru_id: number
  yandere_id: number
  gelbooru_id: number
  creator: string
  material: string
  characters: string
  source: string
}

/** index: 18, 38 */
export interface HMiscResultRaw {
  source: string
  creator: Record<number, string>
  eng_name: string
  jp_name: string
}

/** index: 19 */
export interface TwoDMarketResultRaw extends BaseResultRaw {
  source: string
  creator: string
}

/** index: 21 */
export interface AnimeResultRaw extends BaseResultRaw {
  source: string
  anidb_aid: number
  mal_id: number
  anilist_id: number
  part: string
  year: string
  est_time: string
}

/** index: 25 */
export interface GelbooruResultRaw extends BaseResultRaw {
  gelbooru_id: string
  creator: string
  material: string
  characters: string
  source: string
}

/** index: 26 */
export interface KonachanResultRaw extends BaseResultRaw {
  konachan_id: number
  creator: string
  material: string
  characters: string
  source: string
}

/** index: 27 */
export interface SankakuResultRaw extends BaseResultRaw {
  sankaku_id: number
  creator: string
  material: string
  characters: string
  source: string
}

/** index: 29 */
export interface E621NetResultRaw extends BaseResultRaw {
  e621_id: number
  creator: string
  material: string
  characters: string
  source: string
}

/** index: 31, 32 */
export interface BcyNetResultRaw extends BaseResultRaw {
  title: string
  bcy_id: number
  member_name: string
  member_id: number
  member_link_id: number
  bcy_type: 'illust' | 'cosplay'
}

/** index: 34 */
export interface DeviantArtResultRaw extends BaseResultRaw {
  title: string
  da_id: string
  author_name: string
  author_url: string
}

/** index: 35 */
export interface PawooResultRaw extends BaseResultRaw {
  created_at: string
  pawoo_id: number
  pawoo_user_acct: string
  pawoo_user_username: string
  pawoo_user_display_name: string
}

/** index: 36 */
export interface MadokamiResultRaw extends BaseResultRaw {
  mu_id: number
  source: string
  part: string
  type: string
}

/** index: 37 */
export interface MangaDexResultRaw extends BaseResultRaw {
  md_id: string
  mu_id: number
  mal_id: number
  source: string
  part: string
  artist: string
  author: string
}

/** index: 39 */
export interface ArtStationResultRaw extends BaseResultRaw {
  title: string
  as_project: string
  author_name: string
  author_url: string
}

/** index: 40 */
export interface FurAffinityResultRaw extends BaseResultRaw {
  title: string
  fa_id: number
  author_name: string
  author_url: string
}

/** index: 41 */
export interface TwitterResultRaw extends BaseResultRaw {
  created_at: string
  tweet_id: string
  twitter_user_id: string
  twitter_user_handle: string
}

/** index: 42 */
export interface FurryNetworkResultRaw extends BaseResultRaw {
  title: string
  fn_id: number
  fn_type: 'artwork'
  author_name: string
  author_url: string
}

/** index: 43 */
export interface KemonoResultRaw extends BaseResultRaw {
  published: string
  title: string
  service: string
  service_name: string
  id: string
  user_id: string
  user_name: string
}

/** index: 44 */
export interface SkebResultRaw extends BaseResultRaw {
  path: string
  creator: string
  creator_name: string
  author_name: string | null
  author_url: string
}
