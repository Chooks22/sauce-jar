import { defineEvent } from 'chooksie'

export default defineEvent({
  name: 'messageCreate',
  setup: () => import('../lib/handlers'),
  async execute(ctx, message) {
    if (message.author.bot || message.webhookId) {
      return
    }

    const handler = this.getHandler(message)
    if (handler === null) {
      return
    }

    await handler(ctx.logger)
  },
})
