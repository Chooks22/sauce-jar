import type { CommandContext } from 'chooksie'
import { defineEvent } from 'chooksie'
import { randomUUID } from 'crypto'
import type { Awaitable, ButtonInteraction } from 'discord.js'

export default defineEvent({
  name: 'interactionCreate',
  async setup() {
    const store = new Map<string, (ctx: CommandContext<ButtonInteraction>, payload: string) => Awaitable<void>>()
    const { default: mod } = await import('../buttons/delete')

    store.set(mod.customId, (ctx, payload) => mod.execute(ctx, payload))

    return store
  },
  async execute(ctx, interaction) {
    if (!interaction.isButton()) {
      return
    }

    const [key, payload] = interaction.customId.split(':')
    if (!this.has(key)) {
      return
    }

    const id = randomUUID()
    const logger = ctx.logger.child({ type: 'btn', reqId: id })
    const execute = this.get(key)!

    try {
      await execute({
        id,
        client: ctx.client,
        interaction,
        logger,
      }, payload)
    } catch (err) {
      logger.error(err)
    }
  },
})
