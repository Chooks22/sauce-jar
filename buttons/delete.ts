import type { CommandContext } from 'chooksie'
import type { ButtonInteraction, TextChannel } from 'discord.js'
import { Message } from 'discord.js'

export default {
  customId: 'msg-delete',
  async execute(ctx: CommandContext<ButtonInteraction>, userId?: string): Promise<void> {
    let message = ctx.interaction.message

    if (ctx.interaction.user.id !== userId) {
      await ctx.interaction.reply({
        content: 'You can only delete messages you sent!',
        ephemeral: true,
      })
      return
    }

    const defer = ctx.interaction.deferReply({
      ephemeral: true,
    })

    if (!(message instanceof Message)) {
      const channel = await ctx.client.channels.fetch(message.channel_id) as TextChannel
      if (!channel) {
        await defer
        await ctx.interaction.editReply('Channel does not exist!')
        return
      }

      message = await channel.messages.fetch(message.id)
    }

    await message.delete()
    await defer
    await ctx.interaction.editReply('Message deleted.')
  },
}
