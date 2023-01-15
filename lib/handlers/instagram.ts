import type { Logger } from 'chooksie'
import type { Message } from 'discord.js'
import type { WebhookHandler } from '../utils'
import { deleteButton, row } from '../utils'

export default async function handleInstagram(message: Message, wh: WebhookHandler, logger: Logger): Promise<void> {
  const re = /https?:\/\/www\.instagram\.com\/p\/(\w{11})\S+/i
  const content = message.content.replace(re, 'https://www.ddinstagram.com/p/$1')
  const components = [row(deleteButton(message.author.id))]

  logger.info('replaced instagram links.')

  await wh.send({ content, components })
  await wh.destroy()
}
