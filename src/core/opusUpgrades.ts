import {
  AUTOBUYER_BULK_TIERS,
  AUTOBUYER_SPEED_TIERS,
  CRESCENDO_BASE_MAX,
  CRESCENDO_BUILD_SEC,
  CRESCENDO_DECAY_SEC,
  CRESCENDO_MAX_CEILING,
  FAME_PER,
  OPUS_CRESCENDO_BONUS_PER,
  OPUS_PLAT_ROOT,
  RECORDS_ALBUM_K,
  TEMPO_OP_MULT_PER_LEVEL,
} from './constants'

export type OpusUpgradeTrack = 'AUTOMATORS' | 'CRESCENDO' | 'TEMPO' | 'OP_GAIN'

export interface OpusUpgradeConfig {
  id: string
  track: OpusUpgradeTrack
  name: string
  description: string
  baseCost: number
  costGrowth: number
  maxLevel: number
}

export const OPUS_UPGRADES: OpusUpgradeConfig[] = [
  // === AUTOMATORS ===
  {
    id: 'automator-unlock-2',
    track: 'AUTOMATORS',
    name: 'Motif Automator',
    description: 'Unlock the Motifs auto-buyer.',
    baseCost: 1,
    costGrowth: 1,
    maxLevel: 1,
  },
  {
    id: 'automator-unlock-3',
    track: 'AUTOMATORS',
    name: 'Phrase Automator',
    description: 'Unlock the Phrases auto-buyer.',
    baseCost: 2,
    costGrowth: 1,
    maxLevel: 1,
  },
  {
    id: 'automator-unlock-4',
    track: 'AUTOMATORS',
    name: 'Melody Automator',
    description: 'Unlock the Melodies auto-buyer.',
    baseCost: 3,
    costGrowth: 1,
    maxLevel: 1,
  },
  {
    id: 'automator-unlock-5',
    track: 'AUTOMATORS',
    name: 'Harmony Automator',
    description: 'Unlock the Harmonies auto-buyer.',
    baseCost: 4,
    costGrowth: 1,
    maxLevel: 1,
  },
  {
    id: 'automator-unlock-6',
    track: 'AUTOMATORS',
    name: 'Movement Automator',
    description: 'Unlock the Movements auto-buyer.',
    baseCost: 5,
    costGrowth: 1,
    maxLevel: 1,
  },
  {
    id: 'automator-unlock-7',
    track: 'AUTOMATORS',
    name: 'Symphony Automator',
    description: 'Unlock the Symphonies auto-buyer.',
    baseCost: 6,
    costGrowth: 1,
    maxLevel: 1,
  },
  {
    id: 'automator-speed',
    track: 'AUTOMATORS',
    name: 'Swift Fingers',
    description: 'Each level steps auto-buy interval down one speed tier.',
    baseCost: 3,
    costGrowth: 1.8,
    maxLevel: 5,
  },
  {
    id: 'automator-bulk',
    track: 'AUTOMATORS',
    name: 'Bulk Orders',
    description: 'Each level steps auto-buy bulk up one tier.',
    baseCost: 4,
    costGrowth: 1.7,
    maxLevel: AUTOBUYER_BULK_TIERS.length - 1,
  },
  {
    id: 'auto-conduct',
    track: 'AUTOMATORS',
    name: 'Auto-Conduct',
    description: 'AFK sustain: crescendo holds at half ceiling without holding Conduct.',
    baseCost: 25,
    costGrowth: 1,
    maxLevel: 1,
  },
  // === CRESCENDO ===
  {
    id: 'crescendo-ceiling',
    track: 'CRESCENDO',
    name: 'Grand Crescendo',
    description: '+1 to crescendo ceiling multiplier per level.',
    baseCost: 2,
    costGrowth: 1.9,
    maxLevel: CRESCENDO_MAX_CEILING - CRESCENDO_BASE_MAX,
  },
  {
    id: 'crescendo-slow-decay',
    track: 'CRESCENDO',
    name: 'Sustained Phrase',
    description: 'Each level slows crescendo decay (~x1.4 decay time).',
    baseCost: 3,
    costGrowth: 1.8,
    maxLevel: 3,
  },
  {
    id: 'crescendo-fast-build',
    track: 'CRESCENDO',
    name: 'Quick Attack',
    description: 'Each level speeds crescendo build (~x0.8 build time).',
    baseCost: 3,
    costGrowth: 1.8,
    maxLevel: 3,
  },
  {
    id: 'crescendo-op-bonus',
    track: 'CRESCENDO',
    name: 'Rave Reviews',
    description: '+0.25 crescendo OP bonus factor per level.',
    baseCost: 5,
    costGrowth: 2,
    maxLevel: 3,
  },
  // === TEMPO ===
  {
    id: 'tempo-op-mult',
    track: 'TEMPO',
    name: 'Allegro Spirit',
    // baseCost 2->1 (pacing P1): lets opPower buy in at MO#1-2 instead of ~#6, so the pre-Platinum loop
    // accelerates every cycle instead of 5 flat wall re-climbs. Sim: Platinum ~22.4h -> ~17.7h.
    description: 'Each level multiplies global tempo/production (x1.5).',
    baseCost: 1,
    costGrowth: 1.7,
    maxLevel: 8,
  },
  {
    id: 'bpm-cap',
    track: 'TEMPO',
    name: 'Breakneck',
    description: 'Raises the BPM cap (+25% per level).',
    baseCost: 4,
    costGrowth: 1.9,
    maxLevel: 3,
  },
  // === OP_GAIN ===
  {
    id: 'op-gain-flat',
    track: 'OP_GAIN',
    name: 'Opus Mastery',
    description: '+1 flat Opus Point per Magnum Opus (pre-Platinum).',
    // Flatter curve + more levels (sim/l2mastery.mjs): a focused player climbs +1->~+5 OP by Platinum
    // so pre-Platinum MOs stop feeling stale, without pre-empting the Platinum catalog switch.
    baseCost: 2,
    costGrowth: 1.4,
    maxLevel: 8,
  },
  {
    id: 'records-sell-rate',
    track: 'OP_GAIN',
    name: 'Chart Climber',
    description: 'Each level x1.5 to records sold per second.',
    baseCost: 3,
    costGrowth: 1.7,
    maxLevel: 5,
  },
  {
    id: 'plat-root-boost',
    track: 'OP_GAIN',
    name: 'Platinum Roots',
    description: '+0.01 to post-Platinum OP root per level.',
    baseCost: 6,
    costGrowth: 2,
    maxLevel: 3,
  },
  {
    id: 'fame-strength',
    track: 'OP_GAIN',
    name: 'Superstardom',
    description: 'Each level x1.5 to fame production bonus.',
    baseCost: 5,
    costGrowth: 2,
    maxLevel: 3,
  },
]

