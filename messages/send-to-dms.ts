import { defineMessageCommand } from 'chooksie'
import { MessageEmbed } from 'discord.js'

export default defineMessageCommand({
  name: 'Send to DMs',
  async execute({ client, interaction }) {
    const message = interaction.targetMessage
    const defer = interaction.deferReply({ ephemeral: true })
    try {
      // @todo: save bandwidth
      const attachments = Array.isArray(message.attachments)
        ? message.attachments.map(attachment => attachment.url)
        : message.attachments.toJSON()

      await interaction.user.send({
        content: message.content || undefined,
        embeds: message.embeds,
        files: attachments,
      })

      const embed = new MessageEmbed()
        .setColor('GREEN')
        .setAuthor({
          iconURL: client.user.displayAvatarURL({ size: 64 }),
          name: client.user.username,
        })
        .setTitle('Message saved!')
        .setDescription('Check your DMs.')
        .setTimestamp()

      await defer
      await interaction.editReply({
        embeds: [embed],
      })
    } catch {
      const embed = new MessageEmbed()
        .setColor('RED')
        .setAuthor({
          iconURL: client.user.displayAvatarURL({ size: 64 }),
          name: client.user.username,
        })
        .setTitle('Could not access your DMs!')
        .setDescription('Please make sure your DMs are open.')
        .setTimestamp()

      await defer
      await interaction.editReply({
        embeds: [embed],
      })
    }
  },
})
