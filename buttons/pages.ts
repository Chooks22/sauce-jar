import { defineButtonHandler } from 'chooksie'
import type { InteractionReplyOptions } from 'discord.js'
import { Message } from 'discord.js'

type Action = 'prev' | 'next' | 'save' | 'delete'
export default defineButtonHandler({
  customId: 'paginate',
  setup: async () => (await import('../lib/pagination')).Pages.pageList,
  async execute({ logger, interaction, payload }) {
    const [action, id] = payload!.split(':') as [Action, string]
    const reply = (opts: Partial<InteractionReplyOptions & { fetchReply: true }>) => {
      return interaction.reply({ ...opts, ephemeral: true })
    }

    if (!this.has(id)) {
      if (action === 'delete') {
        logger.info('deleting old pagination')
        if (interaction.message instanceof Message) {
          await interaction.message.delete()
        } else {
          const channel = interaction.channel!
          const message = await channel.messages.fetch(interaction.message.id)
          if (message === null) {
            await reply({ content: 'Message doesn\'t exist!' })
            return
          }
          await message.delete()
        }
        await reply({ content: 'Pages deleted!' })
      } else {
        logger.info('pageList does not contain id')
        await reply({ content: 'Pagination has already expired!' })
        await interaction.update({ components: [] })
      }
      return
    }

    const pages = this.get(id)!
    logger.info(`running paginate action: ${action}`)
    switch (action) {
      case 'save':
        await pages.clear()
        await reply({ content: 'Pages saved!' })
        break
      case 'delete':
        await pages.delete()
        await reply({ content: 'Pages deleted!' })
        break
      default: {
        const didDraw = await pages[action]()
        if (didDraw) {
          await reply({ content: 'Page updated!' })
        } else {
          await reply({ content: 'You\'ve reached the end!' })
        }
      }
    }
  },
})
