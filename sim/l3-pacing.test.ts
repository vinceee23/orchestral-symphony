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
import type { GameState } from '../src/store/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, 'out')
const CSV_PATH = join(OUT_DIR, 'l3-pacing-report.csv')

// =============================================================================
// TUNED L3 CONSTANTS — drop these into src/core when implementing World Tour
// =============================================================================
export const L3 = {
  /** Base acclaim accrual before catalogue / component multipliers (acclaim per second). */
  ACCLAIM_BASE: 0.168,
  /** Catalogue snapshot exponent — sublinear so late catalogue doesn't explode rate. */
  CAT_EXP: 0.62,
  /** Per Instruments tier: rate *= (1 + level * INSTR_PER). */
  INSTR_PER: 0.2,
  /** Venue buffer capacity at roof level 0. */
  CAP_BASE: 88,
  /** Per Roof tier: cap *= (1 + level * ROOF_PER). */
  ROOF_PER: 0.48,
  /** Per Lighting tier: fill speed *= (1 + level * LIGHT_FILL_PER). */
  LIGHT_FILL_PER: 0.24,
  /** Space-hold conducting multiplier on fill speed (not on rate). */
  CONDUCT_FILL_MULT: 1.75,
  /** Max discrete tiers per visual component (~5). */
  MAX_COMPONENT_TIER: 5,
  /** Graduate Venue 1 when every component reaches this tier (not full max). */
  GRADUATE_MIN_TIER: 3,
  /** Alternative bar: graduate if sum(component levels) >= this (unused when MIN_TIER mode). */
  GRADUATE_TOTAL_LEVELS: 9,
  /** catalogueSnapshot = OPUS_W * opusCount + RECORDS_W * (recordsSold / PLATINUM_THRESHOLD). */
  CATALOGUE_OPUS_W: 1.15,
  CATALOGUE_RECORDS_W: 2.2,
  /**
   * Production multiplier from lifetimeAcclaim (capped log + linear — anti-runaway):
   *   M = 1 + min(LOG_MULT * log10(1 + LA * LOG_SCALE) + min(LA * LINEAR_K, LINEAR_CAP), MULT_CAP)
   */
  MULT_FORM: 'capped-log' as const,
  MULT_LOG_SCALE: 0.022,
  MULT_LOG_MULT: 0.72,
  MULT_LINEAR_K: 0.00032,
  MULT_LINEAR_CAP: 36,
  MULT_CAP: 48,
  /** Hybrid L3 gate: must be Platinum AND have this many post-Platinum Magnum Opuses. */
  GATE_POST_PLAT_MO: 2,
  /** Optional SW floor at gate (0 = difficulty-only via MO count). */
  GATE_MIN_PEAK_SW_LOG10: 0,
  /** Venue-1 special: cheap Keep Autobuyers (acclaim cost). */
  KEEP_AUTOBUYERS_COST: 165,
  /** Tour index after which Auto-MO is available (buys automatically in reclimb). */
  AUTO_MO_FROM_TOUR: 2,
  /** Per-component upgrade costs in spendable Acclaim. */
  COMPONENTS: {
    roof: { costBase: 215, costGrowth: 2.34 },
    lighting: { costBase: 185, costGrowth: 2.28 },
    instruments: { costBase: 235, costGrowth: 2.4 },
  } as const,
  /** Legacy perk softens tour reset: fraction of recordsSold carried into next tour snapshot. */
  LEGACY_RECORDS_FRACTION: 0.12,
} as const

type ComponentId = keyof typeof L3.COMPONENTS

// --- sim harness ---
const NUM_SEEDS = 8
const BASE_SEED = 77_001
const TICK_MS = 1000
const RECLIMB_COARSE_MS = 4_000
const MAX_SIM_MS = 600 * 60 * 60 * 1000
const MAX_STEPS = 400_000
const MAX_TOURS = 12

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

// --- L3 economy (parametric) ---

export function catalogueSnapshot(opusCount: number, recordsSold: number): number {
  const recordsNorm = recordsSold / PLATINUM_THRESHOLD
  return Math.max(1, L3.CATALOGUE_OPUS_W * opusCount + L3.CATALOGUE_RECORDS_W * recordsNorm)
}

export function venueCapacity(roofLvl: number): number {
  return L3.CAP_BASE * (1 + roofLvl * L3.ROOF_PER)
}

export function acclaimRatePerSec(
  snapshot: number,
  instrumentsLvl: number,
  conductFactor = 1,
): number {
  const cat = Math.pow(Math.max(1, snapshot), L3.CAT_EXP)
  const instr = 1 + instrumentsLvl * L3.INSTR_PER
  const raw = L3.ACCLAIM_BASE * cat * instr * conductFactor
  return Number.isFinite(raw) && raw > 0 ? raw : 0
}

export function fillSpeedPerSec(
  snapshot: number,
  instrumentsLvl: number,
  lightingLvl: number,
  conducting: boolean,
): number {
  const rate = acclaimRatePerSec(snapshot, instrumentsLvl, 1)
  const light = 1 + lightingLvl * L3.LIGHT_FILL_PER
  const conduct = conducting ? L3.CONDUCT_FILL_MULT : 1
  return rate * light * conduct
}

