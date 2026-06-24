import { useGameStore } from '../../store/gameStore'
import { formatNumber } from '../../core/format'
import { PLATINUM_THRESHOLD } from '../../core/constants'
import {
  OPUS_UPGRADES,
  type OpusUpgradeTrack,
  getOpusUpgradeCost,
} from '../../core/opusUpgrades'
import { playBuySound } from '../../core/audio'
import { Button } from '../shared/Button'

const TRACK_ORDER: OpusUpgradeTrack[] = ['AUTOMATORS', 'CRESCENDO', 'TEMPO', 'OP_GAIN']
const TRACK_LABELS: Record<OpusUpgradeTrack, string> = {
  AUTOMATORS: 'Automators',
  CRESCENDO: 'Crescendo',
  TEMPO: 'Tempo',
  OP_GAIN: 'OP Gain',
}

export function OpusPage() {
  const opusPoints = useGameStore((s) => s.opusPoints)
  const opusCount = useGameStore((s) => s.opusCount)
  const opusUpgrades = useGameStore((s) => s.opusUpgrades)
  const recordsSold = useGameStore((s) => s.recordsSold)
  const platinum = useGameStore((s) => s.platinum)
  const buyOpusUpgrade = useGameStore((s) => s.buyOpusUpgrade)

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-accent-purple tracking-wide">Magnum Opus</h1>
        <p className="text-sm text-text-muted mt-2">Spend Opus Points to deepen your recorded legacy.</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-accent-purple/30 bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Opus Points</div>
          <div className="text-lg font-display font-semibold text-accent-purple tabular-nums mt-1">{opusPoints}</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Albums Recorded</div>
          <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">{opusCount}</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Records Sold</div>
          <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">{formatNumber(recordsSold, 0)}</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Platinum</div>
          <div className={`text-lg font-display font-semibold tabular-nums mt-1 ${platinum ? 'text-accent-purple' : 'text-text-muted'}`}>
            {platinum ? 'Certified' : `${formatNumber(recordsSold, 0)} / ${formatNumber(PLATINUM_THRESHOLD, 0)}`}
          </div>
        </div>
      </div>

      {TRACK_ORDER.map((track) => {
        const nodes = OPUS_UPGRADES.filter((u) => u.track === track)
        return (
          <section key={track} className="space-y-3">
            <h2 className="text-xs font-semibold text-accent-purple uppercase tracking-wider">
              {TRACK_LABELS[track]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nodes.map((u) => {
                const level = opusUpgrades[u.id] ?? 0
                const maxed = level >= u.maxLevel
                const cost = getOpusUpgradeCost(u, level)
                const affordable = opusPoints >= cost
                const buy = () => {
                  if (!maxed && affordable) {
                    buyOpusUpgrade(u.id)
                    playBuySound(7)
                  }
                }
                return (
                  <Button
                    key={u.id}
                    onClick={buy}
                    disabled={maxed || !affordable}
                    variant={maxed ? 'ghost' : affordable ? 'purple' : 'ghost'}
                    size="md"
                    className="w-full !flex !flex-col !items-stretch !justify-start text-left gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="text-sm font-semibold text-text-primary">{u.name}</span>
                      <span className="text-xs text-text-muted tabular-nums shrink-0">Lv {level}/{u.maxLevel}</span>
                    </div>
                    <div className="text-sm text-text-muted leading-relaxed">{u.description}</div>
                    <div className={`text-xs font-medium tabular-nums ${maxed || !affordable ? 'text-text-muted' : 'text-accent-purple'}`}>
                      {maxed ? 'MAX' : `${cost} OP`}
                    </div>
                  </Button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
