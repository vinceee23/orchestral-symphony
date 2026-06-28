/**
 * L3 challenge beatability instrument — plays each of the 12 CHALLENGES to target under
 * real tick.ts constraints. Gates challenge-reward tuning (no rewards on unbeatable runs).
 *
 * Run: npx vitest run sim/challenge-pacing.test.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Decimal from 'break_infinity.js'
import { calculateTick } from '../src/core/tick'
import {
  TIER_CONFIGS,
  STARTING_SOUNDWAVES,
  getEncoreCost,
  getMagnumOpusCost,
  ENCORE_WALL_COUNT,
  AUTOBUYER_DEFAULT_INTERVAL,
  PLATINUM_THRESHOLD,
  AP_UNLOCK,
  AP_UNLOCK_AUTO_TOUR,
} from '../src/core/constants'
import {
  getTierCost,
  getMilestoneMultiplier,
  getTempoCost,
  getTempoTickInterval,
  getTempoBPM,
  getEncoreGain,
} from '../src/core/formulas'
import {
  ENCORE_UPGRADE_MAP,
  getEncoreUpgradeCost,
  getHeadStartExponent,
  getOvertureGainMultiplier,
  getRehearsalCostReduction,
} from '../src/core/encoreUpgrades'
import { OPUS_UPGRADES, OPUS_UPGRADE_MAP, getOpusUpgradeCost } from '../src/core/opusUpgrades'
import {
  hasPerk,
  WARMUP_TIERS,
  WARMUP_BONUS_SW,
  TEMPO_HEADSTART_LEVEL,
  CRESCENDO_HEADSTART,
  ENCORE_UPGRADE_DISCOUNT,
} from '../src/core/perks'
import { getOpusGain, getRecordsPerSec } from '../src/core/records'
import { getCrescendoMultiplier } from '../src/core/crescendo'
import {
  ACHIEVEMENTS,
  getAchievementStartingSW,
  getAchievementCostReduction,
  getAchievementTierCostReduction,
  getAchievementHeadStartBoost,
} from '../src/core/achievements'
import {
  CHALLENGES,
  getChallengeById,
  getActiveChallengeModifiers,
  isChallengeUnlocked,
  getChallengeStartingSoundwaves,
  getChallengeMultipliers,
  speedScaledCapstone,
  CAPSTONE_TIME_FLOOR_MS,
  CAPSTONE_TIME_CAP_MS,
  CAPSTONE_MULT_FLOOR,
  CAPSTONE_MULT_CAP,
  type ChallengeConfig,
} from '../src/core/challenges'
import { getCoreProductionMultiplier } from '../src/core/formulas'
import { canUnlockWorldTour } from '../src/core/worldTour'
import type { GameState, AutobuyerState } from '../src/store/types'

const DT_FINE_MS = 1000
const DT_COARSE_MS = 30_000
const MAX_CLIMB_MS = 500 * 60 * 60 * 1000
const MAX_CLIMB_STEPS = 500_000

const MAX_CHALLENGE_ACTIVE_MS = 6 * 60 * 60 * 1000 // 6h active sim-time per challenge
const MAX_CHALLENGE_STEPS = 500_000
const TARGET_BAND_MIN = 2 // §2.8 tuning target: first clear should feel meaningful, not instant
const TARGET_BAND_MAX = 8 // §2.8 tuning target: unlock-point clears should not become stalls
const HARD_MIN_MIN = 1 // fail below this: challenge is structurally trivial at unlock
const HARD_MAX_MIN = 10 // fail above this: challenge is too slow/unfair at unlock

// Direct global-production challenge budget. Cost/tempo/crescendo/milestone rewards are separate
// levers whose realized value depends on purchases/conducting; keep the capped direct global x in
// the §2.8 target band (roughly x8-12), above achievements (<=x3) and below Acclaim's x49 cap.
const CHALLENGE_GLOBAL_PROD_BUDGET_CEILING = 12

function createDefaultAutobuyer(): AutobuyerState {
  return {
    unlocked: false,
    enabled: false,
    interval: AUTOBUYER_DEFAULT_INTERVAL,
    bulk: 1,
    lastTick: 0,
  }
}

function createInitialState(simTime: number): GameState {
  return {
    soundwaves: new Decimal(STARTING_SOUNDWAVES),
    tiers: TIER_CONFIGS.map((config) => ({
      id: config.id,
      name: config.name,
      quantity: new Decimal(0),
      purchased: 0,
      multiplier: new Decimal(1),
      unlocked: config.id === 1,
    })),
    tempo: { level: 0, tickInterval: 1000, baseBPM: 60 },
    buyAmount: 1,
    achievements: [],
    completedChallenges: [],
    challengeBestTimes: {},
    keepChallenges: false,
    encoreUpgrades: {},
    autobuyers: {},
    activeChallenge: null,
    preChallengeState: null,
    encorePoints: 0,
    lifetimeEncorePoints: 0,
    encoreCount: 0,
    lifetimeEncoreCount: 0,
    applausePoints: 0,
    layer1WallReached: false,
    opusPoints: 0,
    opusCount: 0,
    opusUpgrades: {},
    crescendo: 0,
    peakCrescendoMult: 1,
    recordsSold: 0,
    platinum: false,
    acclaim: new Decimal(0),
    lifetimeAcclaim: new Decimal(0),
    tourCount: 0,
    currentVenue: 0,
    venueBuffer: new Decimal(0),
    venueSoldOut: false,
    components: {},
    catalogueSnapshot: new Decimal(1),
    worldTourUnlocked: false,
    autoCollect: false,
    keepAutobuyers: true,
    autoMO: true,
    autoMOEnabled: true,
    autoGraduate: false,
    autoTour: false,
    autoTourEnabled: true,
    circuitComplete: false,
    postPlatinumMoCount: 0,
    finalePoints: 0,
    finaleCount: 0,
    peakSoundwaves: new Decimal(0),
    producedThisRun: new Decimal(0),
    tempoPurchasesThisRun: 0,
    silentEncoresCompleted: 0,
    wallReachedWithoutTempo: false,
    wallReachedWithoutTempoAtActiveMs: 0,
    totalTimePlayed: 0,
    activeTimePlayed: 0,
    lastSaveTimestamp: simTime,
    currentRunStartTime: simTime,
    version: '0.6.0',
  }
}

function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    soundwaves: new Decimal(state.soundwaves),
    peakSoundwaves: new Decimal(state.peakSoundwaves),
    producedThisRun: new Decimal(state.producedThisRun),
    acclaim: new Decimal(state.acclaim),
    lifetimeAcclaim: new Decimal(state.lifetimeAcclaim),
    venueBuffer: new Decimal(state.venueBuffer),
    catalogueSnapshot: new Decimal(state.catalogueSnapshot),
    tiers: state.tiers.map((t) => ({
      ...t,
      quantity: new Decimal(t.quantity),
      multiplier: new Decimal(t.multiplier),
    })),
    achievements: [...state.achievements],
    completedChallenges: [...state.completedChallenges],
    challengeBestTimes: { ...state.challengeBestTimes },
    encoreUpgrades: { ...state.encoreUpgrades },
    opusUpgrades: { ...state.opusUpgrades },
    components: { ...state.components },
    autobuyers: JSON.parse(JSON.stringify(state.autobuyers)),
    activeChallenge: state.activeChallenge ? { ...state.activeChallenge } : null,
    preChallengeState: state.preChallengeState
      ? {
          soundwaves: new Decimal(state.preChallengeState.soundwaves),
          tempo: { ...state.preChallengeState.tempo },
          tiers: state.preChallengeState.tiers.map((t) => ({
            ...t,
            quantity: new Decimal(t.quantity),
            multiplier: new Decimal(t.multiplier),
          })),
        }
      : null,
  }
}

function getEffectiveCostMultiplier(state: GameState, tierId: number): number {
  const achSet = new Set(state.achievements)
  const globalCostRed = getAchievementCostReduction(achSet)
  const tierCostRed = getAchievementTierCostReduction(achSet, tierId)
  const rehearsal = 1 - getRehearsalCostReduction(state.encoreUpgrades)

  const challenge = state.activeChallenge
    ? getChallengeById(state.activeChallenge.challengeId) ?? null
    : null
  const mods = getActiveChallengeModifiers(challenge)

  let risingFactor = 1
  if (mods.risingCostRate > 0 && state.activeChallenge) {
    const elapsedSec = (Date.now() - state.activeChallenge.startTime) / 1000
    risingFactor = Math.pow(mods.risingCostRate, elapsedSec)
  }

  return mods.costMultiplier * globalCostRed * tierCostRed * rehearsal * risingFactor
}

function resetTiersAndSW(achievementIds: string[], simTime: number): Partial<GameState> {
  const achSet = new Set(achievementIds)
  const bonusSW = getAchievementStartingSW(achSet)
  const warmup = hasPerk(achSet, 'perk-warmup')
  const tempoLevel = hasPerk(achSet, 'perk-tempo-headstart') ? TEMPO_HEADSTART_LEVEL : 0
  const crescHeadstart = hasPerk(achSet, 'perk-crescendo-headstart')
  return {
    soundwaves: STARTING_SOUNDWAVES.plus(bonusSW).plus(warmup ? WARMUP_BONUS_SW : 0),
    tiers: TIER_CONFIGS.map((config, idx) => {
      const preBought = warmup && idx < WARMUP_TIERS
      return {
        id: config.id,
        name: config.name,
        quantity: new Decimal(preBought ? 10 : 0),
        purchased: preBought ? 10 : 0,
        multiplier: preBought ? getMilestoneMultiplier(10) : new Decimal(1),
        unlocked: config.id === 1 || (warmup && idx <= WARMUP_TIERS),
      }
    }),
    tempo: {
      level: tempoLevel,
      tickInterval: getTempoTickInterval(tempoLevel),
      baseBPM: getTempoBPM(tempoLevel),
    },
    ...(crescHeadstart ? { crescendo: CRESCENDO_HEADSTART } : {}),
    currentRunStartTime: simTime,
    producedThisRun: new Decimal(0),
    tempoPurchasesThisRun: 0,
  }
}

function buyTier(state: GameState, tierId: number, amount = 1): void {
  const tierIndex = tierId - 1
  const tier = state.tiers[tierIndex]
  const config = TIER_CONFIGS[tierIndex]
  if (!tier || !tier.unlocked) return

  const challenge = state.activeChallenge
    ? getChallengeById(state.activeChallenge.challengeId) ?? null
    : null
  const mods = getActiveChallengeModifiers(challenge)
  if (mods.singleTierId !== null && tierId !== mods.singleTierId) return
  if (tierIndex >= mods.maxTiers) return

  const costMult = getEffectiveCostMultiplier(state, tierId)
  let sw = new Decimal(state.soundwaves)
  let bought = 0

  const maxAllowed =
    mods.maxPerTier !== null ? Math.min(amount, mods.maxPerTier - tier.purchased) : amount
  if (maxAllowed <= 0) return

  for (let i = 0; i < maxAllowed; i++) {
    const cost = getTierCost(config, tier.purchased + bought, costMult)
    if (sw.lt(cost)) break
    sw = sw.minus(cost)
    bought++
  }
  if (bought === 0) return

  state.soundwaves = sw
  const newPurchased = tier.purchased + bought
  state.tiers[tierIndex] = {
    ...tier,
    quantity: tier.quantity.plus(bought),
    purchased: newPurchased,
    multiplier: mods.noMilestones ? new Decimal(1) : getMilestoneMultiplier(newPurchased),
  }
}

function buyTempo(state: GameState): void {
  const challenge = state.activeChallenge
    ? getChallengeById(state.activeChallenge.challengeId) ?? null
    : null
  const mods = getActiveChallengeModifiers(challenge)
  if (mods.noTempo) return

  const cost = getTempoCost(state.tempo.level)
  if (state.soundwaves.lt(cost)) return

  const newLevel = state.tempo.level + 1
  state.soundwaves = state.soundwaves.minus(cost)
  state.tempoPurchasesThisRun = (state.tempoPurchasesThisRun ?? 0) + 1
  state.tempo = {
    level: newLevel,
    tickInterval: getTempoTickInterval(newLevel),
    baseBPM: getTempoBPM(newLevel),
  }
}

/** Goal-directed buys tuned per constraint — greedy-cheapest alone stalls reversed/inflation runs. */
function challengeAwareBuy(state: GameState): void {
  const challenge = state.activeChallenge
    ? getChallengeById(state.activeChallenge.challengeId) ?? null
    : null
  const mods = getActiveChallengeModifiers(challenge)

  if (mods.reversedProduction) {
    // Only Notes must be purchased — lower tiers feed quantities upward; Symphonies mint SW.
    if (state.tiers[0].purchased < 1) {
      buyTier(state, 1, 1)
      return
    }
    buyTier(state, 1, 10)
    return
  }

  if (mods.maxPerTier !== null) {
    // Spread purchases across tiers — don't dump the 10-buy cap into Notes alone.
    let bought = false
    for (let i = 0; i < Math.min(mods.maxTiers, state.tiers.length); i++) {
      const tier = state.tiers[i]
      if (!tier.unlocked) continue
      if (tier.purchased >= mods.maxPerTier) continue
      const cost = getTierCost(TIER_CONFIGS[i], tier.purchased, getEffectiveCostMultiplier(state, i + 1))
      if (state.soundwaves.gte(cost)) {
        buyTier(state, i + 1, 1)
        bought = true
      }
    }
    if (bought) return
  }

  greedyBuyCheapest(state)
}

