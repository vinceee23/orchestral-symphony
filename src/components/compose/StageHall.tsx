/**
 * The Living Hall — procedural backdrop layers behind the orchestra that grow grander per era.
 * Pure CSS/SVG (zero image cost); generated era backdrops will later layer in front of these.
 * Driven by `era` (0=pre-Encore intimate · 1=Encore warm · 2=Magnum Opus grand · 3=Finale blaze)
 * and `liveliness` (0..1). Everything fades/recolors with the era — the room fills as you rise.
 */
const ERA_COLORS = ['#d4a843', '#d4a843', '#7c3aed', '#f59e0b'] // gold · gold · violet · amber-blaze

interface Props {
  era: number
  liveliness: number
}

export function StageHall({ era, liveliness }: Props) {
  const color = ERA_COLORS[Math.min(era, 3)]
  // each layer fades in as the hall grows; 0 at pre-Encore, full by Finale
  const grand = Math.min(1, era / 3 + liveliness * 0.15)
  const archOn = era >= 1 ? Math.min(1, (era - 0) / 3 + 0.2) : 0.06
  const audienceOn = era >= 1 ? Math.min(1, (era) / 3) : 0

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
      {/* ── tiered risers receding behind the orchestra ── */}
      <div
        className="absolute left-1/2 bottom-[20%] -translate-x-1/2 transition-all duration-[1500ms] ease-out"
        style={{
          width: `${60 + grand * 30}%`, height: '34%',
          opacity: 0.12 + grand * 0.3,
          background:
            `repeating-linear-gradient(0deg, ${color}14 0 2px, transparent 2px 22px)`, // riser steps
          maskImage: 'radial-gradient(80% 100% at 50% 100%, #000 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(80% 100% at 50% 100%, #000 30%, transparent 80%)',
          transform: 'translateX(-50%) perspective(600px) rotateX(38deg)',
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
}
