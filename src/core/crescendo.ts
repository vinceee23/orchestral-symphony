import { AUTO_CONDUCT_FRACTION } from './constants'
import {
  getCrescendoBuildSec,
  getCrescendoCeiling,
  getCrescendoDecaySec,
  getCrescendoOpBonusPer,
  hasAutoConduct,
} from './opusUpgrades'

/** Crescendo intensity as a 0..1 fraction of ceiling (store wiring supplies this). */
export interface CrescendoState {
  level: number
}

/**
 * Advance crescendo level over dtSec. While conducting (a tap-triggered burst window is active) it rises
 * toward 1 over build time; once the window lapses it decays toward 0 over decay time. Auto-conduct floors
 * at AUTO_CONDUCT_FRACTION when AFK.
 */
export function advanceCrescendo(
  currentLevel01: number,
  conducting: boolean,
  dtSec: number,
  levels: Record<string, number>,
): number {
  if (conducting) {
    const buildSec = getCrescendoBuildSec(levels)
    return Math.min(1, currentLevel01 + dtSec / buildSec)
  }

  const decaySec = getCrescendoDecaySec(levels)
  let next = currentLevel01 - dtSec / decaySec
  if (hasAutoConduct(levels)) {
    next = Math.max(AUTO_CONDUCT_FRACTION, next)
  } else {
    next = Math.max(0, next)
  }
  return next
}

/** Map 0..1 crescendo level to a 1..ceiling production multiplier. At 0 -> 1.0.
 *  crescendoBonus raises the ceiling (challenge Solo reward). */
export function getCrescendoMultiplier(
  level01: number,
  levels: Record<string, number>,
  crescendoBonus = 0,
): number {
  const ceiling = getCrescendoCeiling(levels) + crescendoBonus
  const clamped = Math.max(0, Math.min(1, level01))
  return 1 + clamped * (ceiling - 1)
}

/** OP bonus from peak crescendo multiplier: 1 + (peakMult - 1) * bonusPer. */
export function getCrescendoOpBonus(peakCrescendoMult: number, levels: Record<string, number>): number {
  const bonusPer = getCrescendoOpBonusPer(levels)
  return 1 + (peakCrescendoMult - 1) * bonusPer
}
