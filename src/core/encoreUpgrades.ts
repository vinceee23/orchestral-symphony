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
    description: 'Unlock a Soundwave head-start each run (grows as you earn achievements).',
    baseCost: 3,
    costGrowth: 2.5,
    maxLevel: 1,
  },
  {
    id: 'overture',
    name: 'Overture',
    description: '+15% Applause earned from each Encore per level.',
    baseCost: 3,
    costGrowth: 4,
    maxLevel: 8,
  },
  {
    id: 'rehearsal',
    name: 'Rehearsal',
    description: '-5% all tier costs per level.',
    baseCost: 3,
    costGrowth: 3,
    maxLevel: 5,
  },
]

// Head-start exponent: new-run start SW = (prior run peak)^exp. Sim-tuned (sim/_headstart): the wall
// gate escalates ABOVE each prior peak, so even a large exponent barely shifts wall-time (<~5%) — 0.5
// skips most of the tedious redundant re-climb (QoL) without trivializing the push to the next gate.
export const SIGHT_READING_BASE = 0.5

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

/** Sight-Reading unlock + achievement boosts: exponent for peak-SW head-start seeding. */
export function getHeadStartExponent(upgrades: Record<string, number>, achievementBoost: number): number {
  return lvl(upgrades, 'sightReading') >= 1 ? SIGHT_READING_BASE + achievementBoost : 0
}

/** Overture: multiplier on EP gained per Encore. +15% per level. */
export function getOvertureGainMultiplier(upgrades: Record<string, number>): number {
  return 1 + 0.15 * lvl(upgrades, 'overture')
}

/** Rehearsal: global tier cost reduction. -5% per level (0..25%). */
export function getRehearsalCostReduction(upgrades: Record<string, number>): number {
  return 0.05 * lvl(upgrades, 'rehearsal')
}
