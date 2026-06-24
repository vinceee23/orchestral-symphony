import { describe, it, expect } from 'vitest'
import { CRESCENDO_BUILD_SEC, CRESCENDO_DECAY_SEC, CRESCENDO_BASE_MAX, AUTO_CONDUCT_FRACTION } from './constants'
import {
  advanceCrescendo,
  getCrescendoMultiplier,
  getCrescendoOpBonus,
} from './crescendo'
import { getCrescendoCeiling } from './opusUpgrades'

const emptyLevels: Record<string, number> = {}

describe('crescendo', () => {
  it('holding for BUILD_SEC reaches ~ceiling', () => {
    let level = 0
    const dt = CRESCENDO_BUILD_SEC / 100
    for (let i = 0; i < 100; i++) {
      level = advanceCrescendo(level, true, dt, emptyLevels)
    }
    expect(level).toBeCloseTo(1, 5)
    const mult = getCrescendoMultiplier(level, emptyLevels)
    expect(mult).toBeCloseTo(getCrescendoCeiling(emptyLevels), 5)
  })

  it('releasing for DECAY_SEC returns to ~1 multiplier', () => {
    let level = 1
    const dt = CRESCENDO_DECAY_SEC / 100
    for (let i = 0; i < 100; i++) {
      level = advanceCrescendo(level, false, dt, emptyLevels)
    }
    expect(level).toBeCloseTo(0, 5)
    expect(getCrescendoMultiplier(level, emptyLevels)).toBeCloseTo(1, 5)
  })

  it('auto-conduct floors at AUTO_CONDUCT_FRACTION when AFK', () => {
    const levels: Record<string, number> = { 'auto-conduct': 1 }
    let level = 1
    const dt = CRESCENDO_DECAY_SEC * 2
    level = advanceCrescendo(level, false, dt, levels)
    expect(level).toBeCloseTo(AUTO_CONDUCT_FRACTION, 5)
    const mult = getCrescendoMultiplier(level, levels)
    const ceiling = getCrescendoCeiling(levels)
    expect(mult).toBeCloseTo(1 + AUTO_CONDUCT_FRACTION * (ceiling - 1), 5)
  })

  it('getCrescendoOpBonus scales with peak multiplier', () => {
    const peakMult = CRESCENDO_BASE_MAX
    const bonus = getCrescendoOpBonus(peakMult, emptyLevels)
    expect(bonus).toBeCloseTo(1 + (peakMult - 1) * 0.25, 5)
  })
})
