import type { CommandContext } from 'chooksie'
import { defineEvent } from 'chooksie'
import { randomUUID } from 'crypto'
import type { Awaitable, ButtonInteraction } from 'discord.js'

export default defineEvent({
  name: 'interactionCreate',
  async setup() {
    const store = new Map<string, (ctx: CommandContext<ButtonInteraction>) => Awaitable<void>>()
    const { default: mod } = await import('../buttons/delete')

    store.set(mod.customId, ctx => mod.execute(ctx))

    return store
  },
  async execute(ctx, interaction) {
    if (!interaction.isButton()) {
      return
    }

    const key = interaction.customId
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
      })
    } catch (err) {
      logger.error(err)
    }
  },
})
