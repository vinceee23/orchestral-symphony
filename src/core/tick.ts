import Decimal from 'break_infinity.js'
import type { GameState } from '../store/types'
import { TIER_CONFIGS, AUTOBUYER_DEFAULT_INTERVAL } from './constants'
import {
  getTierProductionPerTick,
  getTierCost,
  getMilestoneMultiplier,
  getTempoCost,
  getTempoTickInterval,
  getTempoBPM,
  getMaxBuyable,
  getCoreProductionMultiplier,
} from './formulas'
import { advanceCrescendo, getCrescendoMultiplier } from './crescendo'
import { accrueRecords, isPlatinum } from './records'
import { getAutomatorInterval, getAutomatorBulk, clampAutobuyerBulk } from './opusUpgrades'
import { hasPerk, FAST_AUTOMATOR_SPEED_TIERS, PLATINUM_PRESS_MULT } from './perks'
import {
  getAchievementGlobalMultiplier,
  getAchievementTierMultiplier,
  getAchievementCostReduction,
  getAchievementTierCostReduction,
  getAchievementTempoBonus,
} from './achievements'
import { getChallengeById, getActiveChallengeModifiers, getChallengeMultipliers } from './challenges'
import type { ChallengeModifiers } from './challenges'
import { getAcclaimMultiplier, calculateWorldTourTick } from './worldTour'

