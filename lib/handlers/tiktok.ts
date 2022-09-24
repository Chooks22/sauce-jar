import type { Logger } from 'chooksie'
import type { Message } from 'discord.js'
import type { WebhookHandler } from '../utils'
import { deleteButton, row } from '../utils'

export default async function handleTiktok(message: Message, wh: WebhookHandler, logger: Logger): Promise<void> {
  const re = /https?:\/\/www\.tiktok\.com\/@(\w+)\/video\/(\d+)/gi
  const content = message.content.replace(re, 'https://www.vxtiktok.com/@$1/video/$2')
  const components = [row(deleteButton(message.author.id))]

  logger.info('replaced tiktok links.')

  await wh.send({ content, components })
  await wh.destroy()
}
