import { useGameStore } from '../../store/gameStore'
import { TIER_CONFIGS } from '../../core/constants'
import { TierRow } from './TierRow'

export function TierPanel() {
  const tiers = useGameStore((s) => s.tiers)
  const encoreCount = useGameStore((s) => s.encoreCount)

  return (
    <div className="space-y-2">
      {tiers.map((tier, index) => {
        if (tier.unlocked) {
          return <TierRow key={tier.id} tierId={tier.id} />
        }
        // Only show the next locked tier (the one right after the last unlocked)
        const prevUnlocked = index === 0 || tiers[index - 1].unlocked
        if (!prevUnlocked) return null

        // Determine unlock hint
        const unlockHint = index === 5 && encoreCount < 1
          ? 'Perform an Encore to unlock'
          : `Buy 1 ${TIER_CONFIGS[index - 1].name} to unlock`

        return (
          <div
            key={tier.id}
            className="bg-bg-secondary/40 rounded-lg border border-border/50 p-3 flex items-center gap-3 opacity-40"
          >
            <span className="text-xl w-7 text-center shrink-0 grayscale">
              {TIER_CONFIGS[tier.id - 1].icon}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-text-muted">???</h3>
              <div className="text-[10px] text-text-muted">
                {unlockHint}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
