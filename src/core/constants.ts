import Decimal from 'break_infinity.js'

export const TIER_COUNT = 7

export interface TierConfig {
  id: number
  name: string
  icon: string
  produces: string
  baseCost: Decimal
  costGrowth: number
  baseProduction: Decimal
}

// Cost scaling: moderate steepness (1e2 to 1e5 per bracket of 10)
export const TIER_CONFIGS: TierConfig[] = [
  {
    id: 1,
    name: 'Notes',
    icon: '\u{266A}',
    produces: 'Soundwaves',
    baseCost: new Decimal(10),
    costGrowth: 251.19,
    baseProduction: new Decimal(1),
  },
  {
    id: 2,
    name: 'Motifs',
    icon: '\u{266C}',
    produces: 'Notes',
    baseCost: new Decimal(200),
    costGrowth: 939.5,
    baseProduction: new Decimal(1),
  },
  {
    id: 3,
    name: 'Phrases',
    icon: '\u{1D11E}',
    produces: 'Motifs',
    baseCost: new Decimal(5000),
    costGrowth: 3981,
    baseProduction: new Decimal(1),
  },
  {
    id: 4,
    name: 'Melodies',
    icon: '\u{1D122}',
    produces: 'Phrases',
    baseCost: new Decimal(2e5),
    costGrowth: 14894,
    baseProduction: new Decimal(1),
  },
  {
    id: 5,
    name: 'Harmonies',
    icon: '\u{1D121}',
    produces: 'Melodies',
    baseCost: new Decimal(5e7),
    costGrowth: 63096,
    baseProduction: new Decimal(1),
  },
  {
    id: 6,
    name: 'Movements',
    icon: '\u{1D106}',
    produces: 'Harmonies',
    baseCost: new Decimal(1e12),
    costGrowth: 235879,
    baseProduction: new Decimal(1),
  },
  {
    id: 7,
    name: 'Symphonies',
    icon: '\u{1D107}',
    produces: 'Movements',
    baseCost: new Decimal(1e18),
    costGrowth: 1e6,
    baseProduction: new Decimal(1),
  },
]

export type BuyAmount = 1 | 10 | 'max'

export const STARTING_SOUNDWAVES = new Decimal(10)

// Layer 1 balance — sim-validated with UNCAPPED milestones (see sim/ + DESIGN.md). Punchy ~2-3h to the wall.
export const PRODUCTION_SCALE = 1                   // full early production = snappy opening (10 Notes ~30s)
export const ENCORE_EP_THRESHOLD = new Decimal('1e15') // EP = floor((peak/threshold)^root)
export const ENCORE_EP_ROOT = 0.03                  // small exponent keeps EP bounded under uncapped production
export const ENCORE_REWARD_PER = 1                  // additive: each EP = +100% production (stable; x2/pt explodes)
export const ENCORE_WALL_COUNT = 8                  // after this many Encores, the L1 wall hits & Magnum Opus unlocks
export const TEMPO_BASE_COST = new Decimal(1000)
export const TEMPO_COST_GROWTH = 3.5
export const TEMPO_SPEED_FACTOR = 0.10
export const TEMPO_MIN_INTERVAL = 50
export const TEMPO_BASE_INTERVAL = 1000
export const MILESTONE_INTERVAL = 10
export const MILESTONE_MULTIPLIER = 2
export const MILESTONE_PROD_CAP = Infinity   // uncapped: every 10th buy keeps doubling (the buy-10 chase stays alive)
export const MILESTONE_TICKSPEED_BONUS = 0.01 // +1% tickspeed per milestone row completed
export const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000
export const AUTOSAVE_INTERVAL_MS = 30_000
export const DELTA_CAP_MS = 5000

// Escalating Encore cost: each Encore demands more
export interface PrestigeCost { tierIndex: number; amount: number; tierName: string }
export function getEncoreCost(encoreCount: number): PrestigeCost {
  if (encoreCount === 0) return { tierIndex: 4, amount: 30, tierName: 'Harmonies' }
  if (encoreCount === 1) return { tierIndex: 5, amount: 30, tierName: 'Movements' }
  if (encoreCount === 2) return { tierIndex: 6, amount: 30, tierName: 'Symphonies' }
  if (encoreCount === 3) return { tierIndex: 6, amount: 50, tierName: 'Symphonies' }
  if (encoreCount === 4) return { tierIndex: 6, amount: 70, tierName: 'Symphonies' }
  return { tierIndex: 6, amount: 70 + (encoreCount - 4) * 30, tierName: 'Symphonies' }
}

// Escalating Magnum Opus cost: starts at 100 Symphonies, +80 each time
export function getMagnumOpusCost(opusCount: number): PrestigeCost {
  const amount = 100 + opusCount * 80
  return { tierIndex: 6, amount, tierName: 'Symphonies' }
}
// Grand Finale: the "infinity" of music — 1.79e308 (JS Number.MAX_VALUE)
export const GRAND_FINALE_SW_THRESHOLD = new Decimal('1.79e308')

// Autobuyer defaults
export const AUTOBUYER_DEFAULT_INTERVAL = 500
export const AUTOBUYER_SPEED_TIERS = [500, 250, 100, 50, 10, 1]
export const AUTOBUYER_BULK_TIERS: (number | 'max')[] = [1, 10, 100, 512, 'max']
