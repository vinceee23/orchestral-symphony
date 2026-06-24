/**
 * The Living Hall — procedural backdrop layers behind the orchestra that grow grander per era.
 * Pure CSS/SVG (zero image cost); generated era backdrops will later layer in front of these.
 * Driven by `era` (0=pre-Encore intimate · 1=Encore warm · 2=Magnum Opus grand · 3=Finale blaze)
 * and `liveliness` (0..1). Everything fades/recolors with the era — the room fills as you rise.
 */
import { memo } from 'react'

// One hall tier per prestige layer (0 intimate · 1 Encore · 2 Magnum Opus · 3 Repertoire ·
// 4 Genre · 5 Virtuoso · 6 Canon). L1/L2 palettes are final; L3-L6 are placeholders to tune as each ships.
const TOTAL_LAYERS = 6
const ERA_COLORS = ['#d4a843', '#d4a843', '#7c3aed', '#2dd4bf', '#ec4899', '#ef4444', '#fbbf24']

interface Props {
  era: number
  liveliness: number
}

// Memoized: era/liveliness only change on prestige, so this renders ~once instead of every game-loop frame.
export const StageHall = memo(function StageHall({ era, liveliness }: Props) {
  const e = Math.max(0, Math.min(TOTAL_LAYERS, era))
  const color = ERA_COLORS[e]
  // grandeur scales across ALL 6 layers (concave so early eras still read well, with headroom reserved up top).
  const t = Math.pow(e / TOTAL_LAYERS, 0.65)
  const grand = Math.min(1, 0.3 + t * 0.7 + liveliness * 0.05)
  const archOn = Math.min(1, 0.2 + t * 0.7)
  const audienceOn = e >= 1 ? Math.min(1, 0.15 + t * 0.85) : 0 // no audience until you've earned an Encore

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {/* ── grand architecture: organ pipes + proscenium back wall ── */}
      <div
        className="absolute left-1/2 top-[6%] -translate-x-1/2 transition-all duration-[1500ms] ease-out"
        style={{
          width: `${44 + grand * 34}%`, height: '46%',
          opacity: archOn * 0.5,
          background:
            `repeating-linear-gradient(90deg, ${color}22 0 6px, transparent 6px 26px)`, // organ pipes
          maskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
          borderTopLeftRadius: '50% 80%', borderTopRightRadius: '50% 80%',
          borderTop: `1px solid ${color}33`,
        }}
      />
      {/* ── tiered risers receding behind the orchestra (stacked steps: lit edge + filled tread) ── */}
      <div
        className="absolute left-1/2 bottom-[16%] -translate-x-1/2 transition-all duration-[1500ms] ease-out"
        style={{
          width: `${66 + grand * 24}%`, height: '34%',
          opacity: 0.55 + grand * 0.35,
          background:
            `repeating-linear-gradient(0deg, ${color}26 0 16px, ${color}66 16px 18px, ${color}08 18px 20px)`,
          maskImage: 'radial-gradient(95% 130% at 50% 100%, #000 50%, transparent 88%)',
          WebkitMaskImage: 'radial-gradient(95% 130% at 50% 100%, #000 50%, transparent 88%)',
          transform: 'translateX(-50%) perspective(700px) rotateX(42deg)',
          transformOrigin: 'bottom',
        }}
      />
      {/* ── overhead: chandelier glows + atmospheric haze ── */}
      <div
        className="absolute inset-x-0 top-0 h-[30%] transition-opacity duration-[1500ms]"
        style={{
          opacity: 0.2 + grand * 0.4,
          background:
            `radial-gradient(8% 40% at 22% 0%, ${color}33, transparent 70%),` +
            `radial-gradient(8% 40% at 78% 0%, ${color}33, transparent 70%),` +
            `radial-gradient(60% 80% at 50% -10%, ${color}10, transparent 70%)`,
        }}
      />
      {/* ── audience: silhouetted rows filling the house (front foreground) ── */}
      <svg
        className="absolute inset-x-0 bottom-0 w-full h-[18%] transition-opacity duration-[1500ms]"
        style={{ opacity: audienceOn * 0.55 }}
        viewBox="0 0 100 20" preserveAspectRatio="none"
      >
        {[16, 13, 10].map((cy, row) => (
          <g key={row} fill="#000" opacity={0.5 + row * 0.18}>
            {Array.from({ length: 26 }, (_, i) => (
              <circle key={i} cx={(i + (row % 2) * 0.5) * (100 / 26) + 1} cy={cy} r={1.1 - row * 0.15} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
})
