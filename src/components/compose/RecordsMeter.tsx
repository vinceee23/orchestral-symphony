import { useGameStore } from '../../store/gameStore'
import { PLATINUM_THRESHOLD } from '../../core/constants'
import { getFameMultiplier } from '../../core/records'

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US')
const REVEAL_AT = 600_000 // records stay hidden until here — then a cryptic counter appears

/**
 * The mystery → reveal. "Records Sold" is invisible until ~600k (so it's never explained up front);
 * then a cryptic, unlabeled counter quietly appears (player: "...what's records sold?"), intensifying
 * as it climbs, and pays off when it resolves into GONE PLATINUM at 1,000,000. Bottom-right, clear of
 * the conductor's podium.
 */
export function RecordsMeter() {
  const recordsSold = useGameStore((s) => s.recordsSold)
  const platinum = useGameStore((s) => s.platinum)
  const opusUpgrades = useGameStore((s) => s.opusUpgrades)

  if (!platinum && recordsSold < REVEAL_AT) return null

  if (platinum) {
    const fame = getFameMultiplier(recordsSold, opusUpgrades)
    return (
      <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-lg border border-accent-gold/50 bg-bg-primary/85 px-3.5 py-2 text-right shadow-[0_0_18px_rgba(212,168,67,0.35)]">
        <div className="font-display text-sm font-semibold tracking-wide text-accent-gold">✦ Gone Platinum</div>
        <div className="text-[11px] tabular-nums text-text-secondary">{fmt(recordsSold)} records · Fame ×{fame.toFixed(2)}</div>
      </div>
    )
  }

  // Mystery phase (600k → 1M): cryptic, no goal shown; glow swells as it nears the (unrevealed) threshold.
  const closeness = Math.min(1, (recordsSold - REVEAL_AT) / (PLATINUM_THRESHOLD - REVEAL_AT))
  return (
    <div
      className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-lg border border-accent-purple/30 bg-bg-primary/80 px-3.5 py-2 text-right"
      style={{ boxShadow: `0 0 ${6 + closeness * 18}px rgba(124,58,237,${0.12 + closeness * 0.4})` }}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Records sold</div>
      <div className="font-display text-base font-semibold tabular-nums text-text-primary">{fmt(recordsSold)}</div>
    </div>
  )
}
