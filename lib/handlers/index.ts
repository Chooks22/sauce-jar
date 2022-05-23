import type { Logger } from 'chooksie'
import type { Message } from 'discord.js'
import { tests } from './consts'
import pixiv from './pixiv'

export function getHandler(message: Message): ((logger: Logger) => Promise<void>) | null {
  const content = message.content

  if (tests.pixiv.test(content)) {
    return logger => pixiv(message, logger)
  }

  return null
}
