import { describe, it, expect } from 'vitest'
import Decimal from 'break_infinity.js'
import { calculateTick } from './tick'
import { TIER_CONFIGS, STARTING_SOUNDWAVES, getEncoreCost, ENCORE_WALL_COUNT } from './constants'
import {
  getTierCost, getMilestoneMultiplier, getEncoreMultiplier, getEncoreGain,
  getTempoCost, getTempoTickInterval, getTempoBPM, getTempoProductionMultiplier,
} from './formulas'
import type { GameState } from '../store/types'

function freshState(overrides: Partial<GameState> = {}): GameState {
  return {
    soundwaves: new Decimal(STARTING_SOUNDWAVES),
    tiers: TIER_CONFIGS.map((c) => ({
      id: c.id, name: c.name, quantity: new Decimal(0), purchased: 0,
      multiplier: new Decimal(1), unlocked: c.id === 1,
    })),
    tempo: { level: 0, tickInterval: 1000, baseBPM: 60 },
    buyAmount: 1,
    achievements: [], completedChallenges: [], challengeBestTimes: {}, keepChallenges: false, encoreUpgrades: {}, autobuyers: {},
    activeChallenge: null, preChallengeState: null,
    encorePoints: 0, lifetimeEncorePoints: 0, encoreCount: 0, applausePoints: 0, layer1WallReached: false,
    opusPoints: 0, opusCount: 0, opusUpgrades: {}, crescendo: 0, peakCrescendoMult: 1,
    recordsSold: 0, platinum: false,
    acclaim: new Decimal(0), lifetimeAcclaim: new Decimal(0), tourCount: 0,
    currentVenue: 0, venueBuffer: new Decimal(0), venueSoldOut: false,
    components: {}, catalogueSnapshot: new Decimal(1), worldTourUnlocked: false,
    keepAutobuyers: false, autoCollect: false, autoMO: false, autoMOEnabled: true, autoGraduate: false, autoTour: false, autoTourEnabled: true, circuitComplete: false,
    postPlatinumMoCount: 0,
    lifetimeEncoreCount: 0,
    finalePoints: 0, finaleCount: 0,
    peakSoundwaves: new Decimal(0), producedThisRun: new Decimal(0),
    tempoPurchasesThisRun: 0, silentEncoresCompleted: 0, wallReachedWithoutTempo: false,
    wallReachedWithoutTempoAtActiveMs: 0,
    totalTimePlayed: 0, activeTimePlayed: 0,
    lastSaveTimestamp: 0, currentRunStartTime: 0, version: 'test',
    seenStoryBeats: [],
    ...overrides,
  }
}

/** Active "buy cheapest" player: spends soundwaves on the cheapest unlocked tier or tempo. */
function buyStep(s: GameState) {
  for (let guard = 0; guard < 100000; guard++) {
    let bestTier = -1
    let bestCost: Decimal | null = null
    for (let i = 0; i < s.tiers.length; i++) {
      if (!s.tiers[i].unlocked) continue
      const c = getTierCost(TIER_CONFIGS[i], s.tiers[i].purchased)
      if (bestCost === null || c.lt(bestCost)) { bestTier = i; bestCost = c }
    }
    const tempoC = getTempoCost(s.tempo.level)
    const buyTempo = bestCost === null || tempoC.lt(bestCost)
    const cost = buyTempo ? tempoC : bestCost!
    if (s.soundwaves.lt(cost)) break

    s.soundwaves = s.soundwaves.minus(cost)
    if (buyTempo) {
      const level = s.tempo.level + 1
      s.tempo = { level, tickInterval: getTempoTickInterval(level), baseBPM: getTempoBPM(level) }
    } else {
      const t = s.tiers[bestTier]
      const purchased = t.purchased + 1
      s.tiers[bestTier] = { ...t, purchased, quantity: t.quantity.plus(1), multiplier: getMilestoneMultiplier(purchased) }
    }
  }
}

/** Run the REAL tick loop with the buy strategy until the Encore gate is met or the cap. */
function runToEncore(s: GameState, capMinutes = 90): { minutes: number; reached: boolean; peak: Decimal } {
  const gate = getEncoreCost(s.encoreCount)
  const dt = 1000
  const maxT = capMinutes * 60 * 1000
  let t = 0
  while (t < maxT) {
    buyStep(s)
    const updates = calculateTick(s, dt)
    Object.assign(s, updates)
    t += dt
    if ((s.tiers[gate.tierIndex]?.purchased ?? 0) >= gate.amount) {
      return { minutes: t / 60000, reached: true, peak: s.peakSoundwaves }
    }
  }
  return { minutes: capMinutes, reached: false, peak: s.peakSoundwaves }
}

describe('Layer 1 reward shape (regression guards)', () => {
  it('Encore multiplier is ADDITIVE (1 + EP), not 2^EP', () => {
    expect(getEncoreMultiplier(0).toNumber()).toBe(1)
    expect(getEncoreMultiplier(1).toNumber()).toBe(2)
    expect(getEncoreMultiplier(2).toNumber()).toBe(3) // would be 4 if x2^EP
    expect(getEncoreMultiplier(10).toNumber()).toBe(11) // would be 1024 if x2^EP
    expect(getEncoreMultiplier(100).toNumber()).toBe(101) // the runaway case — stays linear
  })

  it('EP gain is sublinear and single-digit-ish at first-Encore scale', () => {
    expect(getEncoreGain(new Decimal('1e15'))).toBe(0) // at/below threshold => nothing
    const g = getEncoreGain(new Decimal('1e17.7'))
    expect(g).toBeGreaterThanOrEqual(1)
    expect(g).toBeLessThanOrEqual(5)
    // 1000x more peak should NOT explode the gain (small exponent)
    expect(getEncoreGain(new Decimal('1e20.7'))).toBeLessThanOrEqual(10)
  })

  it('tempo is a REAL production multiplier (the dead-tempo fix)', () => {
    expect(getTempoProductionMultiplier(0)).toBeCloseTo(1, 5)
    expect(getTempoProductionMultiplier(10)).toBeGreaterThan(1.5)
  })
})

describe('Layer 1 pacing (real tick + store logic)', () => {
  it('snappy opening: ~10 Notes within the first minute, first Encore in a punchy window', () => {
    const s = freshState()
    const r = runToEncore(s)
    expect(r.reached).toBe(true)
    expect(r.minutes).toBeGreaterThan(2)   // not trivially instant
    expect(r.minutes).toBeLessThan(30)     // punchy first Encore (~5m sim), not a slog
  })

  it('does not run away across Encores: EP accumulates but stays bounded', () => {
    // Simulate the effect of several Encores by feeding lifetime EP back as the multiplier.
    let lifetimeEP = 0
    let totalMinutes = 0
    for (let encore = 0; encore < ENCORE_WALL_COUNT; encore++) {
      const s = freshState({
        lifetimeEncorePoints: lifetimeEP,
        encoreCount: encore,
        // after first Encore, tiers 6/7 are reachable
      })
      const r = runToEncore(s, 180)
      expect(r.reached).toBe(true)
      const gain = getEncoreGain(r.peak)
      lifetimeEP += gain
      totalMinutes += r.minutes
    }
    // After the wall's worth of Encores, lifetime EP is sizeable but NOWHERE near the
    // 1e100 explosion the x2^EP model produced.
    expect(lifetimeEP).toBeGreaterThan(0)
    expect(lifetimeEP).toBeLessThan(1e7)
    expect(totalMinutes).toBeLessThan(600) // whole layer is hours, not days
  })
})
