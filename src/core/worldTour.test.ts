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
  getComponentDef,
  getUnlockFlagsFromComponent,
  isAutoMOUnlocked,
  canAutoPerformMagnumOpus,
  calculateWorldTourTick,
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
    lifetimeEncoreCount: 0,
    applausePoints: 0,
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
    autoCollect: false,
    keepAutobuyers: false,
    autoMO: false,
    autoMOEnabled: true,
    autoGraduate: false,
    autoTour: false,
    autoTourEnabled: true,
    circuitComplete: false,
    postPlatinumMoCount: 2,
    spendableFame: 0, lifetimeFame: 0, fameUpgrades: {},
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

  it('venue ladder has heterogeneous escalating components', () => {
    expect(VENUES).toHaveLength(6)
    expect(getVenue(0).componentIds).toEqual(['lighting', 'roof', 'instruments'])
    expect(getVenue(1).componentIds).toContain('keepAutobuyers')
    expect(getVenue(2).componentIds).toEqual(['lighting', 'roof', 'crowd', 'acoustics'])
    expect(getVenue(5).componentIds).toContain('autoGraduate')
    expect(getVenue(5).componentIds).toHaveLength(8)
  })

  it('each component has role, maxLevel, and target', () => {
    expect(getComponentDef('lighting')).toMatchObject({
      role: 'multiplier',
      maxLevel: 3,
      target: 'fillSpeed',
    })
    expect(getComponentDef('instruments')).toMatchObject({
      role: 'unlock',
      maxLevel: 1,
      target: 'autoCollect',
    })
    expect(getComponentDef('keepAutobuyers')).toMatchObject({
      role: 'unlock',
      target: 'keepAutobuyers',
    })
  })

  it('capacity scales with roof level and venue tier', () => {
    expect(getVenueCapacity({ roof: 0 }, 0)).toBe(L3.CAP_BASE)
    const roofPer = L3.COMPONENTS.roof.perLevel!
    expect(getVenueCapacity({ roof: 2 }, 0)).toBeCloseTo(L3.CAP_BASE * (1 + 2 * roofPer), 5)
    expect(getVenueCapacity({ roof: 0 }, 1)).toBeGreaterThan(L3.CAP_BASE)
  })

  it('acclaim rate scales with crowd multiplier, not instruments unlock', () => {
    const base = getAcclaimRate(10, {})
    const boosted = getAcclaimRate(10, { crowd: 2 })
    const crowdPer = L3.COMPONENTS.crowd.perLevel!
    expect(boosted / base).toBeCloseTo(1 + 2 * crowdPer, 5)
    expect(getAcclaimRate(10, { instruments: 1 })).toBeCloseTo(base, 5)
  })

  it('later venues cost more for the same component', () => {
    expect(getComponentCost('roof', 0, 3)).toBeGreaterThan(getComponentCost('roof', 0, 0))
  })

  it('fill speed applies lighting, acoustics, and conducting', () => {
    const lightPer = L3.COMPONENTS.lighting.perLevel!
    const idle = getFillSpeed(10, { lighting: 1 }, false)
    const lit = getFillSpeed(10, { lighting: 2 }, false)
    const conducting = getFillSpeed(10, { lighting: 1 }, true)
    expect(lit / idle).toBeCloseTo((1 + 2 * lightPer) / (1 + lightPer), 5)
    expect(conducting / idle).toBeCloseTo(L3.CONDUCT_FILL_MULT, 5)
    const acoustic = getFillSpeed(10, { acoustics: 2 }, false)
    expect(acoustic).toBeGreaterThan(getFillSpeed(10, {}, false))
  })

  it('component cost grows per tier', () => {
    expect(getComponentCost('roof', 0)).toBeCloseTo(L3.COMPONENTS.roof.costBase, 5)
    expect(getComponentCost('roof', 1)).toBeCloseTo(L3.COMPONENTS.roof.costBase * L3.COMPONENTS.roof.costGrowth, 5)
  })

  it('graduate requires every component at its own max level', () => {
    const v0 = getVenue(0).componentIds
    const partial = Object.fromEntries(v0.map((id) => [id, getComponentMaxTier(id) - 1]))
    expect(isVenueGraduatable(partial, 0)).toBe(false)

    const ready = Object.fromEntries(v0.map((id) => [id, getComponentMaxTier(id)]))
    expect(isVenueGraduatable(ready, 0)).toBe(true)
  })

  it('unlock components map to automation flags', () => {
    expect(getUnlockFlagsFromComponent('instruments')).toEqual({ autoCollect: true })
    expect(getUnlockFlagsFromComponent('keepAutobuyers')).toEqual({ keepAutobuyers: true })
    expect(getUnlockFlagsFromComponent('autoGraduate')).toEqual({ autoGraduate: true })
    expect(getUnlockFlagsFromComponent('lighting')).toEqual({})
  })

  it('lifetime acclaim multiplier is capped and >= 1', () => {
    expect(getAcclaimMultiplier(0)).toBe(1)
    expect(getAcclaimMultiplier(1000)).toBeGreaterThan(1)
    expect(getAcclaimMultiplier(1e9)).toBeLessThanOrEqual(L3.MULT_CAP + 1)
  })

  it('isAutoMOUnlocked reflects autoMO state flag', () => {
    expect(isAutoMOUnlocked({ autoMO: false })).toBe(false)
    expect(isAutoMOUnlocked({ autoMO: true })).toBe(true)
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

  it('auto-collect banks buffer on sell-out; manual mode holds buffer', () => {
    const cap = getVenueCapacity({ roof: 0 }, 0)
    const base = minimalState({
      venueBuffer: new Decimal(cap),
      components: { roof: 0, lighting: 0 },
    })

    const manual = calculateWorldTourTick({ ...base, autoCollect: false }, 1000, false)
    expect(manual.venueSoldOut).toBe(true)
    expect(manual.venueBuffer?.toNumber()).toBe(cap)
    expect(manual.acclaim?.toNumber() ?? 0).toBe(0)

    const auto = calculateWorldTourTick({ ...base, autoCollect: true }, 1000, false)
    expect(auto.venueSoldOut).toBe(true)
    expect(auto.venueBuffer?.toNumber()).toBe(0)
    expect(auto.acclaim?.toNumber()).toBe(cap)
    expect(auto.lifetimeAcclaim?.toNumber()).toBe(cap)
  })
})
