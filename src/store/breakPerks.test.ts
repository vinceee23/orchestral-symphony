import { describe, it, expect, beforeEach } from 'vitest'
import Decimal from 'break_infinity.js'

// persist middleware needs a storage in the node test env.
const mem: Record<string, string> = {}
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k] },
  key: () => null,
  length: 0,
} as Storage

const { useGameStore } = await import('./gameStore')
const { getEncoreCost, getMagnumOpusCost, AP_UNLOCK } = await import('../core/constants')
const { canAutoPerformTour, getCatalogueSnapshot, L3 } = await import('../core/worldTour')

function setTier(tierIndex: number, purchased: number) {
  const tiers = useGameStore.getState().tiers.map((t, i) =>
    i === tierIndex ? { ...t, purchased, unlocked: true, quantity: new Decimal(purchased) } : t,
  )
  useGameStore.setState({ tiers })
}

describe('Break-phase reset perks', () => {
  beforeEach(() => useGameStore.getState().hardReset())

  it('Encore Resonance: Encore carries Soundwaves + bumps lifetime count', () => {
    const cost = getEncoreCost(0)
    setTier(cost.tierIndex, cost.amount)
    useGameStore.setState({
      achievements: ['ach_perk_encore_resonance'],
      soundwaves: new Decimal('1e20'),
      peakSoundwaves: new Decimal('1e20'),
    })
    const before = useGameStore.getState().lifetimeEncoreCount
    useGameStore.getState().performEncore()
    const s = useGameStore.getState()
    expect(s.soundwaves.gte('1e20')).toBe(true) // SW carried, not reset to ~10
    expect(s.lifetimeEncoreCount).toBe(before + 1)
  })

  it('without the perk, Encore resets Soundwaves', () => {
    const cost = getEncoreCost(0)
    setTier(cost.tierIndex, cost.amount)
    useGameStore.setState({ achievements: [], soundwaves: new Decimal('1e20'), peakSoundwaves: new Decimal('1e20') })
    useGameStore.getState().performEncore()
    expect(useGameStore.getState().soundwaves.lt('1e19')).toBe(true) // reset (sight-reading seed at most)
  })

  it('Opus Memory: Magnum Opus keeps the layers below (tiers + encore count)', () => {
    const moCost = getMagnumOpusCost(0)
    setTier(moCost.tierIndex, moCost.amount)
    useGameStore.setState({
      achievements: ['ach_perk_opus_memory'],
      layer1WallReached: true,
      platinum: true,
      recordsSold: 2_000_000,
      encoreCount: 5,
    })
    const opusBefore = useGameStore.getState().opusCount
    useGameStore.getState().performMagnumOpus()
    const s = useGameStore.getState()
    expect(s.opusCount).toBe(opusBefore + 1) // MO still happened
    expect(s.encoreCount).toBe(5) // Encore layer NOT reset
    expect(s.tiers[moCost.tierIndex].purchased).toBe(moCost.amount) // tiers kept
  })
})

describe('World Tour reset persistence', () => {
  beforeEach(() => useGameStore.getState().hardReset())

  it('Fame/AP/lifetime counts persist; auto-MO resets without Roadies', () => {
    useGameStore.setState({
      worldTourUnlocked: true,
      spendableFame: 7, lifetimeFame: 12, fameUpgrades: { limelight: 2 },
      applausePoints: 40, lifetimeEncoreCount: 30,
      autoMO: true, autoMOEnabled: true, keepAutobuyers: false,
    })
    useGameStore.getState().performTour()
    const s = useGameStore.getState()
    expect(s.spendableFame).toBe(7)        // Fame persists
    expect(s.lifetimeFame).toBe(12)
    expect(s.fameUpgrades.limelight).toBe(2)
    expect(s.applausePoints).toBe(40)      // AP persists (re-buy automations)
    expect(s.lifetimeEncoreCount).toBe(30) // monotonic
    expect(s.autoMO).toBe(false)           // automation resets without Roadies
  })

  it('auto-MO survives a tour when Roadies (keepAutobuyers) is owned', () => {
    useGameStore.setState({ worldTourUnlocked: true, autoMO: true, keepAutobuyers: true })
    useGameStore.getState().performTour()
    expect(useGameStore.getState().autoMO).toBe(true)
  })
})

describe('Auto-Tour capstone', () => {
  beforeEach(() => useGameStore.getState().hardReset())

  it('canAutoPerformTour fires only once the live catalogue passes the ratio', () => {
    // Frozen snapshot from a small catalogue; live catalogue has since regrown well past the ratio.
    const snap = getCatalogueSnapshot(4, 100_000)
    useGameStore.setState({
      worldTourUnlocked: true, autoTour: true, autoTourEnabled: true, circuitComplete: false,
      catalogueSnapshot: new Decimal(snap), opusCount: 12, recordsSold: 2_000_000,
    })
    expect(canAutoPerformTour(useGameStore.getState())).toBe(true)

    // Same state but disabled, or circuit already complete → never fires.
    useGameStore.setState({ autoTourEnabled: false })
    expect(canAutoPerformTour(useGameStore.getState())).toBe(false)
    useGameStore.setState({ autoTourEnabled: true, circuitComplete: true })
    expect(canAutoPerformTour(useGameStore.getState())).toBe(false)
  })

  it('does not fire when the catalogue has barely moved (below the ratio)', () => {
    const snap = getCatalogueSnapshot(12, 1_000_000)
    useGameStore.setState({
      worldTourUnlocked: true, autoTour: true, autoTourEnabled: true, circuitComplete: false,
      catalogueSnapshot: new Decimal(snap), opusCount: 12, recordsSold: 1_010_000, // +1% < ratio
    })
    expect(L3.AUTO_TOUR_CAT_RATIO).toBeGreaterThan(1)
    expect(canAutoPerformTour(useGameStore.getState())).toBe(false)
  })

  it('unlockWithApplause(autoTour) needs World Tour + AP, and resets unless Roadies', () => {
    // Locked: no World Tour yet → no unlock even with AP.
    useGameStore.setState({ worldTourUnlocked: false, opusCount: 10, applausePoints: 9999 })
    useGameStore.getState().unlockWithApplause('autoTour')
    expect(useGameStore.getState().autoTour).toBe(false)

    // Unlock in L3, then a tour without Roadies clears it; AP was spent.
    useGameStore.setState({ worldTourUnlocked: true, opusCount: 10, applausePoints: AP_UNLOCK.autoTour.cost, keepAutobuyers: false })
    useGameStore.getState().unlockWithApplause('autoTour')
    expect(useGameStore.getState().autoTour).toBe(true)
    expect(useGameStore.getState().applausePoints).toBe(0)
    useGameStore.getState().performTour()
    expect(useGameStore.getState().autoTour).toBe(false)
  })
})
