import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Decimal from 'break_infinity.js'

/**
 * L2 MONOTONY PROBE (PROBE=1) — quantifies the suspected mid-game desert: how many identical
 * Magnum Opus cycles does a player grind between the FIRST MO and Platinum, and does the cycle
 * cadence evolve (shrinking cycles = felt acceleration) or stay flat (monotony)?
 * Two profiles: rusher (15s acts, conducts) and casual (2min acts, no conduct).
 * Run: PROBE=1 npx vitest run sim/l2-probe.test.ts   → read PROBE| lines.
 */

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
const { useUiStore } = await import('../src/store/uiStore')
const { ENCORE_UPGRADES } = await import('../src/core/encoreUpgrades')
const { OPUS_UPGRADES } = await import('../src/core/opusUpgrades')

const SIM_EPOCH = 1_900_000_000_000
const DT_MS = 5_000
const MAX_H = 40
const MAX_STEPS = (MAX_H * 3600 * 1000) / DT_MS

function act(conducts: boolean): void {
  const s = useGameStore.getState()
  for (let id = 7; id >= 1; id--) s.buyMaxTier(id)
  s.buyMaxTempo()
  for (const u of ENCORE_UPGRADES) useGameStore.getState().buyEncoreUpgrade(u.id)
  for (const u of OPUS_UPGRADES) useGameStore.getState().buyOpusUpgrade(u.id)
  useGameStore.getState().unlockWithApplause('encore')
  useGameStore.getState().performEncore()
  useGameStore.getState().performMagnumOpus()
  void conducts
}

describe.skipIf(!process.env.PROBE)('L2 probe — MO cycles to Platinum', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(SIM_EPOCH)
    localStorage.clear()
  })
  afterEach(() => {
    useUiStore.setState({ conducting: false })
    vi.useRealTimers()
  })

  it.each([
    { name: 'rusher', cadenceSec: 15, conducts: true },
    { name: 'casual', cadenceSec: 120, conducts: false },
  ])('$name — MO cadence between first MO and Platinum', ({ name, cadenceSec, conducts }) => {
    useGameStore.getState().hardReset()
    useGameStore.setState({ settings: { ...useGameStore.getState().settings, offlineEnabled: false } })
    useUiStore.setState({ conducting: conducts })

    const cadenceSteps = Math.max(1, Math.round((cadenceSec * 1000) / DT_MS))
    const moTimes: number[] = []
    let platinumAt: number | undefined
    let prevOpus = 0

    for (let step = 0; step < MAX_STEPS; step++) {
      const tMs = step * DT_MS
      vi.setSystemTime(SIM_EPOCH + tMs)
      useGameStore.getState().tick(DT_MS)
      if (step % cadenceSteps === 0) act(conducts)
      const s = useGameStore.getState()
      if (s.opusCount > prevOpus) {
        moTimes.push(tMs)
        prevOpus = s.opusCount
      }
      if (platinumAt === undefined && s.platinum) {
        platinumAt = tMs
        break
      }
    }

    const h = (ms: number) => (ms / 3_600_000).toFixed(2)
    const cycles = moTimes.slice(1).map((t, i) => ((t - moTimes[i]) / 60_000).toFixed(1))
    console.log(`PROBE|${name}|firstMO=${h(moTimes[0] ?? 0)}h|platinum=${platinumAt !== undefined ? h(platinumAt) + 'h' : 'NOT in ' + MAX_H + 'h'}|MOsToPlat=${prevOpus}|cycleMins=[${cycles.join(',')}]`)
    expect(moTimes.length).toBeGreaterThan(0)
  }, 900_000)
})
