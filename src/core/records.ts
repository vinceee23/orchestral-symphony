import Decimal from 'break_infinity.js'
import { OPUS_BASE_GAIN, OPUS_PLAT_THRESHOLD, PLATINUM_THRESHOLD } from './constants'
import { getCrescendoOpBonus } from './crescendo'
import {
  getEffectiveRecordsK,
  getFamePer,
  getOpGainFlat,
  getPlatRoot,
} from './opusUpgrades'

/** Records sold per second from soundwave production and crescendo. */
export function getRecordsPerSec(
  swPerSec: Decimal,
  crescendoMult: number,
  levels: Record<string, number>,
): number {
  const k = getEffectiveRecordsK(levels)
  const logTerm = Math.log10(swPerSec.plus(10).toNumber())
  return k * logTerm * crescendoMult
}

/** Accrue records over dtSec. */
export function accrueRecords(
  currentRecords: number,
  swPerSec: Decimal,
  crescendoMult: number,
  dtSec: number,
  levels: Record<string, number>,
): number {
  return currentRecords + getRecordsPerSec(swPerSec, crescendoMult, levels) * dtSec
}

export function isPlatinum(recordsSold: number): boolean {
  return recordsSold >= PLATINUM_THRESHOLD
}

export function getOpusGain(opts: {
  platinum: boolean
  opGainLevel: number
  peakSoundwaves: Decimal
  peakCrescendoMult: number
  levels: Record<string, number>
}): number {
  if (!opts.platinum) {
    return OPUS_BASE_GAIN + opts.opGainLevel + getOpGainFlat(opts.levels)
  }

  if (opts.peakSoundwaves.lte(OPUS_PLAT_THRESHOLD)) return 0

  const ratio = opts.peakSoundwaves.div(OPUS_PLAT_THRESHOLD).pow(getPlatRoot(opts.levels))
  const raw = ratio.times(getCrescendoOpBonus(opts.peakCrescendoMult, opts.levels)).toNumber()
  const n = Math.floor(raw)
  return isFinite(n) ? n : 0
}

/** Fame multiplier on production/OP post-Platinum. */
export function getFameMultiplier(recordsSold: number, levels: Record<string, number>): number {
  if (recordsSold < PLATINUM_THRESHOLD) return 1
  const famePer = getFamePer(levels)
  return 1 + Math.log10(recordsSold / PLATINUM_THRESHOLD) * famePer
}
