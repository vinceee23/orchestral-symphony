import { describe, it, expect } from 'vitest'
import {
  AUTOBUYER_BULK_TIERS,
  AUTOBUYER_SPEED_TIERS,
  CRESCENDO_BUILD_SEC,
  CRESCENDO_DECAY_SEC,
  CRESCENDO_BASE_MAX,
} from './constants'
import {
  OPUS_UPGRADES,
  getOpusUpgradeCost,
  getTempoOpMultiplier,
  getCrescendoCeiling,
  getCrescendoBuildSec,
  getCrescendoDecaySec,
  isAutomatorUnlocked,
  getAutomatorInterval,
  getAutomatorBulk,
  hasAutoConduct,
  getEffectiveRecordsK,
  getFamePer,
  getPlatRoot,
  getBpmCapFactor,
} from './opusUpgrades'

describe('opusUpgrades', () => {
  it('defines all four tracks with sane costs', () => {
    const tracks = new Set(OPUS_UPGRADES.map((u) => u.track))
    expect(tracks).toEqual(new Set(['AUTOMATORS', 'CRESCENDO', 'TEMPO', 'OP_GAIN']))
    for (const u of OPUS_UPGRADES) {
      expect(getOpusUpgradeCost(u, 0)).toBeGreaterThanOrEqual(u.baseCost)
      expect(getOpusUpgradeCost(u, 1)).toBeGreaterThanOrEqual(getOpusUpgradeCost(u, 0))
    }
  })

  it('automator unlocks gate tiers 2..7 only', () => {
    const levels: Record<string, number> = {}
    expect(isAutomatorUnlocked(levels, 1)).toBe(true)
    expect(isAutomatorUnlocked(levels, 3)).toBe(false)
    levels['automator-unlock-3'] = 1
    expect(isAutomatorUnlocked(levels, 3)).toBe(true)
  })

  it('automator speed/bulk step through tier arrays', () => {
    const levels: Record<string, number> = { 'automator-speed': 2, 'automator-bulk': 2 }
    expect(getAutomatorInterval(levels)).toBe(AUTOBUYER_SPEED_TIERS[2])
    expect(getAutomatorBulk(levels)).toBe(AUTOBUYER_BULK_TIERS[2])
  })

  it('effect getters scale with levels', () => {
    const levels: Record<string, number> = {
      'tempo-op-mult': 2,
      'crescendo-ceiling': 1,
      'crescendo-fast-build': 1,
      'crescendo-slow-decay': 1,
      'records-sell-rate': 1,
      'plat-root-boost': 1,
      'fame-strength': 1,
      'bpm-cap': 2,
      'auto-conduct': 1,
    }
    expect(getTempoOpMultiplier(levels)).toBeCloseTo(2.25, 5)
    expect(getCrescendoCeiling(levels)).toBe(CRESCENDO_BASE_MAX + 1)
    expect(getCrescendoBuildSec(levels)).toBeCloseTo(CRESCENDO_BUILD_SEC * 0.8, 5)
    expect(getCrescendoDecaySec(levels)).toBeCloseTo(CRESCENDO_DECAY_SEC * 1.4, 5)
    expect(getEffectiveRecordsK(levels)).toBeCloseTo(1.5, 5)
    expect(getPlatRoot(levels)).toBeCloseTo(0.06, 5)
    expect(getFamePer(levels)).toBeCloseTo(0.15, 5)
    expect(getBpmCapFactor(levels)).toBeCloseTo(1.5, 5)
    expect(hasAutoConduct(levels)).toBe(true)
  })
})
