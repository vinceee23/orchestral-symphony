import { describe, it, expect } from 'vitest'
import {
  SIGHT_READING_BASE,
  getHeadStartExponent,
  getRehearsalCostReduction,
} from './encoreUpgrades'

describe('encoreUpgrades head-start + rehearsal', () => {
  it('head-start exponent is 0 until Sight-Reading is unlocked, then base + achievement boost', () => {
    expect(getHeadStartExponent({}, 0.12)).toBe(0) // not bought -> no head-start regardless of boosts
    expect(getHeadStartExponent({ sightReading: 1 }, 0)).toBeCloseTo(SIGHT_READING_BASE, 5)
    expect(getHeadStartExponent({ sightReading: 1 }, 0.12)).toBeCloseTo(SIGHT_READING_BASE + 0.12, 5)
  })

  it('head-start stays sim-safe (well under 1.0 even fully boosted)', () => {
    // base 0.5 + 3 achievement boosts of 0.04 = 0.62; must stay < ~0.7 (sim: >~0.75 starts eroding the wall)
    expect(getHeadStartExponent({ sightReading: 1 }, 0.04 * 3)).toBeLessThan(0.7)
  })

  it('rehearsal reduces cost 5% per level', () => {
    expect(getRehearsalCostReduction({})).toBe(0)
    expect(getRehearsalCostReduction({ rehearsal: 5 })).toBeCloseTo(0.25, 5)
  })
})
