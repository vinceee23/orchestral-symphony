import Decimal from 'break_infinity.js'

interface ProgressBarProps {
  current: Decimal
  target: Decimal
  className?: string
}

export function ProgressBar({ current, target, className = '' }: ProgressBarProps) {
  const pct = target.gt(0)
    ? Math.min(100, current.div(target).toNumber() * 100)
    : 0

  return (
    <div className={`h-1 w-full rounded-full bg-bg-tertiary overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-accent-gold transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
