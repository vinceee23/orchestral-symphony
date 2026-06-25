/**
 * Headless achievement pacing instrument — drives the REAL game logic (tick, buys, prestige)
 * and records when each achievement's check() first becomes true.
 *
 * Run: npx vitest run sim/achievement-pacing.test.ts
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
import { getOpusGain } from '../src/core/records'
import {
  ACHIEVEMENTS,
  getAchievementStartingSW,
  getAchievementCostReduction,
  getAchievementTierCostReduction,
  getAchievementHeadStartBoost,
  getAchievementGlobalMultiplier,
} from '../src/core/achievements'
import { getChallengeById, getActiveChallengeModifiers } from '../src/core/challenges'
import type { GameState } from '../src/store/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH = join(__dirname, 'out', 'achievement-pacing.csv')

const DT_MS = 1000
const MAX_SIM_MS = 4 * 60 * 60 * 1000 // ~4 sim-hours cap
const TARGET_OPUS_COUNT = 3 // first MO + a couple more

/** Restraint / "do X without Y" achievements that must not unlock from head-start alone. */
const RESTRAINT_ACHIEVEMENT_IDS = new Set([
  'ach_perk_patron',
  'ach_perk_tempo_headstart',
])
const POST_PRESTIGE_GRACE_MS = 60_000 // ~1 sim-minute after Encore / MO reset

/** Mirrors createInitialState() in gameStore.ts */
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
    totalTimePlayed: 0,
    lastSaveTimestamp: simTime,
    currentRunStartTime: simTime,
    version: '0.6.0',
  }
}

function getProgressionPhase(state: GameState): string {
  if (state.finaleCount > 0) return 'post-finale'
  if (state.opusCount >= 3) return 'deep-l2'
  if (state.opusCount >= 1) return 'post-first-mo'
  if (state.layer1WallReached) return 'mo-gate'
  if (state.encoreCount > 0) return 'encore-era'
  return 'early-game'
}

/** Mirrors getEffectiveCostMultiplier in gameStore.ts */
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

/** Mirrors resetTiersAndSW in gameStore.ts — uses simulated clock for currentRunStartTime */
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
  state.tempo = {
    level: newLevel,
    tickInterval: getTempoTickInterval(newLevel),
    baseBPM: getTempoBPM(newLevel),
  }
}

/** Greedy: buy the single cheapest affordable tier unit or tempo upgrade */
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

/** Mirrors performEncore in gameStore.ts */
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
  Object.assign(state, reset, {
    peakSoundwaves: new Decimal(0),
    encorePoints: state.encorePoints + gain,
    lifetimeEncorePoints: state.lifetimeEncorePoints + gain,
    encoreCount: newEncoreCount,
    layer1WallReached: state.layer1WallReached || newEncoreCount >= ENCORE_WALL_COUNT,
  })
  return true
}

/** Mirrors performMagnumOpus in gameStore.ts */
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

function applyTick(state: GameState, deltaMs: number, conducting: boolean): void {
  const updates = calculateTick(state, deltaMs, conducting)
  Object.assign(state, updates)
}

function recordNewAchievements(
  state: GameState,
  simMs: number,
  unlockedAt: Map<string, number>,
  unlockedPhase: Map<string, string>,
): void {
  const current = new Set(state.achievements)
  for (const ach of ACHIEVEMENTS) {
    if (current.has(ach.id) || unlockedAt.has(ach.id)) continue
    if (ach.check(state)) {
      unlockedAt.set(ach.id, simMs)
      unlockedPhase.set(ach.id, getProgressionPhase(state))
      state.achievements.push(ach.id)
    }
  }
}

function buildHistogram(unlockedAt: Map<string, number>, bucketMinutes = 10): Map<number, number> {
  const hist = new Map<number, number>()
  for (const ms of unlockedAt.values()) {
    const bucket = Math.floor(ms / 60000 / bucketMinutes)
    hist.set(bucket, (hist.get(bucket) ?? 0) + 1)
  }
  return hist
}

function countMoSpike(unlockedAt: Map<string, number>): { moMinute: number; count: number } {
  const moMs = unlockedAt.get('ach_magnum')
  if (moMs === undefined) return { moMinute: -1, count: 0 }
  const moMinute = moMs / 60000
  let count = 0
  for (const ms of unlockedAt.values()) {
    const minute = ms / 60000
    if (Math.abs(minute - moMinute) <= 1) count++
  }
  return { moMinute, count }
}

