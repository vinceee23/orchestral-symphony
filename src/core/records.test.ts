import { describe, it, expect } from 'vitest'
import { PLATINUM_THRESHOLD, RECORDS_ALBUM_K, RECORDS_OPUS_EXP } from './constants'
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
    const opusCount = 5
    const mult = 2
    const rate = getRecordsPerSec(opusCount, mult, emptyLevels)
    expect(rate).toBeCloseTo(RECORDS_ALBUM_K * Math.pow(5, RECORDS_OPUS_EXP) * 2, 5)
    const accrued = accrueRecords(0, opusCount, mult, 10, emptyLevels)
    expect(accrued).toBeCloseTo(rate * 10, 5)
  })

  it('getOpusGain pre vs post Platinum differ', () => {
    const pre = getOpusGain({
      platinum: false,
      opGainFlatLevel: 0,
      opusCount: 10,
      peakCrescendoMult: 3,
      levels: emptyLevels,
    })
    expect(pre).toBe(1)

    const post = getOpusGain({
      platinum: true,
      opGainFlatLevel: 0,
      opusCount: 10,
      peakCrescendoMult: 3,
      levels: emptyLevels,
    })
    expect(post).toBeGreaterThan(pre)
  })

  it('getOpusGain guards non-finite -> 0', () => {
    const gain = getOpusGain({
      platinum: true,
      opGainFlatLevel: 0,
      opusCount: 10,
      peakCrescendoMult: Infinity,
      levels: emptyLevels,
    })
    expect(gain).toBe(0)
  })
})
