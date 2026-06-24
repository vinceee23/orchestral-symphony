import { useMemo, type CSSProperties } from 'react'

/**
 * §11 liveliness — gold light motes/embers rising off the stage. The hall comes alive AS YOU PROGRESS:
 * none in the gloomy era-0 start, a few faint motes by the Encore hall, building to a bright celebratory
 * shower by the Canon. Conducting (blaze) brightens + speeds them in the moment. Pure transform/opacity
 * (cheap); the mote SET only re-rolls at coarse era tiers (no per-frame churn).
 */
export function StageLife({ era, blaze = 0 }: { era: number; blaze?: number }) {
  const v = Math.min(1, Math.max(0, era) / 6) // 0 (gloomy start) → 1 (celebratory Canon)
  const tier = Math.round(v * 6)
  const motes = useMemo(() => {
    const count = tier === 0 ? 0 : 3 + tier * 7 // 0 at era0 → ~45 at the Canon
    return Array.from({ length: count }, (_, i) => ({
      left: (i * 37 + (i % 5) * 11) % 100, // spread deterministically (no per-render reshuffle)
      delay: (i * 0.7) % 12,
      duration: 7 + ((i * 13) % 9),
      size: 3 + ((i * 7) % 5),
      drift: ((i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 6)),
    }))
  }, [tier])

  if (motes.length === 0) return null
  // conducting brightens + quickens the motes in the moment (blaze 0..1)
  const peak = Math.min(0.95, 0.3 + v * 0.45 + blaze * 0.3)
  const speed = 1 - blaze * 0.35 // duration multiplier — faster while conducting

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[2]">
      {motes.map((m, i) => (
        <span
          key={i}
          className="absolute rounded-full animate-mote"
          style={{
            left: `${m.left}%`,
            bottom: '-12px',
            width: `${m.size}px`,
            height: `${m.size}px`,
            // white-hot core + warm-gold halo so it pops on gold OR violet OR dark backdrops
            background: 'radial-gradient(circle, #fff6df 0%, #ffe1a0 55%, transparent 100%)',
            boxShadow: '0 0 10px 2px rgba(255,224,150,0.9)',
            animationDelay: `${m.delay}s`,
            animationDuration: `${(m.duration * speed).toFixed(1)}s`,
            ['--mote-peak' as string]: peak,
            ['--mote-drift' as string]: `${m.drift}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
