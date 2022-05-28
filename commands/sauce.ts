import { defineSlashCommand } from 'chooksie'
import type { Page } from '../lib/pagination'

export default defineSlashCommand({
  name: 'sauce',
  description: 'Get sauce for a link.',
  setup: async () => {
    const { row } = await import('../lib/utils')
    const { fetchSauce, noSauceEmbed } = await import('../lib/sauce')
    const { Pages } = await import('../lib/pagination')

    return { Pages, fetchSauce, noSauceEmbed, row }
  },
  async execute({ interaction, client }) {
    const link = interaction.options.getString('link', true)
    const defer = interaction.deferReply()

    const embeds = await this.fetchSauce(link)
    await defer

    if (embeds.length === 0) {
      await interaction.editReply({
        embeds: [this.noSauceEmbed(client)],
      })
      return
    }

    const pages = embeds.map<Page>(embed => ({ embeds: [embed] }))
    await this.Pages.init(interaction, pages)
  },
  options: [
    {
      name: 'link',
      description: 'The link to the image.',
      type: 'STRING',
      required: true,
    },
  ],
})
