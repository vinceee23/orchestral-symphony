import { type CSSProperties } from 'react'
import { useGameStore } from '../../store/gameStore'
import { getLiveliness } from '../../core/formulas'

const SYMBOLS = ['\u{2669}', '\u{266A}', '\u{266B}', '\u{266C}', '\u{1D11E}']
const MAX_NOTES = 28

// Deterministic note field, computed ONCE. As liveliness rises we render MORE of this fixed field
// (slice) rather than re-rolling it — so existing notes keep their positions and don't teleport on a
// prestige (the old Math.random()-in-useMemo reshuffled every note at each tier crossing).
const NOTE_FIELD = Array.from({ length: MAX_NOTES }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 99.13 + n * 7.7) * 43758.5453
    return x - Math.floor(x) // stable 0..1 hash per (index, channel)
  }
  return {
    symbol: SYMBOLS[Math.floor(r(1) * SYMBOLS.length)],
    left: r(2) * 100,
    delay: r(3) * 20,
    duration: 14 + r(4) * 16,
    size: 12 + r(5) * 16,
  }
})

/**
 * Ambient drifting notes. Scales with stage "liveliness": pre-Encore is sparse + faint + grey;
 * as you climb prestige layers it gets denser, brighter, and golden — the hall coming alive.
 */
export function FloatingNotes() {
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const liveliness = getLiveliness(lifetimeEncorePoints, opusPoints, finalePoints)

  const tier = Math.round(liveliness * 4)
  const count = 4 + tier * 6 // 4 (bland) -> 28 (fully alive)
  const notes = NOTE_FIELD.slice(0, count)

  const peak = 0.05 + liveliness * 0.18          // brighter as the hall comes alive
  const color = liveliness > 0.45 ? '#d4a843' : '#6b7280' // grey -> gold

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {notes.map((n, i) => (
        <span
          key={i}
          className="absolute opacity-0 animate-float-note"
          style={{
            left: `${n.left}%`,
            bottom: '-30px',
            fontSize: `${n.size}px`,
            color,
            animationDelay: `${n.delay}s`,
            animationDuration: `${n.duration}s`,
            ['--note-peak' as string]: peak,
          } as CSSProperties}
        >
          {n.symbol}
        </span>
      ))}
    </div>
  )
}
