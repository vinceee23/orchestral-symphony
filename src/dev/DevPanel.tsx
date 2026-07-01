/// <reference types="vite/client" />
import Decimal from 'break_infinity.js'
import { useUiStore } from '../store/uiStore'
import { useGameStore } from '../store/gameStore'
import {
  TIER_CONFIGS,
  AUTOBUYER_DEFAULT_INTERVAL,
  PLATINUM_THRESHOLD,
} from '../core/constants'
import { getMilestoneMultiplier, getTempoBPM, getTempoTickInterval } from '../core/formulas'
import { LAST_VENUE_ID, L3 } from '../core/worldTour'
import { OPUS_UPGRADES } from '../core/opusUpgrades'
import { ENCORE_UPGRADES } from '../core/encoreUpgrades'
import type { GameState } from '../store/types'

// DEV-only pacing tool. Shows ONLY on the dev server (npm run dev) AND only when the URL opts in
// with ?dev (e.g. http://localhost:5173/?dev). Never present in the shipped .exe (import.meta.env.DEV is false).
const DEV_ON = import.meta.env.DEV && /(?:[?&#])dev\b/.test(location.search + location.hash)

const SPEEDS = [1, 10, 100, 1000]

// --- Layer-jump: drop into a realistic state for a target layer, then grant every achievement its
// state earns (checkAchievements → "all possible at that layer, from the sim's own checks"). Cumulative:
// L2 includes L0–L2 unlocks. Escalating SW/tempo per layer; automation (autobuyers) only from L2 (its
// reveal), so a lower-layer jump doesn't misgrant automation achievements.
const LAYERS = ['L0', 'L1', 'L2', 'L3', 'L4'] as const
const LAYER_SW = ['1e6', '1e15', '1e45', '1e120', '1e240'] as const

const maxedTiers = (n: number): GameState['tiers'] =>
  TIER_CONFIGS.map((c) => ({
    id: c.id,
    name: c.name,
    quantity: new Decimal(n),
    purchased: n,
    multiplier: getMilestoneMultiplier(n),
    unlocked: true,
  }))

const allAutobuyers = (): GameState['autobuyers'] => {
  const ab: GameState['autobuyers'] = {}
  for (let i = 1; i <= 7; i++) {
    ab[`tier_${i}`] = { unlocked: true, enabled: true, interval: AUTOBUYER_DEFAULT_INTERVAL, bulk: 'max', lastTick: 0 }
  }
  return ab
}

const maxedMap = (defs: { id: string; maxLevel: number }[]) =>
  Object.fromEntries(defs.map((u) => [u.id, u.maxLevel]))

function jumpToLayer(layer: number) {
  const store = useGameStore.getState()
  store.hardReset()
  const sw = new Decimal(LAYER_SW[layer])
  const patch: Partial<GameState> = {
    tiers: maxedTiers(layer === 0 ? 50 : 100),
    tempo: (() => {
      const level = 8 + layer * 4
      return { level, tickInterval: getTempoTickInterval(level), baseBPM: getTempoBPM(level) }
    })(),
    soundwaves: sw,
    peakSoundwaves: sw,
  }
  if (layer >= 1) {
    patch.layer1WallReached = true
    patch.encoreCount = 8
    patch.lifetimeEncoreCount = 8
    patch.encorePoints = 500
    patch.lifetimeEncorePoints = 500
    patch.applausePoints = 200
    patch.encoreUpgrades = maxedMap(ENCORE_UPGRADES)
  }
  if (layer >= 2) {
    patch.opusCount = 12
    patch.opusPoints = 500
    patch.opusUpgrades = maxedMap(OPUS_UPGRADES)
    patch.recordsSold = PLATINUM_THRESHOLD * 3
    patch.platinum = true
    patch.postPlatinumMoCount = L3.GATE_POST_PLAT_MO
    patch.peakCrescendoMult = 3
    patch.autobuyers = allAutobuyers() // automation reveal is L2 (opus automators)
  }
  if (layer >= 3) {
    patch.worldTourUnlocked = true
    patch.tourCount = 4
    patch.currentVenue = LAST_VENUE_ID
    patch.lifetimeAcclaim = new Decimal('1e6')
    patch.acclaim = new Decimal('1e4')
  }
  if (layer >= 4) {
    patch.circuitComplete = true
    patch.signatureUnlocked = true
    patch.signatureCount = 5
    // signatureAllocation left at zero so you set your own Signature in the panel — the point of the feel-test.
  }
  useGameStore.setState(patch)
  useGameStore.getState().checkAchievements() // grant every achievement the jumped state satisfies
}

export function DevPanel() {
  const devSpeed = useUiStore((s) => s.devSpeed)
  const setDevSpeed = useUiStore((s) => s.setDevSpeed)
  if (!DEV_ON) return null

  const grantSW = () => useGameStore.setState((s) => {
    const sw = s.soundwaves.times(1e9)
    return { soundwaves: sw, peakSoundwaves: s.peakSoundwaves.gt(sw) ? s.peakSoundwaves : sw }
  })
  const grantOP = () => useGameStore.setState((s) => ({ opusPoints: s.opusPoints + 50 }))
  const grantRecords = () => useGameStore.setState((s) => ({ recordsSold: s.recordsSold + 250_000 }))
  const ensureSW = () => useGameStore.setState((s) => {
    const sw = Decimal.max(s.soundwaves, new Decimal('1e80'))
    return { soundwaves: sw, peakSoundwaves: Decimal.max(s.peakSoundwaves, sw) }
  })

  const btn = 'px-2 py-1 rounded text-[11px] border border-border-light text-text-secondary hover:text-accent-gold hover:border-accent-gold/50 transition-colors'

  return (
    <div className="fixed bottom-3 left-3 z-[70] flex flex-col gap-1.5 p-2.5 rounded-lg border border-accent-purple/40 bg-bg-primary/90 backdrop-blur text-text-secondary shadow-2xl">
      <div className="text-[9px] uppercase tracking-[0.2em] text-accent-purple font-semibold">Dev · pacing</div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-text-muted mr-0.5">speed</span>
        {SPEEDS.map((sp) => (
          <button
            key={sp}
            onClick={() => setDevSpeed(sp)}
            className={`${btn} ${devSpeed === sp ? 'border-accent-gold text-accent-gold bg-accent-gold/10' : ''}`}
          >
            {sp}×
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={grantSW} className={btn}>SW ×1e9</button>
        <button onClick={ensureSW} className={btn}>→ MO scale</button>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={grantOP} className={btn}>+50 OP</button>
        <button onClick={grantRecords} className={btn}>+250k records</button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-text-muted mr-0.5">jump</span>
        {LAYERS.map((label, i) => (
          <button
            key={label}
            onClick={() => jumpToLayer(i)}
            title={`Reset to a realistic ${label} state + grant every achievement it earns`}
            className={btn}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="text-[9px] text-text-muted/70 leading-tight max-w-[190px]">
        Jump wipes progress → seeds that layer + its achievements. L4 reveals the Signature tab (dev only).
      </div>
    </div>
  )
}
