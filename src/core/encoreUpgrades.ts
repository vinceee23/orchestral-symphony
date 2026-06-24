import Decimal from 'break_infinity.js'

/**
 * Layer 1 Encore shop — the Applause (EP) sink. Multipliers + QoL only, NO automation
 * (automation is the L3 reveal). Effects are modest so the sim-validated wall still holds:
 * the passive production multiplier comes from lifetimeEncorePoints; these are icing on top.
 */
export interface EncoreUpgradeConfig {
  id: string
  name: string
  description: string
  baseCost: number   // EP for level 1
  costGrowth: number // cost multiplies by this each level
  maxLevel: number
}

export const ENCORE_UPGRADES: EncoreUpgradeConfig[] = [
  {
    id: 'perfectPitch',
    name: 'Perfect Pitch',
    description: '+20% to all production per level.',
    baseCost: 2,
    costGrowth: 3,
    maxLevel: 10,
  },
  {
    id: 'sightReading',
    name: 'Sight-Reading',
    description: 'Begin each Encore with free Notes (a running head start).',
    baseCost: 1,
    costGrowth: 2.5,
    maxLevel: 10,
  },
  {
    id: 'overture',
    name: 'Overture',
    description: '+15% Applause earned from each Encore per level.',
    baseCost: 3,
    costGrowth: 4,
    maxLevel: 8,
  },
]

export const ENCORE_UPGRADE_MAP: Record<string, EncoreUpgradeConfig> = Object.fromEntries(
  ENCORE_UPGRADES.map((u) => [u.id, u]),
)

/** EP cost to buy the NEXT level (current level -> level+1). `discount` (0..1) is the perk-encore-discount. */
export function getEncoreUpgradeCost(config: EncoreUpgradeConfig, currentLevel: number, discount = 0): number {
  return Math.ceil(config.baseCost * Math.pow(config.costGrowth, currentLevel) * (1 - discount))
}

const lvl = (upgrades: Record<string, number>, id: string) => upgrades[id] ?? 0

// === effect getters ===

/** Perfect Pitch: global production multiplier. +20% per level. */
export function getPerfectPitchMultiplier(upgrades: Record<string, number>): Decimal {
  return new Decimal(1).plus(0.2 * lvl(upgrades, 'perfectPitch'))
}

/** Sight-Reading: free Notes (tier 1) to start each run with. 10 per level. */
export function getSightReadingStartNotes(upgrades: Record<string, number>): number {
  return 10 * lvl(upgrades, 'sightReading')
}

/** Overture: multiplier on EP gained per Encore. +15% per level. */
export function getOvertureGainMultiplier(upgrades: Record<string, number>): number {
  return 1 + 0.15 * lvl(upgrades, 'overture')
}
