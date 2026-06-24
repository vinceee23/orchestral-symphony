/**
 * The conductor's podium, front-center of the stage.
 * Pre-L2 it sits DORMANT and dim ("the baton awaits") — a quiet foreshadow of the Crescendo.
 * Once L2 unlocks Conduct, `active` is true and holding Conduct fills the `swell` column of light.
 * (The live hold/swell wiring lands with the L2 tick-pass; this renders the structure + dormant tease.)
 */
import { memo } from 'react'

interface Props {
  active: boolean
  swell?: number // 0..1 crescendo intensity (only meaningful when active)
}

export const ConductorPodium = memo(function ConductorPodium({ active, swell = 0 }: Props) {
  return (
    <div className="pointer-events-none absolute left-1/2 bottom-2 -translate-x-1/2 z-10 flex flex-col items-center">
      {/* swell-meter: a column of light that fills as you conduct (hidden until active) */}
      {active && (
        <div className="relative w-1.5 h-24 mb-1 rounded-full bg-accent-gold/15 overflow-hidden">
          <div
            className="absolute bottom-0 inset-x-0 rounded-full bg-gradient-to-t from-accent-gold to-amber-200 transition-[height] duration-150"
            style={{ height: `${Math.max(0, Math.min(1, swell)) * 100}%`, boxShadow: '0 0 12px rgba(212,168,67,0.7)' }}
          />
        </div>
      )}
      {/* podium silhouette (music stand) */}
      <svg width="40" height="34" viewBox="0 0 40 34" aria-hidden="true"
        className={active ? 'text-accent-gold' : 'text-accent-gold/25'}
        style={active ? { filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.5))' } : undefined}>
        <line x1="20" y1="14" x2="20" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="30" x2="28" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="8" y="4" width="24" height="12" rx="1.5" transform="rotate(-12 20 10)"
          fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {!active && (
        <span className="mt-0.5 text-[8px] uppercase tracking-[0.25em] text-text-muted/40 font-display">the baton awaits</span>
      )}
    </div>
  )
})
