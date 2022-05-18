import { defineSlashCommand } from 'chooksie'
import { MessageEmbed } from 'discord.js'

export default defineSlashCommand({
  name: 'sauce',
  description: 'Get sauce for a link.',
  setup() {
    return import('../lib/saucenao')
  },
  async execute({ logger, interaction }) {
    const link = interaction.options.getString('link', true)
    const defer = interaction.deferReply()

    const sauces = await this.getSauce(link)
    const unparsed = sauces.filter(sauce => !sauce.isParsed())

    if (unparsed.length > 0) {
      logger.info('got unparsed')
      unparsed.forEach(item => {
        const data = JSON.stringify(item, null, 2)
        console.log(data)
      })
    }

    const data = sauces
      .filter(sauce => sauce.isParsed() && sauce.similarity > 80)
      .slice(0, 10)
      .map(sauce => new MessageEmbed()
        .setAuthor({
          name: sauce.artwork.title ?? 'No title',
        })
        .setThumbnail(sauce.entry.header.thumbnail)
        .setDescription(sauce.urls
          .map(url => `[${new URL(url).host}](${url})`)
          .join('\n'))
        .setFooter({
          text: `Similarity: ${sauce.similarity}\nPowered by SauceNAO.com`,
        }))

    await defer
    await interaction.editReply({ embeds: data })
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
