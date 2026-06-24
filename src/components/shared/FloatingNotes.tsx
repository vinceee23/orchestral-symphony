import { useMemo, type CSSProperties } from 'react'
import { useGameStore } from '../../store/gameStore'
import { getLiveliness } from '../../core/formulas'

const SYMBOLS = ['\u{2669}', '\u{266A}', '\u{266B}', '\u{266C}', '\u{1D11E}']

/**
 * Ambient drifting notes. Scales with stage "liveliness": pre-Encore is sparse + faint + grey;
 * as you climb prestige layers it gets denser, brighter, and golden — the hall coming alive.
 */
export function FloatingNotes() {
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const liveliness = getLiveliness(lifetimeEncorePoints, opusPoints, finalePoints)

  // Coarse tier so the note set only re-rolls at milestones (no constant remount).
  const tier = Math.round(liveliness * 4)
  const notes = useMemo<{ symbol: string; left: number; delay: number; duration: number; size: number }[]>(() => {
    const count = 4 + tier * 6 // 4 (bland) -> 28 (fully alive)
    return Array.from({ length: count }, () => ({
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 14 + Math.random() * 16,
      size: 12 + Math.random() * 16,
    }))
  }, [tier])

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
