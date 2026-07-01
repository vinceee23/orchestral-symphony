import Decimal from 'break_infinity.js'
import type { GameState } from '../store/types'
import { calculateTick } from './tick'
import { MAX_OFFLINE_MS } from './constants'

/**
 * Offline catch-up replay — extracted from the store's onRehydrate so the REAL path is unit-testable
 * (the pacing sims previously mirrored it divergently, which could hide regressions).
 */

/**
 * Chunk size scales with the away-window so a 24h gap replays in ≤ ~2.9k iterations instead of 86.4k
 * 1s ticks (a visible main-thread freeze on load). Coarse chunks are safe: production is delta-based
 * and autobuyers multi-fire across elapsed intervals (fires = floor(elapsed/interval), tick.ts).
 */
export function offlineChunkMs(awayMs: number): number {
  if (awayMs <= 2 * 3_600_000) return 1_000
  if (awayMs <= 8 * 3_600_000) return 10_000
  return 30_000
}

export interface OfflineProgress {
  patch: Partial<GameState>
  awayMs: number
  gains: { soundwaves: Decimal; records: number; acclaim: Decimal }
}

/**
 * Replays up to MAX_OFFLINE_MS of away-time through the real calculateTick with an ADVANCING
 * simulated clock (a frozen clock starves offline autobuyers to one burst — the P5 bug).
 * Returns the state patch + gains, or null when there's nothing to replay.
 * Autobuyer lastTick is reset to `nowMs` so the first live frame doesn't re-see the gap and over-fire.
 */
export function computeOfflineProgress(
  state: GameState,
  nowMs: number,
  chunkOverrideMs?: number, // tests only: pin the chunk to compare fidelity across sizes
): OfflineProgress | null {
  const awayMs = Math.min(nowMs - state.lastSaveTimestamp, MAX_OFFLINE_MS)
  if (awayMs <= 1_000 || !state.settings.offlineEnabled) return null

  const beforeSoundwaves = new Decimal(state.soundwaves)
  const beforeRecords = state.recordsSold
  const beforeAcclaim = new Decimal(state.lifetimeAcclaim ?? 0)

  const chunkMs = chunkOverrideMs ?? offlineChunkMs(awayMs)
  let remaining = awayMs
  let current: GameState = { ...state }
  let simNow = state.lastSaveTimestamp
  while (remaining > 0) {
    const step = Math.min(remaining, chunkMs)
    simNow += step
    const updates = calculateTick(current, step, false, simNow)
    current = { ...current, ...updates }
    remaining -= step
  }

  const patch: Partial<GameState> = {
    soundwaves: current.soundwaves,
    tiers: current.tiers,
    tempo: current.tempo,
    autobuyers: Object.fromEntries(
      Object.entries(current.autobuyers).map(([k, ab]) => [k, ab ? { ...ab, lastTick: nowMs } : ab]),
    ) as GameState['autobuyers'],
    totalTimePlayed: current.totalTimePlayed,
    peakSoundwaves: current.peakSoundwaves,
    producedThisRun: current.producedThisRun,
    crescendo: current.crescendo,
    peakCrescendoMult: current.peakCrescendoMult,
    recordsSold: current.recordsSold,
    platinum: current.platinum,
    warmUpLevel: current.warmUpLevel,
    activityGraceMs: current.activityGraceMs,
    acclaim: current.acclaim,
    lifetimeAcclaim: current.lifetimeAcclaim,
    venueBuffer: current.venueBuffer,
    venueSoldOut: current.venueSoldOut,
  }

  return {
    patch,
    awayMs,
    gains: {
      soundwaves: current.soundwaves.minus(beforeSoundwaves),
      records: current.recordsSold - beforeRecords,
      acclaim: new Decimal(current.lifetimeAcclaim ?? 0).minus(beforeAcclaim),
    },
  }
}
