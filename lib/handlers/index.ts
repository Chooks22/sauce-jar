import type { Logger } from 'chooksie'
import type { Message } from 'discord.js'
import type { WebhookHandler } from '../utils'
import { tests } from './consts'
import pixiv from './pixiv'
import tiktok from './tiktok'
import twitter from './twitter'

// @todo: handle messages with multiple sites
export type MessageHandler = (webhook: WebhookHandler) => Promise<void>
export function getHandler(message: Message, logger: Logger): MessageHandler | null {
  const content = message.content

  logger.info('testing for twitter content')
  if (tests.twitter.test(content)) {
    logger.info('found twitter content')
    return wh => twitter(message, wh, logger)
  }

  logger.info('testing for pixiv content')
  if (tests.pixiv.test(content)) {
    logger.info('found pixiv content')
    return wh => pixiv(message, wh, logger)
  }

  logger.info('testing for tiktok content')
  if (tests.tiktok.test(content)) {
    logger.info('found tiktok content')
    return wh => tiktok(message, wh, logger)
  }

  logger.info('no content found')
  return null
}