function greedyBuyCheapest(state: GameState): void {
  for (let guard = 0; guard < 5000; guard++) {
    let bestTier = -1
    let bestCost: Decimal | null = null
    for (let i = 0; i < state.tiers.length; i++) {
      if (!state.tiers[i].unlocked) continue
      const c = getTierCost(
        TIER_CONFIGS[i],
        state.tiers[i].purchased,
        getEffectiveCostMultiplier(state, i + 1),
      )
      if (bestCost === null || c.lt(bestCost)) {
        bestTier = i
        bestCost = c
      }
    }
    const tempoC = getTempoCost(state.tempo.level)
    const buyTempoNext = bestCost === null || tempoC.lt(bestCost)
    const cost = buyTempoNext ? tempoC : bestCost!
    if (state.soundwaves.lt(cost)) break
    if (buyTempoNext) buyTempo(state)
    else buyTier(state, bestTier + 1, 1)
  }
}

function buyTowardGateTier(state: GameState, tierIndex: number, amount: number): void {
  for (let i = tierIndex; i >= 0; i--) {
    const tier = state.tiers[i]
    if (!tier?.unlocked) {
      if (i > 0) buyTowardGateTier(state, i - 1, 1)
      return
    }
    if (i === tierIndex) {
      const shortfall = amount - tier.purchased
      if (shortfall > 0) buyTier(state, tierIndex + 1, shortfall)
      return
    }
    if (tier.purchased < 1) {
      buyTier(state, i + 1, 1)
      return
    }
  }
}

