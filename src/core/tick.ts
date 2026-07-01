import Decimal from 'break_infinity.js'
import type { GameState } from '../store/types'
import { TIER_CONFIGS, AUTOBUYER_DEFAULT_INTERVAL, WARMUP_ACTIVITY_WINDOW_MS } from './constants'
import {
  getTierProductionPerTick,
  getTierCost,
  getMilestoneMultiplier,
  getTempoCost,
  getTempoTickInterval,
  getTempoBPM,
  getMaxBuyable,
  composeTierCostMultiplier,
  composeTempoBonus,
} from './formulas'
import { getRehearsalCostReduction } from './encoreUpgrades'
import { advanceCrescendo, getCrescendoMultiplier } from './crescendo'
import { accrueRecords, isPlatinum } from './records'
import { getAutomatorInterval, getAutomatorBulk, clampAutobuyerBulk } from './opusUpgrades'
import { hasPerk, FAST_AUTOMATOR_SPEED_TIERS, PLATINUM_PRESS_MULT } from './perks'
import {
  getAchievementTierMultiplier,
  getAchievementCostReduction,
  getAchievementTierCostReduction,
  getAchievementTempoBonus,
} from './achievements'
import { getChallengeById, getActiveChallengeModifiers, getChallengeMultipliers } from './challenges'
import type { ChallengeModifiers } from './challenges'
import { calculateWorldTourTick } from './worldTour'
import { advanceWarmUp, isWarmUpUnlocked, warmUpMultiplier } from './warmup'
import { assertFiniteDecimal } from './guards'
import { getProductionMultiplier } from './multiplierRegistry'
import { ZERO_SIGNATURE_ALLOCATION, getSignatureEffects, getSignatureEfficiency } from './signature'

export function calculateTick(state: GameState, deltaMs: number, conducting = false, nowMs: number = Date.now()): Partial<GameState> {
  const achievementSet = new Set(state.achievements)

  // Get active challenge modifiers
  const activeChallenge = state.activeChallenge
    ? getChallengeById(state.activeChallenge.challengeId) ?? null
    : null
  const mods: ChallengeModifiers = getActiveChallengeModifiers(activeChallenge)

  // nerfedTickspeed: slow production and crescendo accrual (challenge-only)
  const effectiveDeltaMs =
    mods.tickspeedDivisor > 1 ? deltaMs / mods.tickspeedDivisor : deltaMs
  const currentActivityGraceMs = conducting ? WARMUP_ACTIVITY_WINDOW_MS : (state.activityGraceMs ?? 0)
  const activeNow = conducting || currentActivityGraceMs > 0
  const activityGraceMs = Math.max(0, currentActivityGraceMs - deltaMs)
  // Warm-Up does not apply during a challenge — challenges are a separately-tuned, constrained test (§2.8),
  // and the active-presence bonus would trivialize them. The bar re-fills once the challenge ends.
  const warmUpLevel = isWarmUpUnlocked(state) && !state.activeChallenge
    ? advanceWarmUp(state.warmUpLevel ?? 0, activeNow, deltaMs / 1000)
    : 0

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
  const noP = mods.noPrestige
  const signatureEffects = getSignatureEffects(
    noP ? ZERO_SIGNATURE_ALLOCATION : (state.signatureAllocation ?? ZERO_SIGNATURE_ALLOCATION),
    getSignatureEfficiency(noP ? 0 : (state.signatureCount ?? 0)),
  )
  const achievementTempoBonus = getAchievementTempoBonus(achievementSet)
  const challengeMults = getChallengeMultipliers(
    state.completedChallenges,
    state.challengeBestTimes ?? {},
    state.keepChallenges ?? false,
  )
  const totalTempoBonus = composeTempoBonus({
    achievements: achievementTempoBonus,
    challenges: challengeMults.tempoBonus,
    signature: signatureEffects.tempoBonus,
  })

  // Single source of truth for the production multiplier — shared with the UI rate displays so
  // they can't drift (encore/finale/opus/perfectPitch/tempo/milestone-tickspeed/PRODUCTION_SCALE).
  // noPrestige challenges zero out the prestige-point contributions.
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

  let globalMult = getProductionMultiplier(state, {
    noPrestige: noP,
    crescendoLevel: nextCresc,
    recordsSold,
    platinum,
    warmUpMult: warmUpMultiplier(warmUpLevel),
  })

  // Apply production divisor from challenge
  if (mods.productionDivisor > 1) {
    globalMult = globalMult.div(mods.productionDivisor)
  }

  // M11: dev/test-build overflow guard — a non-finite production multiplier is always a bug
  // (genuine corruption, not a big-but-valid Decimal). Fires in the sims, no-op in prod.
  assertFiniteDecimal(globalMult, 'calculateTick:globalMult')

  // Rising costs: apply time-based inflation
  let risingCostFactor = 1
  if (mods.risingCostRate > 0 && state.activeChallenge) {
    const elapsedSec = (nowMs - state.activeChallenge.startTime) / 1000
    risingCostFactor = Math.pow(mods.risingCostRate, elapsedSec)
  }
  // Tier-independent cost multiplier via the shared composer (per-tier achievement term applied at
  // the buy site). Same source as the manual-buy path — see composeTierCostMultiplier.
  const achCostReduction = getAchievementCostReduction(achievementSet)
  const rehearsalMult = 1 - getRehearsalCostReduction(state.encoreUpgrades)
  const totalCostMult = composeTierCostMultiplier({
    challengeMod: mods.costMultiplier,
    achievementGlobal: achCostReduction,
    achievementTier: 1, // per-tier reduction applied where the tier is known
    rehearsal: rehearsalMult,
    rising: risingCostFactor,
    challengeReward: challengeMults.costMult,
    signature: signatureEffects.costMult,
  })

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
    // Time-based so the difficulty is framerate-independent. It used to apply once PER TICK — i.e.
    // ~60x/s on a 60Hz display vs 30x/s at the 30 cap, so ch_leaky was far harder on fast displays.
    // Treat swDecayPercent as a PER-SECOND rate (matches the challenge-pacing sim's coarse-step
    // calibration, which is the version that's proven beatable). Uses wall-clock deltaMs (decay isn't
    // tickspeed-scaled), mirroring how risingCosts already does Math.pow(rate, elapsedSec).
    const decayPerSec = mods.swDecayPercent / 100
    newSoundwaves = newSoundwaves.times(Math.pow(1 - decayPerSec, deltaMs / 1000))
  }

  // === Autobuyer tick ===
  const now = nowMs
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
    warmUpLevel,
    activityGraceMs,
    totalTimePlayed: state.totalTimePlayed + deltaMs,
    ...worldTourUpdates,
  }
}
