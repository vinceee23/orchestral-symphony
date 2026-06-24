import { useGameStore } from '../../store/gameStore'
import type { BuyAmount } from '../../core/constants'
import { Button } from '../shared/Button'

const OPTIONS: { value: BuyAmount; label: string }[] = [
  { value: 1, label: '1' },
  { value: 10, label: '10' },
  { value: 'max', label: 'Max' },
]

export function BuyAmountToggle() {
  const buyAmount = useGameStore((s) => s.buyAmount)
  const setBuyAmount = useGameStore((s) => s.setBuyAmount)

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg-secondary p-1">
      <span className="text-xs text-text-muted px-2">Buy</span>
      {OPTIONS.map((opt) => {
        const selected = buyAmount === opt.value
        return (
          <Button
            key={String(opt.value)}
            onClick={() => setBuyAmount(opt.value)}
            variant={selected ? 'gold' : 'ghost'}
            size="sm"
            className={`tabular-nums min-w-[2.5rem] ${selected ? '' : 'border-transparent'}`}
          >
            {opt.label}
          </Button>
        )
      })}
    </div>
  )
}
