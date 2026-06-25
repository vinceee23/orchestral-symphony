/**
 * Full-era headless pacing instrument — drives REAL game logic through L1 Encore,
 * L2 Magnum Opus (records / Platinum / Fame / OP tree / automators), and toward
 * the Grand Finale gate. Reports achievement dead-zones and progression stalls.
 *
 * Run: npx vitest run sim/era-pacing.test.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
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
  GRAND_FINALE_SW_THRESHOLD,
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
import { hasPerk, WARMUP_TIERS, WARMUP_BONUS_SW, TEMPO_HEADSTART_LEVEL, CRESCENDO_HEADSTART, ENCORE_UPGRADE_DISCOUNT } from '../src/core/perks'
import { getOpusGain, getRecordsPerSec } from '../src/core/records'
import { getCrescendoMultiplier } from '../src/core/crescendo'
import {
  ACHIEVEMENTS,
  getAchievementStartingSW,
  getAchievementCostReduction,
  getAchievementTierCostReduction,
  getAchievementHeadStartBoost,
  getAchievementGlobalMultiplier,
} from '../src/core/achievements'
import { CHALLENGES, getChallengeById, getActiveChallengeModifiers } from '../src/core/challenges'
import type { GameState, AutobuyerState } from '../src/store/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, 'out')
const CSV_PATH = join(OUT_DIR, 'era-pacing-report.csv')

const DT_FINE_MS = 1000
const DT_COARSE_MS = 30_000
const MAX_SIM_MS = 500 * 60 * 60 * 1000 // 500 sim-hours ceiling
const MAX_STEPS = 250_000
const POST_PLATINUM_MO_TARGET = 5
const HIST_BUCKET_MIN = 30
const GOLD_RECORD_THRESHOLD = 100_000

/** Restraint / "do X without Y" achievements that must not unlock from head-start alone. */
const RESTRAINT_ACHIEVEMENT_IDS = new Set([
  'ach_perk_patron',
  'ach_perk_tempo_headstart',
])
const POST_PRESTIGE_GRACE_MS = 60_000

// --- era labels for reporting ---
type EraLabel = 'intimate' | 'encore' | 'magnum-opus' | 'pre-finale' | 'post-finale'

function getEra(state: GameState): EraLabel {
  if (state.finaleCount > 0) return 'post-finale'
  if (state.platinum && state.opusCount >= 3) return 'pre-finale'
  if (state.opusCount > 0) return 'magnum-opus'
  if (state.encoreCount > 0 || state.layer1WallReached) return 'encore'
  return 'intimate'
}

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
    encoreUpgrades: {},
    autobuyers: {},
    activeChallenge: null,
    preChallengeState: null,
    encorePoints: 0,
    lifetimeEncorePoints: 0,
    encoreCount: 0,
    layer1WallReached: false,
    opusPoints: 0,
    opusCount: 0,
    opusUpgrades: {},
    crescendo: 0,
    peakCrescendoMult: 1,
    recordsSold: 0,
    platinum: false,
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

  const maxAllowed = mods.maxPerTier !== null
    ? Math.min(amount, mods.maxPerTier - tier.purchased)
    : amount
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

