import { useGameStore } from '../../store/gameStore'
import { useUiStore } from '../../store/uiStore'
import { formatNumber } from '../../core/format'
import {
  L3, VENUES, getVenue, getAcclaimRate, getFillSpeed, getVenueCapacity,
  getComponentCost, isVenueGraduatable, getAcclaimMultiplier, getEffectiveCatalogue,
  getComponentMaxTier, getComponentDef,
} from '../../core/worldTour'
import { Button } from '../shared/Button'
import { playBuySound, playPrestigeSound, playMilestoneSound } from '../../core/audio'

function componentEffectLabel(id: string, level: number): string {
  const cfg = getComponentDef(id)
  if (!cfg) return ''
  if (cfg.role === 'unlock') {
    switch (cfg.target) {
      case 'autoCollect': return 'Auto-collect Acclaim'
      case 'keepAutobuyers': return 'Automators survive tours'
      case 'autoMO': return 'Auto-Magnum Opus'
      case 'autoGraduate': return 'Auto-graduate venues'
      default: return 'Unlock'
    }
  }
  const per = cfg.perLevel ?? 0
  if (cfg.target === 'capacity') return `Cap ×${(1 + level * per).toFixed(2)}`
  if (cfg.target === 'fillSpeed') return `Fill ×${(1 + level * per).toFixed(2)}`
  if (cfg.target === 'acclaimRate') return `Rate ×${(1 + level * per).toFixed(2)}`
  return ''
}

