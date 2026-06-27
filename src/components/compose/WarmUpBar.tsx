import { memo } from 'react'
import { warmUpMultiplier } from '../../core/warmup'

interface Props {
  active: boolean
  level?: number
  engaged?: boolean
}

export const WarmUpBar = memo(function WarmUpBar({ active, level = 0, engaged = false }: Props) {
  if (!active) return null

  const fill = Math.max(0, Math.min(1, level))
  const mult = warmUpMultiplier(fill)

  return (
    <div className={`pointer-events-none w-44 ${engaged ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] font-display">
        <span className="text-amber-200/90">Warm-Up</span>
        <span className="text-accent-gold tabular-nums">&times;{mult.toFixed(2)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-amber-950/50 border border-accent-gold/25 overflow-hidden backdrop-blur">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-accent-gold to-amber-200 transition-[width] duration-150"
          style={{ width: `${fill * 100}%`, boxShadow: engaged ? '0 0 12px rgba(212,168,67,0.65)' : undefined }}
        />
      </div>
    </div>
  )
})
