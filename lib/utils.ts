import type { Guild, Message, MessageActionRowComponentResolvable, PremiumTier, TextChannel, WebhookMessageOptions } from 'discord.js'
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

interface WebhookHandler {
  send: (payload: string | WebhookMessageOptions) => Promise<void>
  sendOnce: (payload: string | WebhookMessageOptions) => Promise<void>
  destroy: () => Promise<void>
}

export async function createWebhook(message: Message): Promise<WebhookHandler> {
  const channel = message.channel as TextChannel
  const author = message.author

  const wh = await channel.createWebhook(author.username, {
    avatar: author.displayAvatarURL(),
  })

  const destroy = async () => {
    try {
      await message.delete()
    } finally {
      await wh.delete()
    }
  }

  const sendOnce = async (payload: string | WebhookMessageOptions) => {
    await wh.send(payload)
    await destroy()
  }

  const send = async (payload: string | WebhookMessageOptions) => {
    await wh.send(payload)
  }

  return { sendOnce, send, destroy }
}

export function deleteButton(authorId: string): MessageButton {
  return new MessageButton()
    .setCustomId(`msg-delete|${authorId}`)
    .setEmoji('🗑️')
    .setStyle('DANGER')
}

export function row(...components: MessageActionRowComponentResolvable[]): MessageActionRow {
  return new MessageActionRow().addComponents(...components)
}
