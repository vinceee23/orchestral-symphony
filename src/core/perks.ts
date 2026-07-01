export type PerkId =
  | 'perk-skip-wall'
  | 'perk-keep-encore-upgrades'
  | 'perk-warmup'
  | 'perk-fast-automators'
  | 'perk-tempo-headstart'
  | 'perk-crescendo-headstart'
  | 'perk-encore-discount'
  | 'perk-bulk-unlock'
  | 'perk-second-wind'
  | 'perk-platinum-press'

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
    achievementId: 'ach_double_feature',
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
  {
    id: 'perk-tempo-headstart',
    achievementId: 'ach_perk_tempo_headstart',
    name: 'Pick Up the Tempo',
    blurb: 'Start each run at Tempo level 8',
  },
  {
    id: 'perk-crescendo-headstart',
    achievementId: 'ach_perk_sustained_note',
    name: 'Sustained Note',
    blurb: 'Start each run with Crescendo at 40%',
  },
  {
    id: 'perk-encore-discount',
    achievementId: 'ach_perk_patron',
    name: 'Patron of the Arts',
    blurb: 'Encore-shop upgrades cost 25% less Applause',
  },
  {
    id: 'perk-bulk-unlock',
    achievementId: 'ach_perk_mass_production',
    name: 'Mass Production',
    blurb: 'Bulk-buy (10/100/Max) unlocked from the start',
  },
  {
    id: 'perk-second-wind',
    achievementId: 'ach_perk_second_wind',
    name: 'Second Wind',
    blurb: 'One free Encore per Magnum Opus cycle',
  },
  {
    id: 'perk-platinum-press',
    achievementId: 'ach_a_side',
    name: 'Platinum Press',
    blurb: 'Records sell 50% faster',
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
export const TEMPO_HEADSTART_LEVEL = 8
export const CRESCENDO_HEADSTART = 0.4
export const ENCORE_UPGRADE_DISCOUNT = 0.25
export const PLATINUM_PRESS_MULT = 1.5
