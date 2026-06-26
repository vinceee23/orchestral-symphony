import { useGameStore } from '../../store/gameStore'
import { TIER_CONFIGS, AUTOBUYER_BULK_TIERS, AUTOBUYER_DEFAULT_INTERVAL, AP_UNLOCK } from '../../core/constants'
import {
  getAutomatorInterval,
  getAutomatorBulk,
  clampAutobuyerBulk,
} from '../../core/opusUpgrades'
import { hasPerk, FAST_AUTOMATOR_SPEED_TIERS } from '../../core/perks'
import { Button } from '../shared/Button'

function formatBulkLabel(bulk: number | 'max'): string {
  return bulk === 'max' ? 'Max' : String(bulk)
}

function formatAutobuyerRate(intervalMs: number): string {
  if (intervalMs >= 1000) {
    const sec = intervalMs / 1000
    return `buying every ${sec % 1 === 0 ? sec : sec.toFixed(1)}s`
  }
  if (intervalMs <= 100) {
    const perSec = Math.round(1000 / intervalMs)
    return `~${perSec}/sec`
  }
  return `buying every ${intervalMs}ms`
}

const TIER_KEYS = TIER_CONFIGS.map((c) => `tier_${c.id}`)
const ALL_KEYS = [...TIER_KEYS, 'tempo', 'encore'] as const

function getAutobuyerLabel(key: string): string {
  if (key === 'tempo') return 'Tempo'
  if (key === 'encore') return 'Auto-Encore'
  const tierId = Number(key.replace('tier_', ''))
  return TIER_CONFIGS[tierId - 1]?.name ?? key
}

export function AutobuyersPage() {
  const autobuyers = useGameStore((s) => s.autobuyers)
  const opusUpgrades = useGameStore((s) => s.opusUpgrades)
  const achievements = useGameStore((s) => s.achievements)
  const toggleAutobuyer = useGameStore((s) => s.toggleAutobuyer)
  const setAutobuyerBulk = useGameStore((s) => s.setAutobuyerBulk)
  const applausePoints = useGameStore((s) => s.applausePoints)
  const opusCount = useGameStore((s) => s.opusCount)
  const unlockWithApplause = useGameStore((s) => s.unlockWithApplause)

  const bulkCap = hasPerk(new Set(achievements), 'perk-bulk-unlock') ? 'max' : getAutomatorBulk(opusUpgrades)
  const capIdx = AUTOBUYER_BULK_TIERS.indexOf(bulkCap)
  const availableBulkTiers = AUTOBUYER_BULK_TIERS.slice(0, capIdx + 1)
  const autoSpeedBonus = hasPerk(new Set(achievements), 'perk-fast-automators') ? FAST_AUTOMATOR_SPEED_TIERS : 0
  const opInterval = getAutomatorInterval(opusUpgrades, autoSpeedBonus)

  const unlocked = ALL_KEYS.filter((key) => autobuyers[key]?.unlocked)

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-accent-purple tracking-wide">Autobuyers</h1>
        <p className="text-sm text-text-muted mt-2">
          Opus upgrades raise the speed &amp; bulk caps; configure each section here.
        </p>
      </header>

      <section className="rounded-xl border border-accent-purple/40 bg-bg-secondary/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-semibold text-accent-purple">Applause Points</h2>
          <span className="text-sm font-mono text-text-primary">{Math.floor(applausePoints).toLocaleString()} AP</span>
        </div>
        <p className="text-xs text-text-muted">Earned each Encore. Spend to automate prestige — so the long stretches run themselves.</p>

        {!autobuyers['encore']?.unlocked && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <div>
              <div className="text-sm font-semibold text-text-primary">Auto-Encore</div>
              <div className="text-xs text-text-muted">
                Performs Encores automatically when ready (weak at first; faster with each Magnum Opus).
                {opusCount < AP_UNLOCK.encore.minOpusCount && ' Unlocks after your first Magnum Opus.'}
              </div>
            </div>
            <Button
              onClick={() => unlockWithApplause('encore')}
              disabled={opusCount < AP_UNLOCK.encore.minOpusCount || applausePoints < AP_UNLOCK.encore.cost}
              variant="purple"
              size="sm"
            >
              Unlock ({AP_UNLOCK.encore.cost} AP)
            </Button>
          </div>
        )}
      </section>

      {unlocked.length === 0 ? (
        <p className="text-sm text-text-muted text-center">No autobuyers unlocked yet.</p>
      ) : (
        <div className="space-y-4">
          {unlocked.map((key) => {
            const ab = autobuyers[key]!
            const isTier = key.startsWith('tier_')
            const effectiveBulk = clampAutobuyerBulk(ab.bulk, bulkCap)
            const interval = isTier ? opInterval : (ab.interval || AUTOBUYER_DEFAULT_INTERVAL)
            const displayBulk = availableBulkTiers.includes(ab.bulk) ? ab.bulk : effectiveBulk

            return (
              <section
                key={key}
                className="rounded-xl border border-border bg-bg-secondary/40 p-4 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-display font-semibold text-text-primary">
                    {getAutobuyerLabel(key)}
                  </h2>
                  <Button
                    onClick={() => toggleAutobuyer(key)}
                    variant={ab.enabled ? 'success' : 'ghost'}
                    size="sm"
                  >
                    {ab.enabled ? 'ON' : 'OFF'}
                  </Button>
                </div>

                {isTier && (
                  <div>
                    <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Bulk per buy</div>
                    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg-secondary p-1">
                      {availableBulkTiers.map((tier) => {
                        const selected = displayBulk === tier
                        return (
                          <Button
                            key={String(tier)}
                            onClick={() => setAutobuyerBulk(key, tier)}
                            variant={selected ? 'purple' : 'ghost'}
                            size="sm"
                            className={selected ? '' : 'border-transparent'}
                          >
                            {formatBulkLabel(tier)}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <p className={`text-sm ${ab.enabled ? 'text-success' : 'text-text-muted'}`}>
                  {ab.enabled ? formatAutobuyerRate(interval) : 'Off'}
                  {ab.enabled && isTier && effectiveBulk !== ab.bulk && (
                    <span className="text-text-muted ml-1">(bulk capped to {formatBulkLabel(effectiveBulk)})</span>
                  )}
                </p>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
