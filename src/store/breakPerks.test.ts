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
const { getEncoreCost, getMagnumOpusCost } = await import('../core/constants')

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
