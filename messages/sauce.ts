import { defineMessageCommand } from 'chooksie'
import type { Collection, MessageAttachment } from 'discord.js'
import { MessageEmbed } from 'discord.js'

export default defineMessageCommand({
  name: 'Get Sauce',
  setup: () => import('../lib/sauce'),
  async execute({ interaction, client }) {
    const message = interaction.targetMessage
    const attachments = message.attachments as Collection<string, MessageAttachment>
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

    const defer = interaction.deferReply()
    const sauces = await this.fetchSauce(url)
    await defer

    const res = sauces.length > 0
      ? sauces
      : [this.noSauceEmbed(client)]

    await interaction.editReply({ embeds: res })
  },
})
