import { defineEvent } from 'chooksie'

export default defineEvent({
  name: 'messageCreate',
  setup: async () => {
    const { getHandler } = await import('../lib/handlers')
    const { createWebhook } = await import('../lib/utils')

    return { getHandler, createWebhook }
  },
  async execute(ctx, message) {
    if (message.author.bot || message.webhookId) {
      return
    }

    const handler = this.getHandler(message, ctx.logger)
    if (handler === null) {
      return
    }

    const wh = await this.createWebhook(message)
    try {
      await handler(wh)
    } catch (err) {
      ctx.logger.error(err)
      ctx.logger.info('failed to handle message')
    }

    await wh.destroy()
  },
})