export function calculateTick(state: GameState, deltaMs: number, conducting = false): Partial<GameState> {
  const achievementSet = new Set(state.achievements)

  // Get active challenge modifiers
  const activeChallenge = state.activeChallenge
    ? getChallengeById(state.activeChallenge.challengeId) ?? null
    : null
  const mods: ChallengeModifiers = getActiveChallengeModifiers(activeChallenge)

  // nerfedTickspeed: slow production and crescendo accrual (challenge-only)
  const effectiveDeltaMs =
    mods.tickspeedDivisor > 1 ? deltaMs / mods.tickspeedDivisor : deltaMs

  const newTiers = state.tiers.map((t) => ({
    ...t,
    quantity: new Decimal(t.quantity),
    multiplier: new Decimal(t.multiplier),
  }))
  let newSoundwaves = new Decimal(state.soundwaves)
  let producedThisRun = state.producedThisRun instanceof Decimal
    ? state.producedThisRun
    : new Decimal(state.producedThisRun ?? 0)
  let newTempo = state.tempo
  let newAutobuyers = { ...state.autobuyers }

  // === Global multiplier stack ===
  const achievementGlobal = getAchievementGlobalMultiplier(achievementSet)
  const achievementTempoBonus = getAchievementTempoBonus(achievementSet)
  const challengeMults = getChallengeMultipliers(
    state.completedChallenges,
    state.challengeBestTimes ?? {},
    state.keepChallenges ?? false,
  )
  const totalTempoBonus = achievementTempoBonus + challengeMults.tempoBonus

  // Single source of truth for the production multiplier — shared with the UI rate displays so
  // they can't drift (encore/finale/opus/perfectPitch/tempo/milestone-tickspeed/PRODUCTION_SCALE).
  // noPrestige challenges zero out the prestige-point contributions.
  const noP = mods.noPrestige

  // === Layer 2: crescendo + records ===
  const nextCresc = advanceCrescendo(state.crescendo, conducting, effectiveDeltaMs / 1000, state.opusUpgrades)
  const crescendoMult = getCrescendoMultiplier(nextCresc, state.opusUpgrades)
  const peakCrescendoMult = Math.max(state.peakCrescendoMult, crescendoMult)
  // perk-platinum-press: records sell PLATINUM_PRESS_MULT× faster (injected via the records-per-sec
  // crescendo factor so only record accrual is boosted, not the production crescendoMult).
  const recordsMult = hasPerk(achievementSet, 'perk-platinum-press') ? PLATINUM_PRESS_MULT : 1
  const recordsSold = accrueRecords(
    state.recordsSold,
    state.opusCount,
    crescendoMult * recordsMult,
    effectiveDeltaMs / 1000,
    state.opusUpgrades,
  )
  const platinum = state.platinum || isPlatinum(recordsSold)

  const acclaimMult = state.worldTourUnlocked && !noP
    ? getAcclaimMultiplier(state.lifetimeAcclaim)
    : 1

  let globalMult = achievementGlobal.times(getCoreProductionMultiplier({
    lifetimeEncorePoints: noP ? 0 : state.lifetimeEncorePoints,
    finalePoints: noP ? 0 : state.finalePoints,
    encoreUpgrades: state.encoreUpgrades,
    tempoLevel: state.tempo.level,
    tiers: state.tiers,
    opusUpgrades: state.opusUpgrades,
    crescendoLevel: nextCresc,
    recordsSold,
    platinum,
    massProduction: hasPerk(achievementSet, 'perk-bulk-unlock'),
    achievementTempoBonus: totalTempoBonus,
    acclaimMult,
    challengeGlobalProdMult: challengeMults.globalProdMult,
    crescendoBonus: challengeMults.crescendoBonus,
  }))

  // Apply production divisor from challenge
  if (mods.productionDivisor > 1) {
    globalMult = globalMult.div(mods.productionDivisor)
  }

  // Cost multiplier from challenge + achievement cost reductions + challenge reward costMult
  const achCostReduction = getAchievementCostReduction(achievementSet)
  const effectiveCostMult = mods.costMultiplier * achCostReduction * challengeMults.costMult

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
        .times(effectiveDeltaMs / 1000)

      if (i === newTiers.length - 1) {
        // Highest tier produces Soundwaves in reversed mode
        newSoundwaves = newSoundwaves.plus(production)
        producedThisRun = producedThisRun.plus(production)
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

      const production = getTierProductionPerTick(effectiveTier, config, effectiveDeltaMs, fullMult)

      if (i === 0) {
        newSoundwaves = newSoundwaves.plus(production)
        producedThisRun = producedThisRun.plus(production)
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
  // perk-fast-automators: one extra speed tier on every automator
  const autoSpeedBonus = hasPerk(achievementSet, 'perk-fast-automators') ? FAST_AUTOMATOR_SPEED_TIERS : 0
  // perk-bulk-unlock: lift the autobuyer bulk cap to max (manual buy is already ungated)
  const bulkPerk = hasPerk(achievementSet, 'perk-bulk-unlock')
  for (let i = 0; i < newTiers.length; i++) {
    const key = `tier_${i + 1}`
    const ab = newAutobuyers[key]
    if (!ab || !ab.unlocked || !ab.enabled) continue

    const interval = (state.opusCount > 0 && ab.unlocked)
      ? getAutomatorInterval(state.opusUpgrades, autoSpeedBonus)
      : (ab.interval || AUTOBUYER_DEFAULT_INTERVAL)
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
    const bulk = (state.opusCount > 0 && ab.unlocked)
      ? clampAutobuyerBulk(ab.bulk, bulkPerk ? 'max' : getAutomatorBulk(state.opusUpgrades))
      : ab.bulk
    // Multi-fire: fire once per elapsed interval, so a coarse tick (sim) or a lagged frame catches up
    // instead of under-buying. At the live small frame-dt this is ×1 (unchanged). 'max' already spends
    // all affordable SW in one pass, so it doesn't multiply.
    const fires = Math.max(1, Math.floor((now - ab.lastTick) / interval))
    if (bulk === 'max') {
      buyCount = getMaxBuyable(config, tier.purchased, newSoundwaves, abCostMult)
    } else {
      buyCount = (bulk as number) * fires
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
      tier.multiplier = mods.noMilestones
        ? new Decimal(1)
        : getMilestoneMultiplier(tier.purchased, challengeMults.milestoneStrength)
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
        // Multi-fire: buy up to one tempo level per elapsed interval (×1 at live small dt; catches up under coarse/lagged dt)
        const fires = Math.max(1, Math.floor((now - tempoAb.lastTick) / interval))
        for (let f = 0; f < fires; f++) {
          const tempoCost = getTempoCost(newTempo.level)
          if (newSoundwaves.lt(tempoCost)) break
          newSoundwaves = newSoundwaves.minus(tempoCost)
          const newLevel = newTempo.level + 1
          newTempo = {
            level: newLevel,
            tickInterval: getTempoTickInterval(newLevel, totalTempoBonus),
            baseBPM: getTempoBPM(newLevel, totalTempoBonus),
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
  // (reversedProduction: quantity>0 — purchases don't feed the cascade)
  // Tier 6 additionally requires at least 1 Encore
  for (let i = 1; i < newTiers.length; i++) {
    if (!newTiers[i].unlocked) {
      const priorTierReady = mods.reversedProduction
        ? newTiers[i - 1].quantity.gt(0)
        : newTiers[i - 1].purchased >= 1
      if (priorTierReady) {
        // Challenge: only unlock if within allowed tiers
        if (mods.singleTierId === null && i < mods.maxTiers) {
          // Reveal pacing: Movements (idx 5) after the 1st Encore; Symphonies (idx 6) held until
          // the 4th Encore (encoreCount >= 3) so they aren't spoiled immediately.
          if (i === 5 && state.encoreCount < 1) continue
          if (i === 6 && state.encoreCount < 3) continue
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

  const worldTourUpdates = calculateWorldTourTick(state, deltaMs, conducting)

  return {
    soundwaves: newSoundwaves,
    producedThisRun,
    tiers: newTiers,
    tempo: newTempo,
    autobuyers: newAutobuyers,
    peakSoundwaves: newPeak,
    crescendo: nextCresc,
    peakCrescendoMult,
    recordsSold,
    platinum,
    totalTimePlayed: state.totalTimePlayed + deltaMs,
    ...worldTourUpdates,
  }
}