function buyPrestigeGateTier(state: GameState): void {
  const gate = state.layer1WallReached
    ? getMagnumOpusCost(state.opusCount)
    : getEncoreCost(state.encoreCount)
  buyTowardGateTier(state, gate.tierIndex, gate.amount)
}

function greedyBuyEncoreUpgrades(state: GameState): void {
  const discount = hasPerk(new Set(state.achievements), 'perk-encore-discount')
    ? ENCORE_UPGRADE_DISCOUNT
    : 0
  for (let guard = 0; guard < 50; guard++) {
    let best: { id: string; cost: number } | null = null
    for (const config of Object.values(ENCORE_UPGRADE_MAP)) {
      const level = state.encoreUpgrades[config.id] ?? 0
      if (level >= config.maxLevel) continue
      const cost = getEncoreUpgradeCost(config, level, discount)
      if (state.encorePoints < cost) continue
      if (!best || cost < best.cost) best = { id: config.id, cost }
    }
    if (!best) break
    const level = state.encoreUpgrades[best.id] ?? 0
    state.encorePoints -= best.cost
    state.encoreUpgrades = { ...state.encoreUpgrades, [best.id]: level + 1 }
  }
}

function buyOpusUpgrade(state: GameState, id: string): void {
  const config = OPUS_UPGRADE_MAP[id] ?? OPUS_UPGRADES.find((u) => u.id === id)
  if (!config) return
  const level = state.opusUpgrades[id] ?? 0
  if (level >= config.maxLevel) return
  const cost = getOpusUpgradeCost(config, level)
  if (state.opusPoints < cost) return

  const unlockMatch = id.match(/^automator-unlock-(\d+)$/)
  if (unlockMatch) {
    const key = `tier_${unlockMatch[1]}`
    state.autobuyers = {
      ...state.autobuyers,
      [key]: {
        unlocked: true,
        enabled: true,
        interval: AUTOBUYER_DEFAULT_INTERVAL,
        bulk: 1,
        lastTick: 0,
      },
    }
  }

  state.opusPoints -= cost
  state.opusUpgrades = { ...state.opusUpgrades, [id]: level + 1 }
}

