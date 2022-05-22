import type { CommandContext } from 'chooksie'
import type { ButtonInteraction, TextChannel } from 'discord.js'
import { Message } from 'discord.js'

export default {
  customId: 'msg-delete',
  async execute(ctx: CommandContext<ButtonInteraction>, userId: string | null): Promise<void> {
    const message = ctx.interaction.message

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

    let chan: TextChannel
    if (message instanceof Message) {
      chan = message.channel as TextChannel
    } else {
      chan = await ctx.client.channels.fetch(message.channel_id) as TextChannel
    }

    if (!chan) {
      await defer
      await ctx.interaction.editReply('Channel does not exist!')
      return
    }

    let messages = await chan.messages.fetch({
      after: message.id,
    })

    messages = messages.filter(msg => msg.author.id === message.author.id)
    await chan.bulkDelete([...messages.toJSON(), message.id])

    await defer
    await ctx.interaction.editReply('Message deleted.')
  },
}
