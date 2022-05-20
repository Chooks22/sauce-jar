import { defineMessageCommand } from 'chooksie'
import type { Message } from 'discord.js'
import { MessageEmbed } from 'discord.js'

export default defineMessageCommand({
  name: 'Get Sauce',
  setup: () => import('../lib/sauce'),
  async execute({ interaction, client }) {
    const message = interaction.targetMessage as Message
    const attachments = message.attachments
    const embeds = message.embeds

    const attachment = attachments.first()
    const embed = embeds[0]
    const url = attachment?.url ?? embed?.url ?? embed.thumbnail?.url ?? embed.image?.url

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
    } else {
      await interaction.editReply(`Found ${sauces.length} sauce!`)
      await message.reply({
        content: `Sauce requested by: ${interaction.user}.`,
        embeds: sauces,
        allowedMentions: {
          users: [],
        },
      })
    }
  },
})
