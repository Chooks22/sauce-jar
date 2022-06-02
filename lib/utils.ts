import type {
  Awaitable,
  EmojiIdentifierResolvable,
  Guild,
  Message,
  MessageActionRowComponentResolvable,
  MessageButtonStyleResolvable,
  PremiumTier,
  TextChannel,
  WebhookMessageOptions,
} from 'discord.js'
import { MessageActionRow, MessageButton } from 'discord.js'

const MB = 1024 * 1024
const UPLOAD_LIMITS: Record<PremiumTier, number> = {
  NONE: 8 * MB,
  TIER_1: 8 * MB,
  TIER_2: 50 * MB,
  TIER_3: 100 * MB,
}

export function getUploadLimit(guild: Guild | null): number {
  return guild
    ? UPLOAD_LIMITS[guild.premiumTier]
    : UPLOAD_LIMITS.NONE
}

export interface WebhookHandler {
  send: (payload: string | WebhookMessageOptions) => Promise<void>
  sendOnce: (payload: string | WebhookMessageOptions) => Promise<void>
  destroy: () => Awaitable<void>
  cleanup: () => Awaitable<void>
}

export async function createWebhook(message: Message): Promise<WebhookHandler> {
  const channel = message.channel as TextChannel
  const author = message.author

  const wh = await channel.createWebhook(author.username, {
    avatar: author.displayAvatarURL(),
  })

  let cleanup: () => Awaitable<void> = async () => {
    await wh.delete()

    // overwrite cleanup so succeeding calls wouldn't error
    cleanup = () => { /*  */ }
  }

  let destroy: () => Awaitable<void> = async () => {
    try {
      await message.delete()
    } finally {
      await cleanup()
    }

    destroy = () => { /*  */ }
  }

  const sendOnce = async (payload: string | WebhookMessageOptions) => {
    await wh.send(payload)
    await destroy()
  }

  const send = async (payload: string | WebhookMessageOptions) => {
    await wh.send(payload)
  }

  return { sendOnce, send, destroy, cleanup }
}

export interface Button {
  customId: string
  emoji?: EmojiIdentifierResolvable
  label?: string
  style?: MessageButtonStyleResolvable
  url?: string
  disabled?: boolean
}

export function button(data: Button): MessageButton {
  const btn = new MessageButton()
    .setCustomId(data.customId)
    .setDisabled(data.disabled ?? false)

  if (data.emoji !== undefined) {
    btn.setEmoji(data.emoji)
  }

  if (data.label !== undefined) {
    btn.setLabel(data.label)
  }

  if (data.style !== undefined) {
    btn.setStyle(data.style)
  }

  if (data.url !== undefined) {
    btn.setURL(data.url)
  }

  return btn
}

export function deleteButton(authorId: string): MessageButton {
  return button({
    customId: `msg-delete|${authorId}`,
    emoji: '🗑️',
    style: 'DANGER',
  })
}

export function row(...components: MessageActionRowComponentResolvable[]): MessageActionRow {
  return new MessageActionRow().addComponents(...components)
}
