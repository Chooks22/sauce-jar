import type { Logger } from 'chooksie'
import type { Message } from 'discord.js'
import { tests } from './consts'
import pixiv from './pixiv'
import twitter from './twitter'

// @todo: handle messages with multiple sites
export function getHandler(message: Message): ((logger: Logger) => Promise<void>) | null {
  const content = message.content

  if (tests.twitter.test(content)) {
    return logger => twitter(message, logger)
  }

  if (tests.pixiv.test(content)) {
    return logger => pixiv(message, logger)
  }

  return null
}
