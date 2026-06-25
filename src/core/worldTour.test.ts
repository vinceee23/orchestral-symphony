import { describe, it, expect } from 'vitest'
import Decimal from 'break_infinity.js'
import {
  L3,
  VENUES,
  getVenue,
  getAcclaimRate,
  getVenueCapacity,
  getFillSpeed,
  getComponentCost,
  isVenueGraduatable,
  getAcclaimMultiplier,
  getCatalogueSnapshot,
  getEffectiveCatalogue,
  getComponentMaxTier,
  isAutoMOUnlocked,
  canAutoPerformMagnumOpus,
} from './worldTour'
import type { GameState } from '../store/types'

function minimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    soundwaves: new Decimal(0),
    tiers: [],
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
    layer1WallReached: true,
    opusPoints: 0,
    opusCount: 2,
    opusUpgrades: {},
    crescendo: 0,
    peakCrescendoMult: 1,
    recordsSold: 0,
    platinum: true,
    acclaim: new Decimal(0),
    lifetimeAcclaim: new Decimal(0),
    tourCount: 0,
    currentVenue: 0,
    venueBuffer: new Decimal(0),
    venueSoldOut: false,
    components: {},
    catalogueSnapshot: new Decimal(10),
    worldTourUnlocked: true,
    keepAutobuyers: false,
    autoMO: false,
    autoMOEnabled: true,
    circuitComplete: false,
    postPlatinumMoCount: 2,
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
    lastSaveTimestamp: 0,
    currentRunStartTime: 0,
    version: '0.6.0',
    ...overrides,
  }
}

describe('worldTour helpers', () => {
  it('catalogue snapshot blends opus count and normalized records', () => {
    const snap = getCatalogueSnapshot(4, 500_000)
    expect(snap).toBeGreaterThan(1)
    expect(snap).toBeCloseTo(L3.CATALOGUE_OPUS_W * 4 + L3.CATALOGUE_RECORDS_W * 0.5, 5)
  })

  it('effective catalogue uses snapshot pre-break and live post-break', () => {
    const pre = getEffectiveCatalogue({
      circuitComplete: false,
      catalogueSnapshot: new Decimal(10),
      opusCount: 20,
      recordsSold: 1_000_000,
    })
    expect(pre).toBe(10)

    const post = getEffectiveCatalogue({
      circuitComplete: true,
      catalogueSnapshot: new Decimal(10),
      opusCount: 20,
      recordsSold: 1_000_000,
    })
    expect(post).toBeGreaterThan(10)
  })

  it('venue ladder has 6 venues with escalating components', () => {
    expect(VENUES).toHaveLength(6)
    expect(getVenue(0).componentIds).toHaveLength(3)
    expect(getVenue(5).componentIds).toHaveLength(8)
    expect(getVenue(1).componentIds).toContain('crowd')
    expect(getVenue(5).componentIds).toContain('premiere')
  })

  it('capacity scales with roof level and venue tier', () => {
    expect(getVenueCapacity({ roof: 0 }, 0)).toBe(L3.CAP_BASE)
    expect(getVenueCapacity({ roof: 2 }, 0)).toBeCloseTo(L3.CAP_BASE * (1 + 2 * L3.ROOF_PER), 5)
    expect(getVenueCapacity({ roof: 0 }, 1)).toBeGreaterThan(L3.CAP_BASE)
  })

  it('acclaim rate scales with catalogue and instruments', () => {
    const base = getAcclaimRate(10, { instruments: 0 })
    const boosted = getAcclaimRate(10, { instruments: 2 })
    expect(boosted / base).toBeCloseTo(1 + 2 * L3.INSTR_PER, 5)
  })

  it('later venues cost more for the same component', () => {
    expect(getComponentCost('roof', 0, 3)).toBeGreaterThan(getComponentCost('roof', 0, 0))
  })

  it('fill speed applies lighting, acoustics, and conducting', () => {
    const idle = getFillSpeed(10, { lighting: 1, instruments: 0 }, false)
    const lit = getFillSpeed(10, { lighting: 2, instruments: 0 }, false)
    const conducting = getFillSpeed(10, { lighting: 1, instruments: 0 }, true)
    expect(lit / idle).toBeCloseTo((1 + 2 * L3.LIGHT_FILL_PER) / (1 + L3.LIGHT_FILL_PER), 5)
    expect(conducting / idle).toBeCloseTo(L3.CONDUCT_FILL_MULT, 5)
    const acoustic = getFillSpeed(10, { lighting: 0, acoustics: 2, instruments: 0 }, false)
    expect(acoustic).toBeGreaterThan(getFillSpeed(10, { lighting: 0, instruments: 0 }, false))
  })

  it('component cost grows per tier', () => {
    expect(getComponentCost('roof', 0)).toBeCloseTo(L3.COMPONENTS.roof.costBase, 5)
    expect(getComponentCost('roof', 1)).toBeCloseTo(L3.COMPONENTS.roof.costBase * L3.COMPONENTS.roof.costGrowth, 5)
  })

  it('visual components cap at 5 tiers; number components at 8', () => {
    expect(getComponentMaxTier('lighting')).toBe(L3.MAX_COMPONENT_TIER)
    expect(getComponentMaxTier('acoustics')).toBe(L3.MAX_NUMBER_TIER)
  })

  it('graduate requires every venue component at min tier', () => {
    const v0 = getVenue(0).componentIds
    const partial = Object.fromEntries(v0.map((id) => [id, L3.GRADUATE_MIN_TIER - 1]))
    expect(isVenueGraduatable(partial, 0)).toBe(false)

    const ready = Object.fromEntries(v0.map((id) => [id, L3.GRADUATE_MIN_TIER]))
    expect(isVenueGraduatable(ready, 0)).toBe(true)
  })

  it('lifetime acclaim multiplier is capped and >= 1', () => {
    expect(getAcclaimMultiplier(0)).toBe(1)
    expect(getAcclaimMultiplier(1000)).toBeGreaterThan(1)
    expect(getAcclaimMultiplier(1e9)).toBeLessThanOrEqual(L3.MULT_CAP + 1)
  })

  it('getAcclaimRate accepts Decimal catalogue snapshot', () => {
    const rate = getAcclaimRate(new Decimal(10), { instruments: 1 })
    expect(rate).toBeGreaterThan(0)
  })

  it('Auto-MO unlocks at tour count or mid venue', () => {
    expect(isAutoMOUnlocked({ autoMO: false, tourCount: 0, currentVenue: 0 })).toBe(false)
    expect(isAutoMOUnlocked({ autoMO: false, tourCount: 2, currentVenue: 0 })).toBe(true)
    expect(isAutoMOUnlocked({ autoMO: false, tourCount: 0, currentVenue: L3.AUTO_MO_VENUE })).toBe(true)
  })

  it('canAutoPerformMagnumOpus requires owned, enabled, and affordable MO', () => {
    const tiers = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      name: `T${i + 1}`,
      quantity: new Decimal(0),
      purchased: i === 6 ? 100 : 0,
      multiplier: new Decimal(1),
      unlocked: true,
    }))
    expect(canAutoPerformMagnumOpus(minimalState({
      autoMO: false,
      tiers,
    }))).toBe(false)

    expect(canAutoPerformMagnumOpus(minimalState({
      autoMO: true,
      autoMOEnabled: false,
      tiers,
    }))).toBe(false)

    expect(canAutoPerformMagnumOpus(minimalState({
      autoMO: true,
      autoMOEnabled: true,
      tiers,
    }))).toBe(true)
  })
})
