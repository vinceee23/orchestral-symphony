import { useUiStore } from '../../store/uiStore'
import { formatNumber } from '../../core/format'
import { Button } from './Button'

function formatAway(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${Math.floor(ms / 1000)}s`
}

/** "Welcome back" overlay — what the orchestra produced while the player was away (offline replay). */
export function OfflineSummary() {
  const summary = useUiStore((s) => s.offlineSummary)
  const clear = useUiStore((s) => s.clearOfflineSummary)
  if (!summary) return null

  const rows: Array<[string, string]> = []
  if (summary.soundwaves.gt(0)) rows.push(['Soundwaves', `+${formatNumber(summary.soundwaves, 2)}`])
  if (summary.records > 0) rows.push(['Records', `+${formatNumber(summary.records, 0)}`])
  if (summary.acclaim.gt(0)) rows.push(['Acclaim', `+${formatNumber(summary.acclaim, 2)}`])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={clear}>
      <div
        className="max-w-sm w-full p-6 rounded-xl border border-accent-gold/40 bg-bg-primary shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-lg font-display font-bold text-accent-gold">Welcome back</h3>
          <p className="text-sm text-text-secondary leading-relaxed mt-1">
            While you were away ({formatAway(summary.awayMs)}), your orchestra kept playing.
          </p>
        </div>
        <div className="space-y-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary/40 px-3 py-2"
            >
              <span className="text-sm text-text-muted">{label}</span>
              <span className="text-sm font-display font-semibold text-success tabular-nums">{value}</span>
            </div>
          ))}
        </div>
        <Button onClick={clear} variant="gold" size="md" display className="w-full">
          Continue
        </Button>
      </div>
    </div>
  )
}
