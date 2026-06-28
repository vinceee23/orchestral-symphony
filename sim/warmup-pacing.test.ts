import { describe, it, expect } from 'vitest'
import { advanceWarmUp, warmUpMultiplier, isWarmUpUnlocked } from '../src/core/warmup'
import { WARMUP_PEAK_MULT } from '../src/core/constants'

// Warm-Up is a single BOUNDED production channel: production is multiplied by
// `warmUpMultiplier(level)` where level ∈ [0,1], so its contribution is capped at WARMUP_PEAK_MULT by
// construction. These unit guards prove the channel's shape (fill, decay-to-floor, cap, unlock gate).
//
// NOTE on balance: instantaneous active:idle is NOT the lever for Warm-Up — sustained conducting
// (crescendo) is already a >1000x instantaneous burst, so isolating Warm-Up against idle is meaningless.
// The meaningful question — "does the +≤1.5x for active play over-tip the intended pace?" — is answered by
// realistic PROGRESSION, which the era/human/l3 pacing sims measure (they conduct continuously post-wall, so
// they already include the Warm-Up bonus). Re-pacing decisions live there.
describe('warm-up channel', () => {
  it('multiplier: floor is 1x, peak is WARMUP_PEAK_MULT, monotonic in level', () => {
    expect(warmUpMultiplier(0)).toBeCloseTo(1)
    expect(warmUpMultiplier(1)).toBeCloseTo(WARMUP_PEAK_MULT)
    expect(warmUpMultiplier(0.5)).toBeGreaterThan(warmUpMultiplier(0))
    expect(warmUpMultiplier(0.5)).toBeLessThan(warmUpMultiplier(1))
    // Out-of-range levels are clamped (defensive against NaN / overshoot).
    expect(warmUpMultiplier(5)).toBeCloseTo(WARMUP_PEAK_MULT)
    expect(warmUpMultiplier(-1)).toBeCloseTo(1)
    expect(warmUpMultiplier(NaN)).toBeCloseTo(1)
  })

  it('fill/decay: rises when active, decays to floor when idle, capped at 1', () => {
    expect(advanceWarmUp(0, true, 1)).toBeGreaterThan(0) // fills when active
    expect(advanceWarmUp(1, false, 1)).toBeLessThan(1) // decays when idle
    expect(advanceWarmUp(0, false, 1)).toBe(0) // floored at 0
    expect(advanceWarmUp(1, true, 999)).toBeLessThanOrEqual(1) // capped at 1
    expect(advanceWarmUp(0.5, true, 0)).toBeCloseTo(0.5) // zero dt = no change
  })

  // RETIRED (2026-06-29): Warm-Up was redundant with Conduct/Crescendo, so isWarmUpUnlocked is now inert
  // (always false). The pure-function shape tests above still hold (plumbing kept for save-compat), but the
  // unlock gate never opens — that's the contract now.
  it('unlock gate: RETIRED — never opens (inert, redundant with Conduct)', () => {
    expect(isWarmUpUnlocked({ tiers: [{ purchased: 0 }, { purchased: 0 }, { purchased: 1 }] } as never)).toBe(false)
    expect(isWarmUpUnlocked({ tiers: [{ purchased: 9 }, { purchased: 9 }, { purchased: 0 }] } as never)).toBe(false)
  })
})