function greedyBuyCheapest(state: GameState): void {
  for (let guard = 0; guard < 5000; guard++) {
    let bestTier = -1
    let bestCost: Decimal | null = null
    for (let i = 0; i < state.tiers.length; i++) {
      if (!state.tiers[i].unlocked) continue
      const c = getTierCost(TIER_CONFIGS[i], state.tiers[i].purchased, getEffectiveCostMultiplier(state, i + 1))
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

function greedyBuyEncoreUpgrades(state: GameState): void {
  const discount = hasPerk(new Set(state.achievements), 'perk-encore-discount') ? ENCORE_UPGRADE_DISCOUNT : 0
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
  const headExp = getHeadStartExponent(state.encoreUpgrades, getAchievementHeadStartBoost(new Set(state.achievements)))
  if (headExp > 0 && state.peakSoundwaves.gt(1)) {
    reset.soundwaves = Decimal.max(reset.soundwaves ?? STARTING_SOUNDWAVES, state.peakSoundwaves.pow(headExp))
  }

  const newEncoreCount = state.encoreCount + 1
  const runActiveMs = simTime - state.currentRunStartTime
  const silentRun =
    !freeEncore &&
    (state.tempoPurchasesThisRun ?? 0) <= 8 &&
    runActiveMs >= 3 * 60_000
  const qualifiedPatron = newEncoreCount >= ENCORE_WALL_COUNT && silentRun
  const patronActiveMs = state.wallReachedWithoutTempoAtActiveMs || state.activeTimePlayed
  Object.assign(state, reset, {
    peakSoundwaves: new Decimal(0),
    encorePoints: state.encorePoints + gain,
    lifetimeEncorePoints: state.lifetimeEncorePoints + gain,
    encoreCount: newEncoreCount,
    layer1WallReached: state.layer1WallReached || newEncoreCount >= ENCORE_WALL_COUNT,
    silentEncoresCompleted: state.silentEncoresCompleted + (silentRun ? 1 : 0),
    wallReachedWithoutTempo: state.wallReachedWithoutTempo || qualifiedPatron,
    wallReachedWithoutTempoAtActiveMs: qualifiedPatron ? patronActiveMs : state.wallReachedWithoutTempoAtActiveMs,
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
  })
  return true
}

function performGrandFinale(state: GameState, simTime: number): boolean {
  if (!state.layer1WallReached) return false
  if (state.activeChallenge) {
    const ch = getChallengeById(state.activeChallenge.challengeId)
    if (ch && getActiveChallengeModifiers(ch).noPrestige) return false
  }
  if (state.soundwaves.lt(GRAND_FINALE_SW_THRESHOLD)) return false

  Object.assign(state, resetTiersAndSW(state.achievements, simTime), {
    peakSoundwaves: new Decimal(0),
    encorePoints: 0,
    lifetimeEncorePoints: 0,
    encoreCount: 0,
    encoreUpgrades: {},
    opusPoints: 0,
    opusCount: 0,
    finalePoints: state.finalePoints + 1,
    finaleCount: state.finaleCount + 1,
  })
  return true
}

function startChallenge(state: GameState, id: string, simTime: number): boolean {
  if (state.activeChallenge) return false
  if (state.completedChallenges.includes(id)) return false

  const challenge = getChallengeById(id)
  if (!challenge) return false
  if (state.finaleCount < challenge.unlockAt) return false

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
    unlocked: mods.singleTierId !== null
      ? config.id === mods.singleTierId
      : i === 0,
  }))

  Object.assign(state, {
    activeChallenge: { challengeId: id, startTime: simTime },
    preChallengeState: snapshot,
    soundwaves: new Decimal(STARTING_SOUNDWAVES),
    tiers: challengeTiers,
    tempo: { level: 0, tickInterval: 1000, baseBPM: 60 },
    currentRunStartTime: simTime,
  })
  return true
}

function checkChallengeCompletion(state: GameState): boolean {
  if (!state.activeChallenge) return false

  const challenge = getChallengeById(state.activeChallenge.challengeId)
  if (!challenge) return false
  if (!state.soundwaves.gte(challenge.targetSoundwaves)) return false

  const newCompleted = [...state.completedChallenges, challenge.id]

  let newAutobuyers = { ...state.autobuyers }
  if (!newAutobuyers[challenge.unlocksAutobuyer]) {
    newAutobuyers[challenge.unlocksAutobuyer] = createDefaultAutobuyer()
  }
  newAutobuyers = {
    ...newAutobuyers,
    [challenge.unlocksAutobuyer]: {
      ...newAutobuyers[challenge.unlocksAutobuyer],
      unlocked: true,
    },
  }

  const pre = state.preChallengeState
  if (pre) {
    Object.assign(state, {
      soundwaves: pre.soundwaves,
      tiers: pre.tiers,
      tempo: pre.tempo,
      completedChallenges: newCompleted,
      autobuyers: newAutobuyers,
      activeChallenge: null,
      preChallengeState: null,
    })
  } else {
    Object.assign(state, {
      completedChallenges: newCompleted,
      autobuyers: newAutobuyers,
      activeChallenge: null,
      preChallengeState: null,
    })
  }
  return true
}

