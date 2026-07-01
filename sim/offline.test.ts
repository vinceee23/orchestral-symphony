import { describe, it, expect } from 'vitest'
import Decimal from 'break_infinity.js'
import { computeOfflineProgress, offlineChunkMs } from '../src/core/offline'
import { MAX_OFFLINE_MS, TIER_CONFIGS, AUTOBUYER_DEFAULT_INTERVAL, DEFAULT_SETTINGS } from '../src/core/constants'
import { getMilestoneMultiplier, getTempoBPM, getTempoTickInterval } from '../src/core/formulas'
import { createInitialState } from '../src/store/initialState'
import type { GameState } from '../src/store/types'

// Tests the REAL offline-replay path (core/offline.ts, called by the store's onRehydrate) — the
// audit found the pacing sims mirrored it divergently, so the P5 offline-autobuyer fix, the lastTick
// reset, and the 24h cap were asserted by nothing.

const NOW = 1_900_000_000_000

function offlineState(awayMs: number, overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState()
  return {
    ...s,
    settings: { ...DEFAULT_SETTINGS, offlineEnabled: true },
    lastSaveTimestamp: NOW - awayMs,
    opusCount: 1, // opus automators active → upgraded interval path
    // Tier 1 at purchased=10: the next unit costs ~2.5k, affordable only after ACCRUAL — so multiple
    // bracket-crossing buys across the window prove the advancing sim-clock (P5), not a t=0 burst.
    tiers: TIER_CONFIGS.map((c, i) => ({
      id: c.id,
      name: c.name,
      quantity: new Decimal(i === 0 ? 10 : 0),
      purchased: i === 0 ? 10 : 0,
      multiplier: i === 0 ? getMilestoneMultiplier(10) : new Decimal(1),
      unlocked: i === 0,
    })),
    tempo: { level: 4, tickInterval: getTempoTickInterval(4), baseBPM: getTempoBPM(4) },
    autobuyers: {
      tier_1: { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 1, lastTick: NOW - awayMs },
    },
    soundwaves: new Decimal(100),
    peakSoundwaves: new Decimal(100),
    ...overrides,
  }
}

describe('offline replay (real path)', () => {
  it('accrues production and autobuyers fire ACROSS the window (P5 guard)', () => {
    const away = 6 * 3_600_000 // 6h
    const state = offlineState(away)
    const result = computeOfflineProgress(state, NOW)
    expect(result).not.toBeNull()
    const { patch, awayMs, gains } = result!
    expect(awayMs).toBe(away)
    expect(gains.soundwaves.gt(0)).toBe(true)
    // Autobuyer must have bought repeatedly as SW accrued over the window — not one burst at t=0
    // (start SW=100 affords zero units at the ~2.5k bracket price; only accrual-then-buy cycles
    // across the advancing sim-clock can cross multiple brackets).
    const t1 = patch.tiers![0]
    expect(t1.purchased).toBeGreaterThan(20)
    // lastTick reset to real-now so the first live frame doesn't re-see the gap and over-fire.
    expect(patch.autobuyers!['tier_1']!.lastTick).toBe(NOW)
    // Time accounting covers the whole window.
    expect(patch.totalTimePlayed).toBe(state.totalTimePlayed + away)
  })

  it('caps a multi-day absence at MAX_OFFLINE_MS (24h)', () => {
    const state = offlineState(72 * 3_600_000) // 3 days away
    const result = computeOfflineProgress(state, NOW)!
    expect(result.awayMs).toBe(MAX_OFFLINE_MS)
    expect(result.patch.totalTimePlayed).toBe(state.totalTimePlayed + MAX_OFFLINE_MS)
  })

  it('returns null when offline progress is disabled or the gap is trivial', () => {
    expect(computeOfflineProgress(offlineState(6 * 3_600_000, {
      settings: { ...DEFAULT_SETTINGS, offlineEnabled: false },
    }), NOW)).toBeNull()
    expect(computeOfflineProgress(offlineState(500), NOW)).toBeNull()
  })

  it('bounds the load-time work: a 24h gap replays in ≤ 3000 iterations (freeze guard)', () => {
    for (const [awayH, maxIters] of [[1, 3600], [6, 2160], [24, 2880]] as const) {
      const iters = Math.ceil((awayH * 3_600_000) / offlineChunkMs(awayH * 3_600_000))
      expect(iters, `${awayH}h window`).toBeLessThanOrEqual(maxIters)
    }
  })

  it('coarse chunks track the fine baseline (fidelity guard: SAME 4h window, 1s vs 30s chunks)', () => {
    const away = 4 * 3_600_000
    const fine = computeOfflineProgress(offlineState(away), NOW, 1_000)!
    const coarse = computeOfflineProgress(offlineState(away), NOW, 30_000)!
    const fineExp = fine.patch.soundwaves!.log10()
    const coarseExp = coarse.patch.soundwaves!.log10()
    expect(fineExp).toBeGreaterThan(0)
    // Coarse replay must land within ±25% of the fine replay's SW exponent over an identical window.
    expect(coarseExp / fineExp).toBeGreaterThan(0.75)
    expect(coarseExp / fineExp).toBeLessThan(1.25)
  })
})
