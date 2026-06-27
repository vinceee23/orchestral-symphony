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
  TEMPO_BASE_INTERVAL,
  TEMPO_MIN_INTERVAL,
  ENCORE_REWARD_PER,
  ENCORE_EP_THRESHOLD,
  ENCORE_EP_ROOT,
  PRODUCTION_SCALE,
} from './constants'
import { getPerfectPitchMultiplier } from './encoreUpgrades'
import { getTempoOpMultiplier } from './opusUpgrades'
import { getCrescendoMultiplier } from './crescendo'
import { getFameMultiplier } from './records'
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

/** Multiplier from milestone bonuses: every 10 purchased = ×base, UNCAPPED (MILESTONE_PROD_CAP=Infinity —
 *  the "buy-10 chase"). Bounded in practice by exponential tier-cost growth, so it's balanced for L1–L3.
 *  milestoneStrength raises the per-milestone base above MILESTONE_MULTIPLIER (challenge Flat: +0.2 → ×2.2).
 *  ⚠ Any permanent layer that SNAPSHOTS production (e.g. L6 Canon's Palimpsest) must take this term
 *  SUBLINEARLY (log/root) or it becomes an unbounded runaway — see docs/HARDENING-PLAN.md (B2). */
export function getMilestoneMultiplier(purchased: number, milestoneStrength = 0): Decimal {
  const base = MILESTONE_MULTIPLIER + milestoneStrength
  const milestones = Math.min(Math.floor(purchased / MILESTONE_INTERVAL), MILESTONE_PROD_CAP)
  return Decimal.pow(base, milestones)
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

/** Additive tempo speed factor: level tiers + achievement tempo bonuses (each +10% = +0.10). */
export function getTempoSpeedFactor(level: number, achievementTempoBonus = 0): number {
  return 1 + level * TEMPO_SPEED_FACTOR + achievementTempoBonus
}

/** Tempo "interval" (display/achievement-derived only — the loop ticks per frame now).
 *  Continuous by level; floored at TEMPO_MIN_INTERVAL when achievement tempo bonus pushes speed too far. */
export function getTempoTickInterval(level: number, achievementTempoBonus = 0): number {
  const speedFactor = getTempoSpeedFactor(level, achievementTempoBonus)
  return Math.max(TEMPO_MIN_INTERVAL, TEMPO_BASE_INTERVAL / speedFactor)
}

/** Display BPM from tempo level */
export function getTempoBPM(level: number, achievementTempoBonus = 0): number {
  return Math.round(60000 / getTempoTickInterval(level, achievementTempoBonus))
}

/** Tempo as a REAL production multiplier (= intended speed-up ratio). The game loop only
 *  shrank the tick interval, which cancels out — so tempo had no production effect. This is the fix. */
export function getTempoProductionMultiplier(level: number, achievementTempoBonus = 0): number {
  return TEMPO_BASE_INTERVAL / getTempoTickInterval(level, achievementTempoBonus)
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

/**
 * Stage "liveliness" 0..1 — how alive the hall feels. STEPPED + MONOTONIC by prestige layer so
 * each layer locks a permanently higher floor that resets can't take back (Magnum Opus resets
 * Applause, but the MO floor stays). Within a layer it still warms up with current Applause.
 *   pre-Encore 0 (bland) · Encore era 0.30-0.55 · Magnum Opus era 0.60-0.82 · Finale era 0.85-1.0
 */
export function getLiveliness(lifetimeEncorePoints: number, opusCount: number, finalePoints: number): number {
  const warmth = Math.log10(lifetimeEncorePoints + 1) // current-run Applause adds within-layer glow
  if (finalePoints > 0) return Math.min(1, 0.85 + finalePoints * 0.05)
  // Magnum Opus era is keyed on opusCount (lifetime MOs), NOT spendable opusPoints — spending OP must
  // not drop you out of the MO era / relock the stage.
  if (opusCount > 0) return Math.min(0.82, 0.6 + opusCount * 0.04 + Math.min(0.12, warmth * 0.04))
  if (lifetimeEncorePoints > 0) return Math.min(0.55, 0.3 + warmth * 0.08)
  return 0
}

/**
 * THE global production multiplier — the single source of truth shared by the tick and the UI
 * rate displays (so the displayed rate can't drift from real production). Excludes only
 * achievement/tier-achievement mults and challenge-only modifiers (handled by their callers).
 * For noPrestige challenges, the caller passes 0 for the prestige point fields.
 */
export function getCoreProductionMultiplier(p: {
  lifetimeEncorePoints: number
  finalePoints: number
  encoreUpgrades: Record<string, number>
  tempoLevel: number
  tiers: { purchased: number }[]
  opusUpgrades: Record<string, number>
  crescendoLevel: number
  recordsSold: number
  platinum: boolean
  massProduction?: boolean  // perk-bulk-unlock kicker: x2 per tier owned 1000+
  achievementTempoBonus?: number
  /** lifetimeAcclaim production snowball (Layer 3 World Tour). */
  acclaimMult?: number
  /** Challenge reward: stacked global production × (default 1 = no-op). */
  challengeGlobalProdMult?: number
  /** Early active-play bonus channel (default 1 = no-op). */
  warmUpMult?: number
  /** Challenge reward: additive crescendo ceiling boost (default 0 = no-op). */
  crescendoBonus?: number
}): Decimal {
  const crescendoMult = getCrescendoMultiplier(p.crescendoLevel, p.opusUpgrades, p.crescendoBonus ?? 0)
  const fameMult = p.platinum ? getFameMultiplier(p.recordsSold, p.opusUpgrades) : 1
  // Mass Production perk: each tier you own 1,000+ of contributes a x2 (sim-tuned in formulas.test).
  const massMult = p.massProduction
    ? Decimal.pow(2, p.tiers.filter((t) => t.purchased >= 1000).length)
    : new Decimal(1)

  return getEncoreMultiplier(p.lifetimeEncorePoints)
    .times(getFinaleMultiplier(p.finalePoints))
    .times(getTempoOpMultiplier(p.opusUpgrades))
    .times(crescendoMult)
    .times(fameMult)
    .times(getPerfectPitchMultiplier(p.encoreUpgrades))
    .times(PRODUCTION_SCALE)
    .times(getTempoProductionMultiplier(p.tempoLevel, p.achievementTempoBonus ?? 0))
    .times(getMilestoneTickspeedMultiplier(p.tiers))
    .times(massMult)
    .times(p.acclaimMult ?? 1)
    .times(p.challengeGlobalProdMult ?? 1)
    .times(p.warmUpMult ?? 1)
}
