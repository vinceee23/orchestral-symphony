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
const { TIER_CONFIGS, AUTOBUYER_DEFAULT_INTERVAL } = await import('../src/core/constants')
const { getTierCost, getMilestoneMultiplier } = await import('../src/core/formulas')

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

  // Drift guard for the Rehearsal bug: the Encore-shop cost discount MUST reach autobuyer buys, not
  // just manual buys. SW is set affordable ONLY with the 25% discount — a buy proves the discount applied.
  it('Rehearsal discount reaches autobuyer buys', () => {
    jump(2, { autoMO: false, autoMOEnabled: false })
    const cfg = TIER_CONFIGS[0]
    const purchased = 20
    const fullCost = getTierCost(cfg, purchased, 1) // undiscounted unit cost at this bracket
    useGameStore.setState({
      encoreUpgrades: { rehearsal: 5 }, // -5%/lvl ×5 = 25% off
      tiers: TIER_CONFIGS.map((c, i) => ({
        id: c.id, name: c.name,
        quantity: new Decimal(0), // no production noise — SW must come only from the seeded budget
        purchased: i === 0 ? purchased : 0,
        multiplier: i === 0 ? getMilestoneMultiplier(purchased) : new Decimal(1),
        unlocked: true,
      })),
      autobuyers: { tier_1: { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 1, lastTick: 0 } },
      soundwaves: fullCost.times(0.9), // ≥ 0.75×cost (discounted) but < 1×cost (undiscounted)
      peakSoundwaves: fullCost.times(0.9),
    })
    runTicks(1)
    expect(useGameStore.getState().tiers[0].purchased).toBe(purchased + 1)
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