function greedyBuyOpusUpgrades(state: GameState): void {
  for (let guard = 0; guard < 50; guard++) {
    let best: { id: string; cost: number } | null = null
    for (const config of OPUS_UPGRADES) {
      const level = state.opusUpgrades[config.id] ?? 0
      if (level >= config.maxLevel) continue
      const cost = getOpusUpgradeCost(config, level)
      if (state.opusPoints < cost) continue
      if (!best || cost < best.cost) best = { id: config.id, cost }
    }
    if (!best) break
    buyOpusUpgrade(state, best.id)
  }
}

function enableUnlockedAutobuyers(state: GameState): void {
  for (const [key, ab] of Object.entries(state.autobuyers)) {
    if (ab.unlocked && !ab.enabled) {
      state.autobuyers[key] = { ...ab, enabled: true }
    }
  }
}

function performEncore(state: GameState, simTime: number): boolean {
  if (state.activeChallenge) {
    const ch = getChallengeById(state.activeChallenge.challengeId)
    if (ch && getActiveChallengeModifiers(ch).noPrestige) return false
  }

  const freeEncore = hasPerk(new Set(state.achievements), 'perk-second-wind') && state.encoreCount === 0
  const cost = getEncoreCost(state.encoreCount)
  const purchased = state.tiers[cost.tierIndex]?.purchased ?? 0
  if (!freeEncore && purchased < cost.amount) return false

  const overtureMult = getOvertureGainMultiplier(state.encoreUpgrades)
  const gain = Math.floor(getEncoreGain(state.peakSoundwaves) * overtureMult)

  const reset = resetTiersAndSW(state.achievements, simTime)
  const headExp = getHeadStartExponent(
    state.encoreUpgrades,
    getAchievementHeadStartBoost(new Set(state.achievements)),
  )
  if (headExp > 0 && state.peakSoundwaves.gt(1)) {
    reset.soundwaves = Decimal.max(
      reset.soundwaves ?? STARTING_SOUNDWAVES,
      state.peakSoundwaves.pow(headExp),
    )
  }

  const newEncoreCount = state.encoreCount + 1
  Object.assign(state, reset, {
    peakSoundwaves: new Decimal(0),
    encorePoints: state.encorePoints + gain,
    lifetimeEncorePoints: state.lifetimeEncorePoints + gain,
    encoreCount: newEncoreCount,
    lifetimeEncoreCount: (state.lifetimeEncoreCount ?? 0) + 1,
    layer1WallReached: state.layer1WallReached || newEncoreCount >= ENCORE_WALL_COUNT,
  })
  return true
}

function performMagnumOpus(state: GameState, simTime: number): boolean {
  if (!state.layer1WallReached) return false

  if (state.activeChallenge) {
    const ch = getChallengeById(state.activeChallenge.challengeId)
    if (ch && getActiveChallengeModifiers(ch).noPrestige) return false
  }

  const moCost = getMagnumOpusCost(state.opusCount)
  const moPurchased = state.tiers[moCost.tierIndex]?.purchased ?? 0
  if (moPurchased < moCost.amount) return false

  const gain = getOpusGain({
    platinum: state.platinum,
    opGainFlatLevel: state.opusUpgrades['op-gain-flat'] ?? 0,
    opusCount: state.opusCount,
    peakCrescendoMult: state.peakCrescendoMult,
    levels: state.opusUpgrades,
  })
  const newOpusCount = state.opusCount + 1

  let autobuyers = { ...state.autobuyers }
  if (newOpusCount === 1) {
    autobuyers = {
      ...autobuyers,
      tier_1: {
        unlocked: true,
        enabled: true,
        interval: AUTOBUYER_DEFAULT_INTERVAL,
        bulk: 1,
        lastTick: 0,
      },
    }
  }

  const achSet = new Set(state.achievements)
  const skipWall = hasPerk(achSet, 'perk-skip-wall')
  const keepEncoreUpgrades = hasPerk(achSet, 'perk-keep-encore-upgrades')
  const wasPlatinum = state.platinum || state.recordsSold >= PLATINUM_THRESHOLD
  Object.assign(state, resetTiersAndSW(state.achievements, simTime), {
    peakSoundwaves: new Decimal(0),
    encorePoints: 0,
    lifetimeEncorePoints: 0,
    encoreCount: 0,
    encoreUpgrades: keepEncoreUpgrades ? state.encoreUpgrades : {},
    layer1WallReached: skipWall,
    opusPoints: state.opusPoints + gain,
    opusCount: newOpusCount,
    crescendo: hasPerk(achSet, 'perk-crescendo-headstart') ? CRESCENDO_HEADSTART : 0,
    peakCrescendoMult: 1,
    autobuyers,
    postPlatinumMoCount: wasPlatinum ? state.postPlatinumMoCount + 1 : state.postPlatinumMoCount,
  })
  return true
}

