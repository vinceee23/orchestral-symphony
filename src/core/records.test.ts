import { describe, it, expect } from 'vitest'
import Decimal from 'break_infinity.js'
import { PLATINUM_THRESHOLD, OPUS_BASE_GAIN } from './constants'
import {
  getRecordsPerSec,
  accrueRecords,
  isPlatinum,
  getOpusGain,
  getFameMultiplier,
} from './records'

const emptyLevels: Record<string, number> = {}

describe('records', () => {
  it('1M records => isPlatinum true & fame 1.0 at exactly 1M', () => {
    expect(isPlatinum(PLATINUM_THRESHOLD)).toBe(true)
    expect(isPlatinum(PLATINUM_THRESHOLD - 1)).toBe(false)
    expect(getFameMultiplier(PLATINUM_THRESHOLD, emptyLevels)).toBeCloseTo(1, 5)
  })

  it('10M records => fame > 1', () => {
    expect(getFameMultiplier(10_000_000, emptyLevels)).toBeGreaterThan(1)
  })

  it('getRecordsPerSec and accrueRecords are consistent', () => {
    const sw = new Decimal(1e6)
    const mult = 2
    const rate = getRecordsPerSec(sw, mult, emptyLevels)
    expect(rate).toBeGreaterThan(0)
    const accrued = accrueRecords(0, sw, mult, 10, emptyLevels)
    expect(accrued).toBeCloseTo(rate * 10, 5)
  })

  it('getOpusGain pre vs post Platinum differ', () => {
    const pre = getOpusGain({
      platinum: false,
      opGainLevel: 0,
      peakSoundwaves: new Decimal('1e40'),
      peakCrescendoMult: 3,
      levels: emptyLevels,
    })
    expect(pre).toBe(OPUS_BASE_GAIN)

    const post = getOpusGain({
      platinum: true,
      opGainLevel: 0,
      peakSoundwaves: new Decimal('1e40'),
      peakCrescendoMult: 3,
      levels: emptyLevels,
    })
    expect(post).toBeGreaterThan(pre)
  })

  it('getOpusGain guards non-finite -> 0', () => {
    const gain = getOpusGain({
      platinum: true,
      opGainLevel: 0,
      peakSoundwaves: new Decimal('1e10'), // below threshold
      peakCrescendoMult: 1,
      levels: emptyLevels,
    })
    expect(gain).toBe(0)
  })
})
