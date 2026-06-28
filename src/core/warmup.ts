import type { GameState } from '../store/types'
import { WARMUP_DECAY_PER_SEC, WARMUP_FILL_PER_SEC, WARMUP_PEAK_MULT } from './constants'

function clampWarmUpLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(1, level))
}

// RETIRED (2026-06-29): Warm-Up was redundant with Conduct/Crescendo — both reward active presence with a
// production multiplier, and post-MO they showed at the same time. Inerted at the source so it never
// engages, never shows (WarmUpBar returns null when inactive), and has zero production effect. The plumbing
// stays for save-compat + easy revert; it can be fully removed in a later cleanup. (perk-warmup, the
// head-start tier-prebuy, is a SEPARATE mechanic and is unaffected.)
export function isWarmUpUnlocked(_state: Pick<GameState, 'tiers'>): boolean {
  return false
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
