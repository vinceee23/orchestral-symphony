import type { GameState } from '../store/types'
import { WARMUP_DECAY_PER_SEC, WARMUP_FILL_PER_SEC, WARMUP_PEAK_MULT } from './constants'

function clampWarmUpLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(1, level))
}

export function isWarmUpUnlocked(state: Pick<GameState, 'tiers'>): boolean {
  return (state.tiers[2]?.purchased ?? 0) >= 1
}

export function advanceWarmUp(level: number, activeNow: boolean, dtSec: number): number {
  const current = clampWarmUpLevel(level)
  if (!Number.isFinite(dtSec) || dtSec <= 0) return current
  const delta = (activeNow ? WARMUP_FILL_PER_SEC : -WARMUP_DECAY_PER_SEC) * dtSec
  return clampWarmUpLevel(current + delta)
}

export function warmUpMultiplier(level: number): number {
  return 1 + clampWarmUpLevel(level) * (WARMUP_PEAK_MULT - 1)
}
