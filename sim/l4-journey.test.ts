import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Decimal from 'break_infinity.js'

/**
 * L4 JOURNEY SIM — six human profiles play the REAL store from a fresh save to the L4 Signature
 * ascension (full-game reveal simulated at circuit-complete), acting only through player verbs.
 * Purpose: (a) measure pacing L0→L4 per playstyle, (b) trip bugs (non-finite numbers, decreasing
 * counters, stalls, automation starvation) under long realistic play.
 *
 * HEAVY (~minutes): gated behind JOURNEY=1 so the standing `npm test` gate stays fast.
 * Run:  JOURNEY=1 npx vitest run sim/l4-journey.test.ts
 * Read: lines prefixed JOURNEY| (milestone table) and STALL|.
 * Caveats: foreground-tab time only (no offline replay); conducting modeled as held-on for
 * conducting profiles (upper bound of active play).
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
const { getVenue, getCatalogueSnapshot, L3 } = await import('../src/core/worldTour')

const SIM_EPOCH = 1_900_000_000_000
const DT_MS = 5_000                 // sim step
const MAX_SIM_HOURS = 60            // hard cap per profile
const MAX_STEPS = (MAX_SIM_HOURS * 3600 * 1000) / DT_MS

interface Profile {
  name: string
  cadenceSec: number     // how often the human takes actions
  conducts: boolean      // holds the Conduct verb (upper bound of active play)
  buysTempo: boolean
  spendsUpgrades: boolean // encore + opus shops
  usesAutomation: boolean // unlocks auto-encore; leaves autobuyers on
}

const PROFILES: Profile[] = [
  { name: 'rusher',     cadenceSec: 15,  conducts: true,  buysTempo: true,  spendsUpgrades: true,  usesAutomation: true },
  { name: 'idler',      cadenceSec: 600, conducts: false, buysTempo: true,  spendsUpgrades: true,  usesAutomation: true },
  { name: 'casual',     cadenceSec: 120, conducts: false, buysTempo: true,  spendsUpgrades: true,  usesAutomation: true },
  { name: 'hoarder',    cadenceSec: 60,  conducts: true,  buysTempo: true,  spendsUpgrades: false, usesAutomation: true },
  { name: 'no-tempo',   cadenceSec: 60,  conducts: true,  buysTempo: false, spendsUpgrades: true,  usesAutomation: true },
  { name: 'all-manual', cadenceSec: 30,  conducts: true,  buysTempo: true,  spendsUpgrades: true,  usesAutomation: false },
]

type Milestones = Record<string, number | undefined>

function fmtH(ms?: number): string {
  return ms === undefined ? '—' : (ms / 3_600_000).toFixed(2) + 'h'
}

function act(p: Profile, m: Milestones, tMs: number): void {
  const s = useGameStore.getState()

  // Buy sections high→low (a human chases the biggest visible number), then tempo.
  for (let id = 7; id >= 1; id--) s.buyMaxTier(id)
  if (p.buysTempo) s.buyMaxTempo()

  if (p.spendsUpgrades) {
    for (const u of ENCORE_UPGRADES) useGameStore.getState().buyEncoreUpgrade(u.id)
    for (const u of OPUS_UPGRADES) useGameStore.getState().buyOpusUpgrade(u.id)
  }
  if (p.usesAutomation) useGameStore.getState().unlockWithApplause('encore')

  // Prestige verbs (all self-gating; call in escalation order).
  useGameStore.getState().performEncore()
  useGameStore.getState().performMagnumOpus()

  // World Tour: build the current venue, graduate, and re-tour when the catalogue has regrown.
  const st = useGameStore.getState()
  if (st.worldTourUnlocked) {
    useGameStore.getState().bankVenueAcclaim() // collect the venue buffer — components cost acclaim
    const venue = getVenue(st.currentVenue)
    for (const cid of venue.componentIds) useGameStore.getState().buyComponent(cid)
    useGameStore.getState().graduateVenue()
    const after = useGameStore.getState()
    if (!after.circuitComplete) {
      const live = getCatalogueSnapshot(after.opusCount, after.recordsSold)
      const snap = after.catalogueSnapshot instanceof Decimal ? after.catalogueSnapshot.toNumber() : 1
      if (live >= Math.max(1, snap) * L3.AUTO_TOUR_CAT_RATIO) useGameStore.getState().performTour()
    }
  }

  // Full-game reveal simulated at circuit-complete → immediately ascend (L4 journey ends).
  // Record the circuit milestone HERE: performSignature resets circuitComplete in the same act,
  // so the step-loop sampler would otherwise never see it true.
  const end = useGameStore.getState()
  if (end.circuitComplete && m.circuit === undefined) m.circuit = tMs
  if (end.circuitComplete && !end.signatureUnlocked) {
    useGameStore.setState({ signatureUnlocked: true }) // what buildVenueGraduationPatch(fullGame) does
  }
  if (end.circuitComplete || useGameStore.getState().signatureUnlocked) {
    useGameStore.getState().performSignature()
  }
}

function invariants(p: Profile, tMs: number, prev: { enc: number; opus: number; tours: number }): void {
  const s = useGameStore.getState()
  const fin = (d: Decimal) => Number.isFinite(d.mantissa) && Number.isFinite(d.exponent)
  if (!fin(s.soundwaves) || !fin(s.peakSoundwaves)) throw new Error(`${p.name}@${fmtH(tMs)}: non-finite SW`)
  if (s.encorePoints < 0 || s.applausePoints < 0 || s.opusPoints < 0) throw new Error(`${p.name}@${fmtH(tMs)}: negative currency`)
  if (s.lifetimeEncoreCount < prev.enc) throw new Error(`${p.name}@${fmtH(tMs)}: lifetimeEncoreCount decreased`)
  if (s.opusCount + s.tourCount * 100 < 0) throw new Error(`${p.name}@${fmtH(tMs)}: counter corruption`)
  for (const t of s.tiers) {
    if (t.purchased < 0 || !Number.isInteger(t.purchased)) throw new Error(`${p.name}@${fmtH(tMs)}: bad purchased ${t.purchased}`)
  }
}

function runJourney(p: Profile): { m: Milestones; stallH: number; steps: number } {
  useGameStore.getState().hardReset()
  useGameStore.setState({ settings: { ...useGameStore.getState().settings, offlineEnabled: false } })
  useUiStore.setState({ conducting: p.conducts })

  const m: Milestones = {}
  const cadenceSteps = Math.max(1, Math.round((p.cadenceSec * 1000) / DT_MS))
  let lastProgressKey = ''
  let lastProgressT = 0
  let worstStall = 0
  let prev = { enc: 0, opus: 0, tours: 0 }

  for (let step = 0; step < MAX_STEPS; step++) {
    const tMs = step * DT_MS
    vi.setSystemTime(SIM_EPOCH + tMs)
    useGameStore.getState().tick(DT_MS)
    if (step % cadenceSteps === 0) act(p, m, tMs)

    const s = useGameStore.getState()
    // Milestones (first time each becomes true)
    if (m.encore === undefined && s.lifetimeEncoreCount >= 1) m.encore = tMs
    if (m.wall === undefined && s.layer1WallReached) m.wall = tMs
    if (m.mo === undefined && s.opusCount >= 1) m.mo = tMs
    if (m.platinum === undefined && s.platinum) m.platinum = tMs
    if (m.worldTour === undefined && s.worldTourUnlocked) m.worldTour = tMs
    if (m.circuit === undefined && s.circuitComplete) m.circuit = tMs
    if (m.signature === undefined && s.signatureCount >= 1) m.signature = tMs

    // Stall detector: progress = any counter/venue/SW-decade movement.
    const sw = s.soundwaves
    const swDecade = Number.isFinite(sw.exponent) ? Math.floor(sw.exponent) : -1
    const key = `${s.lifetimeEncoreCount}|${s.opusCount}|${s.tourCount}|${s.currentVenue}|${s.circuitComplete}|${swDecade}`
    if (key !== lastProgressKey) {
      lastProgressKey = key
      lastProgressT = tMs
    } else if (tMs - lastProgressT > worstStall) {
      worstStall = tMs - lastProgressT
    }

    if (step % 720 === 0) invariants(p, tMs, prev) // hourly
    prev = { enc: s.lifetimeEncoreCount, opus: s.opusCount, tours: s.tourCount }

    if (m.signature !== undefined) return { m, stallH: worstStall / 3_600_000, steps: step }
  }
  return { m, stallH: worstStall / 3_600_000, steps: MAX_STEPS }
}

describe.skipIf(!process.env.JOURNEY)('L4 journey — six human profiles to Signature', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(SIM_EPOCH)
    localStorage.clear()
  })
  afterEach(() => {
    useUiStore.setState({ conducting: false })
    vi.useRealTimers()
  })

  it.each(PROFILES)('$name completes (or honestly reports) the journey', (p) => {
    const { m, stallH, steps } = runJourney(p)
    console.log(
      `JOURNEY|${p.name}|encore=${fmtH(m.encore)}|wall=${fmtH(m.wall)}|MO=${fmtH(m.mo)}|platinum=${fmtH(m.platinum)}|WT=${fmtH(m.worldTour)}|circuit=${fmtH(m.circuit)}|signature=${fmtH(m.signature)}|simSteps=${steps}`,
    )
    console.log(`STALL|${p.name}|worst=${stallH.toFixed(2)}h`)

    // Hard assertions: only what indicates a genuine defect (measurement, not flaky bands).
    expect(m.encore, `${p.name} never reached a first Encore`).toBeDefined()
    expect(m.mo, `${p.name} never reached a Magnum Opus`).toBeDefined()
    // MEASURED REALITY (2026-07-02, post-Rehearsal-fix): only the active-optimal profile finishes the
    // circuit inside 60h — auto-tour is L4-gated, so trial circuit completion is a manual re-tour
    // grind for everyone else (20–50h+ of WT time). Flagged as a pacing finding in the full audit;
    // if a rebalance intends casuals to finish the trial, tighten this to include them.
    if (p.name === 'rusher') {
      expect(m.signature, `rusher failed to reach Signature within ${MAX_SIM_HOURS}h sim`).toBeDefined()
    }
  }, 900_000)
})
