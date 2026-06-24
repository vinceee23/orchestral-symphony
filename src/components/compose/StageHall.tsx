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
const ERA_SAT = [0.18, 0.45, 0.7, 0.85, 0.95, 1.05, 1.15]    // near-grey & cold early → rich colour late
// Keep it RICH + DARK, never a washed-out bright sheet — so the bright motes + conduct-blaze pop against
// deep gold (the "blazing" comes from the lively sparks, not a flat bright wash).
const ERA_BRIGHT = [0.34, 0.5, 0.64, 0.72, 0.78, 0.83, 0.88]
// The hall comes into focus as you rise: extra runtime blur on top of the soft baked baseline — near-
// abstract early → "clearer but still soft" by the Canon (never fully crisp, so it stays cohesive).
const ERA_BLUR = [40, 30, 20, 12, 7, 3, 0]

interface Props {
  era: number
  liveliness: number
  blaze?: number // 0..1 crescendo — conducting brightens the hall art itself
}

export const StageHall = memo(function StageHall({ era, liveliness, blaze = 0 }: Props) {
  const e = Math.max(0, Math.min(TOTAL_LAYERS, era))
  const color = ERA_COLORS[e]
  // Grandeur ramps across all 6 layers from a DIM intimate base — earned, not given.
  const t = Math.pow(e / TOTAL_LAYERS, 0.7)
  const grand = Math.min(1, 0.12 + t * 0.88 + liveliness * 0.04) // era0 ~0.12 (dim) → 1.0 (Canon)

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      aria-hidden="true"
      style={{ contain: 'paint', transform: 'translateZ(0)' }}
    >
      {/* Procedural hall layers removed (per Vince) — the near-abstract blurred master below carries ALL
          the atmosphere now, so nothing competes with the orchestra buttons. */}
      {/* ── §11 backdrop: ONE near-abstract, heavily-blurred hall (offline-blurred to pure mood), zoomed-out
            + recolored per era. Kept subtle + heavily feathered so it recedes behind the buttons. ── */}
      <img
        src={HALL_MASTER}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-all duration-[1800ms] ease-out"
        style={{
          // Pre-blurred/darkened master (atmospheric depth, not a literal scene). Kept subtle + heavily
          // feathered so it MELTS into the dark stage — no hard image edge (per Vince: blend backdrop↔stage).
          opacity: 0.28 + grand * 0.22,
          transform: `scale(${ERA_ZOOM[e] ?? 1})`,
          transformOrigin: '50% 38%',
          // conducting (blaze) brightens + warms the hall live; blur lowers per era (comes into focus as you rise)
          filter: `saturate(${(ERA_SAT[e] ?? 1) + blaze * 0.25}) brightness(${(ERA_BRIGHT[e] ?? 1) + blaze * 0.35}) blur(${ERA_BLUR[e] ?? 0}px)`,
          maskImage: 'radial-gradient(125% 100% at 50% 40%, #000 28%, transparent 86%)',
          WebkitMaskImage: 'radial-gradient(125% 100% at 50% 40%, #000 28%, transparent 86%)',
        }}
        onError={(ev) => { ev.currentTarget.style.display = 'none' }}
      />
      {/* ── §11 per-era recolor: tint the master toward the era palette (gold → violet → blaze). soft-light
            keeps the art's detail while shifting hue; barely there early, richer as the hall grows. ── */}
      <div
        className="absolute inset-0 transition-all duration-[1800ms]"
        style={{ opacity: 0.1 + grand * 0.35, background: color, mixBlendMode: 'soft-light' }}
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
