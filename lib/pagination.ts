import { randomUUID } from 'crypto'
import type { InteractionResponseFields, MessageEditOptions, ReplyOptions, WebhookEditMessageOptions } from 'discord.js'
import { Interaction, Message } from 'discord.js'
import { button, row } from './utils'

export type PageTarget = (Interaction & InteractionResponseFields) | Message
export type Page = Partial<ReplyOptions & WebhookEditMessageOptions>

export interface PageOptions {
  start?: number
}
export class Pages {
  public static pageList = new Map<string, Pages>()
  public static async init(
    target: PageTarget,
    pageList: Page[],
    options?: PageOptions,
  ): Promise<Pages> {
    const id = randomUUID()
    const index = options?.start ?? 0
    const init = pageList[index]

    const buttons = row(
      button({
        customId: `paginate|prev:${id}`,
        emoji: '⬅️',
        style: 'PRIMARY',
      }),
      button({
        customId: `paginate|next:${id}`,
        emoji: '➡️',
        style: 'PRIMARY',
      }),
      button({
        customId: `paginate|save:${id}`,
        emoji: '✅',
        style: 'SUCCESS',
      }),
      button({
        customId: `paginate|delete:${id}`,
        emoji: '🗑️',
        style: 'DANGER',
      }),
    )

    const payload = {
      ...init,
      components: [
        buttons,
        ...init?.components ?? [],
      ],
    }

    let pages: Pages

    if (target instanceof Message) {
      const reply = await target.reply(payload)
      pages = new Pages(id, reply, pageList, options)
    } else {
      pages = new Pages(id, target, pageList, options)
      if (target.replied || target.deferred) {
        await target.editReply(payload)
      } else {
        await target.reply(payload)
      }
    }

    return pages
  }
  public index: number
  public draw!: (page: Page) => Promise<void>
  public delete!: () => Promise<void>
  private constructor(
    private id: string,
    target: PageTarget,
    private pageList: Page[],
    options: PageOptions = {},
  ) {
    this.index = options.start ?? 0
    Pages.pageList.set(id, this)

    if (target instanceof Interaction) {
      this.draw = async function(page) {
        await target.editReply(page)
      }
      this.delete = async function() {
        await target.deleteReply()
      }
    } else {
      this.draw = async function(page) {
        await target.edit(page as MessageEditOptions)
      }
      this.delete = async function() {
        await target.delete()
      }
    }
  }
  public get page(): Page {
    return this.pageList[this.index]
  }
  public get size(): number {
    return this.pageList.length
  }
  public async next(): Promise<boolean> {
    const willDraw = this.index < this.size - 1
    if (willDraw) {
      this.index++
      await this.draw(this.page)
    }
    return willDraw
  }
  public async prev(): Promise<boolean> {
    const willDraw = this.index > 0
    if (willDraw) {
      this.index--
      await this.draw(this.page)
    }
    return willDraw
  }
  public async clear(): Promise<boolean> {
    try {
      await this.draw({ components: [] })
    } catch {
      //
    }
    return Pages.pageList.delete(this.id)
  }
}
