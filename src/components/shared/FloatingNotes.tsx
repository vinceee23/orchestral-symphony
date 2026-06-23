import { useMemo } from 'react'

const SYMBOLS = ['\u{2669}', '\u{266A}', '\u{266B}', '\u{266C}', '\u{1D11E}']

interface NoteConfig {
  symbol: string
  left: number
  delay: number
  duration: number
  size: number
}

export function FloatingNotes() {
  const notes = useMemo<NoteConfig[]>(() => {
    return Array.from({ length: 18 }, () => ({
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 15,
      size: 12 + Math.random() * 16,
    }))
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {notes.map((n, i) => (
        <span
          key={i}
          className="absolute opacity-0 animate-float-note text-text-muted"
          style={{
            left: `${n.left}%`,
            bottom: '-30px',
            fontSize: `${n.size}px`,
            animationDelay: `${n.delay}s`,
            animationDuration: `${n.duration}s`,
          }}
        >
          {n.symbol}
        </span>
      ))}
    </div>
  )
}
