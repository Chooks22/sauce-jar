import { defineSlashCommand } from 'chooksie'
import type { MessageAttachment } from 'discord.js'
import { MessageEmbed } from 'discord.js'

export default defineSlashCommand({
  name: 'pixiv',
  description: 'Test',
  setup: async () => import('../lib/pixiv'),
  async execute(ctx) {
    const id = ctx.interaction.options.getString('id', true)
    const embeds: MessageEmbed[] = []
    const files: MessageAttachment[] = []

    await ctx.interaction.deferReply()
    for await (const file of this.pixiv(id)) {
      const embed = new MessageEmbed()
        .setURL('https://twitter.com')
        .setImage(`attachment://${file.name}`)
      embeds.push(embed)
      files.push(file)
    }

    await ctx.interaction.editReply({
      embeds,
      files,
    })
  },
  options: [
    {
      name: 'id',
      description: 'Pixiv ID',
      type: 'STRING',
      required: true,
    },
  ],
})
