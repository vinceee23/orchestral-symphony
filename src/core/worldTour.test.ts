import { describe, it, expect } from 'vitest'
import Decimal from 'break_infinity.js'
import {
  L3,
  getAcclaimRate,
  getVenueCapacity,
  getFillSpeed,
  getComponentCost,
  isVenueGraduatable,
  getAcclaimMultiplier,
  getCatalogueSnapshot,
} from './worldTour'

describe('worldTour helpers', () => {
  it('catalogue snapshot blends opus count and normalized records', () => {
    const snap = getCatalogueSnapshot(4, 500_000)
    expect(snap).toBeGreaterThan(1)
    expect(snap).toBeCloseTo(L3.CATALOGUE_OPUS_W * 4 + L3.CATALOGUE_RECORDS_W * 0.5, 5)
  })

  it('capacity scales with roof level', () => {
    expect(getVenueCapacity({ roof: 0 })).toBe(L3.CAP_BASE)
    expect(getVenueCapacity({ roof: 2 })).toBeCloseTo(L3.CAP_BASE * (1 + 2 * L3.ROOF_PER), 5)
  })

  it('acclaim rate scales with catalogue and instruments', () => {
    const base = getAcclaimRate(10, { instruments: 0 })
    const boosted = getAcclaimRate(10, { instruments: 2 })
    expect(boosted / base).toBeCloseTo(1 + 2 * L3.INSTR_PER, 5)
  })

  it('fill speed applies lighting and conducting', () => {
    const idle = getFillSpeed(10, { lighting: 1, instruments: 0 }, false)
    const lit = getFillSpeed(10, { lighting: 2, instruments: 0 }, false)
    const conducting = getFillSpeed(10, { lighting: 1, instruments: 0 }, true)
    expect(lit / idle).toBeCloseTo((1 + 2 * L3.LIGHT_FILL_PER) / (1 + L3.LIGHT_FILL_PER), 5)
    expect(conducting / idle).toBeCloseTo(L3.CONDUCT_FILL_MULT, 5)
  })

  it('component cost grows per tier', () => {
    expect(getComponentCost('roof', 0)).toBe(L3.COMPONENTS.roof.costBase)
    expect(getComponentCost('roof', 1)).toBeCloseTo(L3.COMPONENTS.roof.costBase * L3.COMPONENTS.roof.costGrowth, 5)
  })

  it('graduate requires every component at min tier', () => {
    expect(isVenueGraduatable({ roof: 2, lighting: 2, instruments: 2 })).toBe(false)
    expect(isVenueGraduatable({
      roof: L3.GRADUATE_MIN_TIER,
      lighting: L3.GRADUATE_MIN_TIER,
      instruments: L3.GRADUATE_MIN_TIER,
    })).toBe(true)
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
})
