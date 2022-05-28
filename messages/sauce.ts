import { defineMessageCommand } from 'chooksie'
import type { Message } from 'discord.js'
import { MessageEmbed } from 'discord.js'
import type { Page } from '../lib/pagination'

export default defineMessageCommand({
  name: 'Get Sauce',
  setup: async () => {
    const { fetchSauce, noSauceEmbed } = await import('../lib/sauce')
    const { Pages } = await import('../lib/pagination')

    return { Pages, fetchSauce, noSauceEmbed }
  },
  async execute({ interaction, client }) {
    const message = interaction.targetMessage as Message
    const attachments = message.attachments
    const embeds = message.embeds

    const attachment = attachments.first()
    const input = embeds[0]
    const url = attachment?.url ?? input?.url ?? input.thumbnail?.url ?? input.image?.url

    if (url === undefined) {
      const noAttachmentEmbed = new MessageEmbed()
        .setColor('RED')
        .setAuthor({
          iconURL: client.user.displayAvatarURL({ size: 64 }),
          name: client.user.username,
        })
        .setTitle('No attachments found!')
        .setDescription('Make sure you use this command on a message with an image.')

      await interaction.reply({
        embeds: [noAttachmentEmbed],
        ephemeral: true,
      })

      return
    }

    const defer = interaction.deferReply({ ephemeral: true })
    const sauces = await this.fetchSauce(url)
    await defer

    if (sauces.length === 0) {
      await interaction.editReply({
        embeds: [this.noSauceEmbed(client)],
      })
      return
    }

    const pages: Page[] = sauces.map(sauce => ({
      content: `Sauce requested by: ${interaction.user}`,
      embeds: [sauce],
      allowedMentions: {
        users: [],
      },
    }))

    await interaction.editReply(`Found ${sauces.length} sauce!`)
    await this.Pages.init(message, pages)
  },
})