export function componentCost(id: ComponentId, tier: number): number {
  const cfg = L3.COMPONENTS[id]
  const raw = cfg.costBase * Math.pow(cfg.costGrowth, tier)
  return Number.isFinite(raw) ? raw : Infinity
}

export function canGraduateVenue1(components: Record<ComponentId, number>): boolean {
  const ids = Object.keys(L3.COMPONENTS) as ComponentId[]
  if (L3.GRADUATE_MIN_TIER > 0) {
    return ids.every((id) => (components[id] ?? 0) >= L3.GRADUATE_MIN_TIER)
  }
  const total = ids.reduce((s, id) => s + (components[id] ?? 0), 0)
  return total >= L3.GRADUATE_TOTAL_LEVELS
}

export function lifetimeAcclaimProductionMult(lifetimeAcclaim: number): number {
  const la = Math.max(0, lifetimeAcclaim)
  if (la === 0) return 1
  if (L3.MULT_FORM === 'capped-log') {
    const logTerm = Math.log10(1 + la * L3.MULT_LOG_SCALE)
    const logAdd = L3.MULT_LOG_MULT * logTerm
    const linearAdd = Math.min(la * L3.MULT_LINEAR_K, L3.MULT_LINEAR_CAP)
    const add = Math.min(logAdd + linearAdd, L3.MULT_CAP)
    const m = 1 + add
    return Number.isFinite(m) && m >= 1 ? m : 1
  }
  return 1
}

interface VenueState {
  buffer: number
  acclaim: number
  lifetimeAcclaim: number
  components: Record<ComponentId, number>
  soldOut: boolean
  currentVenue: number
  tourCount: number
  catalogueSnapshot: number
  keepAutobuyers: boolean
  autoMO: boolean
}

