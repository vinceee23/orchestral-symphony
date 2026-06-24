export type PerkId =
  | 'perk-skip-wall'
  | 'perk-keep-encore-upgrades'
  | 'perk-warmup'
  | 'perk-fast-automators'

export interface PerkConfig {
  id: PerkId
  achievementId: string
  name: string
  blurb: string
}

export const PERKS: PerkConfig[] = [
  {
    id: 'perk-skip-wall',
    achievementId: 'ach_perk_skip_wall',
    name: 'Skip the Wall',
    blurb: 'Magnum Opus no longer requires re-reaching the 8-Encore wall',
  },
  {
    id: 'perk-keep-encore-upgrades',
    achievementId: 'ach_perk_muscle_memory',
    name: 'Muscle Memory',
    blurb: 'Keep your Encore upgrades through a Magnum Opus',
  },
  {
    id: 'perk-warmup',
    achievementId: 'ach_perk_warmup',
    name: 'Warm-Up',
    blurb: 'Start each run with 2 tiers pre-bought + bonus Soundwaves',
  },
  {
    id: 'perk-fast-automators',
    achievementId: 'ach_perk_session_musicians',
    name: 'Session Musicians',
    blurb: 'Automators run one speed tier faster',
  },
]

export function hasPerk(unlocked: Set<string>, perkId: PerkId): boolean {
  const config = PERKS.find((p) => p.id === perkId)
  if (!config) return false
  return unlocked.has(config.achievementId)
}

export const WARMUP_TIERS = 2
export const WARMUP_BONUS_SW = 500
export const FAST_AUTOMATOR_SPEED_TIERS = 1
