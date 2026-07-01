/// <reference types="vite/client" />
import Decimal from 'break_infinity.js'
import { useUiStore } from '../store/uiStore'
import { useGameStore } from '../store/gameStore'
import { buildLayerJumpPatch } from './layerJump'

// DEV-only pacing tool. Shows ONLY on the dev server (npm run dev) AND only when the URL opts in
// with ?dev (e.g. http://localhost:5173/?dev). Never present in the shipped .exe (import.meta.env.DEV is false).
const DEV_ON = import.meta.env.DEV && /(?:[?&#])dev\b/.test(location.search + location.hash)

const SPEEDS = [1, 10, 100, 1000]
const LAYERS = ['L0', 'L1', 'L2', 'L3', 'L4'] as const

// Wipe to a realistic state for a target layer (its automations unlocked + enabled) and grant every
// achievement that state earns — "all possible at that layer, from the sim's own checks".
function jumpToLayer(layer: number) {
  useGameStore.getState().hardReset()
  useGameStore.setState(buildLayerJumpPatch(layer))
  useGameStore.getState().checkAchievements()
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
            title={`Reset to a realistic ${label} state (its automations on) + grant every achievement it earns`}
            className={btn}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="text-[9px] text-text-muted/70 leading-tight max-w-[190px]">
        Jump wipes progress → seeds that layer, its achievements, and its automations. L1 auto-encores;
        L2+ auto-buys tiers + Magnum Opus; L4 reveals Signature (dev only).
      </div>
    </div>
  )
}
