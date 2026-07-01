import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Decimal from 'break_infinity.js'

const mem: Record<string, string> = {}
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k] },
  key: () => null,
  length: 0,
} as Storage

const { useGameStore } = await import('../src/store/gameStore')
const { buildLayerJumpPatch } = await import('../src/dev/layerJump')

const PINNED_NOW = 1_900_000_000_000

function jump(layer: number, extra: Record<string, unknown> = {}): void {
  useGameStore.getState().hardReset()
  useGameStore.setState({ ...buildLayerJumpPatch(layer), ...extra })
}

function runTicks(n: number, dt = 1000): void {
  for (let i = 0; i < n; i++) {
    vi.setSystemTime(PINNED_NOW + i * dt)
    useGameStore.getState().tick(dt)
  }
}

const totalPurchased = () => useGameStore.getState().tiers.reduce((s, t) => s + t.purchased, 0)

// Verifies each autobuyer type actually AUTOBUYS after a DevPanel layer-jump. Each automation has its own
// valid window (auto-encore pre-wall, auto-MO post-wall, auto-tour during a post-Signature re-climb), so
// each is checked in the layer/state that enables it.
describe('layer-jump automations actually autobuy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_NOW)
    localStorage.clear()
    useGameStore.getState().hardReset()
  })
  afterEach(() => vi.useRealTimers())

  it('L1 jump → auto-encore fires (encoreCount rises; pre-wall)', () => {
    jump(1)
    expect(useGameStore.getState().layer1WallReached).toBe(false)
    expect(useGameStore.getState().autobuyers['encore']?.unlocked).toBe(true)
    const before = useGameStore.getState().encoreCount
    runTicks(40)
    expect(useGameStore.getState().encoreCount).toBeGreaterThan(before)
  })

  it('L2 jump → tier autobuyers buy tiers (isolated: auto-MO off)', () => {
    jump(2, { autoMO: false, autoMOEnabled: false })
    const before = totalPurchased()
    runTicks(20)
    expect(totalPurchased()).toBeGreaterThan(before)
  })

  it('L2 jump → auto-Magnum-Opus fires (opusCount rises)', () => {
    jump(2)
    const before = useGameStore.getState().opusCount
    runTicks(60)
    expect(useGameStore.getState().opusCount).toBeGreaterThan(before)
  })

  it('auto-Tour fires during a post-Signature re-climb (signatureUnlocked, circuit not complete)', () => {
    jump(3, {
      signatureUnlocked: true,
      autoTour: true,
      autoTourEnabled: true,
      circuitComplete: false,
      catalogueSnapshot: new Decimal(1),
      opusCount: 30,
      recordsSold: 5_000_000,
    })
    const before = useGameStore.getState().tourCount
    runTicks(5)
    expect(useGameStore.getState().tourCount).toBeGreaterThan(before)
  })
})
