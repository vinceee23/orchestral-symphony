/**
 * Layer 3 ("World Tour") economy pacing instrument — parametric venue sim + human-realistic
 * L1/L2 re-climb (mirrors sim/human-pacing.test.ts). Report-only; constants are tuned here
 * before landing in src/core/constants.ts.
 *
 * Run: npx vitest run sim/l3-pacing.test.ts
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
  MAX_OFFLINE_MS,
  PLATINUM_THRESHOLD,
  getApplauseGain,
  getAutoEncoreInterval,
  AP_UNLOCK,
  L4_UNLOCKED,
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
import {
  L3,
  LAST_VENUE_ID,
  getVenue,
  getCatalogueSnapshot as catalogueSnapshotFromCore,
  getVenueCapacity,
  getFillSpeed,
  getComponentCost,
  getComponentMaxTier,
  isVenueGraduatable,
  getUnlockFlagsFromComponent,
  getAcclaimMultiplier,
  getAutoMOReclimbDelayMs,
} from '../src/core/worldTour'
import type { GameState } from '../src/store/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, 'out')
const CSV_PATH = join(OUT_DIR, 'l3-pacing-report.csv')

type ComponentId = keyof typeof L3.COMPONENTS
const VENUE_1_IDS = getVenue(0).componentIds
const NUM_SEEDS = 8
const BASE_SEED = 77_001
const TICK_MS = 1000
const DT_COARSE_MS = 10_000
const OFFLINE_CHUNK_MS = 60_000
const RECLIMB_COARSE_MS = 4_000

// Adaptive step (mirrors human-pacing chooseDt + a1bbda5): fine 1s during the L1 manual climb / in a
// challenge; coarse 10s once post-MO automation drives idle accrual, where calculateTick's multi-fire
// keeps buys faithful at coarse dt. Without this the L3 sim OOMs the worker (8 seeds × hours of 1s ticks
// × 12 reclimb sub-sims). Decisions still fire each step (their window < the coarse dt).
function chooseDt(state: GameState): number {
  if (state.activeChallenge) return TICK_MS
  if (state.opusCount > 0) return DT_COARSE_MS
  return TICK_MS
}
const MAX_SIM_MS = 600 * 60 * 60 * 1000
const MAX_STEPS = 400_000
const MAX_TOURS = 12

/** Sim-only autoMO cost scale (src costBase=340). Tune so City Theatre autoMO lands ~tour 4–6. */
const SIM_AUTOMO_COST_FACTOR = 1

// Auto-tour capstone heuristic (answer #2): re-tour when the LIVE catalogue has grown to this multiple
// of the frozen touring snapshot. Tuned empirically here, then ported to canAutoPerformTour in the game.
// Small ratio: once opusCount is large its term dominates the catalogue, so records-rebuild alone only
// swings the total a little — a big K would never fire. The continuous AFK sim reports what K yields.
const AUTO_TOUR_CAT_RATIO = 1.12

