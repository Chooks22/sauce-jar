import type { Client } from 'discord.js'
import { MessageEmbed } from 'discord.js'
import { getSauce } from './saucenao'

export async function fetchSauce(link: string): Promise<MessageEmbed[]> {
  const sauces = await getSauce(link)
  const unparsed = sauces.filter(sauce => !sauce.isParsed())

  if (unparsed.length > 0) {
    console.log('got unparsed')
    unparsed.forEach(item => {
      const data = JSON.stringify(item, null, 2)
      console.log(data)
    })
  }

  const embeds = sauces
    .filter(sauce => sauce.isParsed() && sauce.similarity > 60)
    .slice(0, 10)
    .sort((a, b) => b.similarity - a.similarity)
    .map(sauce => new MessageEmbed()
      .setAuthor({
        name: sauce.artwork.title ?? 'No title',
      })
      .setThumbnail(sauce.entry.header.thumbnail)
      .setDescription(sauce.urls
        .map(url => `[${new URL(url).host}](${url})`)
        .join('\n'))
      .setFooter({
        text: `Similarity: ${sauce.similarity}`,
      }))

  return embeds
}

export function noSauceEmbed(client: Client<true>): MessageEmbed {
  return new MessageEmbed()
    .setColor('RED')
    .setAuthor({
      iconURL: client.user.displayAvatarURL({ size: 64 })!,
      name: client.user.username,
    })
    .setTitle('No sauce found!')
}
