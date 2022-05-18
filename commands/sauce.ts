import { defineSlashCommand } from 'chooksie'

export default defineSlashCommand({
  name: 'sauce',
  description: 'Get sauce for a link.',
  setup: () => import('../lib/sauce'),
  async execute({ interaction, client }) {
    const link = interaction.options.getString('link', true)
    const defer = interaction.deferReply()

    const embeds = await this.fetchSauce(link)
    await defer

    if (embeds.length > 0) {
      await interaction.editReply({ embeds })
    } else {
      await interaction.editReply({
        embeds: [this.noSauceEmbed(client)],
      })
    }
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
