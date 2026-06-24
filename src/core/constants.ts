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
// Tier reveal paced so Symphonies aren't spoiled immediately: 1st Encore reveals Movements,
// Symphonies only enter the gate at the 4th Encore (they unlock once encoreCount >= 3 — see tick.ts).
// Tuned to keep total time-to-Magnum-Opus ~95-99% of the original (sim-validate).
export function getEncoreCost(encoreCount: number): PrestigeCost {
  if (encoreCount === 0) return { tierIndex: 4, amount: 30, tierName: 'Harmonies' }
  if (encoreCount === 1) return { tierIndex: 5, amount: 30, tierName: 'Movements' }
  if (encoreCount === 2) return { tierIndex: 5, amount: 70, tierName: 'Movements' }
  if (encoreCount === 3) return { tierIndex: 6, amount: 50, tierName: 'Symphonies' }
  if (encoreCount === 4) return { tierIndex: 6, amount: 70, tierName: 'Symphonies' }
  if (encoreCount === 5) return { tierIndex: 6, amount: 100, tierName: 'Symphonies' }
  if (encoreCount === 6) return { tierIndex: 6, amount: 128, tierName: 'Symphonies' }
  if (encoreCount === 7) return { tierIndex: 6, amount: 152, tierName: 'Symphonies' }
  return { tierIndex: 6, amount: 152 + (encoreCount - 7) * 24, tierName: 'Symphonies' }
}

// Magnum Opus gate: gentle escalation — 100 Symphonies + floor(opusCount/3)
export function getMagnumOpusCost(opusCount: number): PrestigeCost {
  const amount = 100 + Math.floor(opusCount / 3)
  return { tierIndex: 6, amount, tierName: 'Symphonies' }
}
// Grand Finale: the "infinity" of music — 1.79e308 (JS Number.MAX_VALUE)
export const GRAND_FINALE_SW_THRESHOLD = new Decimal('1.79e308')

// Autobuyer defaults
export const AUTOBUYER_DEFAULT_INTERVAL = 500
export const AUTOBUYER_SPEED_TIERS = [500, 250, 100, 50, 10, 1]
export const AUTOBUYER_BULK_TIERS: (number | 'max')[] = [1, 10, 100, 512, 'max']

// === Layer 2: Magnum Opus ===
export const OPUS_BASE_GAIN = 1                         // flat OP per Magnum Opus pre-Platinum
export const OPUS_PLAT_THRESHOLD = new Decimal('1e30')  // post-Platinum sublinear: (peakSW/this)^root
export const OPUS_PLAT_ROOT = 0.05
export const OPUS_CRESCENDO_BONUS_PER = 0.25            // crescendoBonus = 1 + peakCrescendo*this
export const CRESCENDO_BASE_MAX = 3                     // base ceiling multiplier (x3)
export const CRESCENDO_MAX_CEILING = 6                  // hard cap after upgrades
export const CRESCENDO_BUILD_SEC = 12                   // seconds of holding Conduct to reach ceiling
export const CRESCENDO_DECAY_SEC = 25                   // seconds to decay ceiling -> x1 when released
export const AUTO_CONDUCT_FRACTION = 0.5                // auto-conduct sustains this fraction of ceiling AFK
export const TEMPO_OP_MULT_PER_LEVEL = 1.5              // each Tempo OP-node = x1.5 global tempo/production
export const RECORDS_PROD_K = 5                         // legacy v0 constant (superseded by RECORDS_ALBUM_K)
export const RECORDS_ALBUM_K = 1                        // recordsPerSec = K * opusCount * crescendoMult
export const OPUS_CATALOG_K = 0.5                       // post-Platinum OP gain scales with catalog size
export const PLATINUM_THRESHOLD = 1_000_000             // records sold to Go Platinum
export const FAME_PER = 0.1                             // post-Platinum: prod/OP *= 1 + log10(recordsSold/1e6)*FAME_PER
