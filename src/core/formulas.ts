import Decimal from 'break_infinity.js'
import {
  type TierConfig,
  MILESTONE_INTERVAL,
  MILESTONE_MULTIPLIER,
  MILESTONE_PROD_CAP,
  MILESTONE_TICKSPEED_BONUS,
  TEMPO_BASE_COST,
  TEMPO_COST_GROWTH,
  TEMPO_SPEED_FACTOR,
  TEMPO_MIN_INTERVAL,
  TEMPO_BASE_INTERVAL,
  ENCORE_REWARD_PER,
  ENCORE_EP_THRESHOLD,
  ENCORE_EP_ROOT,
} from './constants'
import type { TierState } from '../store/types'

/**
 * Cost per unit of a tier. Cost increases every 10 purchases (bracket).
 * cost = baseCost * costGrowth ^ bracket * costMultiplier
 */
export function getTierCost(config: TierConfig, purchased: number, costMultiplier: number = 1): Decimal {
  const bracket = Math.floor(purchased / MILESTONE_INTERVAL)
  return config.baseCost.times(Decimal.pow(config.costGrowth, bracket)).times(costMultiplier)
}

/** Cost to buy a specific number of units, accounting for bracket changes */
export function getTierBatchCost(config: TierConfig, purchased: number, amount: number, costMultiplier: number = 1): Decimal {
  let total = new Decimal(0)
  let current = purchased
  let remaining = amount
  while (remaining > 0) {
    const bracket = Math.floor(current / MILESTONE_INTERVAL)
    const nextBracketAt = (bracket + 1) * MILESTONE_INTERVAL
    const canBuyInBracket = Math.min(remaining, nextBracketAt - current)
    const unitCost = config.baseCost.times(Decimal.pow(config.costGrowth, bracket)).times(costMultiplier)
    total = total.plus(unitCost.times(canBuyInBracket))
    current += canBuyInBracket
    remaining -= canBuyInBracket
  }
  return total
}

/** Multiplier from milestone bonuses (every 10 purchased = x2, capped at 4 milestones = x16) */
export function getMilestoneMultiplier(purchased: number): Decimal {
  const milestones = Math.min(Math.floor(purchased / MILESTONE_INTERVAL), MILESTONE_PROD_CAP)
  return Decimal.pow(MILESTONE_MULTIPLIER, milestones)
}

/** Total milestone rows completed across all tiers */
export function getTotalMilestones(tiers: { purchased: number }[]): number {
  if (!tiers || tiers.length === 0) return 0
  return tiers.reduce((sum, t) => sum + Math.floor((t.purchased || 0) / MILESTONE_INTERVAL), 0)
}

/** Tickspeed multiplier from milestone rows: 1 + totalMilestones * bonus */
export function getMilestoneTickspeedMultiplier(tiers: { purchased: number }[]): number {
  const total = getTotalMilestones(tiers)
  if (!isFinite(total)) return 1
  return 1 + total * MILESTONE_TICKSPEED_BONUS
}

/** Production per second for a single tier */
export function getTierProductionPerSec(
  tier: TierState,
  config: TierConfig,
  globalMultiplier: Decimal,
): Decimal {
  if (tier.quantity.eq(0)) return new Decimal(0)
  return tier.quantity
    .times(config.baseProduction)
    .times(tier.multiplier)
    .times(globalMultiplier)
}

/** Production for a given tick duration */
export function getTierProductionPerTick(
  tier: TierState,
  config: TierConfig,
  tickMs: number,
  globalMultiplier: Decimal,
): Decimal {
  return getTierProductionPerSec(tier, config, globalMultiplier).times(tickMs / 1000)
}

/** Tick interval in ms based on tempo level */
export function getTempoTickInterval(level: number): number {
  return Math.max(
    TEMPO_MIN_INTERVAL,
    Math.floor(TEMPO_BASE_INTERVAL / (1 + level * TEMPO_SPEED_FACTOR)),
  )
}

/** Display BPM from tempo level */
export function getTempoBPM(level: number): number {
  return Math.round(60000 / getTempoTickInterval(level))
}

/** Tempo as a REAL production multiplier (= intended speed-up ratio). The game loop only
 *  shrank the tick interval, which cancels out — so tempo had no production effect. This is the fix. */
export function getTempoProductionMultiplier(level: number): number {
  return TEMPO_BASE_INTERVAL / getTempoTickInterval(level)
}

/** Cost of the next tempo upgrade */
export function getTempoCost(level: number): Decimal {
  return TEMPO_BASE_COST.times(Decimal.pow(TEMPO_COST_GROWTH, level))
}

/** How many units of a tier can be bought with given soundwaves */
export function getMaxBuyable(
  config: TierConfig,
  purchased: number,
  soundwaves: Decimal,
  costMultiplier: number = 1,
): number {
  let count = 0
  let remaining = new Decimal(soundwaves)
  let current = purchased
  while (count < 10000) {
    const unitCost = getTierCost(config, current, costMultiplier)
    if (remaining.lt(unitCost)) break
    remaining = remaining.minus(unitCost)
    count++
    current++
  }
  return count
}

/** How many tempo levels can be bought with given soundwaves */
export function getMaxTempoLevels(currentLevel: number, soundwaves: Decimal): number {
  let count = 0
  let remaining = new Decimal(soundwaves)
  let level = currentLevel
  while (count < 10000) {
    const cost = getTempoCost(level)
    if (remaining.lt(cost)) break
    remaining = remaining.minus(cost)
    count++
    level++
  }
  return count
}

// === Prestige reward formulas ===

/** EP multiplier: additive per point (1 + per*EP). Stable — x2^EP explodes (sim-proven). */
export function getEncoreMultiplier(ep: number): Decimal {
  return new Decimal(1).plus(ENCORE_REWARD_PER * ep)
}

/** EP gained from a run's peak soundwaves: floor((peak/threshold)^root). 0 below threshold. */
export function getEncoreGain(peakSoundwaves: Decimal): number {
  if (peakSoundwaves.lte(ENCORE_EP_THRESHOLD)) return 0
  const n = Math.floor(peakSoundwaves.div(ENCORE_EP_THRESHOLD).pow(ENCORE_EP_ROOT).toNumber())
  return isFinite(n) ? n : Number.MAX_SAFE_INTEGER // guard: extreme peaks can't poison numeric EP
}

/** Opus BPM multiplier: each OP = x2 tick speed (BPM) */
export function getOpusBPMMultiplier(op: number): number {
  return Math.pow(2, op)
}

/** Grand Finale multiplier: each FP = x10 all production */
export function getFinaleMultiplier(fp: number): Decimal {
  return Decimal.pow(10, fp)
}
