import { useGameStore } from '../../store/gameStore'
import { useUiStore } from '../../store/uiStore'
import { formatNumber } from '../../core/format'
import {
  L3, VENUE_1, getAcclaimRate, getFillSpeed, getVenueCapacity,
  getComponentCost, isVenueGraduatable, getAcclaimMultiplier,
} from '../../core/worldTour'
import { Button } from '../shared/Button'
import { playBuySound } from '../../core/audio'

export function WorldTourPage() {
  const acclaim = useGameStore((s) => s.acclaim)
  const lifetimeAcclaim = useGameStore((s) => s.lifetimeAcclaim)
  const catalogueSnapshot = useGameStore((s) => s.catalogueSnapshot)
  const components = useGameStore((s) => s.components)
  const venueBuffer = useGameStore((s) => s.venueBuffer)
  const venueSoldOut = useGameStore((s) => s.venueSoldOut)
  const currentVenue = useGameStore((s) => s.currentVenue)
  const tourCount = useGameStore((s) => s.tourCount)
  const keepAutobuyers = useGameStore((s) => s.keepAutobuyers)
  const conducting = useUiStore((s) => s.conducting)
  const buyComponent = useGameStore((s) => s.buyComponent)
  const buyKeepAutobuyers = useGameStore((s) => s.buyKeepAutobuyers)
  const graduateVenue = useGameStore((s) => s.graduateVenue)
  const performTour = useGameStore((s) => s.performTour)

  const acclaimNum = acclaim instanceof Object && 'toNumber' in acclaim ? acclaim.toNumber() : Number(acclaim)
  const lifetimeNum = lifetimeAcclaim instanceof Object && 'toNumber' in lifetimeAcclaim
    ? lifetimeAcclaim.toNumber()
    : Number(lifetimeAcclaim)
  const bufferNum = venueBuffer instanceof Object && 'toNumber' in venueBuffer
    ? venueBuffer.toNumber()
    : Number(venueBuffer)
  const snapshotNum = catalogueSnapshot instanceof Object && 'toNumber' in catalogueSnapshot
    ? catalogueSnapshot.toNumber()
    : Number(catalogueSnapshot)

  const capacity = getVenueCapacity(components)
  const rate = getAcclaimRate(snapshotNum, components)
  const fillSpeed = getFillSpeed(snapshotNum, components, conducting)
  const fillPct = capacity > 0 ? Math.min(100, (bufferNum / capacity) * 100) : 0
  const prodMult = getAcclaimMultiplier(lifetimeNum)
  const graduable = isVenueGraduatable(components)
  const venueComplete = currentVenue > VENUE_1.id

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-teal-400 tracking-wide">World Tour</h1>
        <p className="text-sm text-text-muted mt-2">Fill venues with Acclaim, upgrade the stage, then book a new tour.</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-teal-500/30 bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Acclaim</div>
          <div className="text-lg font-display font-semibold text-teal-400 tabular-nums mt-1">
            {formatNumber(acclaimNum, 1)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Rate</div>
          <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">
            {formatNumber(rate, 2)}/s
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Lifetime</div>
          <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">
            {formatNumber(lifetimeNum, 1)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Prod ×</div>
          <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">
            ×{prodMult.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Venue placeholder art */}
      <section className="rounded-xl border border-teal-500/20 bg-bg-secondary/30 p-6 text-center space-y-3">
        <div
          className="mx-auto w-full max-w-md h-40 rounded-lg border border-dashed border-teal-500/40 bg-gradient-to-b from-teal-950/40 to-bg-primary flex items-center justify-center"
          aria-hidden
        >
          <span className="text-teal-400/60 text-sm uppercase tracking-widest">
            {venueComplete ? 'Venue 1 — Graduated' : VENUE_1.name}
          </span>
        </div>
        <p className="text-xs text-text-muted">
          Catalogue snapshot ×{formatNumber(snapshotNum, 2)} · Tours started: {tourCount}
          {conducting && ' · Conducting (+fill speed)'}
        </p>
      </section>

      {/* Buffer / fill bar */}
      <section className="space-y-2">
        <div className="flex justify-between text-xs text-text-muted uppercase tracking-wider">
          <span>Venue buffer</span>
          <span>
            {formatNumber(bufferNum, 1)} / {formatNumber(capacity, 0)}
            {venueSoldOut ? ' · Sold out' : ` · ${formatNumber(fillSpeed, 2)}/s fill`}
          </span>
        </div>
        <div className="h-3 rounded-full bg-bg-tertiary overflow-hidden border border-border">
          <div
            className="h-full bg-teal-500/70 transition-all duration-300"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </section>

      {/* Component upgrades */}
      {!venueComplete && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Venue components</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VENUE_1.componentIds.map((id) => {
              const cfg = L3.COMPONENTS[id]
              const level = components[id] ?? 0
              const maxed = level >= L3.MAX_COMPONENT_TIER
              const cost = getComponentCost(id, level)
              const affordable = acclaimNum >= cost
              const buy = () => {
                if (!maxed && affordable) {
                  buyComponent(id)
                  playBuySound(5)
                }
              }
              let effectLabel = ''
              if (id === 'roof') effectLabel = `Cap ×${(1 + level * L3.ROOF_PER).toFixed(2)}`
              else if (id === 'lighting') effectLabel = `Fill ×${(1 + level * L3.LIGHT_FILL_PER).toFixed(2)}`
              else effectLabel = `Rate ×${(1 + level * L3.INSTR_PER).toFixed(2)}`

              return (
                <Button
                  key={id}
                  onClick={buy}
                  disabled={maxed || !affordable}
                  variant={affordable && !maxed ? 'purple' : 'ghost'}
                  className="flex flex-col items-start gap-1 h-auto py-3"
                >
                  <span className="font-semibold">{cfg.label}</span>
                  <span className="text-xs opacity-80">Lv {level}/{L3.MAX_COMPONENT_TIER} · {effectLabel}</span>
                  <span className="text-xs opacity-70">{maxed ? 'Maxed' : `${formatNumber(cost, 0)} Acclaim`}</span>
                </Button>
              )
            })}
          </div>
        </section>
      )}

      {/* Keep Autobuyers special */}
      {!keepAutobuyers && !venueComplete && (
        <Button
          onClick={() => { buyKeepAutobuyers(); playBuySound(6) }}
          disabled={acclaimNum < L3.KEEP_AUTOBUYERS_COST}
          variant="ghost"
          className="w-full"
        >
          Keep Autobuyers — {L3.KEEP_AUTOBUYERS_COST} Acclaim
        </Button>
      )}

      {graduable && !venueComplete && (
        <Button onClick={graduateVenue} variant="gold" className="w-full">
          Graduate {VENUE_1.name}
        </Button>
      )}

      {venueComplete && (
        <p className="text-center text-sm text-teal-400/80">
          Venue 1 complete — more venues coming soon. Re-tour to deepen your catalogue.
        </p>
      )}

      <Button onClick={performTour} variant="gold" className="w-full" display>
        Start Tour (resets Encore + Magnum Opus)
      </Button>
    </div>
  )
}
