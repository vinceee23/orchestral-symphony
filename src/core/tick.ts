import Decimal from 'break_infinity.js'
import type { GameState } from '../store/types'
import { TIER_CONFIGS, AUTOBUYER_DEFAULT_INTERVAL, PRODUCTION_SCALE } from './constants'
import {
  getTierProductionPerTick,
  getTierCost,
  getMilestoneMultiplier,
  getTempoCost,
  getTempoTickInterval,
  getTempoBPM,
  getMaxBuyable,
  getEncoreMultiplier,
  getFinaleMultiplier,
  getTempoProductionMultiplier,
  getMilestoneTickspeedMultiplier,
} from './formulas'
import {
  getAchievementGlobalMultiplier,
  getAchievementTierMultiplier,
  getAchievementCostReduction,
  getAchievementTierCostReduction,
} from './achievements'
import { getChallengeById, getActiveChallengeModifiers } from './challenges'
import type { ChallengeModifiers } from './challenges'
import { getPerfectPitchMultiplier } from './encoreUpgrades'

export function calculateTick(state: GameState, deltaMs: number): Partial<GameState> {
  const achievementSet = new Set(state.achievements)

  // Get active challenge modifiers
  const activeChallenge = state.activeChallenge
    ? getChallengeById(state.activeChallenge.challengeId) ?? null
    : null
  const mods: ChallengeModifiers = getActiveChallengeModifiers(activeChallenge)

  const newTiers = state.tiers.map((t) => ({
    ...t,
    quantity: new Decimal(t.quantity),
    multiplier: new Decimal(t.multiplier),
  }))
  let newSoundwaves = new Decimal(state.soundwaves)
  let newTempo = state.tempo
  let newAutobuyers = { ...state.autobuyers }

  // === Global multiplier stack ===
  const achievementGlobal = getAchievementGlobalMultiplier(achievementSet)

  // Prestige multipliers (disabled during noPrestige challenge)
  let encoreMult = new Decimal(1)
  let finaleMult = new Decimal(1)
  if (!mods.noPrestige) {
    // Multiplier from TOTAL EP earned (lifetime) — spending in the shop doesn't reduce it.
    encoreMult = getEncoreMultiplier(state.lifetimeEncorePoints)
    finaleMult = getFinaleMultiplier(state.finalePoints)
  }

  // Tempo + milestone-tickspeed are now REAL production multipliers (previously dead — they only
  // shrank the tick interval, which cancels out over real time). PRODUCTION_SCALE is the tuning knob.
  let globalMult = achievementGlobal
    .times(encoreMult)
    .times(finaleMult)
    .times(getPerfectPitchMultiplier(state.encoreUpgrades))
    .times(PRODUCTION_SCALE)
    .times(getTempoProductionMultiplier(state.tempo.level))
    .times(getMilestoneTickspeedMultiplier(state.tiers))

  // Apply production divisor from challenge
  if (mods.productionDivisor > 1) {
    globalMult = globalMult.div(mods.productionDivisor)
  }

  // Cost multiplier from challenge + achievement cost reductions
  const achCostReduction = getAchievementCostReduction(achievementSet)
  const effectiveCostMult = mods.costMultiplier * achCostReduction

  // Rising costs: apply time-based inflation
  let risingCostFactor = 1
  if (mods.risingCostRate > 0 && state.activeChallenge) {
    const elapsedSec = (Date.now() - state.activeChallenge.startTime) / 1000
    risingCostFactor = Math.pow(mods.risingCostRate, elapsedSec)
  }
  const totalCostMult = effectiveCostMult * risingCostFactor

  // Process tiers — handle reversed production
  if (mods.reversedProduction) {
    // Reversed: tier 0 (Notes) produces tier 1 (Motifs), tier 1 produces tier 2, etc.
    // Tier 6 (highest) produces Soundwaves
    for (let i = 0; i < newTiers.length; i++) {
      const tier = newTiers[i]
      const config = TIER_CONFIGS[i]
      if (!tier.unlocked || tier.quantity.eq(0)) continue

      // Check tier availability for challenge
      if (mods.singleTierId !== null && tier.id !== mods.singleTierId) continue
      if (i >= mods.maxTiers) continue

      const tierAchMult = getAchievementTierMultiplier(achievementSet, tier.id)
      const tierMult = mods.noMilestones ? new Decimal(1) : tier.multiplier
      const fullMult = globalMult.times(tierAchMult)

      const production = tier.quantity
        .times(config.baseProduction)
        .times(tierMult)
        .times(fullMult)
        .times(deltaMs / 1000)

      if (i === newTiers.length - 1) {
        // Highest tier produces Soundwaves in reversed mode
        newSoundwaves = newSoundwaves.plus(production)
      } else {
        newTiers[i + 1].quantity = newTiers[i + 1].quantity.plus(production)
      }
    }
  } else {
    // Normal: highest to lowest cascade
    for (let i = newTiers.length - 1; i >= 0; i--) {
      const tier = newTiers[i]
      const config = TIER_CONFIGS[i]
      if (!tier.unlocked || tier.quantity.eq(0)) continue

      // Check tier availability for challenge
      if (mods.singleTierId !== null && tier.id !== mods.singleTierId) continue
      if (i >= mods.maxTiers) continue

      const tierAchMult = getAchievementTierMultiplier(achievementSet, tier.id)
      const tierCostRed = getAchievementTierCostReduction(achievementSet, tier.id)
      // Use tierCostRed only for cost context, not production
      void tierCostRed

      // Apply noMilestones: replace milestone multiplier with 1
      const effectiveTier = mods.noMilestones
        ? { ...tier, multiplier: new Decimal(1) }
        : tier
      const fullMult = globalMult.times(tierAchMult)

      const production = getTierProductionPerTick(effectiveTier, config, deltaMs, fullMult)

      if (i === 0) {
        newSoundwaves = newSoundwaves.plus(production)
      } else {
        newTiers[i - 1].quantity = newTiers[i - 1].quantity.plus(production)
      }
    }
  }

  // === SW Decay (challenge modifier) ===
  if (mods.swDecayPercent > 0) {
    const decayFraction = mods.swDecayPercent / 100
    newSoundwaves = newSoundwaves.times(1 - decayFraction)
  }

  // === Autobuyer tick ===
  const now = Date.now()
  for (let i = 0; i < newTiers.length; i++) {
    const key = `tier_${i + 1}`
    const ab = newAutobuyers[key]
    if (!ab || !ab.unlocked || !ab.enabled) continue

    const interval = ab.interval || AUTOBUYER_DEFAULT_INTERVAL
    if (now - ab.lastTick < interval) continue

    const tier = newTiers[i]
    if (!tier.unlocked) continue

    // Challenge: skip tier if not allowed
    if (mods.singleTierId !== null && tier.id !== mods.singleTierId) continue
    if (i >= mods.maxTiers) continue

    const config = TIER_CONFIGS[i]
    const tierCostRed = getAchievementTierCostReduction(achievementSet, tier.id)
    const abCostMult = totalCostMult * tierCostRed

    let buyCount = 0
    if (ab.bulk === 'max') {
      buyCount = getMaxBuyable(config, tier.purchased, newSoundwaves, abCostMult)
    } else {
      buyCount = ab.bulk as number
    }

    // Challenge: maxPerTier limit
    if (mods.maxPerTier !== null) {
      buyCount = Math.min(buyCount, mods.maxPerTier - tier.purchased)
    }

    let bought = 0
    for (let j = 0; j < buyCount; j++) {
      const cost = getTierCost(config, tier.purchased + bought, abCostMult)
      if (newSoundwaves.lt(cost)) break
      newSoundwaves = newSoundwaves.minus(cost)
      bought++
    }

    if (bought > 0) {
      tier.purchased += bought
      tier.quantity = tier.quantity.plus(bought)
      tier.multiplier = mods.noMilestones ? new Decimal(1) : getMilestoneMultiplier(tier.purchased)
    }

    newAutobuyers = {
      ...newAutobuyers,
      [key]: { ...ab, lastTick: now },
    }
  }

  // Tempo autobuyer (skip if noTempo challenge)
  if (!mods.noTempo) {
    const tempoAb = newAutobuyers['tempo']
    if (tempoAb && tempoAb.unlocked && tempoAb.enabled) {
      const interval = tempoAb.interval || AUTOBUYER_DEFAULT_INTERVAL
      if (now - tempoAb.lastTick >= interval) {
        const tempoCost = getTempoCost(newTempo.level)
        if (newSoundwaves.gte(tempoCost)) {
          newSoundwaves = newSoundwaves.minus(tempoCost)
          const newLevel = newTempo.level + 1
          newTempo = {
            level: newLevel,
            tickInterval: getTempoTickInterval(newLevel),
            baseBPM: getTempoBPM(newLevel),
          }
        }
        newAutobuyers = {
          ...newAutobuyers,
          tempo: { ...tempoAb, lastTick: now },
        }
      }
    }
  }

  // Check unlock conditions: tier unlocks when previous tier has ≥1 purchased
  // Tier 6 additionally requires at least 1 Encore
  for (let i = 1; i < newTiers.length; i++) {
    if (!newTiers[i].unlocked) {
      if (newTiers[i - 1].purchased >= 1) {
        // Challenge: only unlock if within allowed tiers
        if (mods.singleTierId === null && i < mods.maxTiers) {
          // Tier 6 (index 5): requires at least 1 Encore
          if (i === 5 && state.encoreCount < 1) continue
          newTiers[i] = { ...newTiers[i], unlocked: true }
        }
      }
    }
  }

  // Track peak soundwaves
  let newPeak = state.peakSoundwaves
  if (newSoundwaves.gt(newPeak)) {
    newPeak = new Decimal(newSoundwaves)
  }

  return {
    soundwaves: newSoundwaves,
    tiers: newTiers,
    tempo: newTempo,
    autobuyers: newAutobuyers,
    peakSoundwaves: newPeak,
    totalTimePlayed: state.totalTimePlayed + deltaMs,
  }
}
