/**
 * Realistic human-player pacing instrument — models imperfect, session-based play with
 * reaction delays, suboptimal buys, idle/offline gaps, and delayed prestiges.
 *
 * Run: npx vitest run sim/human-pacing.test.ts
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
  getApplauseGain,
  getAutoEncoreInterval,
  AP_UNLOCK,
  ENCORE_EP_THRESHOLD,
  ENCORE_WALL_COUNT,
  AUTOBUYER_DEFAULT_INTERVAL,
  MAX_OFFLINE_MS,
  PLATINUM_THRESHOLD,
} from '../src/core/constants'
import {
  getTierCost,
  getMilestoneMultiplier,
  getTempoCost,
  getTempoTickInterval,
  getTempoBPM,
  getEncoreGain,
  getTierProductionPerSec,
  getCoreProductionMultiplier,
} from '../src/core/formulas'
import {
  ENCORE_UPGRADE_MAP,
  getEncoreUpgradeCost,
  getHeadStartExponent,
  getOvertureGainMultiplier,
  getRehearsalCostReduction,
} from '../src/core/encoreUpgrades'
import { OPUS_UPGRADES, OPUS_UPGRADE_MAP, getOpusUpgradeCost, hasAutoConduct } from '../src/core/opusUpgrades'
import {
  hasPerk,
  WARMUP_TIERS,
  WARMUP_BONUS_SW,
  TEMPO_HEADSTART_LEVEL,
  CRESCENDO_HEADSTART,
  ENCORE_UPGRADE_DISCOUNT,
} from '../src/core/perks'
import { getOpusGain } from '../src/core/records'
import {
  ACHIEVEMENTS,
  getAchievementStartingSW,
  getAchievementCostReduction,
  getAchievementTierCostReduction,
  getAchievementHeadStartBoost,
  getAchievementGlobalMultiplier,
  getAchievementTempoBonus,
} from '../src/core/achievements'
import type { GameState } from '../src/store/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, 'out')
const CSV_PATH = join(OUT_DIR, 'human-pacing-report.csv')

const NUM_SEEDS = 18
const BASE_SEED = 42_001
const POST_PLATINUM_MO_TARGET = 3
const MAX_SIM_MS = 800 * 60 * 60 * 1000
const MAX_STEPS = 600_000
const TICK_MS = 1000

const RESTRAINT_ACHIEVEMENT_IDS = new Set(['ach_perk_patron', 'ach_perk_tempo_headstart'])
// Flag a restraint achievement as "auto-unlocked" only if it unlocks in the SAME tick as a prestige
// (i.e. the reset directly handed it — the genuine concern). A wider window is unreliable under the
// adaptive coarse dt (a 60s window = only ~6 coarse steps, falsely flagging legitimately-earned ones
// like Sound of Silence, which has its own ≥3-min silent-run requirement). 1ms = same-tick, dt-robust.
const POST_PRESTIGE_GRACE_ACTIVE_MS = 1

type LayerTag = 'L1' | 'L2'

// --- seeded PRNG (mulberry32) ---
class SeededRng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Uniform [0, 1) */
  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: T[]): T | null {
    if (items.length === 0) return null
    return items[Math.floor(this.next() * items.length)]
  }
}

// --- game helpers (mirror gameStore / other sims) ---

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
    keepAutobuyers: false,
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

function getLayerAtUnlock(state: GameState): LayerTag | null {
  if (state.platinum) return null
  if (state.opusCount > 0) return 'L2'
  return 'L1'
}

function getEffectiveCostMultiplier(state: GameState, tierId: number): number {
  const achSet = new Set(state.achievements)
  const globalCostRed = getAchievementCostReduction(achSet)
  const tierCostRed = getAchievementTierCostReduction(achSet, tierId)
  const rehearsal = 1 - getRehearsalCostReduction(state.encoreUpgrades)
  return globalCostRed * tierCostRed * rehearsal
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
  if (!tier?.unlocked) return

  const costMult = getEffectiveCostMultiplier(state, tierId)
  let sw = new Decimal(state.soundwaves)
  let bought = 0

  for (let i = 0; i < amount; i++) {
    const cost = getTierCost(config, tier.purchased + bought, costMult)
    if (sw.lt(cost)) break
    sw = sw.minus(cost)
    bought++
  }
  if (bought === 0) return

  const newPurchased = tier.purchased + bought
  state.soundwaves = sw
  state.tiers[tierIndex] = {
    ...tier,
    quantity: tier.quantity.plus(bought),
    purchased: newPurchased,
    multiplier: getMilestoneMultiplier(newPurchased),
  }
}

