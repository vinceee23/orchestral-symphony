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
const { canAutoPerformTour, getCatalogueSnapshot } = await import('../core/worldTour')

describe('World Tour reset persistence', () => {
  beforeEach(() => useGameStore.getState().hardReset())

  it('AP/lifetime counts persist; auto-MO resets without Roadies', () => {
    useGameStore.setState({
      worldTourUnlocked: true,
      applausePoints: 40, lifetimeEncoreCount: 30,
      autoMO: true, autoMOEnabled: true, keepAutobuyers: false,
    })
    useGameStore.getState().performTour()
    const s = useGameStore.getState()
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

describe('Auto-Tour is gated to L4 (not reachable in L3)', () => {
  beforeEach(() => useGameStore.getState().hardReset())

  it('canAutoPerformTour never fires in L3, even past the catalogue ratio', () => {
    const snap = getCatalogueSnapshot(4, 100_000)
    useGameStore.setState({
      worldTourUnlocked: true, autoTour: true, autoTourEnabled: true, circuitComplete: false,
      catalogueSnapshot: new Decimal(snap), opusCount: 12, recordsSold: 2_000_000,
    })
    expect(canAutoPerformTour(useGameStore.getState())).toBe(false) // L4_UNLOCKED === false
  })

  it('unlockWithApplause(autoTour) is a no-op in L3', () => {
    useGameStore.setState({ worldTourUnlocked: true, opusCount: 10, applausePoints: 9999 })
    useGameStore.getState().unlockWithApplause('autoTour')
    expect(useGameStore.getState().autoTour).toBe(false)
  })
})
