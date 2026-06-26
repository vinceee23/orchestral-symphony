import { PLATINUM_THRESHOLD } from './constants'

// === Post-Platinum "Break" phase: Fame Tree ===
// Fame is a SECOND post-Platinum currency (distinct from the always-on FAME_PER passive prod mult).
// Earned per post-Platinum Magnum Opus; spent on this tree. Persists across all resets (meta), incl.
// the World Tour reset. Magnitudes are from docs/L1-L3-RELEASE-PLAN.md §3b-numbers (approved drafts);
// cost GROWTH wasn't in the approved table — set to a modest 1.5 default, flagged for resim tuning.
// ponytail: growth 1.5 across the board until resim says otherwise.

export interface FameNodeConfig {
  id: string
  name: string
  description: string
  baseCost: number
  costGrowth: number
  maxLevel: number
}

export const FAME_NODES: FameNodeConfig[] = [
  {
    id: 'limelight',
    name: 'Limelight',
    description: '+15% global production & Opus Point gain per level.',
    baseCost: 3,
    costGrowth: 1.5,
    maxLevel: 8,
  },
  {
    id: 'standing-ovation',
    name: 'Standing Ovation',
    description: '+0.5× to the active crescendo ceiling per level (idle still earns 70%).',
    baseCost: 5,
    costGrowth: 1.5,
    maxLevel: 4,
  },
  {
    id: 'sold-out-shows',
    name: 'Sold-Out Shows',
    description: '+20% records sold per second per level.',
    baseCost: 4,
    costGrowth: 1.5,
    maxLevel: 6,
  },
  {
    id: 'tour-buzz',
    name: 'Tour Buzz',
    description: '−8% World Tour venue component costs per level.',
    baseCost: 6,
    costGrowth: 1.5,
    maxLevel: 5,
  },
  {
    id: 'encore-magnetism',
    name: 'Encore Magnetism',
    description: '−10% auto-encore interval and +10% Applause Point gain per level.',
    baseCost: 4,
    costGrowth: 1.5,
    maxLevel: 6,
  },
  {
    id: 'diamond-status',
    name: 'Diamond Status',
    description: '+25% Fame gained per Magnum Opus per level.',
    baseCost: 8,
    costGrowth: 1.5,
    maxLevel: 5,
  },
]

export const FAME_NODE_MAP: Record<string, FameNodeConfig> = Object.fromEntries(
  FAME_NODES.map((n) => [n.id, n]),
)

/** Fame cost to buy the NEXT level (current level -> level+1). */
export function getFameNodeCost(config: FameNodeConfig, currentLevel: number): number {
  return Math.ceil(config.baseCost * Math.pow(config.costGrowth, currentLevel))
}

const lvl = (levels: Record<string, number>, id: string): number => levels[id] ?? 0

// === effect getters (pure; read by game systems in the wiring pass) ===

/** Diamond Status: scales Fame earned per post-Platinum MO. */
export function getFameGainMult(levels: Record<string, number>): number {
  return 1 + 0.25 * lvl(levels, 'diamond-status')
}

/**
 * Fame earned for one post-Platinum Magnum Opus. 0 before Platinum.
 * Base ≈ floor(1 + log10(records / 1M)); scaled by Diamond Status.
 */
export function getFameGain(recordsSold: number, levels: Record<string, number>): number {
  if (recordsSold < PLATINUM_THRESHOLD) return 0
  const base = Math.floor(1 + Math.log10(recordsSold / PLATINUM_THRESHOLD))
  return Math.floor(base * getFameGainMult(levels))
}

/** Limelight: +15%/lvl to production & OP gain. */
export function getFameProdMult(levels: Record<string, number>): number {
  return 1 + 0.15 * lvl(levels, 'limelight')
}

/** Standing Ovation: +0.5/lvl to the (active) crescendo ceiling multiplier. */
export function getFameCrescendoCeilingBonus(levels: Record<string, number>): number {
  return 0.5 * lvl(levels, 'standing-ovation')
}

/** Sold-Out Shows: +20%/lvl to records sell rate. */
export function getFameRecordsMult(levels: Record<string, number>): number {
  return 1 + 0.2 * lvl(levels, 'sold-out-shows')
}

/** Tour Buzz: −8%/lvl (multiplicative) to World Tour venue component costs (relevant the whole circuit). */
export function getFameVenueCostFactor(levels: Record<string, number>): number {
  return Math.pow(0.92, lvl(levels, 'tour-buzz'))
}

/** Encore Magnetism: −10%/lvl (multiplicative) to auto-encore interval. */
export function getFameAutoEncoreFactor(levels: Record<string, number>): number {
  return Math.pow(0.9, lvl(levels, 'encore-magnetism'))
}

/** Encore Magnetism: +10%/lvl to Applause Point gain. */
export function getFameApMult(levels: Record<string, number>): number {
  return 1 + 0.1 * lvl(levels, 'encore-magnetism')
}
