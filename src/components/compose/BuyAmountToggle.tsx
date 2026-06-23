import { useGameStore } from '../../store/gameStore'
import type { BuyAmount } from '../../core/constants'

const OPTIONS: { value: BuyAmount; label: string }[] = [
  { value: 1, label: 'x1' },
  { value: 10, label: 'Next 10' },
  { value: 'max', label: 'Max' },
]

export function BuyAmountToggle() {
  const buyAmount = useGameStore((s) => s.buyAmount)
  const setBuyAmount = useGameStore((s) => s.setBuyAmount)

  return (
    <div className="flex items-center gap-1 bg-bg-secondary rounded-lg border border-border p-1">
      <span className="text-xs text-text-muted px-2">Buy</span>
      {OPTIONS.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => setBuyAmount(opt.value)}
          className={`
            py-1 px-3 rounded text-xs font-medium transition-all duration-150
            ${buyAmount === opt.value
              ? 'bg-accent-gold/20 text-accent-gold'
              : 'text-text-muted hover:text-text-secondary'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
