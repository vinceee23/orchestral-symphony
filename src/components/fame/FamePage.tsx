import { useGameStore } from '../../store/gameStore'
import { FAME_NODES, getFameNodeCost, getFameGain } from '../../core/fameTree'
import { playBuySound } from '../../core/audio'
import { Button } from '../shared/Button'

export function FamePage() {
  const spendableFame = useGameStore((s) => s.spendableFame)
  const lifetimeFame = useGameStore((s) => s.lifetimeFame)
  const fameUpgrades = useGameStore((s) => s.fameUpgrades)
  const recordsSold = useGameStore((s) => s.recordsSold)
  const buyFameUpgrade = useGameStore((s) => s.buyFameUpgrade)

  const famePerMo = getFameGain(recordsSold, fameUpgrades)

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-accent-gold tracking-wide">Fame</h1>
        <p className="text-sm text-text-muted mt-2">
          Now that you're Platinum-certified, every record sold builds Fame. Spend it to amplify your legacy.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-accent-gold/30 bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Fame</div>
          <div className="text-lg font-display font-semibold text-accent-gold tabular-nums mt-1">{spendableFame}</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Lifetime Fame</div>
          <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">{lifetimeFame}</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Per Magnum Opus</div>
          <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">+{famePerMo}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FAME_NODES.map((n) => {
          const level = fameUpgrades[n.id] ?? 0
          const maxed = level >= n.maxLevel
          const cost = getFameNodeCost(n, level)
          const affordable = spendableFame >= cost
          const buy = () => {
            if (!maxed && affordable) {
              buyFameUpgrade(n.id)
              playBuySound(7)
            }
          }
          return (
            <Button
              key={n.id}
              onClick={buy}
              disabled={maxed || !affordable}
              variant={maxed ? 'ghost' : affordable ? 'gold' : 'ghost'}
              size="md"
              className="w-full !flex !flex-col !items-stretch !justify-start text-left gap-1.5"
            >
              <div className="flex items-center justify-between gap-3 w-full">
                <span className="text-sm font-semibold text-text-primary">{n.name}</span>
                <span className="text-xs text-text-muted tabular-nums shrink-0">Lv {level}/{n.maxLevel}</span>
              </div>
              <div className="text-sm text-text-muted leading-relaxed">{n.description}</div>
              <div className={`text-xs font-medium tabular-nums ${maxed || !affordable ? 'text-text-muted' : 'text-accent-gold'}`}>
                {maxed ? 'MAX' : `${cost} Fame`}
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
