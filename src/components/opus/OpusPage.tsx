import { useGameStore } from '../../store/gameStore'
import { formatNumber } from '../../core/format'
import { PLATINUM_THRESHOLD } from '../../core/constants'
import {
  OPUS_UPGRADES,
  type OpusUpgradeTrack,
  getOpusUpgradeCost,
} from '../../core/opusUpgrades'
import { playBuySound } from '../../core/audio'

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
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-accent-purple tracking-wide">Magnum Opus</h1>
        <p className="text-sm text-text-muted mt-1">Spend Opus Points to deepen your recorded legacy.</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg bg-bg-secondary/50 p-3 border border-accent-purple/20">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Opus Points</div>
          <div className="text-lg font-semibold text-accent-purple tabular-nums">{opusPoints}</div>
        </div>
        <div className="rounded-lg bg-bg-secondary/50 p-3 border border-border/40">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Albums Recorded</div>
          <div className="text-lg font-semibold text-text-primary tabular-nums">{opusCount}</div>
        </div>
        <div className="rounded-lg bg-bg-secondary/50 p-3 border border-border/40">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Records Sold</div>
          <div className="text-lg font-semibold text-text-primary tabular-nums">{formatNumber(recordsSold, 0)}</div>
        </div>
        <div className="rounded-lg bg-bg-secondary/50 p-3 border border-border/40">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Platinum</div>
          <div className={`text-lg font-semibold ${platinum ? 'text-accent-purple' : 'text-text-muted'}`}>
            {platinum ? 'Certified' : `${formatNumber(recordsSold, 0)} / ${formatNumber(PLATINUM_THRESHOLD, 0)}`}
          </div>
        </div>
      </div>

      {TRACK_ORDER.map((track) => {
        const nodes = OPUS_UPGRADES.filter((u) => u.track === track)
        return (
          <section key={track}>
            <h2 className="text-sm font-display font-semibold text-accent-purple uppercase tracking-wider mb-2">
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
                  <button
                    key={u.id}
                    onClick={buy}
                    disabled={maxed || !affordable}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      maxed ? 'bg-bg-secondary/40 border-border/40 opacity-60 cursor-default'
                        : affordable ? 'bg-accent-purple/10 border-accent-purple/30 hover:bg-accent-purple/20 cursor-pointer'
                          : 'bg-bg-secondary/50 border-border/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">{u.name}</span>
                      <span className="text-[10px] text-text-muted">Lv {level}/{u.maxLevel}</span>
                    </div>
                    <div className="text-[11px] text-text-muted mt-1 leading-snug">{u.description}</div>
                    <div className={`text-xs mt-2 font-medium ${maxed || !affordable ? 'text-text-muted' : 'text-accent-purple'}`}>
                      {maxed ? 'MAX' : `${cost} OP`}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