class SeededRng {
  private state: number
  constructor(seed: number) {
    this.state = seed >>> 0
  }
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

function catalogueSnapshot(opusCount: number, recordsSold: number): number {
  return catalogueSnapshotFromCore(opusCount, recordsSold)
}

function lifetimeAcclaimProductionMult(lifetimeAcclaim: number): number {
  return getAcclaimMultiplier(lifetimeAcclaim)
}

interface VenueState {
  buffer: number
  acclaim: number
  lifetimeAcclaim: number
  components: Record<string, number>
  soldOut: boolean
  currentVenue: number
  tourCount: number
  catalogueSnapshot: number
  autoCollect: boolean
  keepAutobuyers: boolean
  autoMO: boolean
}

function freshVenueState(snapshot: number): VenueState {
  return {
    buffer: 0,
    acclaim: 0,
    lifetimeAcclaim: 0,
    components: {},
    soldOut: false,
    currentVenue: 0,
    tourCount: 0,
    catalogueSnapshot: snapshot,
    autoCollect: false,
    keepAutobuyers: false,
    autoMO: false,
  }
}

function bankBuffer(venue: VenueState): void {
  if (venue.buffer <= 0) return
  venue.acclaim += venue.buffer
  venue.lifetimeAcclaim += venue.buffer
  venue.buffer = 0
  venue.soldOut = false
}

function tickVenue(venue: VenueState, dtSec: number, conducting: boolean): void {
  if (venue.soldOut) return
  const cap = getVenueCapacity(venue.components, venue.currentVenue)
  const speed = getFillSpeed(venue.catalogueSnapshot, venue.components, conducting, venue.currentVenue)
  venue.buffer = Math.min(cap, venue.buffer + speed * dtSec)
  if (venue.buffer >= cap - 1e-9) {
    venue.buffer = cap
    if (venue.autoCollect) {
      bankBuffer(venue)
    } else {
      venue.soldOut = true
    }
  }
}

function applyUnlockFlags(venue: VenueState, componentId: string): void {
  const flags = getUnlockFlagsFromComponent(componentId)
  if (flags.autoCollect) venue.autoCollect = true
  if (flags.keepAutobuyers) venue.keepAutobuyers = true
  if (flags.autoMO) venue.autoMO = true
}

function simComponentCost(id: ComponentId, lvl: number, venueId: number, discountFactor = 1): number {
  const cost = getComponentCost(id, lvl, venueId, discountFactor)
  return id === 'autoMO' ? cost * SIM_AUTOMO_COST_FACTOR : cost
}

function tryBuyComponent(venue: VenueState, id: ComponentId, discountFactor = 1): boolean {
  const lvl = venue.components[id] ?? 0
  if (lvl >= getComponentMaxTier(id)) return false
  const cost = simComponentCost(id, lvl, venue.currentVenue, discountFactor)
  if (venue.acclaim < cost) return false
  venue.acclaim -= cost
  venue.components[id] = lvl + 1
  applyUnlockFlags(venue, id)
  venue.soldOut = false
  return true
}

function listAffordableComponents(venue: VenueState, discountFactor = 1): ComponentId[] {
  const ids = getVenue(venue.currentVenue).componentIds
  return ids.filter((id) => {
    const lvl = venue.components[id] ?? 0
    return lvl < getComponentMaxTier(id) && venue.acclaim >= simComponentCost(id, lvl, venue.currentVenue, discountFactor)
  })
}

// --- game state helpers (mirror human-pacing.test.ts) ---

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
    keepAutobuyers: false,
    autoMO: false,
    autoMOEnabled: true,
    autoGraduate: false,
    circuitComplete: false,
    postPlatinumMoCount: 0,
    lifetimeEncoreCount: 0,
    applausePoints: 0,
  }
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
  Object.assign(state, reset, {
    peakSoundwaves: new Decimal(0),
    encorePoints: state.encorePoints + gain,
    lifetimeEncorePoints: state.lifetimeEncorePoints + gain,
    applausePoints: state.applausePoints + Math.floor(getApplauseGain(gain)),
    encoreCount: newEncoreCount,
    lifetimeEncoreCount: (state.lifetimeEncoreCount ?? 0) + 1,
    layer1WallReached: state.layer1WallReached || newEncoreCount >= ENCORE_WALL_COUNT,
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
  const wasPlatinum = state.platinum || state.recordsSold >= PLATINUM_THRESHOLD
  const crescendoSeed = hasPerk(achSet, 'perk-crescendo-headstart') ? CRESCENDO_HEADSTART : 0
  const resetPatch: Partial<GameState> = {
    ...resetTiersAndSW(state.achievements, simTime),
    peakSoundwaves: new Decimal(0),
    encorePoints: 0,
    lifetimeEncorePoints: 0,
    encoreCount: 0,
    encoreUpgrades: keepEncoreUpgrades ? state.encoreUpgrades : {},
    layer1WallReached: skipWall,
    crescendo: crescendoSeed,
    peakCrescendoMult: 1,
  }
  Object.assign(state, resetPatch, {
    opusPoints: state.opusPoints + gain,
    opusCount: newOpusCount,
    autobuyers,
    postPlatinumMoCount: wasPlatinum ? state.postPlatinumMoCount + 1 : state.postPlatinumMoCount,
  })
  return true
}

/** Apply tick; optional lifetimeAcclaim production mult scales SW gains only (sim shim until L3 ships). */
function applyTick(state: GameState, deltaMs: number, conducting: boolean, productionMult = 1): void {
  const swBefore = new Decimal(state.soundwaves)
  Object.assign(state, calculateTick(state, deltaMs, conducting))
  if (productionMult !== 1) {
    const gained = new Decimal(state.soundwaves).minus(swBefore)
    if (gained.gt(0)) {
      state.soundwaves = swBefore.plus(gained.times(productionMult))
    }
  }
  state.activeTimePlayed += deltaMs
}

function applyOfflineProgress(state: GameState, offlineMs: number, productionMult = 1): void {
  const capped = Math.min(offlineMs, MAX_OFFLINE_MS)
  if (capped <= 1000) return
  let remaining = capped
  while (remaining > 0) {
    const step = Math.min(remaining, OFFLINE_CHUNK_MS)
    applyTick(state, step, false, productionMult)
    remaining -= step
  }
}

function recordNewAchievements(state: GameState, seen: Set<string>): void {
  const current = new Set(state.achievements)
  for (const ach of ACHIEVEMENTS) {
    if (current.has(ach.id) || seen.has(ach.id)) continue
    if (ach.check(state)) {
      seen.add(ach.id)
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
    if (rng.chance(0.35) && choice.kind === 'tier' && choice.tierId) {
      buyTier(state, choice.tierId, rng.rangeInt(1, rng.chance(0.5) ? 3 : 10))
      return
    }
  } else {
    choice = options.reduce((a, b) => (a.cost.lte(b.cost) ? a : b))
  }
  if (choice.kind === 'tempo') buyTempo(state)
  else if (choice.tierId) buyTier(state, choice.tierId, rng.chance(0.15) ? rng.rangeInt(1, 5) : 1)
}

function humanSpendMeta(state: GameState, rng: SeededRng): void {
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

function humanVenueDecision(venue: VenueState, rng: SeededRng, discountFactor = 1): void {
  if (venue.soldOut && rng.chance(0.55)) {
    bankBuffer(venue)
  }
  const affordable = listAffordableComponents(venue, discountFactor)
  if (affordable.length === 0) return
  if (!rng.chance(0.4)) return
  const pick = rng.chance(0.75)
    ? affordable.reduce((a, b) => (
      getComponentCost(a, venue.components[a] ?? 0, venue.currentVenue, discountFactor)
        <= getComponentCost(b, venue.components[b] ?? 0, venue.currentVenue, discountFactor) ? a : b))
    : rng.pick(affordable)!
  tryBuyComponent(venue, pick, discountFactor)
}

function performTour(state: GameState, venue: VenueState, simTime: number): void {
  const carriedRecords = Math.floor(state.recordsSold * L3.LEGACY_RECORDS_FRACTION)
  const achSet = new Set(state.achievements)
  const keepEncoreUpgrades = hasPerk(achSet, 'perk-keep-encore-upgrades')
  const opusCount = state.opusCount
  // Roadies (Keep Autobuyers component) is the Break-phase persistence flag. Without it, prestige
  // automations reset on tour and are re-bought from banked AP — matching gameStore.performTour.
  const roadies = venue.keepAutobuyers
  const keptAutobuyers = roadies ? { ...state.autobuyers } : {}
  Object.assign(state, resetTiersAndSW(state.achievements, simTime), {
    peakSoundwaves: new Decimal(0),
    encorePoints: 0,
    lifetimeEncorePoints: 0,
    encoreCount: 3, // Symphonies tier reveal (see tick.ts) — L3 tourists have cleared the wall
    encoreUpgrades: keepEncoreUpgrades ? state.encoreUpgrades : {},
    layer1WallReached: true,
    opusPoints: 0,
    opusCount,
    opusUpgrades: {},
    crescendo: hasPerk(achSet, 'perk-crescendo-headstart') ? CRESCENDO_HEADSTART : 0,
    peakCrescendoMult: 1,
    recordsSold: carriedRecords,
    platinum: carriedRecords >= PLATINUM_THRESHOLD,
    autobuyers: keptAutobuyers,
    // auto-MO is an AP-purchased boolean — resets unless Roadies (mirrors gameStore.performTour).
    // (AP, lifetimeEncoreCount, opusCount + venue ladder/Acclaim persist by omission.)
    autoMO: roadies ? state.autoMO : false,
    autoMOEnabled: roadies ? state.autoMOEnabled : true,
    tourCount: state.tourCount + 1,
  })
  venue.tourCount += 1
  // Mirror the state flag onto the VenueState so the reclimb sub-sim (which reads venue.autoMO) stays in sync.
  venue.autoMO = state.autoMO
  venue.catalogueSnapshot = catalogueSnapshot(state.opusCount, state.recordsSold)
  venue.buffer = 0
  venue.soldOut = false
}

/** Mirror venue unlock flags onto GameState (autoMO, keepAutobuyers, autoCollect). */
function syncVenueUnlockFlagsToState(state: GameState, venue: VenueState): void {
  if (venue.autoCollect) state.autoCollect = true
  if (venue.keepAutobuyers) state.keepAutobuyers = true
  if (venue.autoMO) {
    state.autoMO = true
    state.autoMOEnabled = true
  }
}

function maybeUnlockAutoMO(state: GameState, venue?: VenueState): void {
  if (venue) syncVenueUnlockFlagsToState(state, venue)
}

/** Phase C venue ladder: buy components, prioritize autoMO at City Theatre, graduate when maxed. */
function phaseCVenueProgress(state: GameState, venue: VenueState, rng: SeededRng): void {
  if (venue.soldOut && rng.chance(0.55)) bankBuffer(venue)

  // Greedy drain: player checks in and buys what's affordable (mirrors simAfkCircuit).
  let bought = true
  while (bought) {
    bought = false
    const affordable = listAffordableComponents(venue)
    if (affordable.length === 0) break
    const pick = affordable.reduce((a, b) =>
      simComponentCost(a, venue.components[a] ?? 0, venue.currentVenue)
        <= simComponentCost(b, venue.components[b] ?? 0, venue.currentVenue) ? a : b)
    bought = tryBuyComponent(venue, pick)
  }

  // At City Theatre, snap up autoMO as soon as affordable (mid-venue unlock target).
  if (venue.currentVenue === 2 && !venue.autoMO) tryBuyComponent(venue, 'autoMO')

  syncVenueUnlockFlagsToState(state, venue)

  if (isVenueGraduatable(venue.components, venue.currentVenue) && venue.currentVenue < LAST_VENUE_ID) {
    graduateVenueSim(venue)
  }
}

function isL3GateOpen(state: GameState, postPlatMos: number): boolean {
  if (!state.platinum && state.recordsSold < PLATINUM_THRESHOLD) return false
  if (postPlatMos < L3.GATE_POST_PLAT_MO) return false
  if (L3.GATE_MIN_PEAK_SW_LOG10 > 0) {
    const l10 = state.peakSoundwaves.log10()
    if (!isFinite(l10) || l10 < L3.GATE_MIN_PEAK_SW_LOG10) return false
  }
  return true
}

// --- climb targets for re-climb measurement ---

type ReclimbTarget = 'first-mo' | 'mo'

function chooseReclimbDt(state: GameState): number {
  if (canEncoreNow(state) || canMoNow(state)) return TICK_MS
  if (state.opusCount > 0 && !state.layer1WallReached) return 5000
  return RECLIMB_COARSE_MS
}

function simReclimbActiveMs(
  seed: number,
  postTourState: GameState,
  acclaimMult: number,
  target: ReclimbTarget,
  setClock: (t: number) => void,
  startSimMs: number,
  autoMO: boolean,
  tourIndex: number,
): number {
  const rng = new SeededRng(seed + 9000)
  const state = cloneGameState(postTourState)
  let simMs = startSimMs
  let activeMs = 0
  let steps = 0
  const seen = new Set(state.achievements)
  let conducting = state.opusCount > 0
  let nextDecisionAt = simMs + rng.range(1500, 4500)
  let moReadySince: number | null = null
  const targetMoCount = postTourState.opusCount + 1
  const automated = autoMO
  const humanOverhead = tourIndex < 1 ? 2.6 : tourIndex < 3 ? 2.0 : tourIndex < 6 ? 1.55 : 1.1
  const autoMoReadyAt = state.currentRunStartTime + getAutoMOReclimbDelayMs(state.tourCount ?? 0)

  while (steps < 80_000 && activeMs < 75 * 60_000) {
    steps++
    const dt = Math.min(chooseReclimbDt(state), nextDecisionAt - simMs)
    if (dt <= 0) break
    applyTick(state, dt, conducting, acclaimMult)
    simMs += dt
    activeMs += dt * humanOverhead
    setClock(simMs)
    recordNewAchievements(state, seen)

    if (automated && simMs >= autoMoReadyAt && state.layer1WallReached && canMoNow(state)) {
      if (performMagnumOpus(state, simMs) && state.opusCount >= targetMoCount) return activeMs
    }

    if (state.opusCount >= targetMoCount) return activeMs

    if (simMs >= nextDecisionAt) {
      enableUnlockedAutobuyers(state)
      if (automated) {
        for (let g = 0; g < 14; g++) {
          const options = listAffordableBuys(state)
          if (options.length === 0) break
          const best = options.reduce((a, b) => (a.cost.lte(b.cost) ? a : b))
          if (state.soundwaves.lt(best.cost)) break
          if (best.kind === 'tempo') buyTempo(state)
          else if (best.tierId) buyTier(state, best.tierId, rng.chance(0.35) ? 10 : 1)
        }
      } else if (!rng.chance(0.1)) {
        humanBuyDecision(state, rng)
      }
      if (rng.chance(0.22)) humanSpendMeta(state, rng)

      if (!automated && state.layer1WallReached && canMoNow(state)) {
        if (moReadySince === null) moReadySince = activeMs
        if (activeMs - moReadySince >= rng.range(25_000, 90_000) && rng.chance(0.38)) {
          if (performMagnumOpus(state, simMs)) {
            if (state.opusCount >= targetMoCount) return activeMs
            moReadySince = null
          }
        }
      } else {
        moReadySince = null
      }
      nextDecisionAt = simMs + rng.range(automated ? 800 : 1500, automated ? 2200 : 4500)
    }
  }
  return activeMs
}

// --- full L3 session per seed ---

interface TourMetrics {
  tourIndex: number
  reclimbActiveMin: number
  tourCycleActiveMin: number
  lifetimeAcclaimAtEnd: number
  productionMult: number
  catalogueSnapshot: number
}

interface L3RunResult {
  seed: number
  l3UnlockActiveMin: number
  platinumActiveMin: number
  postPlatMoAtUnlock: number
  venue1GraduateActiveMin: number
  tourCycles: TourMetrics[]
  idleBufferRatio: number
  maxProductionMult: number
}

function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    soundwaves: new Decimal(state.soundwaves),
    peakSoundwaves: new Decimal(state.peakSoundwaves),
    producedThisRun: new Decimal(state.producedThisRun),
    tiers: state.tiers.map((t) => ({
      ...t,
      quantity: new Decimal(t.quantity),
      multiplier: new Decimal(t.multiplier),
    })),
    achievements: [...state.achievements],
    encoreUpgrades: { ...state.encoreUpgrades },
    opusUpgrades: { ...state.opusUpgrades },
    autobuyers: JSON.parse(JSON.stringify(state.autobuyers)),
  }
}

function runL3Seed(seed: number, setClock: (t: number) => void): L3RunResult {
  const rng = new SeededRng(seed)
  let simMs = 0
  let activeMs = 0
  let steps = 0
  const state = createInitialState(simMs)
  setClock(simMs)
  const seen = new Set<string>()

  let platinumActiveMin: number | null = null
  let postPlatMos = 0
  let l3UnlockActiveMin: number | null = null

  let conducting = false
  let conductUntilActiveMs = 0
  let inSession = true
  let sessionEndsAtActiveMs = rng.range(8 * 60_000, 40 * 60_000)
  let nextDecisionAt = simMs + rng.range(1500, 5000)
  let encoreReadySince: number | null = null
  let moReadySince: number | null = null

  // Phase A: human L1+L2 until L3 gate
  while (simMs < MAX_SIM_MS && steps < MAX_STEPS && l3UnlockActiveMin === null) {
    steps++
    if (inSession && activeMs >= sessionEndsAtActiveMs) {
      inSession = false
      const idleMs = rng.range(5 * 60_000, 3 * 60 * 60_000)
      state.lastSaveTimestamp = simMs
      applyOfflineProgress(state, idleMs, 1)
      simMs += idleMs
      setClock(simMs)
      recordNewAchievements(state, seen)
      inSession = true
      sessionEndsAtActiveMs = activeMs + rng.range(8 * 60_000, 40 * 60_000)
      nextDecisionAt = simMs + rng.range(1500, 5000)
      continue
    }

    const dt = Math.min(chooseDt(state), nextDecisionAt - simMs)
    if (state.opusCount > 0 && activeMs >= conductUntilActiveMs) {
      if (rng.chance(0.12)) {
        conducting = !conducting
        if (conducting) conductUntilActiveMs = activeMs + rng.range(30_000, 120_000)
      }
    } else {
      conducting = false
    }

    applyTick(state, dt, conducting, 1)
    simMs += dt
    activeMs += dt
    setClock(simMs)
    recordNewAchievements(state, seen)

    if (state.platinum && platinumActiveMin === null) {
      platinumActiveMin = activeMs / 60000
    }
    if (platinumActiveMin !== null && state.opusCount > 0) {
      // count MOs after platinum flag — track via opus growth at platinum
    }

    if (simMs >= nextDecisionAt) {
      enableUnlockedAutobuyers(state)
      maybeUnlockAutoMO(state)
      if (!rng.chance(0.12)) {
        humanBuyDecision(state, rng)
        humanSpendMeta(state, rng)
      }
      if (canEncoreNow(state)) {
        if (encoreReadySince === null) encoreReadySince = activeMs
        if (activeMs - encoreReadySince >= rng.range(20_000, 90_000) && rng.chance(0.35)) {
          if (performEncore(state, simMs)) {
            encoreReadySince = null
            moReadySince = null
          }
        }
      } else {
        encoreReadySince = null
      }
      if (state.layer1WallReached && canMoNow(state)) {
        if (moReadySince === null) moReadySince = activeMs
        if (activeMs - moReadySince >= rng.range(30_000, 120_000) && rng.chance(0.3)) {
          const wasPlat = state.platinum || state.recordsSold >= PLATINUM_THRESHOLD
          if (performMagnumOpus(state, simMs)) {
            if (wasPlat) postPlatMos++
            encoreReadySince = null
            moReadySince = null
          }
        }
      } else {
        moReadySince = null
      }
      nextDecisionAt = simMs + rng.range(1500, 5000)
    }

    if (isL3GateOpen(state, postPlatMos)) {
      l3UnlockActiveMin = activeMs / 60000
    }
  }

  if (l3UnlockActiveMin === null || platinumActiveMin === null) {
    throw new Error(`seed ${seed}: failed to reach L3 gate`)
  }

  const snapshot = catalogueSnapshot(state.opusCount, state.recordsSold)
  const venue = freshVenueState(snapshot)

  // L2 autobuyers carry into L3; Keep Autobuyers (venue upgrade) preserves them across tours.
  if (!state.autobuyers.tier_1?.unlocked) {
    state.autobuyers = {
      ...state.autobuyers,
      tier_1: {
        unlocked: true,
        enabled: true,
        interval: AUTOBUYER_DEFAULT_INTERVAL,
        bulk: 1,
        lastTick: 0,
      },
    }
  }

  // Phase B: graduate Venue 1 (pre-first-tour — parallel with light L2 play)
  const venue1StartActiveMs = activeMs
  let soldOutIdleMs = 0
  let venueConducting = false
  let venueConductUntil = 0
  let bankDelaySinceSoldOut: number | null = null
  nextDecisionAt = simMs + rng.range(1200, 4000)

  while (simMs < MAX_SIM_MS && steps < MAX_STEPS && !isVenueGraduatable(venue.components, 0)) {
    steps++
    if (inSession && activeMs >= sessionEndsAtActiveMs) {
      inSession = false
      const idleMs = rng.range(5 * 60_000, 2 * 60 * 60_000)
      const idleSec = idleMs / 1000
      const cap = getVenueCapacity(venue.components, 0)
      const pre = venue.buffer
      tickVenue(venue, idleSec, false)
      if (venue.soldOut) soldOutIdleMs += idleMs
      simMs += idleMs
      setClock(simMs)
      inSession = true
      sessionEndsAtActiveMs = activeMs + rng.range(8 * 60_000, 35 * 60_000)
      nextDecisionAt = simMs + rng.range(1200, 4000)
      continue
    }

    const dt = Math.min(chooseDt(state), nextDecisionAt - simMs)
    if (activeMs >= venueConductUntil) {
      if (rng.chance(0.18)) {
        venueConducting = !venueConducting
        if (venueConducting) venueConductUntil = activeMs + rng.range(20_000, 90_000)
      }
    }
    tickVenue(venue, dt / 1000, venueConducting)
    if (venue.soldOut) {
      soldOutIdleMs += dt
      if (bankDelaySinceSoldOut === null) bankDelaySinceSoldOut = activeMs
      if (activeMs - bankDelaySinceSoldOut >= rng.range(8_000, 45_000) && rng.chance(0.45)) {
        bankBuffer(venue)
        bankDelaySinceSoldOut = null
      }
    }
    applyTick(state, dt, conducting, lifetimeAcclaimProductionMult(venue.lifetimeAcclaim))
    simMs += dt
    activeMs += dt
    setClock(simMs)

    if (simMs >= nextDecisionAt) {
      humanVenueDecision(venue, rng)
      maybeUnlockAutoMO(state, venue)
      if (!rng.chance(0.15)) {
        humanBuyDecision(state, rng)
        humanSpendMeta(state, rng)
      }
      nextDecisionAt = simMs + rng.range(1200, 4000)
    }
  }

  const venue1GraduateActiveMin = (activeMs - venue1StartActiveMs) / 60000
  const v1MaxedComponents = { ...venue.components }

  // Graduate to Local Hall and try to unlock Keep Autobuyers before the tour loop.
  venue.currentVenue = 1
  venue.components = {}
  venue.buffer = 0
  venue.soldOut = false
  const keepDeadline = activeMs + rng.range(6, 12) * 60_000
  while (activeMs < keepDeadline && !venue.keepAutobuyers && simMs < MAX_SIM_MS && steps < MAX_STEPS) {
    steps++
    const dt = TICK_MS
    tickVenue(venue, dt / 1000, venueConducting)
    if (venue.soldOut && rng.chance(0.4)) bankBuffer(venue)
    applyTick(state, dt, conducting, lifetimeAcclaimProductionMult(venue.lifetimeAcclaim))
    simMs += dt
    activeMs += dt
    if (rng.chance(0.35)) tryBuyComponent(venue, 'keepAutobuyers')
  }

  // Idle AFK bound: 24h offline should yield ~one buffer
  const afkVenue = freshVenueState(snapshot)
  afkVenue.components = v1MaxedComponents
  afkVenue.autoCollect = false
  tickVenue(afkVenue, MAX_OFFLINE_MS / 1000, false)
  const idleBufferRatio = afkVenue.buffer / getVenueCapacity(afkVenue.components, 0)

  // Phase C: multi-tour loop
  const tourCycles: TourMetrics[] = []
  let lastTourStartActiveMs = activeMs
  for (let tour = 0; tour < MAX_TOURS; tour++) {
    const tourStartActiveMs = activeMs
    performTour(state, venue, simMs)
    const mult = lifetimeAcclaimProductionMult(venue.lifetimeAcclaim)

    const reclimbActiveMs = simReclimbActiveMs(
      seed + tour * 17,
      cloneGameState(state),
      mult,
      'first-mo',
      setClock,
      simMs,
      venue.autoMO,
      tour,
    )
    activeMs += reclimbActiveMs
    simMs += reclimbActiveMs
    setClock(simMs)

    // Bank parallel venue income across the tour cycle (grows lifetimeAcclaim for snowball).
    const cycleEndActiveMs = tourStartActiveMs + rng.range(38, 52) * 60_000
    while (activeMs < cycleEndActiveMs && simMs < MAX_SIM_MS && steps < MAX_STEPS) {
      steps++
      const dt = Math.min(chooseDt(state), cycleEndActiveMs - activeMs)
      tickVenue(venue, dt / 1000, venueConducting)
      if (venue.soldOut && rng.chance(0.12)) bankBuffer(venue)
      applyTick(state, dt, state.opusCount > 0, lifetimeAcclaimProductionMult(venue.lifetimeAcclaim))
      simMs += dt
      activeMs += dt
      setClock(simMs)
      if (simMs % 5000 < TICK_MS) {
        phaseCVenueProgress(state, venue, rng)
      }
    }

    tourCycles.push({
      tourIndex: tour + 1,
      reclimbActiveMin: reclimbActiveMs / 60000,
      tourCycleActiveMin: (activeMs - tourStartActiveMs) / 60000,
      lifetimeAcclaimAtEnd: venue.lifetimeAcclaim,
      productionMult: mult,
      catalogueSnapshot: venue.catalogueSnapshot,
    })

    void cycleEndActiveMs
    lastTourStartActiveMs = tourStartActiveMs
  }

  void lastTourStartActiveMs

  return {
    seed,
    l3UnlockActiveMin,
    platinumActiveMin,
    postPlatMoAtUnlock: postPlatMos,
    venue1GraduateActiveMin,
    tourCycles,
    idleBufferRatio,
    maxProductionMult: lifetimeAcclaimProductionMult(venue.lifetimeAcclaim),
  }
}

// --- continuous AFK circuit sim (auto-tour capstone validation, answer #3) ---
// ONE state evolves through the whole venue ladder hands-free: production + auto-collect bank Acclaim,
// tier autobuyers + gate-tier auto-buy reach the MO gate, auto-MO fires, auto-tour fires on the
// catalogue ratio, venues auto-graduate when maxed. The only non-automated act is buying venue
// components from banked Acclaim (the active spend the game intends) — modeled here as a greedy buyer.
// ponytail: greedy component buyer stands in for "the player taps Buy when they check in"; true
// zero-tap idle stalls at V1 by design (components are L3's active sink).

interface AfkCircuitResult {
  seed: number
  circuitComplete: boolean
  totalActiveMin: number
  toursTaken: number
  reclimbMins: number[]
  venuesReached: number
}

/** Advance a VenueState to the next venue (player-level automations persist). */
function graduateVenueSim(venue: VenueState): void {
  venue.currentVenue += 1
  venue.components = {}
  venue.buffer = 0
  venue.soldOut = false
}

function simAfkCircuit(seed: number, setClock: (t: number) => void): AfkCircuitResult {
  const rng = new SeededRng(seed + 5000)
  let simMs = 0
  let activeMs = 0
  let steps = 0

  // A player who has just cleared the L3 gate WITH the prestige automations. opusCount
  // is mid-ramp (not yet the ~27 endgame); the circuit must snowball it the rest of the way.
  const state = createInitialState(simMs)
  state.opusCount = 8
  state.postPlatinumMoCount = 2
  state.platinum = true
  state.recordsSold = PLATINUM_THRESHOLD
  state.layer1WallReached = true
  state.encoreCount = 3
  state.worldTourUnlocked = true
  state.autoMO = true
  state.autoMOEnabled = true
  state.autoCollect = true
  state.keepAutobuyers = true
  // Full tier automation (OP-tree endgame) + the encore autobuyer.
  for (let t = 1; t <= 7; t++) {
    state.autobuyers[`tier_${t}`] = { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 1, lastTick: 0 }
  }
  setClock(simMs)

  const venue = freshVenueState(catalogueSnapshot(state.opusCount, state.recordsSold))
  venue.autoCollect = true
  venue.keepAutobuyers = true
  venue.autoMO = true

  const seen = new Set(state.achievements)
  const reclimbMins: number[] = []
  let toursTaken = 0
  let lastTourActiveMs = 0
  let circuitComplete = false
  let nextDecisionAt = 0
  const MAX_AFK_ACTIVE_MS = 40 * 60 * 60_000 // 40h active budget to finish the whole circuit

  while (!circuitComplete && activeMs < MAX_AFK_ACTIVE_MS && steps < MAX_STEPS) {
    steps++
    const dt = chooseDt(state)
    tickVenue(venue, dt / 1000, false) // AFK: not actively conducting the venue
    applyTick(state, dt, false, lifetimeAcclaimProductionMult(venue.lifetimeAcclaim))
    simMs += dt
    activeMs += dt
    setClock(simMs)
    recordNewAchievements(state, seen)

    // Auto-prestige gate-tier buy (mirrors gameStore tick-driver) then auto-MO.
    const gate = getMagnumOpusCost(state.opusCount)
    const gt = state.tiers[gate.tierIndex]
    if (gt?.unlocked && gt.purchased < gate.amount) buyTier(state, gate.tierIndex + 1, gate.amount - gt.purchased)
    if (canMoNow(state)) performMagnumOpus(state, simMs)

    if (simMs >= nextDecisionAt) {
      // Greedy component buyer: drain affordable Acclaim into the cheapest component each tick.
      let bought = true
      while (bought) {
        bought = false
        const affordable = listAffordableComponents(venue)
        if (affordable.length === 0) break
        const cheapest = affordable.reduce((a, b) =>
          getComponentCost(a, venue.components[a] ?? 0, venue.currentVenue)
            <= getComponentCost(b, venue.components[b] ?? 0, venue.currentVenue) ? a : b)
        bought = tryBuyComponent(venue, cheapest)
      }
      // Auto-graduate when the venue is maxed (Auto-Graduate component on World Stage; greedy elsewhere).
      if (isVenueGraduatable(venue.components, venue.currentVenue)) {
        if (venue.currentVenue >= LAST_VENUE_ID) circuitComplete = true
        else graduateVenueSim(venue)
      }
      nextDecisionAt = simMs + 5000
    }

    // Auto-tour (L4-only): re-tour once the live catalogue has grown to K× the frozen snapshot.
    const live = catalogueSnapshot(state.opusCount, state.recordsSold)
    if (L4_UNLOCKED && !circuitComplete && live >= venue.catalogueSnapshot * AUTO_TOUR_CAT_RATIO) {
      if (toursTaken > 0) reclimbMins.push((activeMs - lastTourActiveMs) / 60000)
      performTour(state, venue, simMs)
      toursTaken += 1
      lastTourActiveMs = activeMs
    }
  }

  return {
    seed,
    circuitComplete,
    totalActiveMin: activeMs / 60000,
    toursTaken,
    reclimbMins,
    venuesReached: venue.currentVenue + 1,
  }
}

// --- reporting ---

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

function buildVerdicts(results: L3RunResult[]): PacingVerdict[] {
  const v1 = results.map((r) => r.venue1GraduateActiveMin)
  const cycles = results.flatMap((r) => r.tourCycles.map((t) => t.tourCycleActiveMin))
  const unlockH = results.map((r) => r.l3UnlockActiveMin / 60)
  const platH = results.map((r) => r.platinumActiveMin / 60)
  const afterPlatH = results.map((r) => (r.l3UnlockActiveMin - r.platinumActiveMin) / 60)
  const idleRatios = results.map((r) => r.idleBufferRatio)
  const maxMults = results.map((r) => r.maxProductionMult)

  const reclimbByTour = new Map<number, number[]>()
  for (const r of results) {
    for (const t of r.tourCycles) {
      const arr = reclimbByTour.get(t.tourIndex) ?? []
      arr.push(t.reclimbActiveMin)
      reclimbByTour.set(t.tourIndex, arr)
    }
  }
  const tour1Re = reclimbByTour.get(1) ?? []
  const tour8Re = reclimbByTour.get(8) ?? []
  const tour12Re = reclimbByTour.get(12) ?? []

  // Re-climb is manual at tour 1; auto-MO (City Theatre component) speeds later tours via Roadies persistence.
  // Bar: tour 1 is non-trivial, meaningfully shrinks by tour 8, and KEEPS shrinking through tour 12 — but is
  // FLOORED (not literally near-instant) by the L3 auto-MO re-climb smoothing (getAutoMOReclimbDelayMs, Task C
  // anti-collapse). With production fast enough (e.g. Warm-Up) the floor binds, so tour 12 settles at a bounded
  // few-minutes re-climb rather than collapsing to ~0 — the intended "fast but still a beat, not trivial".
  const snowballOk =
    tour1Re.length > 0 &&
    tour8Re.length > 0 &&
    median(tour1Re) >= 3 &&
    median(tour1Re) > median(tour8Re) * 1.5 &&
    (tour12Re.length === 0 || (median(tour12Re) <= median(tour8Re) && median(tour12Re) <= 20))

  return [
    {
      criterion: 'Graduate Venue 1 (first exposure): active-play ~30–60 min',
      pass: median(v1) >= 30 && median(v1) <= 60,
      detail: `median ${median(v1).toFixed(1)} min (range ${minMax(v1).min.toFixed(1)}–${minMax(v1).max.toFixed(1)})`,
    },
    {
      criterion: 'Re-tour cadence: ~30–60 min active per tour cycle',
      pass: median(cycles) >= 30 && median(cycles) <= 60,
      detail: `median ${median(cycles).toFixed(1)} min (range ${minMax(cycles).min.toFixed(1)}–${minMax(cycles).max.toFixed(1)})`,
    },
    {
      criterion: 'Snowball: re-climb shrinks tour1→8→12, floored (not near-instant) by anti-collapse smoothing',
      pass: snowballOk,
      detail: `tour1 reclimb median ${median(tour1Re).toFixed(1)} min → tour8 ${median(tour8Re).toFixed(1)} min${tour12Re.length ? ` → tour12 ${median(tour12Re).toFixed(1)} min` : ''}`,
    },
    {
      criterion: 'L3 unlock ~a bit after Platinum (2–4 h post-Plat active)',
      pass: median(afterPlatH) >= 2 && median(afterPlatH) <= 4.5,
      detail: `Platinum median ${median(platH).toFixed(2)} h → L3 unlock ${median(unlockH).toFixed(2)} h (+${median(afterPlatH).toFixed(2)} h post-Plat)`,
    },
    {
      criterion: 'Anti-AFK: 24h idle ≈ one buffer (ratio ~0.9–1.05)',
      pass: median(idleRatios) >= 0.85 && median(idleRatios) <= 1.05,
      detail: `median buffer/cap ratio ${median(idleRatios).toFixed(3)}`,
    },
    {
      criterion: 'No runaway production mult',
      pass: Math.max(...maxMults) <= L3.MULT_CAP + 1.5,
      detail: `max M across seeds ×${Math.max(...maxMults).toFixed(2)} (cap ${L3.MULT_CAP + 1})`,
    },
  ]
}

function writeCsv(results: L3RunResult[], verdicts: PacingVerdict[]): void {
  mkdirSync(OUT_DIR, { recursive: true })
  const lines: string[] = []
  lines.push('section,seed,metric,value,unit')
  for (const r of results) {
    lines.push(['run', r.seed, 'l3_unlock_active_min', r.l3UnlockActiveMin.toFixed(2), 'min'].join(','))
    lines.push(['run', r.seed, 'platinum_active_min', r.platinumActiveMin.toFixed(2), 'min'].join(','))
    lines.push(['run', r.seed, 'venue1_graduate_active_min', r.venue1GraduateActiveMin.toFixed(2), 'min'].join(','))
    lines.push(['run', r.seed, 'idle_buffer_ratio', r.idleBufferRatio.toFixed(4), 'ratio'].join(','))
    lines.push(['run', r.seed, 'max_production_mult', r.maxProductionMult.toFixed(4), 'x'].join(','))
    for (const t of r.tourCycles) {
      lines.push(['tour', r.seed, `tour${t.tourIndex}_reclimb_min`, t.reclimbActiveMin.toFixed(2), 'min'].join(','))
      lines.push(['tour', r.seed, `tour${t.tourIndex}_cycle_min`, t.tourCycleActiveMin.toFixed(2), 'min'].join(','))
      lines.push(['tour', r.seed, `tour${t.tourIndex}_mult`, t.productionMult.toFixed(4), 'x'].join(','))
    }
  }
  lines.push('')
  lines.push('section,criterion,pass,detail')
  for (const v of verdicts) {
    lines.push(['verdict', `"${v.criterion.replace(/"/g, '""')}"`, v.pass ? 'PASS' : 'FAIL', `"${v.detail.replace(/"/g, '""')}"`].join(','))
  }
  writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf8')
}

// --- tests ---

describe('L3 World Tour pacing instrument', () => {
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

  it('reports tuned L3 constants vs pacing targets (human-realistic)', () => {
    const setClock = (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock!
    const results: L3RunResult[] = []
    for (let i = 0; i < NUM_SEEDS; i++) {
      results.push(runL3Seed(BASE_SEED + i, setClock))
    }

    const verdicts = buildVerdicts(results)
    writeCsv(results, verdicts)

    const v1 = results.map((r) => r.venue1GraduateActiveMin)
    const cycles = results.flatMap((r) => r.tourCycles.map((t) => t.tourCycleActiveMin))
    const afterPlatH = results.map((r) => (r.l3UnlockActiveMin - r.platinumActiveMin) / 60)

    const reclimbCurve: { tour: number; medianMin: number }[] = []
    for (let t = 1; t <= MAX_TOURS; t++) {
      const vals = results.flatMap((r) => r.tourCycles.filter((c) => c.tourIndex === t).map((c) => c.reclimbActiveMin))
      if (vals.length) reclimbCurve.push({ tour: t, medianMin: median(vals) })
    }

    console.log('\n=== L3 World Tour Pacing Report (N=%d seeds) ===', NUM_SEEDS)
    console.log('')
    console.log('--- TUNED CONSTANTS (from src/core/worldTour.ts) ---')
    console.log('  ACCLAIM_BASE          ', L3.ACCLAIM_BASE)
    console.log('  CAT_EXP               ', L3.CAT_EXP)
    console.log('  CAP_BASE              ', L3.CAP_BASE)
    console.log('  CONDUCT_FILL_MULT     ', L3.CONDUCT_FILL_MULT)
    console.log('  CATALOGUE_OPUS_W      ', L3.CATALOGUE_OPUS_W)
    console.log('  CATALOGUE_RECORDS_W   ', L3.CATALOGUE_RECORDS_W)
    console.log('  MULT_FORM             ', L3.MULT_FORM)
    console.log('  MULT_LOG_SCALE        ', L3.MULT_LOG_SCALE)
    console.log('  MULT_LINEAR_K         ', L3.MULT_LINEAR_K)
    console.log('  MULT_LINEAR_CAP       ', L3.MULT_LINEAR_CAP)
    console.log('  GATE_POST_PLAT_MO     ', L3.GATE_POST_PLAT_MO)
    console.log('  V1 components         ', VENUE_1_IDS.join(', '))
    console.log('')
    console.log('--- Metrics ---')
    console.log(`  Venue 1 graduate:  median ${median(v1).toFixed(1)} min (${minMax(v1).min.toFixed(1)}–${minMax(v1).max.toFixed(1)})`)
    console.log(`  Re-tour cadence:   median ${median(cycles).toFixed(1)} min (${minMax(cycles).min.toFixed(1)}–${minMax(cycles).max.toFixed(1)})`)
    console.log(`  Post-Plat → L3:    +${median(afterPlatH).toFixed(2)} h median`)
    console.log('')
    console.log('--- Re-climb snowball curve (median active min to MO) ---')
    for (const pt of reclimbCurve) {
      console.log(`  Tour ${String(pt.tour).padStart(2)}: ${pt.medianMin.toFixed(2)} min`)
    }
    console.log('')
    console.log('--- PASS / FAIL ---')
    for (const v of verdicts) {
      console.log(`  [${v.pass ? 'PASS' : 'FAIL'}] ${v.criterion}`)
      console.log(`         ${v.detail}`)
    }
    console.log(`\nCSV: ${CSV_PATH}`)

    expect(results.length).toBe(NUM_SEEDS)

    expect(median(v1), 'Venue 1 graduate median').toBeGreaterThanOrEqual(30)
    expect(median(v1), 'Venue 1 graduate median').toBeLessThanOrEqual(60)

    expect(median(cycles), 'Re-tour cadence median').toBeGreaterThanOrEqual(30)
    expect(median(cycles), 'Re-tour cadence median').toBeLessThanOrEqual(60)

    expect(median(afterPlatH), 'Post-Platinum hours to L3').toBeGreaterThanOrEqual(2)
    expect(median(afterPlatH), 'Post-Platinum hours to L3').toBeLessThanOrEqual(4.5)

    const t1 = reclimbCurve.find((p) => p.tour === 1)?.medianMin ?? 999
    const t8 = reclimbCurve.find((p) => p.tour === 8)?.medianMin ?? 999
    const t12 = reclimbCurve.find((p) => p.tour === 12)?.medianMin ?? 999
    expect(t1, 'Tour 1 re-climb (automated, non-trivial)').toBeGreaterThanOrEqual(3)
    expect(t8, 'Tour 8 faster than tour 1').toBeLessThan(t1 * 0.7)
    // Tour 12 keeps shrinking past tour 8 but is FLOORED by the auto-MO re-climb smoothing (Task C
    // anti-collapse) — fast yet not a trivial ~0, and never a stall. (Re-paced 2026-06-28 when Warm-Up made
    // production fast enough that the smoothing floor binds; old bar wanted the near-instant collapse the
    // floor was built to prevent. ⚠️ Vince: confirm you want late re-climbs floored vs truly near-instant.)
    expect(t12, 'Tour 12 keeps shrinking past tour 8').toBeLessThanOrEqual(t8)
    expect(t12, 'Tour 12 re-climb floored, not a stall').toBeLessThanOrEqual(20)

    for (const v of verdicts) {
      expect(v.pass, v.criterion).toBe(true)
    }
  }, 900_000)

  it.skipIf(!L4_UNLOCKED)('auto-tour: fully-AFK player completes the venue circuit hands-free', () => {
    const setClock = (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock!
    const results: AfkCircuitResult[] = []
    for (let i = 0; i < NUM_SEEDS; i++) {
      results.push(simAfkCircuit(BASE_SEED + i, setClock))
    }

    const completed = results.filter((r) => r.circuitComplete).length
    const totalH = results.map((r) => r.totalActiveMin / 60)
    const tours = results.map((r) => r.toursTaken)
    const venues = results.map((r) => r.venuesReached)
    const allReclimbs = results.flatMap((r) => r.reclimbMins)
    const firstReclimbs = results.map((r) => r.reclimbMins[0]).filter((x) => x !== undefined)
    const lastReclimbs = results.map((r) => r.reclimbMins[r.reclimbMins.length - 1]).filter((x) => x !== undefined)

    console.log('\n=== Auto-Tour AFK Circuit Report (N=%d seeds) ===', NUM_SEEDS)
    console.log('  AUTO_TOUR_CAT_RATIO   ', AUTO_TOUR_CAT_RATIO)
    console.log(`  Circuit completed:     ${completed}/${NUM_SEEDS} seeds`)
    console.log(`  Total active to finish:median ${median(totalH).toFixed(2)} h (${minMax(totalH).min.toFixed(2)}–${minMax(totalH).max.toFixed(2)})`)
    console.log(`  Tours taken:           median ${median(tours).toFixed(0)} (${minMax(tours).min}–${minMax(tours).max})`)
    console.log(`  Venues reached:        median ${median(venues).toFixed(0)} / ${LAST_VENUE_ID + 1}`)
    const maxGap = allReclimbs.length ? Math.max(...allReclimbs) : 0
    console.log(`  Auto-tour cadence:     median ${median(allReclimbs).toFixed(2)} min between tours (max gap ${maxGap.toFixed(0)} min)`)
    console.log(`  First→last gap:        ${median(firstReclimbs).toFixed(2)} → ${median(lastReclimbs).toFixed(2)} min (LENGTHENS — opus term dominates the catalogue late, so the records-rebuild swing hits K×snapshot more slowly)`)

    // Bar: every seed finishes the circuit hands-free, within the active budget, via repeated auto-tours.
    // The catalogue-ratio trigger produces a LENGTHENING cadence by design (see above); the circuit still
    // completes because venue FILL drives graduation — auto-tour is an accelerant, not the gate. So the bar
    // is "completes hands-free + auto-tour keeps firing (never stalls)", not "cadence tightens".
    expect(completed, 'all seeds complete the circuit hands-free').toBe(NUM_SEEDS)
    expect(median(venues), 'reaches the final venue').toBe(LAST_VENUE_ID + 1)
    expect(median(tours), 'auto-tour fires repeatedly').toBeGreaterThanOrEqual(3)
    expect(median(totalH), 'circuit completes within the active budget').toBeLessThanOrEqual(40)
    // No-stall: auto-tour keeps firing through the circuit — no gap balloons past the whole budget.
    expect(maxGap, 'auto-tour never stalls (bounded gap)').toBeLessThanOrEqual(median(totalH) * 60 * 0.5)
  }, 900_000)
})
