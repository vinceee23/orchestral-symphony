import { OPUS_CATALOG_K, PLATINUM_THRESHOLD, RECORDS_OPUS_EXP } from './constants'
import { getCrescendoOpBonus } from './crescendo'
import {
  getEffectiveRecordsK,
  getFamePer,
} from './opusUpgrades'
import { getFameProdMult, getFameRecordsMult } from './fameTree'

/** Records sold per second — album-style: scales with opusCount and crescendo. */
export function getRecordsPerSec(
  opusCount: number,
  crescendoMult: number,
  levels: Record<string, number>,
  fameUpgrades: Record<string, number> = {},
): number {
  return (
    getEffectiveRecordsK(levels) *
    Math.pow(opusCount, RECORDS_OPUS_EXP) *
    crescendoMult *
    getFameRecordsMult(fameUpgrades) // Sold-Out Shows
  )
}

/** Accrue records over dtSec. */
export function accrueRecords(
  currentRecords: number,
  opusCount: number,
  crescendoMult: number,
  dtSec: number,
  levels: Record<string, number>,
  fameUpgrades: Record<string, number> = {},
): number {
  return currentRecords + getRecordsPerSec(opusCount, crescendoMult, levels, fameUpgrades) * dtSec
}

export function isPlatinum(recordsSold: number): boolean {
  return recordsSold >= PLATINUM_THRESHOLD
}

export function getOpusGain(opts: {
  platinum: boolean
  opGainFlatLevel: number
  opusCount: number
  peakCrescendoMult: number
  levels: Record<string, number>
  fameUpgrades?: Record<string, number>
}): number {
  if (!opts.platinum) {
    return 1 + opts.opGainFlatLevel
  }

  const catalogBase = 1 + opts.opusCount * OPUS_CATALOG_K + opts.opGainFlatLevel
  // Limelight (Fame tree) boosts post-Platinum OP gain alongside production.
  const raw =
    catalogBase *
    getCrescendoOpBonus(opts.peakCrescendoMult, opts.levels) *
    getFameProdMult(opts.fameUpgrades ?? {})
  const n = Math.floor(raw)
  return isFinite(n) ? n : 0
}

/** Fame multiplier on production/OP post-Platinum. */
export function getFameMultiplier(recordsSold: number, levels: Record<string, number>): number {
  if (recordsSold < PLATINUM_THRESHOLD) return 1
  const famePer = getFamePer(levels)
  return 1 + Math.log10(recordsSold / PLATINUM_THRESHOLD) * famePer
}