function startChallenge(state: GameState, id: string, simTime: number): boolean {
  if (state.activeChallenge) return false
  if (state.completedChallenges.includes(id)) return false

  const challenge = getChallengeById(id)
  if (!challenge) return false
  if (!isChallengeUnlocked(state, challenge)) return false

  const snapshot = {
    soundwaves: new Decimal(state.soundwaves),
    tiers: state.tiers.map((t) => ({
      ...t,
      quantity: new Decimal(t.quantity),
      multiplier: new Decimal(t.multiplier),
    })),
    tempo: { ...state.tempo },
  }

  const mods = getActiveChallengeModifiers(challenge)
  const challengeTiers = TIER_CONFIGS.map((config, i) => ({
    id: config.id,
    name: config.name,
    quantity: new Decimal(0),
    purchased: 0,
    multiplier: new Decimal(1),
    unlocked:
      mods.singleTierId !== null ? config.id === mods.singleTierId : i === 0,
  }))

  Object.assign(state, {
    activeChallenge: { challengeId: id, startTime: simTime },
    preChallengeState: snapshot,
    soundwaves: getChallengeStartingSoundwaves(challenge, state.achievements),
    tiers: challengeTiers,
    tempo: { level: 0, tickInterval: 1000, baseBPM: 60 },
    currentRunStartTime: simTime,
    producedThisRun: new Decimal(0),
    peakSoundwaves: new Decimal(0),
  })
  return true
}

function applyTick(state: GameState, deltaMs: number, conducting: boolean): void {
  Object.assign(state, calculateTick(state, deltaMs, conducting))
  state.activeTimePlayed += deltaMs
}

function canEncoreNow(state: GameState): boolean {
  const freeEncore = hasPerk(new Set(state.achievements), 'perk-second-wind') && state.encoreCount === 0
  const cost = getEncoreCost(state.encoreCount)
  const purchased = state.tiers[cost.tierIndex]?.purchased ?? 0
  return freeEncore || purchased >= cost.amount
}

function canMoNow(state: GameState): boolean {
  if (!state.layer1WallReached) return false
  const moCost = getMagnumOpusCost(state.opusCount)
  const moPurchased = state.tiers[moCost.tierIndex]?.purchased ?? 0
  return moPurchased >= moCost.amount
}

function chooseDt(state: GameState): number {
  if (state.activeChallenge) return DT_FINE_MS
  if (canEncoreNow(state) || canMoNow(state)) return DT_FINE_MS

  if (state.opusCount > 0) {
    if (!state.layer1WallReached) return DT_FINE_MS
    const moGate = getMagnumOpusCost(state.opusCount)
    const moPurchased = state.tiers[moGate.tierIndex]?.purchased ?? 0
    if (!state.platinum && moPurchased < moGate.amount) return DT_FINE_MS

    const crescMult = getCrescendoMultiplier(state.crescendo, state.opusUpgrades)
    const rate = getRecordsPerSec(state.opusCount, crescMult, state.opusUpgrades)
    if (!state.platinum && rate > 0) {
      const remaining = PLATINUM_THRESHOLD - state.recordsSold
      if (remaining > rate * 120) return DT_COARSE_MS
    }
    if (state.platinum) return 10_000
    return 5000
  }

  return DT_FINE_MS
}

function recordNewAchievements(state: GameState): void {
  const current = new Set(state.achievements)
  for (const ach of ACHIEVEMENTS) {
    if (current.has(ach.id)) continue
    if (ach.check(state)) state.achievements.push(ach.id)
  }
}