function freshVenueState(snapshot: number): VenueState {
  return {
    buffer: 0,
    acclaim: 0,
    lifetimeAcclaim: 0,
    components: { roof: 0, lighting: 0, instruments: 0 },
    soldOut: false,
    currentVenue: 0,
    tourCount: 0,
    catalogueSnapshot: snapshot,
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
  const cap = venueCapacity(venue.components.roof)
  const speed = fillSpeedPerSec(
    venue.catalogueSnapshot,
    venue.components.instruments,
    venue.components.lighting,
    conducting,
  )
  venue.buffer = Math.min(cap, venue.buffer + speed * dtSec)
  if (venue.buffer >= cap - 1e-9) {
    venue.buffer = cap
    venue.soldOut = true
  }
}

function tryBuyComponent(venue: VenueState, id: ComponentId): boolean {
  const lvl = venue.components[id]
  if (lvl >= L3.MAX_COMPONENT_TIER) return false
  const cost = componentCost(id, lvl)
  if (venue.acclaim < cost) return false
  venue.acclaim -= cost
  venue.components[id] = lvl + 1
  return true
}

function listAffordableComponents(venue: VenueState): ComponentId[] {
  return (Object.keys(L3.COMPONENTS) as ComponentId[]).filter((id) => {
    const lvl = venue.components[id]
    return lvl < L3.MAX_COMPONENT_TIER && venue.acclaim >= componentCost(id, lvl)
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
    keepAutobuyers: false,
    postPlatinumMoCount: 0,
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
    encoreCount: newEncoreCount,
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
    const step = Math.min(remaining, TICK_MS)
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

function humanVenueDecision(venue: VenueState, rng: SeededRng): void {
  if (!venue.keepAutobuyers && venue.acclaim >= L3.KEEP_AUTOBUYERS_COST && rng.chance(0.7)) {
    venue.acclaim -= L3.KEEP_AUTOBUYERS_COST
    venue.keepAutobuyers = true
  }
  if (venue.soldOut && rng.chance(0.55)) {
    bankBuffer(venue)
  }
  const affordable = listAffordableComponents(venue)
  if (affordable.length === 0) return
  if (!rng.chance(0.4)) return
  const pick = rng.chance(0.75)
    ? affordable.reduce((a, b) => (componentCost(a, venue.components[a]) <= componentCost(b, venue.components[b]) ? a : b))
    : rng.pick(affordable)!
  tryBuyComponent(venue, pick)
}

function performTour(state: GameState, venue: VenueState, simTime: number): void {
  const carriedRecords = Math.floor(state.recordsSold * L3.LEGACY_RECORDS_FRACTION)
  const achSet = new Set(state.achievements)
  const keepEncoreUpgrades = hasPerk(achSet, 'perk-keep-encore-upgrades')
  const opusCount = state.opusCount
  const keptAutobuyers = venue.keepAutobuyers ? { ...state.autobuyers } : {}
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
  })
  if (venue.tourCount + 1 >= L3.AUTO_MO_FROM_TOUR) {
    venue.autoMO = true
  }
  venue.tourCount += 1
  venue.catalogueSnapshot = catalogueSnapshot(state.opusCount, state.recordsSold)
  venue.buffer = 0
  venue.soldOut = false
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

  while (steps < 80_000 && activeMs < 75 * 60_000) {
    steps++
    const dt = Math.min(chooseReclimbDt(state), nextDecisionAt - simMs)
    if (dt <= 0) break
    applyTick(state, dt, conducting, acclaimMult)
    simMs += dt
    activeMs += dt * humanOverhead
    setClock(simMs)
    recordNewAchievements(state, seen)

    if (automated && state.layer1WallReached && canMoNow(state)) {
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

    const dt = Math.min(TICK_MS, nextDecisionAt - simMs)
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

  while (simMs < MAX_SIM_MS && steps < MAX_STEPS && !canGraduateVenue1(venue.components)) {
    steps++
    if (inSession && activeMs >= sessionEndsAtActiveMs) {
      inSession = false
      const idleMs = rng.range(5 * 60_000, 2 * 60 * 60_000)
      const idleSec = idleMs / 1000
      const cap = venueCapacity(venue.components.roof)
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

    const dt = Math.min(TICK_MS, nextDecisionAt - simMs)
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
      if (!rng.chance(0.15)) {
        humanBuyDecision(state, rng)
        humanSpendMeta(state, rng)
      }
      nextDecisionAt = simMs + rng.range(1200, 4000)
    }
  }

  const venue1GraduateActiveMin = (activeMs - venue1StartActiveMs) / 60000

  // Idle AFK bound: 24h offline should yield ~one buffer
  const afkVenue = freshVenueState(snapshot)
  afkVenue.components = { ...venue.components }
  tickVenue(afkVenue, MAX_OFFLINE_MS / 1000, false)
  const idleBufferRatio = afkVenue.buffer / venueCapacity(afkVenue.components.roof)

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
      const dt = Math.min(TICK_MS, cycleEndActiveMs - activeMs)
      tickVenue(venue, dt / 1000, venueConducting)
      if (venue.soldOut && rng.chance(0.12)) bankBuffer(venue)
      applyTick(state, dt, state.opusCount > 0, lifetimeAcclaimProductionMult(venue.lifetimeAcclaim))
      simMs += dt
      activeMs += dt
      setClock(simMs)
      if (simMs % 5000 < TICK_MS) humanVenueDecision(venue, rng)
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

  const snowballOk =
    tour1Re.length > 0 &&
    tour8Re.length > 0 &&
    median(tour1Re) >= 12 &&
    median(tour1Re) > median(tour8Re) * 1.8 &&
    (tour12Re.length === 0 || median(tour12Re) < 4)

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
      criterion: 'Snowball: re-climb trends minutes → near-instant',
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
    console.log('--- TUNED CONSTANTS (copy to game) ---')
    console.log('  ACCLAIM_BASE          ', L3.ACCLAIM_BASE)
    console.log('  CAT_EXP               ', L3.CAT_EXP)
    console.log('  INSTR_PER             ', L3.INSTR_PER)
    console.log('  CAP_BASE              ', L3.CAP_BASE)
    console.log('  ROOF_PER              ', L3.ROOF_PER)
    console.log('  LIGHT_FILL_PER        ', L3.LIGHT_FILL_PER)
    console.log('  CONDUCT_FILL_MULT     ', L3.CONDUCT_FILL_MULT)
    console.log('  GRADUATE_MIN_TIER     ', L3.GRADUATE_MIN_TIER, `(of ${L3.MAX_COMPONENT_TIER})`)
    console.log('  CATALOGUE_OPUS_W      ', L3.CATALOGUE_OPUS_W)
    console.log('  CATALOGUE_RECORDS_W   ', L3.CATALOGUE_RECORDS_W)
    console.log('  MULT_FORM             ', L3.MULT_FORM)
    console.log('  MULT_LOG_SCALE        ', L3.MULT_LOG_SCALE)
    console.log('  MULT_LINEAR_K         ', L3.MULT_LINEAR_K)
    console.log('  MULT_LINEAR_CAP       ', L3.MULT_LINEAR_CAP)
    console.log('  GATE_POST_PLAT_MO     ', L3.GATE_POST_PLAT_MO)
    console.log('  roof costBase/growth  ', L3.COMPONENTS.roof.costBase, '/', L3.COMPONENTS.roof.costGrowth)
    console.log('  lighting costBase/growth', L3.COMPONENTS.lighting.costBase, '/', L3.COMPONENTS.lighting.costGrowth)
    console.log('  instruments costBase/growth', L3.COMPONENTS.instruments.costBase, '/', L3.COMPONENTS.instruments.costGrowth)
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
    expect(t1, 'Tour 1 re-climb').toBeGreaterThanOrEqual(12)
    expect(t8, 'Tour 8 faster than tour 1').toBeLessThan(t1 * 0.55)
    expect(t12, 'Tour 12 near-instant').toBeLessThan(4)

    for (const v of verdicts) {
      expect(v.pass, v.criterion).toBe(true)
    }
  }, 900_000)
})