function tryStartNextChallenge(state: GameState, simTime: number): void {
  if (state.activeChallenge || state.opusCount === 0) return
  for (const ch of CHALLENGES) {
    if (state.completedChallenges.includes(ch.id)) continue
    if (state.finaleCount < ch.unlockAt) continue
    if (startChallenge(state, ch.id, simTime)) return
  }
}

function applyTick(state: GameState, deltaMs: number, conducting: boolean): void {
  Object.assign(state, calculateTick(state, deltaMs, conducting))
  state.activeTimePlayed += deltaMs
}

function recordNewAchievements(
  state: GameState,
  simMs: number,
  unlockedAt: Map<string, number>,
  unlockedPhase: Map<string, EraLabel>,
): void {
  const current = new Set(state.achievements)
  for (const ach of ACHIEVEMENTS) {
    if (current.has(ach.id) || unlockedAt.has(ach.id)) continue
    if (ach.check(state)) {
      unlockedAt.set(ach.id, simMs)
      unlockedPhase.set(ach.id, getEra(state))
      state.achievements.push(ach.id)
    }
  }
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

// --- reporting types ---
interface DeadZone {
  startMin: number
  endMin: number
  gapMin: number
  era: EraLabel
  beforeId: string
  afterId: string
}

interface StallGap {
  kind: 'oom' | 'encore' | 'magnum-opus'
  startMin: number
  endMin: number
  gapMin: number
  detail: string
}

interface EraSummary {
  era: EraLabel
  startMin: number
  endMin: number
  spanMin: number
  achievementCount: number
  longestDeadZoneMin: number
}

function achName(id: string): string {
  return ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id
}

function findAchievementDeadZones(
  unlockedAt: Map<string, number>,
  unlockedPhase: Map<string, EraLabel>,
  simMs: number,
): DeadZone[] {
  const sorted = [...unlockedAt.entries()]
    .map(([id, ms]) => ({ id, ms, era: unlockedPhase.get(id) ?? 'intimate' as EraLabel }))
    .sort((a, b) => a.ms - b.ms)

  const gaps: DeadZone[] = []

  if (sorted.length > 0 && sorted[0].ms > 0) {
    gaps.push({
      startMin: 0,
      endMin: sorted[0].ms / 60000,
      gapMin: sorted[0].ms / 60000,
      era: 'intimate',
      beforeId: '(game start)',
      afterId: sorted[0].id,
    })
  }

  for (let i = 1; i < sorted.length; i++) {
    const gapMs = sorted[i].ms - sorted[i - 1].ms
    gaps.push({
      startMin: sorted[i - 1].ms / 60000,
      endMin: sorted[i].ms / 60000,
      gapMin: gapMs / 60000,
      era: sorted[i - 1].era,
      beforeId: sorted[i - 1].id,
      afterId: sorted[i].id,
    })
  }

  if (sorted.length > 0) {
    const tailMs = simMs - sorted[sorted.length - 1].ms
    if (tailMs > 0) {
      gaps.push({
        startMin: sorted[sorted.length - 1].ms / 60000,
        endMin: simMs / 60000,
        gapMin: tailMs / 60000,
        era: sorted[sorted.length - 1].era,
        beforeId: sorted[sorted.length - 1].id,
        afterId: '(sim end)',
      })
    }
  } else if (simMs > 0) {
    gaps.push({
      startMin: 0,
      endMin: simMs / 60000,
      gapMin: simMs / 60000,
      era: 'intimate',
      beforeId: '(game start)',
      afterId: '(sim end)',
    })
  }

  return gaps.sort((a, b) => b.gapMin - a.gapMin)
}

function maxGapMinutes(times: number[]): { gapMin: number; startMin: number; endMin: number } | null {
  if (times.length < 2) return null
  let best = { gapMin: 0, startMin: 0, endMin: 0 }
  for (let i = 1; i < times.length; i++) {
    const gap = (times[i] - times[i - 1]) / 60000
    if (gap > best.gapMin) {
      best = { gapMin: gap, startMin: times[i - 1] / 60000, endMin: times[i] / 60000 }
    }
  }
  return best
}

function buildEraSummaries(
  eraTimeline: { era: EraLabel; startMs: number }[],
  simMs: number,
  unlockedPhase: Map<string, EraLabel>,
  deadZones: DeadZone[],
): EraSummary[] {
  const summaries: EraSummary[] = []
  for (let i = 0; i < eraTimeline.length; i++) {
    const era = eraTimeline[i].era
    const startMs = eraTimeline[i].startMs
    const endMs = i + 1 < eraTimeline.length ? eraTimeline[i + 1].startMs : simMs
    const achCount = [...unlockedPhase.values()].filter((e) => e === era).length
    const internalGaps = deadZones.filter((dz) => dz.era === era && dz.gapMin > 0)
    const longest = internalGaps.length > 0 ? Math.max(...internalGaps.map((g) => g.gapMin)) : 0
    summaries.push({
      era,
      startMin: startMs / 60000,
      endMin: endMs / 60000,
      spanMin: (endMs - startMs) / 60000,
      achievementCount: achCount,
      longestDeadZoneMin: longest,
    })
  }
  return summaries
}

function buildHistogram(unlockedAt: Map<string, number>, bucketMinutes: number): Map<number, number> {
  const hist = new Map<number, number>()
  for (const ms of unlockedAt.values()) {
    const bucket = Math.floor(ms / 60000 / bucketMinutes)
    hist.set(bucket, (hist.get(bucket) ?? 0) + 1)
  }
  return hist
}

function writeReportCsv(opts: {
  deadZones: DeadZone[]
  stalls: StallGap[]
  eraSummaries: EraSummary[]
  unlockedAt: Map<string, number>
  unlockedPhase: Map<string, EraLabel>
}): void {
  mkdirSync(OUT_DIR, { recursive: true })
  const lines: string[] = []

  lines.push('section,rank,start_min,end_min,gap_min,era_or_kind,detail_before,detail_after')
  opts.deadZones.slice(0, 10).forEach((dz, i) => {
    lines.push([
      'achievement_dead_zone',
      i + 1,
      dz.startMin.toFixed(2),
      dz.endMin.toFixed(2),
      dz.gapMin.toFixed(2),
      dz.era,
      dz.beforeId,
      dz.afterId,
    ].join(','))
  })

  opts.stalls.forEach((s, i) => {
    lines.push([
      'progression_stall',
      i + 1,
      s.startMin.toFixed(2),
      s.endMin.toFixed(2),
      s.gapMin.toFixed(2),
      s.kind,
      s.detail,
      '',
    ].join(','))
  })

  opts.eraSummaries.forEach((es) => {
    lines.push([
      'era_summary',
      es.era,
      es.startMin.toFixed(2),
      es.endMin.toFixed(2),
      es.spanMin.toFixed(2),
      es.achievementCount,
      es.longestDeadZoneMin.toFixed(2),
      '',
    ].join(','))
  })

  lines.push('')
  lines.push('achievement_id,first_unlock_min,era')
  for (const ach of ACHIEVEMENTS) {
    const ms = opts.unlockedAt.get(ach.id)
    const minute = ms !== undefined ? (ms / 60000).toFixed(2) : ''
    const era = opts.unlockedPhase.get(ach.id) ?? ''
    lines.push(`${ach.id},${minute},${era}`)
  }

  writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf8')
}

describe('full-era pacing instrument', () => {
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

  it('runs L1+L2 through Platinum and reports dead-zones / stalls', () => {
    const setClock = (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock!

    let simMs = 0
    let steps = 0
    const state = createInitialState(simMs)
    setClock(simMs)

    const unlockedAt = new Map<string, number>()
    const unlockedPhase = new Map<string, EraLabel>()
    const wiringNeeded: string[] = []

    const encoreTimes: number[] = []
    const moTimes: number[] = []
    const oomEvents: [number, number][] = []
    let nextOom = 1
    let peakSw = new Decimal(0)

    const eraTimeline: { era: EraLabel; startMs: number }[] = [{ era: 'intimate', startMs: 0 }]
    let lastEra: EraLabel = 'intimate'

    let platinumAtMs: number | null = null
    let records100kAtMs: number | null = null
    let postPlatinumMoCount = 0
    let lastPrestigeMs = 0
    const restraintCollisions: { id: string; ms: number; sincePrestigeMs: number }[] = []

    const challengeUnlockable = CHALLENGES.some((ch) => ch.unlockAt === 0)
    if (!challengeUnlockable) {
      wiringNeeded.push(
        'challenges — all challenges require finaleCount >= unlockAt (min 1), but Grand Finale needs soundwaves >= 1.79e308; cannot exercise challenge runs within L1+L2 sim horizon',
      )
    }

    while (
      simMs < MAX_SIM_MS &&
      steps < MAX_STEPS &&
      (platinumAtMs === null || postPlatinumMoCount < POST_PLATINUM_MO_TARGET)
    ) {
      steps++

      if (!state.activeChallenge) {
        greedyBuyCheapest(state)
        greedyBuyEncoreUpgrades(state)
        greedyBuyOpusUpgrades(state)
        enableUnlockedAutobuyers(state)
        tryStartNextChallenge(state, simMs)
      } else {
        greedyBuyCheapest(state)
      }

      const conducting = state.layer1WallReached || state.opusCount > 0
      const dt = chooseDt(state)
      applyTick(state, dt, conducting)
      simMs += dt
      setClock(simMs)

      recordNewAchievements(state, simMs, unlockedAt, unlockedPhase)
      for (const [id, ms] of unlockedAt) {
        if (ms !== simMs || !RESTRAINT_ACHIEVEMENT_IDS.has(id)) continue
        const since = ms - lastPrestigeMs
        if (since <= POST_PRESTIGE_GRACE_MS) {
          restraintCollisions.push({ id, ms, sincePrestigeMs: since })
        }
      }

      if (state.peakSoundwaves.gt(peakSw)) peakSw = new Decimal(state.peakSoundwaves)
      const l10 = peakSw.log10()
      if (isFinite(l10) && l10 >= nextOom) {
        oomEvents.push([simMs, Math.floor(l10)])
        nextOom = Math.floor(l10) + 1
      }

      const era = getEra(state)
      if (era !== lastEra) {
        eraTimeline.push({ era, startMs: simMs })
        lastEra = era
      }

      if (state.platinum && platinumAtMs === null) {
        platinumAtMs = simMs
      }
      if (records100kAtMs === null && state.recordsSold >= GOLD_RECORD_THRESHOLD) {
        records100kAtMs = simMs
      }

      if (state.activeChallenge) {
        if (checkChallengeCompletion(state)) {
          setClock(simMs)
          continue
        }
      }

      if (performGrandFinale(state, simMs)) {
        lastPrestigeMs = simMs
        setClock(simMs)
        continue
      }

      if (state.layer1WallReached && canMoNow(state)) {
        const prevPlatinum = state.platinum
        if (performMagnumOpus(state, simMs)) {
          moTimes.push(simMs)
          lastPrestigeMs = simMs
          if (prevPlatinum || state.platinum) {
            postPlatinumMoCount++
          }
          setClock(simMs)
          continue
        }
      }

      if (performEncore(state, simMs)) {
        encoreTimes.push(simMs)
        lastPrestigeMs = simMs
        setClock(simMs)
      }
    }

    expect(state.opusCount).toBeGreaterThanOrEqual(1)
    expect(state.platinum || state.recordsSold >= PLATINUM_THRESHOLD).toBe(true)

    const deadZones = findAchievementDeadZones(unlockedAt, unlockedPhase, simMs)
    const topDeadZones = deadZones.slice(0, 10)

    const stalls: StallGap[] = []
    for (let i = 1; i < oomEvents.length; i++) {
      const gapMin = (oomEvents[i][0] - oomEvents[i - 1][0]) / 60000
      stalls.push({
        kind: 'oom',
        startMin: oomEvents[i - 1][0] / 60000,
        endMin: oomEvents[i][0] / 60000,
        gapMin,
        detail: `SW 10^${oomEvents[i - 1][1]} → 10^${oomEvents[i][1]}`,
      })
    }
    stalls.sort((a, b) => b.gapMin - a.gapMin)

    const encoreGap = maxGapMinutes(encoreTimes)
    if (encoreGap) {
      stalls.push({
        kind: 'encore',
        ...encoreGap,
        detail: `Encore #${encoreTimes.findIndex((t) => t / 60000 === encoreGap.startMin) + 1} → #${encoreTimes.findIndex((t) => t / 60000 === encoreGap.endMin) + 1}`,
      })
    }
    const moGap = maxGapMinutes(moTimes)
    if (moGap) {
      stalls.push({
        kind: 'magnum-opus',
        ...moGap,
        detail: `MO gap (longest between consecutive Magnum Opuses)`,
      })
    }
    stalls.sort((a, b) => b.gapMin - a.gapMin)

    const eraSummaries = buildEraSummaries(eraTimeline, simMs, unlockedPhase, deadZones)
    const hist = buildHistogram(unlockedAt, HIST_BUCKET_MIN)

    writeReportCsv({ deadZones: topDeadZones, stalls: stalls.slice(0, 10), eraSummaries, unlockedAt, unlockedPhase })

    const simMinutes = simMs / 60000
    const peakLog10 = peakSw.log10()
    const finaleLog10 = GRAND_FINALE_SW_THRESHOLD.log10()
    const neverUnlocked = ACHIEVEMENTS.filter((a) => !unlockedAt.has(a.id)).map((a) => a.id)

    const allIds = new Set(ACHIEVEMENTS.map((a) => a.id))
    const globalMult = getAchievementGlobalMultiplier(allIds)
    const globalSum = ACHIEVEMENTS.reduce((s, a) => s + (a.reward.globalPercent ?? 0), 0)
    const goldToPlatinumMin =
      records100kAtMs !== null && platinumAtMs !== null
        ? (platinumAtMs - records100kAtMs) / 60000
        : null
    const moEraSummary = eraSummaries.find((e) => e.era === 'magnum-opus')

    console.log('\n=== Full-Era Pacing Report ===')
    console.log(`Achievement global sum: ${globalSum.toFixed(3)} → x${globalMult.toFixed(3)} (all ${ACHIEVEMENTS.length} unlocked)`)
    if (goldToPlatinumMin !== null) {
      console.log(`Gold→Platinum (100k→1M records): ${goldToPlatinumMin.toFixed(1)} min (${(goldToPlatinumMin / 60).toFixed(2)} h)`)
    }
    console.log('CAVEAT: This models a PERFECT/greedy player. Absolute durations are a LOWER BOUND')
    console.log('(humans are slower). The useful signal is the relative SHAPE — where stalls cluster.')
    console.log('')
    console.log(`Simulated playtime: ${simMinutes.toFixed(1)} min (${(simMinutes / 60).toFixed(2)} h)`)
    console.log(`Steps: ${steps} | Opus count: ${state.opusCount} | Records: ${state.recordsSold.toLocaleString()}`)
    console.log(`Platinum: ${state.platinum ? 'yes' : 'no'} at ${platinumAtMs !== null ? (platinumAtMs / 60000).toFixed(1) : '?'} min`)
    console.log(`Post-Platinum MOs: ${postPlatinumMoCount} | Peak SW: 10^${isFinite(peakLog10) ? peakLog10.toFixed(1) : '∞'}`)
    console.log(`Grand Finale gate: 10^${finaleLog10.toFixed(0)} — distance: ${isFinite(peakLog10) ? (finaleLog10 - peakLog10).toFixed(1) : 'N/A'} orders of magnitude`)
    console.log(`Achievements unlocked: ${unlockedAt.size}/${ACHIEVEMENTS.length}`)

    console.log('\n--- Top Achievement Dead-Zones (no new unlocks) ---')
    for (const [i, dz] of topDeadZones.entries()) {
      console.log(
        `  #${i + 1}: ${dz.startMin.toFixed(1)}→${dz.endMin.toFixed(1)} min (${dz.gapMin.toFixed(1)} min gap) [${dz.era}]`,
      )
      console.log(`       after "${achName(dz.beforeId)}" (${dz.beforeId}) → before "${achName(dz.afterId)}" (${dz.afterId})`)
    }

    console.log('\n--- Worst Progression Stalls ---')
    const worstOom = stalls.find((s) => s.kind === 'oom')
    const worstEncore = stalls.find((s) => s.kind === 'encore')
    const worstMo = stalls.find((s) => s.kind === 'magnum-opus')
    if (worstOom) {
      console.log(`  SW oom: ${worstOom.gapMin.toFixed(1)} min (${worstOom.detail})`)
    }
    if (worstEncore) {
      console.log(`  Encore→Encore: ${worstEncore.gapMin.toFixed(1)} min`)
    }
    if (worstMo) {
      console.log(`  MO→MO: ${worstMo.gapMin.toFixed(1)} min`)
    }

    console.log('\n--- Per-Era Summary ---')
    console.log('  era            | span (min) | achievements | longest internal dead-zone (min)')
    for (const es of eraSummaries) {
      console.log(
        `  ${es.era.padEnd(14)} | ${es.spanMin.toFixed(1).padStart(10)} | ${String(es.achievementCount).padStart(12)} | ${es.longestDeadZoneMin.toFixed(1)}`,
      )
    }

    console.log(`\n--- Unlocks per ${HIST_BUCKET_MIN}-minute bucket ---`)
    for (const [bucket, n] of [...hist.entries()].sort((a, b) => a[0] - b[0])) {
      const from = bucket * HIST_BUCKET_MIN
      console.log(`  [${from}-${from + HIST_BUCKET_MIN} min): ${n}`)
    }

    if (wiringNeeded.length > 0) {
      console.log('\n--- WIRING NEEDED ---')
      for (const w of wiringNeeded) console.log(`  WIRING NEEDED: ${w}`)
    }

    if (neverUnlocked.length > 0) {
      console.log(`\nNot unlocked within sim (${neverUnlocked.length}):`)
      console.log(neverUnlocked.join(', '))
    }

    if (restraintCollisions.length > 0) {
      console.log('\nRestraint achievement collisions (unlocked ≤1 min after Encore/MO):')
      for (const c of restraintCollisions) {
        console.log(`  ${c.id} at ${(c.ms / 60000).toFixed(2)} min (${(c.sincePrestigeMs / 1000).toFixed(0)}s after prestige)`)
      }
    }

    console.log(`\nCSV written to: ${CSV_PATH}`)

    expect(restraintCollisions, 'restraint achievements must not auto-unlock from head-start').toHaveLength(0)
    if (moEraSummary) {
      expect(moEraSummary.longestDeadZoneMin).toBeLessThan(25)
    }
  })
})