function writeCsv(
  unlockedAt: Map<string, number>,
  unlockedPhase: Map<string, string>,
): void {
  mkdirSync(dirname(CSV_PATH), { recursive: true })
  const rows = ['id,name,first_unlock_minute,progression_phase']
  for (const ach of ACHIEVEMENTS) {
    const ms = unlockedAt.get(ach.id)
    const minute = ms !== undefined ? (ms / 60000).toFixed(2) : ''
    const phase = unlockedPhase.get(ach.id) ?? ''
    const name = ach.name.replace(/"/g, '""')
    rows.push(`${ach.id},"${name}",${minute},${phase}`)
  }
  writeFileSync(CSV_PATH, rows.join('\n') + '\n', 'utf8')
}

describe('achievement pacing instrument', () => {
  let dateNowSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    let simClock = 0
    dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => simClock)
    // Keep sim clock in sync via a module-level setter the sim updates each tick
    ;(globalThis as { __setSimClock?: (t: number) => void }).__setSimClock = (t: number) => {
      simClock = t
    }
  })

  afterEach(() => {
    dateNowSpy.mockRestore()
    delete (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock
  })

  it('records first-unlock timing across a full playthrough to first MO+', () => {
    const setClock = (globalThis as { __setSimClock?: (t: number) => void }).__setSimClock!

    // Re-run with clock sync inside the sim loop
    let simMs = 0
    const state = createInitialState(simMs)
    setClock(simMs)
    const unlockedAt = new Map<string, number>()
    const unlockedPhase = new Map<string, string>()
    let lastPrestigeMs = 0
    const restraintCollisions: { id: string; ms: number; sincePrestigeMs: number }[] = []

    while (simMs < MAX_SIM_MS && state.opusCount < TARGET_OPUS_COUNT) {
      greedyBuyCheapest(state)
      greedyBuyEncoreUpgrades(state)
      greedyBuyOpusUpgrades(state)
      enableUnlockedAutobuyers(state)

      const conducting = state.layer1WallReached || state.opusCount > 0
      applyTick(state, DT_MS, conducting)
      simMs += DT_MS
      setClock(simMs)

      recordNewAchievements(state, simMs, unlockedAt, unlockedPhase)
      for (const [id, ms] of unlockedAt) {
        if (ms !== simMs || !RESTRAINT_ACHIEVEMENT_IDS.has(id)) continue
        const since = ms - lastPrestigeMs
        if (since <= POST_PRESTIGE_GRACE_MS) {
          restraintCollisions.push({ id, ms, sincePrestigeMs: since })
        }
      }

      if (state.layer1WallReached) {
        if (performMagnumOpus(state, simMs)) {
          lastPrestigeMs = simMs
          setClock(simMs)
          continue
        }
      }
      if (performEncore(state, simMs)) {
        lastPrestigeMs = simMs
      }
      setClock(simMs)
    }

    expect(state.opusCount).toBeGreaterThanOrEqual(1)

    const hist = buildHistogram(unlockedAt)
    const { moMinute, count: moSpikeCount } = countMoSpike(unlockedAt)
    writeCsv(unlockedAt, unlockedPhase)

    const unlockedCount = unlockedAt.size
    const simMinutes = (simMs / 60000).toFixed(1)

    const allIds = new Set(ACHIEVEMENTS.map((a) => a.id))
    const globalMult = getAchievementGlobalMultiplier(allIds)
    const globalSum = ACHIEVEMENTS.reduce((s, a) => s + (a.reward.globalPercent ?? 0), 0)

    console.log('\n=== Achievement Pacing Report ===')
    console.log(`Achievement global sum: ${globalSum.toFixed(3)} → x${globalMult.toFixed(3)} (all ${ACHIEVEMENTS.length} unlocked)`)
    console.log(`Simulated playtime: ${simMinutes} min | Opus count: ${state.opusCount} | Achievements unlocked: ${unlockedCount}/${ACHIEVEMENTS.length}`)
    console.log(`First Magnum Opus (ach_magnum): minute ${moMinute.toFixed(2)}`)
    console.log(`MO spike (±1 min of first MO): ${moSpikeCount} achievements`)
    console.log('\nUnlocks per 10-minute bucket:')
    const sortedBuckets = [...hist.entries()].sort((a, b) => a[0] - b[0])
    for (const [bucket, n] of sortedBuckets) {
      const from = bucket * 10
      const to = from + 10
      console.log(`  [${from}-${to} min): ${n}`)
    }
    console.log(`\nCSV written to: ${CSV_PATH}`)

    const neverUnlocked = ACHIEVEMENTS.filter((a) => !unlockedAt.has(a.id)).map((a) => a.id)
    if (neverUnlocked.length > 0) {
      console.log(`\nNot unlocked within sim window (${neverUnlocked.length}):`)
      console.log(neverUnlocked.join(', '))
    }

    if (restraintCollisions.length > 0) {
      console.log('\nRestraint achievement collisions (unlocked ≤1 min after Encore/MO):')
      for (const c of restraintCollisions) {
        console.log(`  ${c.id} at ${(c.ms / 60000).toFixed(2)} min (${(c.sincePrestigeMs / 1000).toFixed(0)}s after prestige)`)
      }
    }
    expect(restraintCollisions, 'restraint achievements must not auto-unlock from head-start').toHaveLength(0)
  })
})