/** Era-pacing climb; snapshot each challenge the moment its unlockThreshold is first met. */
function buildThresholdSnapshots(
  setClock: (t: number) => void,
): Map<string, { state: GameState; climbMin: number }> {
  const snapshots = new Map<string, { state: GameState; climbMin: number }>()
  let simMs = 0
  let steps = 0
  const state = createInitialState(simMs)
  setClock(simMs)

  const tryCapture = () => {
    for (const ch of CHALLENGES) {
      if (snapshots.has(ch.id)) continue
      if (!isChallengeUnlocked(state, ch)) continue
      snapshots.set(ch.id, { state: cloneGameState(state), climbMin: simMs / 60000 })
    }
  }

  while (
    simMs < MAX_CLIMB_MS &&
    steps < MAX_CLIMB_STEPS &&
    snapshots.size < CHALLENGES.length
  ) {
    steps++
    tryCapture()

    buyPrestigeGateTier(state)
    greedyBuyCheapest(state)
    greedyBuyEncoreUpgrades(state)
    greedyBuyOpusUpgrades(state)
    enableUnlockedAutobuyers(state)

    // Conducting unlocks only AFTER the first Magnum Opus (real game gates it on opusCount > 0). The old
    // `layer1WallReached || ...` over-credited the wall→MO climb with a Crescendo boost. (2026-06-29 fix.)
    const conducting = state.opusCount > 0
    const dt = chooseDt(state)
    applyTick(state, dt, conducting)
    simMs += dt
    setClock(simMs)
    recordNewAchievements(state)

    if (!state.worldTourUnlocked && canUnlockWorldTour(state)) {
      state.worldTourUnlocked = true
      tryCapture()
    }

    if (state.layer1WallReached && canMoNow(state)) {
      performMagnumOpus(state, simMs)
      setClock(simMs)
      tryCapture()
      continue
    }

    if (performEncore(state, simMs)) {
      setClock(simMs)
      tryCapture()
    }
  }

  tryCapture()
  return snapshots
}

interface ChallengeRunResult {
  id: string
  name: string
  beatable: boolean
  timeMin: number
  climbMin: number
  finalSw: Decimal
  targetSw: Decimal
  targetLog10: number
  finalLog10: number
  threshold: string
}

function runChallenge(
  baseSnapshot: GameState,
  challenge: ChallengeConfig,
  climbMin: number,
  setClock: (t: number) => void,
): ChallengeRunResult {
  const state = cloneGameState(baseSnapshot)
  state.completedChallenges = []
  state.activeChallenge = null
  state.preChallengeState = null

  let simMs = 0
  let activeMs = 0
  let steps = 0
  setClock(simMs)

  if (!startChallenge(state, challenge.id, simMs)) {
    throw new Error(`failed to start challenge ${challenge.id}`)
  }

  const conducting = true

  while (
    activeMs < MAX_CHALLENGE_ACTIVE_MS &&
    steps < MAX_CHALLENGE_STEPS &&
    !state.soundwaves.gte(challenge.targetSoundwaves)
  ) {
    steps++
    challengeAwareBuy(state)
    // Autobuyers can starve the reversed cascade (bulk into Notes); optimal sim is manual buys.
    // Live players may use autobuyers — if that makes reverse harder, that's a balance finding.

    const dt = DT_FINE_MS
    applyTick(state, dt, conducting)
    simMs += dt
    activeMs += dt
    setClock(simMs)
  }

  const beatable = state.soundwaves.gte(challenge.targetSoundwaves)
  const finalLog10 = state.soundwaves.log10()
  const targetLog10 = challenge.targetSoundwaves.log10()

  return {
    id: challenge.id,
    name: challenge.name,
    beatable,
    timeMin: activeMs / 60000,
    climbMin,
    finalSw: new Decimal(state.soundwaves),
    targetSw: challenge.targetSoundwaves,
    targetLog10: isFinite(targetLog10) ? targetLog10 : Infinity,
    finalLog10: isFinite(finalLog10) ? finalLog10 : Infinity,
    threshold: formatThreshold(challenge),
  }
}

function progressionGateScore(t: ChallengeConfig['unlockThreshold']): number {
  let s = 0
  if (t.opusCount !== undefined) s = Math.max(s, 1000 + t.opusCount)
  if (t.encoreCount !== undefined) s = Math.max(s, 2000 + t.encoreCount)
  if (t.peakSoundwaves !== undefined) {
    const p = new Decimal(t.peakSoundwaves).log10()
    s = Math.max(s, 3000 + (isFinite(p) ? p : 0))
  }
  return s
}

function thresholdScore(ch: ChallengeConfig): number {
  return progressionGateScore(ch.unlockThreshold)
}

function formatThreshold(ch: ChallengeConfig): string {
  const parts: string[] = []
  const t = ch.unlockThreshold
  if (t.opusCount !== undefined) parts.push(`opus≥${t.opusCount}`)
  if (t.encoreCount !== undefined) parts.push(`encore≥${t.encoreCount}`)
  if (t.peakSoundwaves !== undefined) parts.push(`peak≥${t.peakSoundwaves}`)
  return parts.length ? parts.join(', ') : '(L3 only)'
}

