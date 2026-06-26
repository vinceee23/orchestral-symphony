import { describe, it, expect } from 'vitest'
import {
  FAME_NODE_MAP,
  getFameGain,
  getFameNodeCost,
  getFameGainMult,
} from './fameTree'

describe('Fame gain', () => {
  it('is 0 before Platinum (1M records)', () => {
    expect(getFameGain(999_999, {})).toBe(0)
  })

  it('floors log10 over the Platinum threshold', () => {
    expect(getFameGain(1_000_000, {})).toBe(1) // floor(1 + log10(1)) = 1
    expect(getFameGain(10_000_000, {})).toBe(2) // floor(1 + log10(10)) = 2
    expect(getFameGain(100_000_000, {})).toBe(3)
  })

  it('Diamond Status scales the gain (+25%/lvl)', () => {
    expect(getFameGainMult({ 'diamond-status': 4 })).toBe(2) // 1 + 0.25*4
    // base 2 (10M) * 2.0 = 4
    expect(getFameGain(10_000_000, { 'diamond-status': 4 })).toBe(4)
  })
})

describe('Fame effects are wired into the formulas', () => {
  it('Standing Ovation raises the crescendo ceiling/multiplier', async () => {
    const { getCrescendoMultiplier } = await import('./crescendo')
    const base = getCrescendoMultiplier(1, {}, {})
    const boosted = getCrescendoMultiplier(1, {}, { 'standing-ovation': 4 })
    expect(boosted).toBeGreaterThan(base)
    expect(boosted - base).toBeCloseTo(2, 5) // +0.5 ceiling ×4 levels, at full crescendo (level01=1)
  })

  it('Sold-Out Shows raises records/sec', async () => {
    const { getRecordsPerSec } = await import('./records')
    const base = getRecordsPerSec(5, 1, {}, {})
    const boosted = getRecordsPerSec(5, 1, {}, { 'sold-out-shows': 6 })
    expect(boosted / base).toBeCloseTo(2.2, 5) // 1 + 0.20*6
  })

  it('Limelight raises post-Platinum OP gain', async () => {
    const { getOpusGain } = await import('./records')
    const opts = { platinum: true, opGainFlatLevel: 0, opusCount: 10, peakCrescendoMult: 1, levels: {} }
    const base = getOpusGain(opts)
    const boosted = getOpusGain({ ...opts, fameUpgrades: { limelight: 8 } })
    expect(boosted).toBeGreaterThan(base) // +15%/lvl ×8 = +120%
  })
})

describe('Fame node cost', () => {
  it('grows geometrically from base', () => {
    const limelight = FAME_NODE_MAP['limelight'] // base 3, growth 1.5
    expect(getFameNodeCost(limelight, 0)).toBe(3)
    expect(getFameNodeCost(limelight, 1)).toBe(Math.ceil(3 * 1.5)) // 5
    expect(getFameNodeCost(limelight, 2)).toBe(Math.ceil(3 * 1.5 * 1.5)) // 7
  })
})
