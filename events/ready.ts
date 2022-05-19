import { defineEvent } from 'chooksie'

export default defineEvent({
  name: 'ready',
  once: true,
  execute(ctx, client) {
    ctx.logger.info(`Logged in as ${client.user.username}!`)
    const guilds = client.guilds.cache
    const memberCount = guilds.reduce((total, guild) => total + guild.memberCount, 0)
    ctx.logger.info(`Guilds: ${guilds.size}; Members: ${memberCount}`)
  },
})
