import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../store/initialState'
import { getProductionBreakdown, getProductionMultiplier } from './multiplierRegistry'

/** The C10 breakdown is only trustworthy if its product is EXACTLY the real multiplier. Guard that. */
describe('getProductionBreakdown', () => {
  const product = (s: ReturnType<typeof createInitialState>) =>
    getProductionBreakdown(s).reduce((acc, f) => acc.times(f.value), new Decimal(1))

  it('product of the breakdown equals getProductionMultiplier (no drift)', () => {
    const base = createInitialState()
    // A non-trivial state so several channels are live (Applause / Tempo / Milestones / Acclaim).
    const s = {
      ...base,
      lifetimeEncorePoints: 8,
      tempo: { ...base.tempo, level: 30 },
      tiers: base.tiers.map((t, i) => (i === 0 ? { ...t, purchased: 25, unlocked: true } : t)),
      worldTourUnlocked: true,
      lifetimeAcclaim: new Decimal(1000),
    }
    const mult = getProductionMultiplier(s)
    expect(product(s).div(mult).toNumber()).toBeCloseTo(1, 9)
  })

  it('holds for the fresh initial state too', () => {
    const s = createInitialState()
    expect(product(s).div(getProductionMultiplier(s)).toNumber()).toBeCloseTo(1, 9)
  })

  it('drops no-op x1 factors', () => {
    const s = createInitialState()
    expect(getProductionBreakdown(s).every((f) => !f.value.eq(1))).toBe(true)
  })
})
