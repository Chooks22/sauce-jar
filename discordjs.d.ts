/* eslint-disable @typescript-eslint/method-signature-style */
export {}
declare module 'discord.js' {
  interface BaseCommandInteraction<Cached extends CacheType = CacheType> extends Interaction<Cached> {
    editReply(options: string | MessagePayload | Partial<WebhookEditMessageOptions>): Promise<GuildCacheMessage<Cached>>
  }
}