export const OPUS_UPGRADE_MAP: Record<string, OpusUpgradeConfig> = Object.fromEntries(
  OPUS_UPGRADES.map((u) => [u.id, u]),
)

/** OP cost to buy the NEXT level (current level -> level+1). */
export function getOpusUpgradeCost(config: OpusUpgradeConfig, currentLevel: number): number {
  return Math.ceil(config.baseCost * Math.pow(config.costGrowth, currentLevel))
}

const lvl = (levels: Record<string, number>, id: string): number => levels[id] ?? 0

// === effect getters ===

export function getTempoOpMultiplier(levels: Record<string, number>): number {
  return Math.pow(TEMPO_OP_MULT_PER_LEVEL, lvl(levels, 'tempo-op-mult'))
}

/** BPM cap factor: 1 + 25% per bpm-cap level. */
export function getBpmCapFactor(levels: Record<string, number>): number {
  return 1 + 0.25 * lvl(levels, 'bpm-cap')
}

export function getCrescendoCeiling(levels: Record<string, number>): number {
  return CRESCENDO_BASE_MAX + lvl(levels, 'crescendo-ceiling')
}

export function getCrescendoBuildSec(levels: Record<string, number>): number {
  return CRESCENDO_BUILD_SEC * Math.pow(0.8, lvl(levels, 'crescendo-fast-build'))
}

export function getCrescendoDecaySec(levels: Record<string, number>): number {
  return CRESCENDO_DECAY_SEC * Math.pow(1.4, lvl(levels, 'crescendo-slow-decay'))
}

export function getCrescendoOpBonusPer(levels: Record<string, number>): number {
  return OPUS_CRESCENDO_BONUS_PER + 0.25 * lvl(levels, 'crescendo-op-bonus')
}

export function getOpGainFlat(levels: Record<string, number>): number {
  return lvl(levels, 'op-gain-flat')
}

export function getEffectiveRecordsK(levels: Record<string, number>): number {
  return RECORDS_ALBUM_K * Math.pow(1.5, lvl(levels, 'records-sell-rate'))
}

export function getPlatRoot(levels: Record<string, number>): number {
  return OPUS_PLAT_ROOT + 0.01 * lvl(levels, 'plat-root-boost')
}

export function getFamePer(levels: Record<string, number>): number {
  return FAME_PER * Math.pow(1.5, lvl(levels, 'fame-strength'))
}

export function isAutomatorUnlocked(levels: Record<string, number>, tierId: number): boolean {
  if (tierId <= 1) return true
  return lvl(levels, `automator-unlock-${tierId}`) > 0
}

export function getAutomatorInterval(levels: Record<string, number>, speedBonus = 0): number {
  const step = lvl(levels, 'automator-speed') + speedBonus
  const idx = Math.min(Math.max(0, step), AUTOBUYER_SPEED_TIERS.length - 1)
  return AUTOBUYER_SPEED_TIERS[idx]
}

export function getAutomatorBulk(levels: Record<string, number>): number | 'max' {
  const step = lvl(levels, 'automator-bulk')
  const idx = Math.min(step, AUTOBUYER_BULK_TIERS.length - 1)
  return AUTOBUYER_BULK_TIERS[idx]
}

/** Clamp configured bulk to the OP-unlocked cap using AUTOBUYER_BULK_TIERS ordering. */
export function clampAutobuyerBulk(
  configured: number | 'max',
  cap: number | 'max',
): number | 'max' {
  const capIdx = AUTOBUYER_BULK_TIERS.indexOf(cap)
  const configIdx = AUTOBUYER_BULK_TIERS.indexOf(configured)
  if (configIdx < 0) return cap
  if (capIdx < 0) return configured
  return AUTOBUYER_BULK_TIERS[Math.min(configIdx, capIdx)]
}

export function hasAutoConduct(levels: Record<string, number>): boolean {
  return lvl(levels, 'auto-conduct') > 0
}
