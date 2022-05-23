import type { Guild, PremiumTier } from 'discord.js'
const MB = 1024 * 1024

const UPLOAD_LIMITS: Record<PremiumTier, number> = {
  NONE: 8 * MB,
  TIER_1: 8 * MB,
  TIER_2: 50 * MB,
  TIER_3: 100 * MB,
}

export function getUploadLimit(guild: Guild | null): number {
  return guild
    ? UPLOAD_LIMITS[guild.premiumTier]
    : UPLOAD_LIMITS.NONE
}
