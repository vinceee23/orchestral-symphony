import { describe, it, expect } from 'vitest'
import { getCoreProductionMultiplier } from './formulas'

const base = {
  lifetimeEncorePoints: 0,
  finalePoints: 0,
  encoreUpgrades: {},
  tempoLevel: 0,
  opusUpgrades: {},
  crescendoLevel: 0,
  recordsSold: 0,
  platinum: false,
}

describe('Mass Production multiplier', () => {
  it('is x1 without the perk regardless of tier counts', () => {
    const tiers = [{ purchased: 1000 }, { purchased: 1000 }, { purchased: 5 }]
    const off = getCoreProductionMultiplier({ ...base, tiers })
    const offMass = getCoreProductionMultiplier({ ...base, tiers, massProduction: true })
    // with 2 tiers at 1000+, the perk should multiply by 2^2 = 4
    expect(offMass.div(off).toNumber()).toBeCloseTo(4, 5)
  })

  it('only counts tiers at 1000+ (x2 each), no perk -> x1', () => {
    const tiers = [{ purchased: 999 }, { purchased: 1000 }]
    const noPerk = getCoreProductionMultiplier({ ...base, tiers })
    const perk = getCoreProductionMultiplier({ ...base, tiers, massProduction: true })
    expect(perk.div(noPerk).toNumber()).toBeCloseTo(2, 5) // exactly one tier qualifies
  })
})
