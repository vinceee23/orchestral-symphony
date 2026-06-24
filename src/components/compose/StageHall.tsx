/**
 * The Living Hall — procedural backdrop layers behind the orchestra that grow grander per era.
 * Pure CSS/SVG (zero image cost); an optional generated backdrop layers in front (hybrid, see below).
 * era 0 is DIM + intimate (one lamp, faint risers, heavy shadow); each prestige layer brightens and opens
 * the hall toward the Canon. Firefox-friendly: no blur/conic/extra masks, and the whole layer is isolated
 * (contain:paint + its own compositor layer) so the animated notes/counters don't force it to re-rasterize.
 */
import { memo } from 'react'

// One hall tier per prestige layer (0 intimate · 1 Encore · 2 Magnum Opus · 3 Repertoire ·
// 4 Genre · 5 Virtuoso · 6 Canon). L1/L2 palettes are final; L3-L6 are placeholders to tune as each ships.
const TOTAL_LAYERS = 6
const ERA_COLORS = ['#d4a843', '#d4a843', '#7c3aed', '#2dd4bf', '#ec4899', '#ef4444', '#fbbf24']
// §11 backdrop: ONE illustrative master hall (public/backdrops/hall-master.jpg), zoomed + mood-shifted
// per era. era 0 zooms tight on the organ (gloomy/desaturated); each era pulls the "camera" back and
// warms the hall toward blazing gold. BASE_URL keeps the path correct under the GH Pages subpath.
const HALL_MASTER = `${import.meta.env.BASE_URL}backdrops/hall-master.jpg`
const ERA_ZOOM = [2.4, 1.7, 1.3, 1.15, 1.08, 1.03, 1.0]      // camera pull-back per era
const ERA_SAT = [0.18, 0.45, 0.75, 0.9, 1.0, 1.1, 1.2]       // near-grey & cold early → vivid gold late
const ERA_BRIGHT = [0.34, 0.55, 0.8, 0.92, 1.0, 1.05, 1.1]   // murky/dim early → blazing late

interface Props {
  era: number
  liveliness: number
}

export const StageHall = memo(function StageHall({ era, liveliness }: Props) {
  const e = Math.max(0, Math.min(TOTAL_LAYERS, era))
  const color = ERA_COLORS[e]
  // Grandeur ramps across all 6 layers from a DIM intimate base — earned, not given.
  const t = Math.pow(e / TOTAL_LAYERS, 0.7)
  const grand = Math.min(1, 0.12 + t * 0.88 + liveliness * 0.04) // era0 ~0.12 (dim) → 1.0 (Canon)
  const archOn = Math.min(1, 0.06 + t * 0.85)
  const audienceOn = e >= 1 ? Math.min(1, 0.1 + t * 0.9) : 0 // no audience until you've earned an Encore

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      aria-hidden="true"
      style={{ contain: 'paint', transform: 'translateZ(0)' }}
    >
      {/* ── back-wall ambient glow (soft radial — no blur filter; Firefox-cheap) ── */}
      <div
        className="absolute left-1/2 top-[28%] -translate-x-1/2 transition-all duration-[1500ms] ease-out"
        style={{
          width: `${52 + grand * 32}%`, height: '52%',
          opacity: 0.1 + grand * 0.45,
          background: `radial-gradient(60% 55% at 50% 45%, ${color}2e, transparent 72%)`,
        }}
      />
      {/* ── grand architecture: organ pipes + proscenium back wall (linear mask only) ── */}
      <div
        className="absolute left-1/2 top-[6%] -translate-x-1/2 transition-all duration-[1500ms] ease-out"
        style={{
          width: `${42 + grand * 36}%`, height: '46%',
          opacity: archOn * 0.5,
          background: `repeating-linear-gradient(90deg, ${color}22 0 6px, transparent 6px 26px)`,
          maskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
          borderTopLeftRadius: '50% 80%', borderTopRightRadius: '50% 80%',
          borderTop: `1px solid ${color}33`,
        }}
      />
      {/* ── soft overhead haze from the lamp (replaces the costly conic god-rays) ── */}
      <div
        className="absolute inset-x-0 top-0 h-[34%] transition-opacity duration-[1500ms]"
        style={{
          opacity: 0.1 + grand * 0.5,
          background:
            `radial-gradient(45% 60% at 50% 0%, ${color}14, transparent 72%),` +
            `radial-gradient(7% 38% at 22% 0%, ${color}26, transparent 70%),` +
            `radial-gradient(7% 38% at 78% 0%, ${color}26, transparent 70%)`,
        }}
      />
      {/* ── tiered risers receding behind the orchestra (one radial mask; stays visible at era 0) ── */}
      <div
        className="absolute left-1/2 bottom-[16%] -translate-x-1/2 transition-all duration-[1500ms] ease-out"
        style={{ width: `${64 + grand * 26}%`, height: '34%', opacity: 0.4 + grand * 0.5 }}
      >
        <div
          className="w-full h-full"
          style={{
            background:
              `repeating-linear-gradient(0deg, ${color}26 0 16px, ${color}66 16px 18px, ${color}08 18px 20px)`,
            maskImage: 'radial-gradient(95% 130% at 50% 100%, #000 50%, transparent 88%)',
            WebkitMaskImage: 'radial-gradient(95% 130% at 50% 100%, #000 50%, transparent 88%)',
            transform: 'perspective(700px) rotateX(42deg)',
            transformOrigin: 'bottom center',
          }}
        />
      </div>
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
      {/* ── era-tinted floor glow ── */}
      <div
        className="absolute inset-x-0 bottom-0 h-[26%] transition-all duration-[1500ms]"
        style={{ opacity: 0.12 + grand * 0.4, background: `radial-gradient(50% 120% at 50% 100%, ${color}24, transparent 72%)` }}
      />
      {/* ── §11 master backdrop: one illustrative hall, zoomed + mood-shifted per era (camera pull-back).
            Sits in front of the procedural layers (which remain as graceful fallback if the art fails). ── */}
      <img
        src={HALL_MASTER}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-all duration-[1800ms] ease-out"
        style={{
          opacity: 0.45 + grand * 0.4,
          transform: `scale(${ERA_ZOOM[e] ?? 1})`,
          transformOrigin: '50% 38%',
          filter: `saturate(${ERA_SAT[e] ?? 1}) brightness(${ERA_BRIGHT[e] ?? 1})`,
          maskImage: 'radial-gradient(140% 110% at 50% 42%, #000 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(140% 110% at 50% 42%, #000 60%, transparent 100%)',
        }}
        onError={(ev) => { ev.currentTarget.style.display = 'none' }}
      />
      {/* ── blacking gloom vignette: heavy black creeps in from the edges when intimate, then recedes as
            the hall opens up. gloom = 1-grand (era0 ~0.88 → era6 ~0). ── */}
      {(() => {
        const gloom = 1 - grand
        const inner = (50 - gloom * 22).toFixed(0) // black creeps inward when gloomy (era0 ~31% → era6 ~50%)
        return (
          <div
            className="absolute inset-0 transition-all duration-[1500ms]"
            style={{
              opacity: 0.45 + gloom * 0.5, // era0 ~0.89 (near-black edges) → era6 ~0.45
              background: `radial-gradient(125% 95% at 50% 42%, transparent ${inner}%, #000 100%)`,
            }}
          />
        )
      })()}
    </div>
  )
})