describe('L3 challenge beatability instrument', () => {
  let dateNowSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    let simClock = 0
    dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => simClock)
    ;(globalThis as { __setSimClock?: (t: number) => void }).__setSimClock = (t: number) => {
      simClock = t
    }
  })

  afterEach(() => {
    dateNowSpy.mockRestore()
    delete (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock
  })

  it('each L3 challenge reaches targetSoundwaves from its unlock-threshold snapshot', () => {
    const setClock = (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock!
    const snapshots = buildThresholdSnapshots(setClock)

    for (const ch of CHALLENGES) {
      expect(
        snapshots.has(ch.id),
        `climb must reach unlock threshold for ${ch.id} (${formatThreshold(ch)})`,
      ).toBe(true)
    }

    console.log('\n=== L3 Challenge Pacing Report (unlock-threshold snapshots) ===')
    console.log('')

    const results: ChallengeRunResult[] = []
    for (const ch of CHALLENGES) {
      const snap = snapshots.get(ch.id)!
      const result = runChallenge(snap.state, ch, snap.climbMin, setClock)
      results.push(result)
    }

    console.log(
      'challenge id          | threshold              | target (log10) | time@unlock (min) | beatable',
    )
    console.log(
      '----------------------|------------------------|----------------|-------------------|----------',
    )
    for (const r of results) {
      const status = r.beatable ? 'yes' : 'NO'
      console.log(
        `${r.id.padEnd(21)} | ${r.threshold.padEnd(22)} | ${r.targetLog10.toFixed(0).padStart(14)} | ` +
          `${r.timeMin.toFixed(2).padStart(17)} | ${status}`,
      )
    }

    const totalMin = results.reduce((s, r) => s + r.timeMin, 0)
    console.log('')
    console.log(`TOTAL time-at-unlock (all 12): ${totalMin.toFixed(2)} min (${(totalMin / 60).toFixed(2)} h)`)

    const belowTarget = results.filter((r) => r.beatable && r.timeMin < TARGET_BAND_MIN)
    const aboveTarget = results.filter((r) => r.beatable && r.timeMin > TARGET_BAND_MAX)
    const trivial = results.filter((r) => r.beatable && r.timeMin < HARD_MIN_MIN)
    const tooLong = results.filter((r) => r.beatable && r.timeMin > HARD_MAX_MIN)
    const failed = results.filter((r) => !r.beatable)
    if (belowTarget.length > 0) {
      console.log(`\nBelow target band (<~${TARGET_BAND_MIN} min at unlock):`)
      for (const r of belowTarget) {
        console.log(`  ${r.id}: ${(r.timeMin * 60).toFixed(1)}s - consider raising targetSoundwaves`)
      }
    }
    if (aboveTarget.length > 0) {
      console.log(`\nAbove target band (>~${TARGET_BAND_MAX} min at unlock):`)
      for (const r of aboveTarget) {
        console.log(`  ${r.id}: ${r.timeMin.toFixed(2)} min`)
      }
    }
    if (trivial.length > 0) {
      console.log(`\nHARD FAIL - trivial (<~${HARD_MIN_MIN} min at unlock):`)
      for (const r of trivial) {
        console.log(`  ${r.id}: ${(r.timeMin * 60).toFixed(1)}s - raise targetSoundwaves`)
      }
    }
    if (tooLong.length > 0) {
      console.log(`\nHARD FAIL - too slow (>~${HARD_MAX_MIN} min at unlock):`)
      for (const r of tooLong) {
        console.log(`  ${r.id}: ${r.timeMin.toFixed(2)} min - lower targetSoundwaves`)
      }
    }
    if (failed.length > 0) {
      console.log('\nUNBEATABLE within cap:')
      for (const r of failed) {
        const gap = r.targetLog10 - r.finalLog10
        console.log(
          `  ${r.id} (${r.name}): reached 10^${r.finalLog10.toFixed(2)}, ` +
            `target 10^${r.targetLog10.toFixed(0)} (short ${gap.toFixed(2)} orders)`,
        )
      }
    }

    console.log('\n--- Unlock threshold ordering ---')
    const ordered = [...CHALLENGES].sort((a, b) => thresholdScore(a) - thresholdScore(b))
    let prevScore = -Infinity
    let monotonicViolations = 0
    for (const ch of ordered) {
      const score = thresholdScore(ch)
      const flag = score < prevScore ? ' ⚠ non-monotonic' : ''
      if (score < prevScore) monotonicViolations++
      console.log(`  ${ch.id.padEnd(21)} score=${score.toFixed(1).padStart(8)}  ${formatThreshold(ch)}${flag}`)
      prevScore = score
    }
    if (monotonicViolations === 0) {
      console.log('  → Threshold scores are monotonic (PASS)')
    } else {
      console.log(`  → ${monotonicViolations} ordering inversion(s) in composite score`)
    }

    for (const r of failed) {
      expect(
        r.beatable,
        `${r.id} (${r.name}): reached 10^${r.finalLog10.toFixed(2)} vs target 10^${r.targetLog10.toFixed(0)} ` +
          `after ${r.timeMin.toFixed(1)} min — constraint too harsh or target too high`,
      ).toBe(true)
    }

    for (const r of trivial) {
      expect(
        r.timeMin,
        `${r.id}: ${(r.timeMin * 60).toFixed(1)}s at unlock is trivial — raise targetSoundwaves`,
      ).toBeGreaterThanOrEqual(HARD_MIN_MIN)
    }

    for (const r of tooLong) {
      expect(
        r.timeMin,
        `${r.id}: ${r.timeMin.toFixed(2)} min at unlock is too slow - lower targetSoundwaves`,
      ).toBeLessThanOrEqual(HARD_MAX_MIN)
    }

    expect(results.length).toBe(12)

    const completedIds = results.map((r) => r.id)
    const measuredBestTimes = Object.fromEntries(results.map((r) => [r.id, r.timeMin * 60_000]))
    const allMeasuredMults = getChallengeMultipliers(completedIds, measuredBestTimes)
    console.log('')
    console.log(
      `Measured all-12 capstone global x: ${allMeasuredMults.globalProdMult.toFixed(2)} ` +
        `(total best-time ${totalMin.toFixed(2)} min)`,
    )

    for (const ch of CHALLENGES) {
      const skippedIds = completedIds.filter((id) => id !== ch.id)
      const skippedTimes = Object.fromEntries(
        Object.entries(measuredBestTimes).filter(([id]) => id !== ch.id),
      )
      const skippedMults = getChallengeMultipliers(skippedIds, skippedTimes)
      expect(
        allMeasuredMults.globalProdMult,
        `all-12 measured stack must beat skipping ${ch.id}; capstone should reward full clears`,
      ).toBeGreaterThan(skippedMults.globalProdMult)
    }
  }, 900_000)

  it('challenge rewards stack and capstone scales with total best-time', () => {
    const completed = ['ch_duet', 'ch_diminuendo', 'ch_inflation', 'ch_adagio', 'ch_flat', 'ch_unplugged']
    const bestTimes: Record<string, number> = {
      ch_unplugged: 30 * 60 * 1000,
    }
    const mults = getChallengeMultipliers(completed, bestTimes)
    expect(mults.globalProdMult).toBeCloseTo(1.15 * 1.5)
    expect(mults.costMult).toBeCloseTo(0.90)
    expect(mults.tempoBonus).toBeCloseTo(0.15)
    expect(mults.milestoneStrength).toBeCloseTo(0.2)

    const core = getCoreProductionMultiplier({
      lifetimeEncorePoints: 100,
      finalePoints: 0,
      encoreUpgrades: {},
      tempoLevel: 5,
      tiers: [{ purchased: 20 }],
      opusUpgrades: {},
      crescendoLevel: 0.5,
      recordsSold: 0,
      platinum: false,
      achievementTempoBonus: mults.tempoBonus,
      challengeGlobalProdMult: mults.globalProdMult,
      crescendoBonus: mults.crescendoBonus,
    })
    const baseline = getCoreProductionMultiplier({
      lifetimeEncorePoints: 100,
      finalePoints: 0,
      encoreUpgrades: {},
      tempoLevel: 5,
      tiers: [{ purchased: 20 }],
      opusUpgrades: {},
      crescendoLevel: 0.5,
      recordsSold: 0,
      platinum: false,
    })
    expect(core.toNumber()).toBeGreaterThan(baseline.toNumber())

    const allIds = CHALLENGES.map((c) => c.id)
    const flatGlobalProd = 1.15 * 1.5 * 1.25 * 1.3
    const cappedSuiteTimes = Object.fromEntries(
      allIds.map((id) => [id, CAPSTONE_TIME_CAP_MS / CHALLENGES.length]),
    )
    const floorSuiteTimes = Object.fromEntries(
      allIds.map((id) => [id, CAPSTONE_TIME_FLOOR_MS / CHALLENGES.length]),
    )
    const cappedSuite = getChallengeMultipliers(allIds, cappedSuiteTimes)
    const floorSuite = getChallengeMultipliers(allIds, floorSuiteTimes)

    expect(floorSuite.globalProdMult).toBeCloseTo(flatGlobalProd * CAPSTONE_MULT_FLOOR)
    expect(cappedSuite.globalProdMult).toBeCloseTo(flatGlobalProd * CAPSTONE_MULT_CAP)
    expect(cappedSuite.globalProdMult).toBeLessThanOrEqual(CHALLENGE_GLOBAL_PROD_BUDGET_CEILING)
    expect(cappedSuite.costMult).toBeCloseTo(0.90 * 0.90 * 0.92)
    expect(cappedSuite.tempoBonus).toBeCloseTo(0.15 + 0.05)
    expect(cappedSuite.crescendoBonus).toBeCloseTo(0.5)
    expect(cappedSuite.milestoneStrength).toBeCloseTo(0.2)

    for (const ch of CHALLENGES) {
      const skippedIds = allIds.filter((id) => id !== ch.id)
      const skipped = getChallengeMultipliers(skippedIds, cappedSuiteTimes)
      expect(
        cappedSuite.globalProdMult,
        `capped all-12 stack must be better than skipping ${ch.id}`,
      ).toBeGreaterThan(skipped.globalProdMult)
    }

    const totalChallengeAp = CHALLENGES.reduce((sum, ch) => sum + ch.reward.ap, 0)
    // 145 AP is meaningful next to the 5-AP auto-encore SKU, but does not by itself buy
    // the L4-only 200-AP auto-tour SKU. Precise AP pacing is TBD after the L2 idle AP model.
    expect(totalChallengeAp).toBe(145)
    expect(totalChallengeAp).toBeGreaterThan(AP_UNLOCK.encore.cost)
    expect(totalChallengeAp).toBeLessThan(AP_UNLOCK_AUTO_TOUR.cost)

    const slowCap = speedScaledCapstone(CAPSTONE_TIME_FLOOR_MS)
    const fastCap = speedScaledCapstone(CAPSTONE_TIME_CAP_MS)
    expect(slowCap).toBe(CAPSTONE_MULT_FLOOR)
    expect(fastCap).toBe(CAPSTONE_MULT_CAP)
    expect(slowCap).toBeLessThan(fastCap)
    expect(speedScaledCapstone((CAPSTONE_TIME_FLOOR_MS + CAPSTONE_TIME_CAP_MS) / 2)).toBeCloseTo(
      (slowCap + fastCap) / 2,
      5,
    )
  })
})