export function WorldTourPage() {
  const acclaim = useGameStore((s) => s.acclaim)
  const lifetimeAcclaim = useGameStore((s) => s.lifetimeAcclaim)
  const catalogueSnapshot = useGameStore((s) => s.catalogueSnapshot)
  const opusCount = useGameStore((s) => s.opusCount)
  const recordsSold = useGameStore((s) => s.recordsSold)
  const components = useGameStore((s) => s.components)
  const venueBuffer = useGameStore((s) => s.venueBuffer)
  const venueSoldOut = useGameStore((s) => s.venueSoldOut)
  const currentVenue = useGameStore((s) => s.currentVenue)
  const tourCount = useGameStore((s) => s.tourCount)
  const autoCollect = useGameStore((s) => s.autoCollect)
  const autoMO = useGameStore((s) => s.autoMO)
  const autoMOEnabled = useGameStore((s) => s.autoMOEnabled)
  const circuitComplete = useGameStore((s) => s.circuitComplete)
  const conducting = useUiStore((s) => s.conducting)
  const buyComponent = useGameStore((s) => s.buyComponent)
  const bankVenueAcclaim = useGameStore((s) => s.bankVenueAcclaim)
  const graduateVenue = useGameStore((s) => s.graduateVenue)
  const performTour = useGameStore((s) => s.performTour)
  const setAutoMOEnabled = useGameStore((s) => s.setAutoMOEnabled)

  const acclaimNum = acclaim instanceof Object && 'toNumber' in acclaim ? acclaim.toNumber() : Number(acclaim)
  const lifetimeNum = lifetimeAcclaim instanceof Object && 'toNumber' in lifetimeAcclaim
    ? lifetimeAcclaim.toNumber()
    : Number(lifetimeAcclaim)
  const bufferNum = venueBuffer instanceof Object && 'toNumber' in venueBuffer
    ? venueBuffer.toNumber()
    : Number(venueBuffer)

  const venue = getVenue(currentVenue)
  const effectiveCatalogue = getEffectiveCatalogue({
    circuitComplete,
    catalogueSnapshot,
    opusCount,
    recordsSold,
  })
  const capacity = getVenueCapacity(components, currentVenue)
  const rate = getAcclaimRate(effectiveCatalogue, components, currentVenue)
  const fillSpeed = getFillSpeed(effectiveCatalogue, components, conducting, currentVenue)
  const fillPct = capacity > 0 ? Math.min(100, (bufferNum / capacity) * 100) : 0
  const prodMult = getAcclaimMultiplier(lifetimeNum)
  const graduable = isVenueGraduatable(components, currentVenue)
  // 0..1 venue completion (fraction of this venue's components maxed) — drives the hero's "comes alive" bloom.
  const venueFill = venue.componentIds.length
    ? venue.componentIds.filter((id) => (components[id] ?? 0) >= getComponentMaxTier(id)).length / venue.componentIds.length
    : 0

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-teal-400 tracking-wide">World Tour</h1>
        <p className="text-sm text-text-muted mt-2">Fill venues with Acclaim, upgrade the stage, then book a new tour.</p>
        {circuitComplete && (
          <p className="text-xs text-teal-300/90 mt-2 uppercase tracking-wider">
            Trial complete
          </p>
        )}
      </header>

      {circuitComplete && (
        <section className="rounded-xl border border-teal-400/40 bg-teal-950/30 p-5 text-center space-y-2">
          <h2 className="text-xl font-display font-semibold text-teal-200">The circuit is complete.</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Six venues carried the work from the Old House to the World Stage. This trial ends here, with Acclaim now scaling from your live catalogue.
          </p>
          <p className="text-sm font-display text-accent-gold">The Sonance continues...</p>
          {/* Phased CTA: swap this for the Steam wishlist link the day the Coming Soon page is live. */}
          <p className="text-xs text-text-muted pt-1">
            More layers are being composed.{' '}
            <a
              href="https://ko-fi.com/vinceangelolmacaraig"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-gold/90 hover:text-accent-gold underline underline-offset-2"
            >
              Follow the work — or leave a coin in the case ☕
            </a>
          </p>
        </section>
      )}

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

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Venue ladder</h2>
        <div className="flex flex-wrap gap-2">
          {VENUES.map((v) => {
            const isCurrent = v.id === currentVenue
            const graduated = v.id < currentVenue || (circuitComplete && v.id === currentVenue)
            return (
              <span
                key={v.id}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  isCurrent
                    ? 'border-teal-400 text-teal-300 bg-teal-950/50'
                    : graduated
                      ? 'border-teal-500/30 text-teal-500/70 line-through'
                      : 'border-border text-text-muted'
                }`}
              >
                {v.name}
              </span>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-teal-500/20 bg-bg-secondary/30 p-3 text-center space-y-3">
        <div
          className="relative mx-auto w-full max-w-md aspect-video rounded-lg overflow-hidden border border-teal-500/20"
          aria-hidden
        >
          {/* Venue hero — starts dim and warms/blooms as you max its components (venueFill). */}
          <img
            src={`${import.meta.env.BASE_URL}venues/${currentVenue}.jpg`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
            style={{ filter: `brightness(${0.6 + venueFill * 0.5}) saturate(${0.7 + venueFill * 0.5})` }}
          />
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-700"
            style={{ opacity: venueFill, background: 'radial-gradient(60% 60% at 50% 55%, rgba(212,168,67,0.28), transparent 75%)' }}
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-bg-primary/90 to-transparent pt-10 pb-2">
            <span className="text-sm font-display text-teal-100/90 tracking-wide">{venue.name}</span>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          Catalogue {circuitComplete ? 'live' : 'snapshot'} ×{formatNumber(effectiveCatalogue, 2)}
          {' · '}Tours started: {tourCount}
          {autoCollect && ' · Auto-collect'}
          {conducting && ' · Conducting (+fill speed)'}
        </p>
      </section>

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
        {venueSoldOut && bufferNum > 0 && !autoCollect && (
          <Button onClick={() => { bankVenueAcclaim(); playMilestoneSound() }} variant="purple" className="w-full">
            Collect {formatNumber(bufferNum, 1)} Acclaim
          </Button>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Venue components</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {venue.componentIds.map((id) => {
            const cfg = L3.COMPONENTS[id]
            const level = components[id] ?? 0
            const maxTier = getComponentMaxTier(id)
            const maxed = level >= maxTier
            const isUnlock = cfg.role === 'unlock'
            const cost = getComponentCost(id, level, currentVenue)
            const affordable = acclaimNum >= cost
            const buy = () => {
              if (!maxed && affordable) {
                buyComponent(id)
                playBuySound(5)
              }
            }

            return (
              <Button
                key={id}
                onClick={buy}
                disabled={maxed || !affordable}
                variant={affordable && !maxed ? 'purple' : 'ghost'}
                className="flex flex-col items-start gap-1 h-auto py-3"
              >
                <span className="font-semibold">{cfg.label}</span>
                <span className="text-xs opacity-80">
                  {isUnlock
                    ? (maxed ? 'Owned' : 'Unlock')
                    : `Lv ${level}/${maxTier}`}
                  {' · '}
                  {componentEffectLabel(id, level)}
                </span>
                <span className="text-xs opacity-70">
                  {maxed ? 'Maxed' : `${formatNumber(cost, 0)} Acclaim`}
                </span>
              </Button>
            )
          })}
        </div>
      </section>

      {graduable && !circuitComplete && (
        <Button onClick={graduateVenue} variant="gold" className="w-full">
          Graduate {venue.name}
        </Button>
      )}

      {autoMO && (
        <label className="flex items-center justify-center gap-3 text-sm text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={autoMOEnabled}
            onChange={(e) => setAutoMOEnabled(e.target.checked)}
            className="rounded border-border"
          />
          Auto-Magnum Opus (when profitable)
        </label>
      )}

      <Button onClick={() => { performTour(); playPrestigeSound(3) }} variant="gold" className="w-full" display>
        Start Tour (resets Encore + Magnum Opus)
      </Button>
    </div>
  )
}
