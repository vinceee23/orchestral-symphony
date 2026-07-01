import { useGameStore } from '../../store/gameStore'
import { ACHIEVEMENTS } from '../../core/achievements'
import { CHALLENGES } from '../../core/challenges'
import { formatNumber } from '../../core/format'
import { getProductionBreakdown, getProductionMultiplier } from '../../core/multiplierRegistry'

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function StatsPanel() {
  const totalTimePlayed = useGameStore((s) => s.totalTimePlayed)
  const tiers = useGameStore((s) => s.tiers)
  const tempo = useGameStore((s) => s.tempo)
  const achievements = useGameStore((s) => s.achievements)
  const completedChallenges = useGameStore((s) => s.completedChallenges)
  const encoreCount = useGameStore((s) => s.encoreCount)
  const encorePoints = useGameStore((s) => s.encorePoints)
  const opusCount = useGameStore((s) => s.opusCount)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const finaleCount = useGameStore((s) => s.finaleCount)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const peakSoundwaves = useGameStore((s) => s.peakSoundwaves)
  // Production breakdown (C10). Derive from the whole-store value, NOT a selector returning a fresh
  // array/Decimal each call — that loops useSyncExternalStore and blanks the page.
  const fullState = useGameStore()
  const breakdown = getProductionBreakdown(fullState)
  const totalMult = getProductionMultiplier(fullState)

  const totalPurchased = tiers.reduce((sum, t) => sum + t.purchased, 0)

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-display font-semibold text-text-primary">Stats</h1>
      </header>

      <div className="rounded-xl border border-border bg-bg-secondary/40 p-4 space-y-4">
        <div className="flex justify-between items-baseline gap-4">
          <span className="text-sm text-text-secondary">Time Played</span>
          <span className="text-sm text-text-primary font-medium tabular-nums">{formatTime(totalTimePlayed)}</span>
        </div>
        <div className="flex justify-between items-baseline gap-4">
          <span className="text-sm text-text-secondary">Total Purchased</span>
          <span className="text-sm text-text-primary font-medium tabular-nums">{totalPurchased}</span>
        </div>
        <div className="flex justify-between items-baseline gap-4">
          <span className="text-sm text-text-secondary">Tiers Unlocked</span>
          <span className="text-sm text-text-primary font-medium tabular-nums">{tiers.filter((t) => t.unlocked).length} / {tiers.length}</span>
        </div>
        <div className="flex justify-between items-baseline gap-4">
          <span className="text-sm text-text-secondary">Tempo</span>
          <span className="text-sm text-text-primary font-medium tabular-nums">Lv.{tempo.level} ({tempo.baseBPM} BPM)</span>
        </div>
        <div className="flex justify-between items-baseline gap-4">
          <span className="text-sm text-text-secondary">Peak Soundwaves (run)</span>
          <span className="text-sm text-text-primary font-medium tabular-nums">{formatNumber(peakSoundwaves)}</span>
        </div>
        <div className="flex justify-between items-baseline gap-4">
          <span className="text-sm text-text-secondary">Achievements</span>
          <span className="text-sm text-text-primary font-medium tabular-nums">{achievements.length} / {ACHIEVEMENTS.length}</span>
        </div>
        <div className="flex justify-between items-baseline gap-4">
          <span className="text-sm text-text-secondary">Challenges</span>
          <span className="text-sm text-text-primary font-medium tabular-nums">{completedChallenges.length} / {CHALLENGES.length}</span>
        </div>
      </div>

      {/* Prestige Stats */}
      {(encoreCount > 0 || opusCount > 0 || finaleCount > 0) && (
        <div className="rounded-xl border border-border bg-bg-secondary/40 p-4 space-y-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Prestige</h2>
          {encoreCount > 0 && (
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-sm text-text-secondary">Encores</span>
              <span className="text-sm text-accent-gold font-medium tabular-nums">{encoreCount} ({encorePoints} Applause)</span>
            </div>
          )}
          {opusCount > 0 && (
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-sm text-text-secondary">Magnum Opuses</span>
              <span className="text-sm text-accent-purple font-medium tabular-nums">{opusCount} ({opusPoints} OP)</span>
            </div>
          )}
          {finaleCount > 0 && (
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-sm text-text-secondary">Grand Finales</span>
              <span className="text-sm text-accent-gold font-medium tabular-nums">{finaleCount} ({finalePoints} FP)</span>
            </div>
          )}
        </div>
      )}

      {/* Production Breakdown (genre-audit C10): exactly how the /s multiplier is composed, so the
          math is never opaque. The factors multiply to the total shown. */}
      <div className="rounded-xl border border-border bg-bg-secondary/40 p-4 space-y-2">
        <div className="flex justify-between items-baseline gap-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Production Breakdown</h2>
          <span className="text-sm text-accent-gold font-semibold tabular-nums">x{formatNumber(totalMult, 2)}</span>
        </div>
        {breakdown.map((f) => (
          <div key={f.label} className="flex justify-between items-baseline gap-4">
            <span className="text-sm text-text-secondary">{f.label}</span>
            <span className="text-sm text-text-primary font-medium tabular-nums">x{formatNumber(f.value, 2)}</span>
          </div>
        ))}
        <p className="text-[11px] text-text-muted pt-1">All factors multiply together to set your production rate. Hard reset lives in Settings.</p>
      </div>
    </div>
  )
}