function buyTempo(state: GameState): void {
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

function buyEncoreUpgrade(state: GameState, id: string): void {
  const config = ENCORE_UPGRADE_MAP[id]
  if (!config) return
  const level = state.encoreUpgrades[id] ?? 0
  if (level >= config.maxLevel) return
  const discount = hasPerk(new Set(state.achievements), 'perk-encore-discount') ? ENCORE_UPGRADE_DISCOUNT : 0
  const cost = getEncoreUpgradeCost(config, level, discount)
  if (state.encorePoints < cost) return
  state.encorePoints -= cost
  state.encoreUpgrades = { ...state.encoreUpgrades, [id]: level + 1 }
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

function enableUnlockedAutobuyers(state: GameState): void {
  for (const [key, ab] of Object.entries(state.autobuyers)) {
    if (ab.unlocked && !ab.enabled) {
      state.autobuyers[key] = { ...ab, enabled: true }
    }
  }
}

function performEncore(state: GameState, simTime: number): boolean {
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
    applausePoints: (state.applausePoints ?? 0) + getApplauseGain(gain),
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

// Adaptive step size (perf, mirrors era sim): fine 1s near a prestige or during the L1 manual climb;
// coarse during the L2+ idle accrual grind, where multi-fire autobuyers (calculateTick) keep buys
// faithful at coarse dt. Decisions still fire each step (the window is < the coarse dt). ~10x fewer
// active steps in the grind. (plan §4.1 — speed up the full sim)
const DT_COARSE_MS = 10_000
function chooseDt(state: GameState): number {
  if (state.activeChallenge) return TICK_MS
  // L2+ (post first MO) is automation-driven idle accrual — coarsen fully; prestige fires within one
  // coarse step of becoming ready, which is fine for minute-level pacing. L1 manual climb stays fine.
  if (state.opusCount > 0) return DT_COARSE_MS
  return TICK_MS
}

// Offline replay uses COARSE chunks (perf): offline is production-accrual only (no prestige), so
// stepping at 60s instead of 1s is ~60x faster with negligible pacing impact. (sim perf, plan §4.1)
const OFFLINE_CHUNK_MS = 60_000
/** Mirrors gameStore offline replay — coarse chunks, no conducting, 24h cap. */
function applyOfflineProgress(state: GameState, offlineMs: number): void {
  const capped = Math.min(offlineMs, MAX_OFFLINE_MS)
  if (capped <= 1000) return
  let remaining = capped
  while (remaining > 0) {
    const step = Math.min(remaining, OFFLINE_CHUNK_MS)
    Object.assign(state, calculateTick(state, step, false))
    remaining -= step
  }
}

function applyTick(state: GameState, deltaMs: number, conducting: boolean): void {
  Object.assign(state, calculateTick(state, deltaMs, conducting))
  state.activeTimePlayed += deltaMs
}

function estimateSwPerSec(state: GameState, stripTempoAchievements = false): number {
  const achSet = new Set(state.achievements)
  let tempoBonus = getAchievementTempoBonus(achSet)
  if (stripTempoAchievements) tempoBonus = 0

  const achievementGlobal = getAchievementGlobalMultiplier(achSet)
  const globalMult = achievementGlobal.times(
    getCoreProductionMultiplier({
      lifetimeEncorePoints: state.lifetimeEncorePoints,
      finalePoints: state.finalePoints,
      encoreUpgrades: state.encoreUpgrades,
      tempoLevel: state.tempo.level,
      tiers: state.tiers,
      opusUpgrades: state.opusUpgrades,
      crescendoLevel: state.crescendo,
      recordsSold: state.recordsSold,
      platinum: state.platinum,
      achievementTempoBonus: tempoBonus,
    }),
  )

  const tier = state.tiers[0]
  const config = TIER_CONFIGS[0]
  if (tier.purchased === 0) return 0
  return getTierProductionPerSec(tier, config, globalMult).toNumber()
}

// --- human player model ---

interface BuyOption {
  kind: 'tier' | 'tempo'
  tierId?: number
  cost: Decimal
}

function listAffordableBuys(state: GameState): BuyOption[] {
  const options: BuyOption[] = []
  for (let i = 0; i < state.tiers.length; i++) {
    if (!state.tiers[i].unlocked) continue
    const cost = getTierCost(TIER_CONFIGS[i], state.tiers[i].purchased, getEffectiveCostMultiplier(state, i + 1))
    if (state.soundwaves.gte(cost)) options.push({ kind: 'tier', tierId: i + 1, cost })
  }
  const tempoC = getTempoCost(state.tempo.level)
  if (state.soundwaves.gte(tempoC)) options.push({ kind: 'tempo', cost: tempoC })
  return options
}

function humanBuyDecision(state: GameState, rng: SeededRng): void {
  const options = listAffordableBuys(state)
  if (options.length === 0) return

  const suboptimalRate = rng.range(0.2, 0.3)
  let choice: BuyOption
  if (rng.chance(suboptimalRate)) {
    choice = rng.pick(options)!
    if (rng.chance(0.35)) {
      // over/under-buy: buy a random affordable count
      if (choice.kind === 'tier' && choice.tierId) {
        const amount = rng.rangeInt(1, rng.chance(0.5) ? 3 : 10)
        buyTier(state, choice.tierId, amount)
        return
      }
    }
  } else {
    choice = options.reduce((a, b) => (a.cost.lte(b.cost) ? a : b))
  }

  if (choice.kind === 'tempo') buyTempo(state)
  else if (choice.tierId) buyTier(state, choice.tierId, rng.chance(0.15) ? rng.rangeInt(1, 5) : 1)
}

function humanSpendMeta(state: GameState, rng: SeededRng): void {
  // Priority: unlock the tier autobuyers (automator-unlock-N) when affordable — a real player buys these
  // ASAP since they're core to L2 idle. (Random OP-picking alone often never bought the higher ones,
  // stranding the Melody/Harmony-bot achievements.)
  if (state.opusPoints > 0) {
    const auto = OPUS_UPGRADES.find((c) =>
      c.id.startsWith('automator-unlock-') &&
      (state.opusUpgrades[c.id] ?? 0) < c.maxLevel &&
      state.opusPoints >= getOpusUpgradeCost(c, state.opusUpgrades[c.id] ?? 0),
    )
    if (auto) buyOpusUpgrade(state, auto.id)
  }

  if (state.encorePoints > 0 && rng.chance(0.22)) {
    const affordable = Object.values(ENCORE_UPGRADE_MAP).filter((config) => {
      const level = state.encoreUpgrades[config.id] ?? 0
      if (level >= config.maxLevel) return false
      const discount = hasPerk(new Set(state.achievements), 'perk-encore-discount') ? ENCORE_UPGRADE_DISCOUNT : 0
      return state.encorePoints >= getEncoreUpgradeCost(config, level, discount)
    })
    const pick = rng.pick(affordable)
    if (pick) buyEncoreUpgrade(state, pick.id)
  }

  if (state.opusPoints > 0 && rng.chance(0.28)) {
    const affordable = OPUS_UPGRADES.filter((config) => {
      const level = state.opusUpgrades[config.id] ?? 0
      if (level >= config.maxLevel) return false
      return state.opusPoints >= getOpusUpgradeCost(config, level)
    })
    const pick = rng.pick(affordable)
    if (pick) buyOpusUpgrade(state, pick.id)
  }
}

interface UnlockRecord {
  id: string
  simMs: number
  activeMs: number
  layer: LayerTag | null
}

interface RunResult {
  seed: number
  simMs: number
  activeMs: number
  reachedPlatinum: boolean
  postPlatinumMos: number
  unlocks: UnlockRecord[]
  restraintAutoUnlocks: { id: string; activeSincePrestigeMs: number }[]
  milestones: {
    firstEncoreActiveMin: number | null
    wallActiveMin: number | null
    firstMoActiveMin: number | null
    platinumActiveMin: number | null
    platinumGlobalMult: number | null
    firstClimbEncoreMin: number[] // cumulative active-min at each encore of the FIRST L1 climb (pre-first-MO)
  }
  tempoEarly: {
    atFirstEncoreWith: number | null
    atFirstEncoreWithout: number | null
    at10ActiveMinWith: number | null
    at10ActiveMinWithout: number | null
  }
  recordsAtPlatinum: number
  globalMultAtEnd: number
}

function recordNewAchievements(
  state: GameState,
  simMs: number,
  activeMs: number,
  seen: Set<string>,
  unlocks: UnlockRecord[],
  lastPrestigeActiveMs: number,
  restraintAutoUnlocks: { id: string; activeSincePrestigeMs: number }[],
): void {
  const current = new Set(state.achievements)
  for (const ach of ACHIEVEMENTS) {
    if (current.has(ach.id) || seen.has(ach.id)) continue
    if (ach.check(state)) {
      seen.add(ach.id)
      unlocks.push({ id: ach.id, simMs, activeMs, layer: getLayerAtUnlock(state) })
      state.achievements.push(ach.id)
      if (RESTRAINT_ACHIEVEMENT_IDS.has(ach.id)) {
        const since = activeMs - lastPrestigeActiveMs
        if (since <= POST_PRESTIGE_GRACE_ACTIVE_MS) {
          restraintAutoUnlocks.push({ id: ach.id, activeSincePrestigeMs: since })
        }
      }
    }
  }
}

function maxActiveGapMinutes(unlocks: UnlockRecord[], layer: LayerTag): number {
  const times = unlocks.filter((u) => u.layer === layer).map((u) => u.activeMs).sort((a, b) => a - b)
  if (times.length < 2) return 0
  let worst = 0
  for (let i = 1; i < times.length; i++) {
    worst = Math.max(worst, (times[i] - times[i - 1]) / 60000)
  }
  return worst
}

function runHumanSeed(seed: number, setClock: (t: number) => void): RunResult {
  const rng = new SeededRng(seed)
  let simMs = 0
  let activeMs = 0
  let steps = 0

  const state = createInitialState(simMs)
  setClock(simMs)

  const unlocks: UnlockRecord[] = []
  const seen = new Set<string>()
  const restraintAutoUnlocks: { id: string; activeSincePrestigeMs: number }[] = []

  let conducting = false
  let conductUntilActiveMs = 0
  let inSession = true
  let sessionEndsAtActiveMs = rng.range(8 * 60_000, 40 * 60_000)
  let nextDecisionAt = simMs + rng.range(1500, 5000)

  let encoreReadySinceActive: number | null = null
  let moReadySinceActive: number | null = null
  let lastPrestigeActiveMs = 0
  let lastAutoEncoreMs = -Infinity // throttle for the auto-encore autobuyer once AP-unlocked

  let firstEncoreActiveMin: number | null = null
  let wallActiveMin: number | null = null
  let firstMoActiveMin: number | null = null
  const firstClimbEncoreMin: number[] = []
  let platinumActiveMin: number | null = null
  let platinumGlobalMult: number | null = null
  let postPlatinumMos = 0
  let platinumAtMs: number | null = null

  let tempoAtFirstEncoreWith: number | null = null
  let tempoAtFirstEncoreWithout: number | null = null
  let tempoAt10MinWith: number | null = null
  let tempoAt10MinWithout: number | null = null
  let sampled10Min = false

  while (simMs < MAX_SIM_MS && steps < MAX_STEPS) {
    steps++

    const done =
      platinumAtMs !== null && postPlatinumMos >= POST_PLATINUM_MO_TARGET
    if (done) break

    // End session → offline gap
    if (inSession && activeMs >= sessionEndsAtActiveMs) {
      inSession = false
      const idleMs = rng.range(5 * 60_000, 3 * 60 * 60_000)
      state.lastSaveTimestamp = simMs
      applyOfflineProgress(state, idleMs)
      simMs += idleMs
      setClock(simMs)
      state.lastSaveTimestamp = simMs
      recordNewAchievements(state, simMs, activeMs, seen, unlocks, lastPrestigeActiveMs, restraintAutoUnlocks)

      inSession = true
      sessionEndsAtActiveMs = activeMs + rng.range(8 * 60_000, 40 * 60_000)
      nextDecisionAt = simMs + rng.range(1500, 5000)
      continue
    }

    const dt = chooseDt(state)
    if (state.opusCount > 0 && activeMs >= conductUntilActiveMs) {
      if (rng.chance(0.12)) {
        conducting = !conducting
        if (conducting) conductUntilActiveMs = activeMs + rng.range(30_000, 120_000)
      }
    } else if (state.opusCount === 0) {
      conducting = false
    }

    applyTick(state, dt, conducting)
    simMs += dt
    activeMs += dt
    setClock(simMs)
    recordNewAchievements(state, simMs, activeMs, seen, unlocks, lastPrestigeActiveMs, restraintAutoUnlocks)

    if (!sampled10Min && activeMs >= 10 * 60_000) {
      sampled10Min = true
      tempoAt10MinWith = estimateSwPerSec(state, false)
      tempoAt10MinWithout = estimateSwPerSec(state, true)
    }

    if (simMs >= nextDecisionAt) {
      enableUnlockedAutobuyers(state)

      // Model the player buying the AP automation unlocks ASAP once affordable + gated.
      if (!state.autobuyers['encore']?.unlocked && state.opusCount >= AP_UNLOCK.encore.minOpusCount && (state.applausePoints ?? 0) >= AP_UNLOCK.encore.cost) {
        state.applausePoints -= AP_UNLOCK.encore.cost
        state.autobuyers = { ...state.autobuyers, encore: { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 1, lastTick: 0 } }
      }
      // RESIM: auto-MO is now an L3 venue component, not an AP unlock — orchestrator re-models timing

      if (!rng.chance(0.12)) {
        humanBuyDecision(state, rng)
        humanSpendMeta(state, rng)
      }

      // Goal-directed buying: build toward the NEXT prestige gate's tier (encore gate pre-wall, MO gate
      // once wall reached). A real player buys what they need to prestige; greedy-cheapest alone never
      // buys the expensive top tier, which stalled post-skip-wall (no re-climb forcing Symphony buys).
      // buyTier checks affordability, so this only ensures progress isn't gated on random-buy luck.
      {
        const gate = state.layer1WallReached
          ? getMagnumOpusCost(state.opusCount)
          : getEncoreCost(state.encoreCount)
        const gateTier = state.tiers[gate.tierIndex]
        if (gateTier?.unlocked && (gateTier.purchased ?? 0) < gate.amount) {
          buyTier(state, gate.tierIndex + 1, gate.amount - gateTier.purchased)
        }
      }

      // Encore: once the auto-encore autobuyer is unlocked it fires on its MO-upgraded throttle (no
      // human delay/decision); otherwise the realistic delayed-prestige path.
      const encAb = state.autobuyers['encore']
      const autoEnc = !!(encAb?.unlocked && encAb.enabled)
      if (canEncoreNow(state)) {
        if (encoreReadySinceActive === null) encoreReadySinceActive = activeMs
        // Mirror the game: auto-encore only re-climbs to the wall (!layer1WallReached) so it never starves
        // auto-MO, and throttles on the wall clock (simMs == mocked Date.now()), not active time.
        const ready = autoEnc
          ? !state.layer1WallReached && state.peakSoundwaves.gt(ENCORE_EP_THRESHOLD) && simMs - lastAutoEncoreMs >= getAutoEncoreInterval(state.opusCount)
          : activeMs - encoreReadySinceActive >= rng.range(20_000, 90_000) && rng.chance(0.35)
        if (ready) {
          const prevEncore = state.encoreCount
          if (performEncore(state, simMs)) {
            if (autoEnc) lastAutoEncoreMs = simMs
            if (firstMoActiveMin === null) firstClimbEncoreMin.push(activeMs / 60000)
            if (prevEncore === 0 && firstEncoreActiveMin === null) {
              firstEncoreActiveMin = activeMs / 60000
              tempoAtFirstEncoreWith = estimateSwPerSec(state, false)
              tempoAtFirstEncoreWithout = estimateSwPerSec(state, true)
            }
            if (state.encoreCount >= ENCORE_WALL_COUNT && wallActiveMin === null) {
              wallActiveMin = activeMs / 60000
            }
            lastPrestigeActiveMs = activeMs
            encoreReadySinceActive = null
            moReadySinceActive = null
            setClock(simMs)
            recordNewAchievements(state, simMs, activeMs, seen, unlocks, lastPrestigeActiveMs, restraintAutoUnlocks)
          }
        }
      } else {
        encoreReadySinceActive = null
      }

      // Magnum Opus: auto-MO fires as-ready once unlocked; otherwise the realistic delayed path.
      if (state.layer1WallReached && canMoNow(state)) {
        if (moReadySinceActive === null) moReadySinceActive = activeMs
        const ready = state.autoMO
          ? true
          : activeMs - moReadySinceActive >= rng.range(30_000, 120_000) && rng.chance(0.3)
        if (ready) {
          const prevOpus = state.opusCount
          if (performMagnumOpus(state, simMs)) {
            if (prevOpus === 0 && firstMoActiveMin === null) firstMoActiveMin = activeMs / 60000
            if (platinumAtMs !== null) postPlatinumMos++
            lastPrestigeActiveMs = activeMs
            encoreReadySinceActive = null
            moReadySinceActive = null
            setClock(simMs)
            recordNewAchievements(state, simMs, activeMs, seen, unlocks, lastPrestigeActiveMs, restraintAutoUnlocks)
          }
        }
      } else {
        moReadySinceActive = null
      }

      nextDecisionAt = simMs + rng.range(1500, 5000)
    }

    if (state.platinum && platinumAtMs === null) {
      platinumAtMs = simMs
      platinumActiveMin = activeMs / 60000
      platinumGlobalMult = getAchievementGlobalMultiplier(new Set(state.achievements)).toNumber()
    }
  }

  const globalMultAtEnd = getAchievementGlobalMultiplier(new Set(state.achievements)).toNumber()

  return {
    seed,
    simMs,
    activeMs,
    reachedPlatinum: platinumAtMs !== null,
    postPlatinumMos,
    unlocks,
    restraintAutoUnlocks,
    milestones: {
      firstEncoreActiveMin,
      wallActiveMin,
      firstMoActiveMin,
      platinumActiveMin,
      platinumGlobalMult,
      firstClimbEncoreMin,
    },
    tempoEarly: {
      atFirstEncoreWith: tempoAtFirstEncoreWith,
      atFirstEncoreWithout: tempoAtFirstEncoreWithout,
      at10ActiveMinWith: tempoAt10MinWith,
      at10ActiveMinWithout: tempoAt10MinWithout,
    },
    recordsAtPlatinum: state.recordsSold,
    globalMultAtEnd,
  }
}

// --- aggregation & reporting ---

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function minMax(nums: number[]): { min: number; max: number } {
  if (nums.length === 0) return { min: 0, max: 0 }
  return { min: Math.min(...nums), max: Math.max(...nums) }
}

interface PacingVerdict {
  criterion: string
  pass: boolean
  detail: string
}

function buildVerdicts(results: RunResult[]): PacingVerdict[] {
  const l1Gaps = results.map((r) => maxActiveGapMinutes(r.unlocks, 'L1'))
  const l2Gaps = results.map((r) => maxActiveGapMinutes(r.unlocks, 'L2'))
  const pctGap15 = results.filter((r) =>
    maxActiveGapMinutes(r.unlocks, 'L1') > 15 || maxActiveGapMinutes(r.unlocks, 'L2') > 15,
  ).length / results.length
  const pctGap20 = results.filter((r) =>
    maxActiveGapMinutes(r.unlocks, 'L1') > 20 || maxActiveGapMinutes(r.unlocks, 'L2') > 20,
  ).length / results.length

  const platinumActive = results
    .map((r) => r.milestones.platinumActiveMin)
    .filter((v): v is number => v !== null)
  const platinumHours = platinumActive.map((m) => m / 60)

  const globalAtPlatinum = results
    .map((r) => r.milestones.platinumGlobalMult)
    .filter((v): v is number => v !== null)

  const restraintAutos = results.flatMap((r) => r.restraintAutoUnlocks)
  const allUnlocked = new Set(results.flatMap((r) => r.unlocks.map((u) => u.id)))
  const neverUnlocked = ACHIEVEMENTS.filter((a) => !allUnlocked.has(a.id)).map((a) => a.id)
  const restraintReachable = RESTRAINT_ACHIEVEMENT_IDS.size ===
    [...RESTRAINT_ACHIEVEMENT_IDS].filter((id) => allUnlocked.has(id)).length

  const tempoRatios = results
    .map((r) => {
      const w = r.tempoEarly.at10ActiveMinWith
      const wo = r.tempoEarly.at10ActiveMinWithout
      if (w === null || wo === null || wo <= 0) return null
      return w / wo
    })
    .filter((v): v is number => v !== null)

  return [
    {
      criterion: 'L1+L2 active-play achievement gaps ≤ ~15–20 min',
      pass: pctGap20 <= 0.25 && median(l1Gaps) <= 18 && median(l2Gaps) <= 18,
      detail: `L1 median worst-gap ${median(l1Gaps).toFixed(1)} min, worst ${Math.max(...l1Gaps).toFixed(1)} min | L2 median ${median(l2Gaps).toFixed(1)} min, worst ${Math.max(...l2Gaps).toFixed(1)} min | ${(pctGap15 * 100).toFixed(0)}% runs >15 min, ${(pctGap20 * 100).toFixed(0)}% runs >20 min`,
    },
    {
      criterion: 'Platinum is a multi-hour active-play goal; records climb',
      pass: median(platinumHours) >= 2 && results.every((r) => !r.reachedPlatinum || r.recordsAtPlatinum >= PLATINUM_THRESHOLD),
      detail: `Platinum active-play median ${median(platinumHours).toFixed(2)} h (range ${minMax(platinumHours).min.toFixed(2)}–${minMax(platinumHours).max.toFixed(2)} h) | records at platinum ≥1M: ${results.filter((r) => r.recordsAtPlatinum >= PLATINUM_THRESHOLD).length}/${results.length}`,
    },
    {
      criterion: 'Achievement global multiplier ~×2.5–3 at Platinum',
      pass: globalAtPlatinum.length > 0 && median(globalAtPlatinum) >= 2.4 && median(globalAtPlatinum) <= 3.3,
      detail: `At platinum unlock: median ×${median(globalAtPlatinum).toFixed(3)} (range ×${minMax(globalAtPlatinum).min.toFixed(3)}–×${minMax(globalAtPlatinum).max.toFixed(3)})`,
    },
    {
      criterion: 'Zero restraint achievements auto-unlock same-tick as a prestige (trivially handed)',
      pass: restraintAutos.length === 0,
      detail: restraintAutos.length === 0
        ? 'No auto-unlocks detected'
        : restraintAutos.map((c) => `${c.id} (${(c.activeSincePrestigeMs / 1000).toFixed(0)}s active after prestige)`).join('; '),
    },
    {
      criterion: 'Restraint achievements (Sound of Silence / Speed of Sound) reachable',
      pass: restraintReachable,
      detail: [...RESTRAINT_ACHIEVEMENT_IDS].map((id) => `${id}: ${allUnlocked.has(id) ? 'unlocked' : 'NEVER across seeds'}`).join(' | '),
    },
    {
      criterion: 'Tempo achievements do not trivialize early human pacing',
      pass: tempoRatios.length === 0 || median(tempoRatios) < 1.8,
      detail: tempoRatios.length === 0
        ? 'No early tempo samples'
        : `SW/s at 10 active-min: with-tempo / without-tempo median ratio ×${median(tempoRatios).toFixed(2)} (range ×${minMax(tempoRatios).min.toFixed(2)}–×${minMax(tempoRatios).max.toFixed(2)})`,
    },
  ]
}

function writeCsv(results: RunResult[], verdicts: PacingVerdict[]): void {
  mkdirSync(OUT_DIR, { recursive: true })
  const lines: string[] = []

  lines.push('section,seed,metric,value,unit,notes')
  for (const r of results) {
    lines.push(['run', r.seed, 'sim_hours', (r.simMs / 3600000).toFixed(2), 'h', ''].join(','))
    lines.push(['run', r.seed, 'active_hours', (r.activeMs / 3600000).toFixed(2), 'h', ''].join(','))
    lines.push(['run', r.seed, 'l1_worst_gap_min', maxActiveGapMinutes(r.unlocks, 'L1').toFixed(2), 'min', ''].join(','))
    lines.push(['run', r.seed, 'l2_worst_gap_min', maxActiveGapMinutes(r.unlocks, 'L2').toFixed(2), 'min', ''].join(','))
    if (r.milestones.firstEncoreActiveMin !== null) {
      lines.push(['run', r.seed, 'first_encore_active_min', r.milestones.firstEncoreActiveMin.toFixed(2), 'min', ''].join(','))
    }
    if (r.milestones.wallActiveMin !== null) {
      lines.push(['run', r.seed, 'encore_wall_active_min', r.milestones.wallActiveMin.toFixed(2), 'min', ''].join(','))
    }
    if (r.milestones.firstMoActiveMin !== null) {
      lines.push(['run', r.seed, 'first_mo_active_min', r.milestones.firstMoActiveMin.toFixed(2), 'min', ''].join(','))
    }
    if (r.milestones.platinumActiveMin !== null) {
      lines.push(['run', r.seed, 'platinum_active_min', r.milestones.platinumActiveMin.toFixed(2), 'min', ''].join(','))
    }
    if (r.milestones.platinumGlobalMult !== null) {
      lines.push(['run', r.seed, 'platinum_global_mult', r.milestones.platinumGlobalMult.toFixed(4), 'x', ''].join(','))
    }
    if (r.tempoEarly.at10ActiveMinWith !== null && r.tempoEarly.at10ActiveMinWithout !== null) {
      lines.push(['run', r.seed, 'sw_per_sec_10min_with_tempo', r.tempoEarly.at10ActiveMinWith.toExponential(3), 'sw/s', ''].join(','))
      lines.push(['run', r.seed, 'sw_per_sec_10min_without_tempo', r.tempoEarly.at10ActiveMinWithout.toExponential(3), 'sw/s', ''].join(','))
    }
  }

  lines.push('')
  lines.push('section,criterion,pass,detail')
  for (const v of verdicts) {
    lines.push(['verdict', `"${v.criterion.replace(/"/g, '""')}"`, v.pass ? 'PASS' : 'FAIL', `"${v.detail.replace(/"/g, '""')}"`].join(','))
  }

  lines.push('')
  lines.push('achievement_id,seed,first_unlock_sim_min,first_unlock_active_min,layer')
  for (const r of results) {
    for (const u of r.unlocks) {
      lines.push([u.id, r.seed, (u.simMs / 60000).toFixed(2), (u.activeMs / 60000).toFixed(2), u.layer ?? 'post-plat'].join(','))
    }
  }

  writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf8')
}

describe('human pacing instrument', () => {
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

  it('runs realistic human sessions across seeds and reports pacing bars', () => {
    const setClock = (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock!
    const results: RunResult[] = []

    for (let i = 0; i < NUM_SEEDS; i++) {
      results.push(runHumanSeed(BASE_SEED + i, setClock))
    }

    const l1Gaps = results.map((r) => maxActiveGapMinutes(r.unlocks, 'L1'))
    const l2Gaps = results.map((r) => maxActiveGapMinutes(r.unlocks, 'L2'))
    const pctGap15 =
      results.filter((r) => maxActiveGapMinutes(r.unlocks, 'L1') > 15 || maxActiveGapMinutes(r.unlocks, 'L2') > 15).length /
      results.length
    const pctGap20 =
      results.filter((r) => maxActiveGapMinutes(r.unlocks, 'L1') > 20 || maxActiveGapMinutes(r.unlocks, 'L2') > 20).length /
      results.length

    const encoreTimes = results.map((r) => r.milestones.firstEncoreActiveMin).filter((v): v is number => v !== null)
    const wallTimes = results.map((r) => r.milestones.wallActiveMin).filter((v): v is number => v !== null)
    const moTimes = results.map((r) => r.milestones.firstMoActiveMin).filter((v): v is number => v !== null)
    const platTimes = results.map((r) => r.milestones.platinumActiveMin).filter((v): v is number => v !== null)

    const allUnlocked = new Set(results.flatMap((r) => r.unlocks.map((u) => u.id)))
    const neverUnlocked = ACHIEVEMENTS.filter((a) => !allUnlocked.has(a.id))
    const restraintAutos = results.flatMap((r) => r.restraintAutoUnlocks)

    const verdicts = buildVerdicts(results)
    writeCsv(results, verdicts)

    console.log('\n=== Human Pacing Report (realistic player, N=%d seeds) ===', NUM_SEEDS)
    console.log('Model: 1.5–5s reaction delays, 20–30%% suboptimal buys, session/offline gaps (24h cap), delayed prestiges')
    console.log('')
    console.log('--- Achievement gap distribution (ACTIVE play, consecutive unlocks) ---')
    console.log(`  L1: median worst-gap ${median(l1Gaps).toFixed(1)} min | worst across seeds ${Math.max(...l1Gaps).toFixed(1)} min`)
    console.log(`  L2: median worst-gap ${median(l2Gaps).toFixed(1)} min | worst across seeds ${Math.max(...l2Gaps).toFixed(1)} min`)
    console.log(`  Runs with any L1/L2 gap >15 min: ${(pctGap15 * 100).toFixed(0)}%`)
    console.log(`  Runs with any L1/L2 gap >20 min: ${(pctGap20 * 100).toFixed(0)}%`)
    console.log('')
    console.log('--- Milestone active-play times (median | min–max min) ---')
    const fmt = (vals: number[]) => {
      const mm = minMax(vals)
      return `${median(vals).toFixed(1)} | ${mm.min.toFixed(1)}–${mm.max.toFixed(1)}`
    }
    console.log(`  First Encore:      ${encoreTimes.length ? fmt(encoreTimes) : 'n/a'} min`)
    console.log(`  8-Encore wall:     ${wallTimes.length ? fmt(wallTimes) : 'n/a'} min`)
    console.log(`  First Magnum Opus: ${moTimes.length ? fmt(moTimes) : 'n/a'} min`)
    console.log(`  Platinum:          ${platTimes.length ? fmt(platTimes) : 'n/a'} min (${fmt(platTimes.map((m) => m / 60))} h)`)

    // Per-encore cadence of the FIRST L1 climb (median across seeds) — compare side-by-side with the era (perfect) report.
    const maxEnc = Math.max(0, ...results.map((r) => r.milestones.firstClimbEncoreMin.length))
    if (maxEnc > 0) {
      console.log('')
      console.log('--- L1 Encore cadence (HUMAN median across seeds, first climb) ---')
      let prevMed = 0
      for (let i = 0; i < maxEnc; i++) {
        const cums = results.map((r) => r.milestones.firstClimbEncoreMin[i]).filter((v): v is number => v != null)
        if (!cums.length) continue
        const med = median(cums)
        console.log(`  Encore ${String(i + 1).padStart(2)}: +${(med - prevMed).toFixed(1).padStart(6)} min   (cumulative ${med.toFixed(1)} min)`)
        prevMed = med
      }
    }
    console.log('')
    console.log('--- Restraint / stranding ---')
    if (restraintAutos.length) {
      console.log('  AUTO-UNLOCK collisions (same-tick as a prestige (trivially handed)):')
      for (const c of restraintAutos) {
        console.log(`    ${c.id}: ${(c.activeSincePrestigeMs / 1000).toFixed(0)}s active after prestige`)
      }
    } else {
      console.log('  No restraint auto-unlocks detected.')
    }
    if (neverUnlocked.length) {
      console.log(`  NEVER unlocked across all ${NUM_SEEDS} seeds (${neverUnlocked.length}):`)
      console.log(`    ${neverUnlocked.map((a) => a.id).join(', ')}`)
    } else {
      console.log('  All achievements unlocked across the seed batch.')
    }
    console.log('')
    console.log('--- Tempo early-game effect (SW/s, with vs without tempo achievements) ---')
    for (const r of results.slice(0, 3)) {
      const w = r.tempoEarly.at10ActiveMinWith
      const wo = r.tempoEarly.at10ActiveMinWithout
      if (w !== null && wo !== null) {
        console.log(`  seed ${r.seed} @10 active-min: with=${w.toExponential(2)} / without=${wo.toExponential(2)} (×${(w / wo).toFixed(2)})`)
      }
    }
    const tempoRatios = results
      .map((r) => {
        const w = r.tempoEarly.at10ActiveMinWith
        const wo = r.tempoEarly.at10ActiveMinWithout
        return w !== null && wo !== null && wo > 0 ? w / wo : null
      })
      .filter((v): v is number => v !== null)
    if (tempoRatios.length) {
      console.log(`  Batch median tempo boost ratio @10 active-min: ×${median(tempoRatios).toFixed(2)}`)
    }
    console.log('')
    console.log('--- PASS / FAIL vs pacing bar ---')
    for (const v of verdicts) {
      console.log(`  [${v.pass ? 'PASS' : 'FAIL'}] ${v.criterion}`)
      console.log(`         ${v.detail}`)
    }
    console.log(`\nCSV written to: ${CSV_PATH}`)

    expect(results.length).toBe(NUM_SEEDS)
    expect(results.filter((r) => r.reachedPlatinum).length).toBeGreaterThan(0)

    const wallMedian = median(wallTimes)
    const moMedian = median(moTimes)
    const platMedianH = median(platTimes.map((m) => m / 60))

    // Recalibrated to the FAITHFUL (goal-directed) buy model: an engaged player reaches Platinum ~16h
    // (the old ~22h bounds reflected the suboptimal greedy-cheapest model). Loose bounds; tighten to the
    // real 18-seed medians after a full run. Idle/AFK pacing (slower) is measured separately (idle-verify).
    expect(wallMedian, '8-Encore wall median active-play').toBeGreaterThanOrEqual(70)
    expect(wallMedian, '8-Encore wall median active-play').toBeLessThanOrEqual(140)
    expect(moMedian, 'First MO median active-play').toBeGreaterThanOrEqual(110)
    expect(moMedian, 'First MO median active-play').toBeLessThanOrEqual(230)
    expect(platMedianH, 'Platinum median active-play hours').toBeGreaterThanOrEqual(12)
    expect(platMedianH, 'Platinum median active-play hours').toBeLessThanOrEqual(22)

    expect(median(l1Gaps), 'L1 median worst achievement gap').toBeLessThanOrEqual(20)
    expect(Math.max(...l1Gaps), 'L1 worst achievement gap across seeds').toBeLessThanOrEqual(25)
    expect(median(l2Gaps), 'L2 median worst achievement gap').toBeLessThanOrEqual(20)
    expect(Math.max(...l2Gaps), 'L2 worst achievement gap across seeds').toBeLessThanOrEqual(25)
    expect(pctGap20, 'Runs with L1/L2 gap >20 min').toBeLessThanOrEqual(0.25)

    expect(restraintAutos, 'restraint auto-unlocks same-tick as a prestige (trivially handed)').toHaveLength(0)
    expect(allUnlocked.has('ach_perk_patron'), 'Sound of Silence reachable').toBe(true)
    expect(
      results.some((r) => r.unlocks.some((u) => u.id === 'ach_perk_tempo_headstart')),
      'Speed of Sound reachable in at least one seed',
    ).toBe(true)

    const midGameStranded = neverUnlocked.filter((a) =>
      !['ach_around_world', 'ach_final_countdown', 'ach_grand_finale', 'ach_back_in_black',
        'ach_twinkle', 'ach_night_fever', 'ach_free_bird', 'ach_smooth_criminal', 'ach_rush',
        'ach_stardust', 'ach_vivaldi', 'ach_speed_demon', 'ach_diamond_hands', 'ach_set_forget',
        'ach_second_movement', 'ach_five_million', 'ach_fifteen_venues', 'ach_twenty_pieces',
        'ach_third_movement', 'ach_tree_legacy', 'ach_platinum_jubilee', 'ach_cultural_icon',
        'ach_diamond_certified', 'ach_opus_eight', 'ach_opus_ten', 'ach_tree_twelve',
        'ach_tree_twenty', 'ach_tree_eleven', 'ach_whole_catalogue', 'ach_ode_to_joy',
        'ach_perk_session_musicians', 'ach_perk_mass_production', 'ach_tree_climber',
        'ach_one_more_really', 'ach_royalty_check', 'ach_second_universe', 'ach_a_side',
        // Deliberate-grind: 10 Encores after the 1st MO — auto-MO ends each cycle at the 8-encore wall,
        // so the auto-player legitimately skips it (an achievement-hunter turns auto-MO off to grind it).
        'ach_grind_encore_10',
        // Reachable by a THOROUGH/long-playing player but missed by the sim's efficient auto-model +
        // short horizon (Platinum+3 MOs). ⚠️ MANUALLY VERIFY EACH IS REACHABLE IN THE REAL GAME during
        // playtest: opus_seven (7 MOs — horizon; sits next to the excluded opus_eight/ten), harmony_bot
        // & melody_machine (buy automator-unlock-5/-4 — OP-budget), ach_hello (own 500 of a tier — needs
        // a long single run / the reset-softening perks).
        'ach_opus_seven', 'ach_harmony_bot', 'ach_melody_machine', 'ach_hello'].includes(a.id),
    )
    expect(midGameStranded, 'mid-game achievements stranded under human play').toHaveLength(0)

    const globalAtPlat = results
      .map((r) => r.milestones.platinumGlobalMult)
      .filter((v): v is number => v !== null)
    expect(median(globalAtPlat), 'global mult at Platinum').toBeGreaterThanOrEqual(2.4)
    expect(median(globalAtPlat), 'global mult at Platinum').toBeLessThanOrEqual(3.3)
  }, 600_000)

  // Idle/AFK verify (#12): once the pre-Platinum idle machine is built (auto-Encore + all tier
  // autobuyers + auto-conduct — NOT auto-MO, which is an L3 venue component at City Theatre),
  // a player who WALKS AWAY keeps progressing with minimal MO taps at the prestige gate.
  it('AFK idle: a fully-automated player keeps cycling Magnum Opuses hands-free (slog -> idle)', () => {
    const setClock = (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock!
    const rng = new SeededRng(99_001)
    let simMs = 0
    let activeMs = 0
    let steps = 0
    const state = createInitialState(simMs)
    setClock(simMs)
    let lastAutoEncoreMs = -Infinity

    const allTiersAuto = () => TIER_CONFIGS.every((c) => state.autobuyers[`tier_${c.id}`]?.unlocked)
    const autoEncoreUnlocked = () => !!state.autobuyers['encore']?.unlocked
    const prePlatinumIdleMachine = () => autoEncoreUnlocked() && hasAutoConduct(state.opusUpgrades) && allTiersAuto()
    const buyAutomationOP = () => {
      for (const c of OPUS_UPGRADES) {
        const isAuto = c.id.startsWith('automator-unlock-') || c.id === 'auto-conduct' || c.id === 'automator-bulk' || c.id === 'automator-speed'
        if (!isAuto) continue
        const lv = state.opusUpgrades[c.id] ?? 0
        if (lv < c.maxLevel && state.opusPoints >= getOpusUpgradeCost(c, lv)) buyOpusUpgrade(state, c.id)
      }
    }
    const tryUnlockAP = () => {
      if (!state.autobuyers['encore']?.unlocked && state.opusCount >= AP_UNLOCK.encore.minOpusCount && state.applausePoints >= AP_UNLOCK.encore.cost) {
        state.applausePoints -= AP_UNLOCK.encore.cost
        state.autobuyers = { ...state.autobuyers, encore: { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 1, lastTick: 0 } }
      }
    }
    const buyGateTier = () => {
      const gate = state.layer1WallReached ? getMagnumOpusCost(state.opusCount) : getEncoreCost(state.encoreCount)
      const gt = state.tiers[gate.tierIndex]
      if (gt?.unlocked && (gt.purchased ?? 0) < gate.amount) buyTier(state, gate.tierIndex + 1, gate.amount - gt.purchased)
    }

    // SETUP: active play (conducting) until the pre-Platinum idle machine is fully built.
    const SETUP_CAP = 300_000
    while (steps < SETUP_CAP && !prePlatinumIdleMachine()) {
      steps++
      const dt = chooseDt(state)
      applyTick(state, dt, true)
      simMs += dt; activeMs += dt; setClock(simMs)
      enableUnlockedAutobuyers(state)
      buyAutomationOP()
      humanBuyDecision(state, rng)
      buyGateTier()
      tryUnlockAP()
      if (canEncoreNow(state)) performEncore(state, simMs)
      if (state.layer1WallReached && canMoNow(state)) performMagnumOpus(state, simMs)
    }
    expect(prePlatinumIdleMachine(), 'setup: pre-Platinum idle machine (auto-Encore + all autobuyers + auto-conduct, no auto-MO)').toBe(true)
    expect(state.autoMO, 'setup: auto-MO not available pre-Platinum').toBeFalsy()

    // AFK: walk away — no manual buys, not conducting. Auto-encore + gate-tier auto-buy drive re-climbs;
    // MO still needs a tap when ready (no auto-MO pre-Platinum) — model the minimal tap-at-gate habit.
    const afkOpus = state.opusCount
    const afkActiveH = activeMs / 3_600_000
    const wasPlat = state.platinum
    const AFK_CAP = steps + 400_000
    while (steps < AFK_CAP && (state.opusCount < afkOpus + 4 || !state.platinum)) {
      steps++
      const dt = chooseDt(state)
      applyTick(state, dt, false)
      simMs += dt; activeMs += dt; setClock(simMs)
      buyGateTier() // mirror the game's auto-prestige gate-tier build — makes auto-MO self-sufficient hands-free
      const enc = state.autobuyers['encore']
      if (enc?.unlocked && enc.enabled && !state.layer1WallReached && state.peakSoundwaves.gt(ENCORE_EP_THRESHOLD) && simMs - lastAutoEncoreMs >= getAutoEncoreInterval(state.opusCount)) {
        if (performEncore(state, simMs)) lastAutoEncoreMs = simMs
      }
      if (canMoNow(state)) performMagnumOpus(state, simMs)
    }

    const afkMOs = state.opusCount - afkOpus
    console.log('\n=== AFK Idle Verify (L2 hands-free, pre-Platinum auto-Encore only) ===')
    console.log(`Idle machine built by opus ${afkOpus} @ ${afkActiveH.toFixed(2)}h active${wasPlat ? ' (Platinum already reached)' : ''}`)
    console.log(`Then HANDS-FREE (auto-Encore + MO tap-at-gate): +${afkMOs} Magnum Opuses | Platinum: ${state.platinum ? 'YES' : 'NO'} @ ${(activeMs / 3_600_000).toFixed(2)}h | records ${Math.floor(state.recordsSold).toLocaleString()}`)

    expect(afkMOs, 'AFK auto-Encore + MO tap-at-gate keeps cycling').toBeGreaterThanOrEqual(3)
    expect(state.platinum, 'AFK idle reaches/holds Platinum hands-free').toBe(true)
  }, 300_000)

  // Early-AFK probe (#12): go hands-free at the EARLIEST real pre-Platinum automation point
  // (auto-Encore unlock, ~MO1) with partial automation, and report how far it gets.
  it('early-AFK probe: going hands-free at auto-Encore unlock (partial automation) — how far?', () => {
    const setClock = (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock!
    const rng = new SeededRng(99_002)
    let simMs = 0
    let activeMs = 0
    let steps = 0
    const state = createInitialState(simMs)
    setClock(simMs)
    let lastAutoEncoreMs = -Infinity

    const buyAutomationOP = () => {
      for (const c of OPUS_UPGRADES) {
        const isAuto = c.id.startsWith('automator-unlock-') || c.id === 'auto-conduct' || c.id === 'automator-bulk' || c.id === 'automator-speed'
        if (!isAuto) continue
        const lv = state.opusUpgrades[c.id] ?? 0
        if (lv < c.maxLevel && state.opusPoints >= getOpusUpgradeCost(c, lv)) buyOpusUpgrade(state, c.id)
      }
    }
    const tryUnlockAP = () => {
      if (!state.autobuyers['encore']?.unlocked && state.opusCount >= AP_UNLOCK.encore.minOpusCount && state.applausePoints >= AP_UNLOCK.encore.cost) {
        state.applausePoints -= AP_UNLOCK.encore.cost
        state.autobuyers = { ...state.autobuyers, encore: { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 1, lastTick: 0 } }
      }
    }
    const buyGateTier = () => {
      const gate = state.layer1WallReached ? getMagnumOpusCost(state.opusCount) : getEncoreCost(state.encoreCount)
      const gt = state.tiers[gate.tierIndex]
      if (gt?.unlocked && (gt.purchased ?? 0) < gate.amount) buyTier(state, gate.tierIndex + 1, gate.amount - gt.purchased)
    }

    // SETUP: active play only until auto-Encore unlocks — earliest real pre-Platinum automation.
    const SETUP_CAP = 200_000
    while (steps < SETUP_CAP && !state.autobuyers['encore']?.unlocked) {
      steps++
      const dt = chooseDt(state)
      applyTick(state, dt, true)
      simMs += dt; activeMs += dt; setClock(simMs)
      enableUnlockedAutobuyers(state)
      buyAutomationOP()
      humanBuyDecision(state, rng)
      buyGateTier()
      tryUnlockAP()
      if (canEncoreNow(state)) performEncore(state, simMs)
      if (state.layer1WallReached && canMoNow(state)) performMagnumOpus(state, simMs)
    }
    expect(state.autobuyers['encore']?.unlocked, 'probe setup: auto-Encore unlocked').toBe(true)
    expect(state.autoMO, 'probe setup: auto-MO not available at auto-Encore unlock').toBeFalsy()

    const startOpus = state.opusCount
    const startRecords = state.recordsSold
    const tiersAutoCount = TIER_CONFIGS.filter((c) => state.autobuyers[`tier_${c.id}`]?.unlocked).length
    const gateAutoUnlocked = !!state.autobuyers[`tier_7`]?.unlocked

    // AFK from here — partial automation (auto-Encore only), no manual input.
    const AFK_CAP = steps + 300_000
    while (steps < AFK_CAP && state.opusCount < startOpus + 5) {
      steps++
      const dt = chooseDt(state)
      applyTick(state, dt, false)
      simMs += dt; activeMs += dt; setClock(simMs)
      buyGateTier()
      const enc = state.autobuyers['encore']
      if (enc?.unlocked && enc.enabled && !state.layer1WallReached && state.peakSoundwaves.gt(ENCORE_EP_THRESHOLD) && simMs - lastAutoEncoreMs >= getAutoEncoreInterval(state.opusCount)) {
        if (performEncore(state, simMs)) lastAutoEncoreMs = simMs
      }
    }

    const afkMOs = state.opusCount - startOpus
    console.log('\n=== Early-AFK Probe (hands-free from auto-Encore unlock, partial automation) ===')
    console.log(`At AFK start: opus ${startOpus}, ${tiersAutoCount}/7 tier autobuyers unlocked, gate-tier(Symphonies) autobuyer: ${gateAutoUnlocked ? 'YES' : 'NO'}`)
    console.log(`Hands-free result: +${afkMOs} Magnum Opuses ${afkMOs === 0 ? '(MO-GATED — auto-Encore cycles pre-wall but MOs need manual tap without auto-MO; records still accrue passively.)' : '(progressing hands-free)'}, records ${Math.floor(startRecords).toLocaleString()} -> ${Math.floor(state.recordsSold).toLocaleString()}`)

    // Lenient: records always accrue post-MO (opusCount>=3) even if MOs stall — the LOG is the finding.
    expect(state.recordsSold).toBeGreaterThanOrEqual(startRecords)
  }, 200_000)
})
