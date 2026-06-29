import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Decimal from 'break_infinity.js'
import {
  AUTOBUYER_DEFAULT_INTERVAL,
  PLATINUM_THRESHOLD,
  TIER_CONFIGS,
  getEncoreCost,
  getMagnumOpusCost,
} from '../src/core/constants'
import { getMilestoneMultiplier, getTempoBPM, getTempoTickInterval } from '../src/core/formulas'
import { calculateTick } from '../src/core/tick'
import {
  L3,
  VENUES,
  getComponentMaxTier,
  getVenue,
} from '../src/core/worldTour'
import {
  SIGNATURE_DOMAINS,
  ZERO_SIGNATURE_ALLOCATION,
  getSignatureEffects,
  getSignatureEfficiency,
  getSignatureProductionMultiplier,
  getSignatureIdentity,
} from '../src/core/signature'
import { isBeatConditionMet } from '../src/components/story/beats'
import type { GameState, SignatureDomain, TierState } from '../src/store/types'

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

const PINNED_NOW = 1_900_000_000_000
const SIGNATURE_KEYS = new Set<keyof GameState>([
  'signatureAllocation',
  'signatureCount',
  'peakDomainAlignment',
  'signatureUnlocked',
])

function normalize(value: unknown): unknown {
  if (value instanceof Decimal) return value.toString()
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = normalize((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

function l1ToL3Snapshot(state: GameState): string {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(state).sort() as (keyof GameState)[]) {
    if (SIGNATURE_KEYS.has(key)) continue
    if (typeof state[key] === 'function') continue
    out[key] = normalize(state[key])
  }
  return JSON.stringify(out)
}

function gateTiers(cost: { tierIndex: number; amount: number }): TierState[] {
  return TIER_CONFIGS.map((config, index) => {
    const purchased = index === cost.tierIndex ? cost.amount : 10
    const unlocked = index <= cost.tierIndex
    return {
      id: config.id,
      name: config.name,
      quantity: new Decimal(unlocked ? purchased : 0),
      purchased: unlocked ? purchased : 0,
      multiplier: unlocked && purchased > 0 ? getMilestoneMultiplier(purchased) : new Decimal(1),
      unlocked,
    }
  })
}

function completeCurrentVenue(): void {
  const state = useGameStore.getState()
  const venue = getVenue(state.currentVenue)
  const components = Object.fromEntries(
    venue.componentIds.map((id) => [id, getComponentMaxTier(id)]),
  )
  useGameStore.setState({ components })
  useGameStore.getState().graduateVenue()
}

function runDeterministicL1ToL3(signatureOverrides: Partial<GameState>): string {
  useGameStore.getState().hardReset()
  useGameStore.setState({
    ...signatureOverrides,
    tiers: gateTiers({ tierIndex: 0, amount: 10 }),
    soundwaves: new Decimal('1e30'),
    peakSoundwaves: new Decimal('1e30'),
  })
  useGameStore.getState().tick(1000)

  useGameStore.setState({
    tiers: gateTiers(getEncoreCost(0)),
    peakSoundwaves: new Decimal('1e32'),
  })
  useGameStore.getState().performEncore()

  useGameStore.setState({
    layer1WallReached: true,
    tiers: gateTiers(getMagnumOpusCost(0)),
    peakCrescendoMult: 3,
    recordsSold: PLATINUM_THRESHOLD,
    platinum: true,
    postPlatinumMoCount: L3.GATE_POST_PLAT_MO,
  })
  useGameStore.getState().performMagnumOpus()

  useGameStore.setState({
    recordsSold: PLATINUM_THRESHOLD,
    platinum: true,
    postPlatinumMoCount: L3.GATE_POST_PLAT_MO,
    peakSoundwaves: new Decimal('1e40'),
  })
  useGameStore.getState().unlockWorldTour()

  for (let i = 0; i < VENUES.length; i++) {
    completeCurrentVenue()
  }

  return l1ToL3Snapshot(useGameStore.getState())
}

function alloc(overrides: Partial<Record<SignatureDomain, number>>): Record<SignatureDomain, number> {
  return { ...ZERO_SIGNATURE_ALLOCATION, ...overrides }
}

// === L4 balance oracle: deterministic timed mini-climb ===
// Drives the REAL calculateTick (production + autobuyers) under a fixed mid-L4 baseline, advancing the
// fake clock each step so autobuyer intervals elapse — so cost-reduction (Woodwinds) speeds the climb
// just like in-game. Measures ticks-to-target; lower = stronger. Captures all 4 bend channels.
const CLIMB_STEP_MS = 1000
const CLIMB_START_SW = '1e9'
const CLIMB_TEMPO_LEVEL = 12
// "Diverse but viable" (Vince): the strongest build stays within ~30% of the weakest; none dead/dominant.
const DOMINANCE_BAND = 1.30

function midL4Tiers(): TierState[] {
  return TIER_CONFIGS.map((config) => ({
    id: config.id,
    name: config.name,
    quantity: new Decimal(25),
    purchased: 25,
    multiplier: getMilestoneMultiplier(25),
    unlocked: true,
  }))
}

function midL4Autobuyers(): GameState['autobuyers'] {
  const ab: GameState['autobuyers'] = {}
  for (let i = 1; i <= 7; i++) {
    ab[`tier_${i}`] = {
      unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 'max', lastTick: 0,
    }
  }
  return ab
}

const CLIMB_WINDOW_STEPS = 40
/**
 * Build "strength" = SW-exponents gained over a FIXED window of ticks from an identical mid-L4 baseline.
 * Continuous (no integer-step granularity), captures all four bend channels (production via the domain
 * channel, Percussion->tempo, Strings->crescendo when conducting, Woodwinds->cheaper autobuyer buys).
 * Higher = stronger.
 */
function buildStrength(
  allocation: Record<SignatureDomain, number>,
  signatureCount: number,
  conducting: boolean,
): number {
  useGameStore.getState().hardReset()
  useGameStore.setState({
    signatureUnlocked: true,
    signatureAllocation: allocation,
    signatureCount,
    opusCount: 5,
    tiers: midL4Tiers(),
    tempo: {
      level: CLIMB_TEMPO_LEVEL,
      tickInterval: getTempoTickInterval(CLIMB_TEMPO_LEVEL),
      baseBPM: getTempoBPM(CLIMB_TEMPO_LEVEL),
    },
    autobuyers: midL4Autobuyers(),
    soundwaves: new Decimal(CLIMB_START_SW),
    crescendo: 0,
  })
  const start = useGameStore.getState().soundwaves.log10()
  for (let i = 0; i < CLIMB_WINDOW_STEPS; i++) {
    vi.setSystemTime(PINNED_NOW + i * CLIMB_STEP_MS)
    useGameStore.setState(calculateTick(useGameStore.getState(), CLIMB_STEP_MS, conducting))
  }
  return useGameStore.getState().soundwaves.log10() - start
}

const CLIMB_BUILDS: Array<[string, Record<SignatureDomain, number>]> = [
  ['percussion', alloc({ percussion: 1 })],
  ['strings', alloc({ strings: 1 })],
  ['brass', alloc({ brass: 1 })],
  ['woodwinds', alloc({ woodwinds: 1 })],
  ['harmony', alloc({ harmony: 1 })],
  ['blend', alloc({ percussion: 0.2, strings: 0.2, brass: 0.2, woodwinds: 0.2, harmony: 0.2 })],
  ['brass60harmony40', alloc({ brass: 0.6, harmony: 0.4 })],
]

describe('L4 Signature', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_NOW)
    localStorage.clear()
    useGameStore.getState().hardReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('NO-OP IDENTITY: all-zero Signature is byte-identical through an L1-L3 climb', () => {
    const baseline = runDeterministicL1ToL3({
      signatureAllocation: ZERO_SIGNATURE_ALLOCATION,
      signatureCount: 0,
      signatureUnlocked: false,
    })
    const l4PathEnabled = runDeterministicL1ToL3({
      signatureAllocation: ZERO_SIGNATURE_ALLOCATION,
      signatureCount: 50,
      signatureUnlocked: true,
    })

    const effects = getSignatureEffects(ZERO_SIGNATURE_ALLOCATION, getSignatureEfficiency(1_000_000))
    expect(effects.prodMult.eq(1)).toBe(true)
    expect(effects.tempoBonus).toBe(0)
    expect(effects.crescendoBonus).toBe(0)
    expect(effects.costMult).toBe(1)
    expect(effects.harmonyMult.eq(1)).toBe(true)
    expect(getSignatureProductionMultiplier(ZERO_SIGNATURE_ALLOCATION, 1_000_000).eq(1)).toBe(true)
    expect(l4PathEnabled).toBe(baseline)
  })

  it('setSignatureAllocation enforces the fixed budget', () => {
    useGameStore.setState({ signatureUnlocked: true })
    useGameStore.getState().setSignatureAllocation(alloc({ brass: 0.7, strings: 0.4 }))
    expect(useGameStore.getState().signatureAllocation).toEqual(ZERO_SIGNATURE_ALLOCATION)

    useGameStore.getState().setSignatureAllocation(alloc({ brass: 0.6, strings: 0.4 }))
    expect(useGameStore.getState().signatureAllocation).toEqual(alloc({ brass: 0.6, strings: 0.4 }))
  })

  it('peakDomainAlignment captures max allocation across respecs', () => {
    useGameStore.setState({ signatureUnlocked: true })
    useGameStore.getState().setSignatureAllocation(alloc({ brass: 0.4, percussion: 0.2 }))
    useGameStore.getState().setSignatureAllocation(alloc({ brass: 0.1, strings: 0.7 }))

    expect(useGameStore.getState().peakDomainAlignment).toMatchObject({
      brass: 0.4,
      percussion: 0.2,
      strings: 0.7,
    })
  })

  it('performSignature applies the signature reset row and preserves identity records', () => {
    const bestTimes = { solo: 12_000, silence: 34_000 }
    const signatureAllocation = alloc({ harmony: 0.5, woodwinds: 0.3 })
    const peakDomainAlignment = alloc({ harmony: 0.5, brass: 0.8 })
    useGameStore.setState({
      signatureUnlocked: true,
      signatureCount: 2,
      signatureAllocation,
      peakDomainAlignment,
      circuitComplete: true,
      worldTourUnlocked: true,
      opusCount: 9,
      lifetimeAcclaim: new Decimal(999),
      acclaim: new Decimal(111),
      tourCount: 4,
      currentVenue: 5,
      components: { premiere: 3 },
      completedChallenges: ['solo', 'silence'],
      challengeBestTimes: bestTimes,
      seenStoryBeats: ['intro', 'world_tour'],
      lifetimeEncoreCount: 44,
    })

    useGameStore.getState().performSignature()
    const state = useGameStore.getState()

    expect(state.signatureCount).toBe(3)
    expect(state.signatureAllocation).toEqual(signatureAllocation)
    expect(state.peakDomainAlignment).toEqual({ ...peakDomainAlignment, woodwinds: 0.3 })
    expect(state.signatureUnlocked).toBe(true)
    expect(state.challengeBestTimes).toEqual(bestTimes)
    expect(state.seenStoryBeats).toEqual(['intro', 'world_tour'])
    expect(state.lifetimeEncoreCount).toBe(44)
    expect(state.opusCount).toBe(0)
    expect(state.lifetimeAcclaim.eq(0)).toBe(true)
    expect(state.acclaim.eq(0)).toBe(true)
    expect(state.tourCount).toBe(0)
    expect(state.currentVenue).toBe(0)
    expect(state.components).toEqual({})
    expect(state.worldTourUnlocked).toBe(false)
    expect(state.circuitComplete).toBe(false)
    expect(state.completedChallenges).toEqual([])
    expect(isBeatConditionMet('signature', state)).toBe(true)
  })

  it('getSignatureEfficiency is finite and bounded at extreme counts', () => {
    for (const count of [0, 1, 100, 1e9, Number.MAX_SAFE_INTEGER]) {
      const efficiency = getSignatureEfficiency(count)
      expect(Number.isFinite(efficiency)).toBe(true)
      expect(efficiency).toBeGreaterThanOrEqual(1)
      expect(efficiency).toBeLessThanOrEqual(1.75)
    }
  })

  it('no build strictly dominates — all 5 monos + blend stay in the diverse-but-viable band', () => {
    for (const count of [1, 5, 40]) {
      const strengths = CLIMB_BUILDS.map(([name, a]) => ({ name, s: buildStrength(a, count, true) }))
      for (const { name, s } of strengths) {
        expect(s, `${name} @count${count} must be a live build (>0 exponents)`).toBeGreaterThan(0)
      }
      const vals = strengths.map((x) => x.s)
      const ratio = Math.max(...vals) / Math.min(...vals)
      expect(ratio, `dominance band @count${count}`).toBeLessThanOrEqual(DOMINANCE_BAND)
      // the balanced blend must itself be viable (inside the band, not a lone outlier either way)
      const blend = strengths.find((x) => x.name === 'blend')!.s
      expect(blend / Math.min(...vals)).toBeLessThanOrEqual(DOMINANCE_BAND)
      expect(Math.max(...vals) / blend).toBeLessThanOrEqual(DOMINANCE_BAND)
    }
  })

  it('no overflow: brass / brass+harmony at extreme signatureCount stays finite (M11)', () => {
    expect(Number.isFinite(buildStrength(alloc({ brass: 1 }), 1_000_000, true))).toBe(true)
    expect(buildStrength(alloc({ brass: 0.6, harmony: 0.4 }), 1_000_000, true)).toBeGreaterThan(0)
  })

  // P0 #3: no signature build may WORSEN the idle:active balance vs the zero-allocation baseline.
  // (The absolute 1.4-1.75x window is gated globally by the existing pacing sims; here we isolate the
  // signature's MARGINAL effect — Percussion->tempo should be ~ratio-neutral, Strings->crescendo is the
  // risk since it amplifies the active crescendo advantage.) Same harness, conducting on vs off.
  it('no domain main worsens the idle:active balance vs baseline (P0 #3)', () => {
    const ratio = (a: Record<SignatureDomain, number>) =>
      buildStrength(a, 5, true) / buildStrength(a, 5, false)
    const baseline = ratio(ZERO_SIGNATURE_ALLOCATION)
    for (const [name, a] of CLIMB_BUILDS) {
      expect(ratio(a) / baseline, `${name} must not widen idle:active >25% vs baseline`)
        .toBeLessThanOrEqual(1.25)
    }
  })

  it('tracks every Signature domain in the fixed domain list', () => {
    expect([...SIGNATURE_DOMAINS].sort()).toEqual([
      'brass',
      'harmony',
      'percussion',
      'strings',
      'woodwinds',
    ])
  })

  it('A1 identity: dominant domain → epithet, spread → Composer, empty → Unvoiced', () => {
    expect(getSignatureIdentity(ZERO_SIGNATURE_ALLOCATION)).toEqual({ label: 'The Unvoiced', domain: null })
    expect(getSignatureIdentity(alloc({ percussion: 1 }))).toEqual({ label: 'The Pulse-Driven', domain: 'percussion' })
    expect(getSignatureIdentity(alloc({ harmony: 0.5, woodwinds: 0.2 }))).toEqual({ label: 'The Harmonist', domain: 'harmony' })
    // even spread, no domain ≥40% share → balanced "Composer"
    expect(getSignatureIdentity(alloc({ percussion: 0.2, strings: 0.2, brass: 0.2, woodwinds: 0.2, harmony: 0.2 })))
      .toEqual({ label: 'The Composer', domain: null })
  })
})
