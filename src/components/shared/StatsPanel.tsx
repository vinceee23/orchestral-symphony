import { useGameStore } from '../../store/gameStore'
import { ACHIEVEMENTS } from '../../core/achievements'
import { CHALLENGES } from '../../core/challenges'
import { formatNumber } from '../../core/format'

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
  const hardReset = useGameStore((s) => s.hardReset)

  const totalPurchased = tiers.reduce((sum, t) => sum + t.purchased, 0)

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-text-primary mb-2">Stats</h2>

      <div className="bg-bg-secondary rounded-lg border border-border p-5 space-y-3">
        <div className="flex justify-between">
          <span className="text-text-secondary text-sm">Time Played</span>
          <span className="text-text-primary text-sm font-medium">{formatTime(totalTimePlayed)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary text-sm">Total Purchased</span>
          <span className="text-text-primary text-sm font-medium">{totalPurchased}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary text-sm">Tiers Unlocked</span>
          <span className="text-text-primary text-sm font-medium">{tiers.filter((t) => t.unlocked).length} / {tiers.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary text-sm">Tempo</span>
          <span className="text-text-primary text-sm font-medium">Lv.{tempo.level} ({tempo.baseBPM} BPM)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary text-sm">Peak Soundwaves</span>
          <span className="text-text-primary text-sm font-medium">{formatNumber(peakSoundwaves)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary text-sm">Achievements</span>
          <span className="text-text-primary text-sm font-medium">{achievements.length} / {ACHIEVEMENTS.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary text-sm">Challenges</span>
          <span className="text-text-primary text-sm font-medium">{completedChallenges.length} / {CHALLENGES.length}</span>
        </div>
      </div>

      {/* Prestige Stats */}
      {(encoreCount > 0 || opusCount > 0 || finaleCount > 0) && (
        <div className="bg-bg-secondary rounded-lg border border-border p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Prestige</h3>
          {encoreCount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Encores</span>
              <span className="text-accent-gold text-sm font-medium">{encoreCount} ({encorePoints} EP)</span>
            </div>
          )}
          {opusCount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Magnum Opuses</span>
              <span className="text-red-400 text-sm font-medium">{opusCount} ({opusPoints} OP)</span>
            </div>
          )}
          {finaleCount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary text-sm">Grand Finales</span>
              <span className="text-amber-400 text-sm font-medium">{finaleCount} ({finalePoints} FP)</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-bg-secondary rounded-lg border border-danger/30 p-5">
        <h3 className="text-sm font-semibold text-danger mb-2">Danger Zone</h3>
        <p className="text-xs text-text-muted mb-3">Reset all progress. This cannot be undone.</p>
        <button
          onClick={() => {
            if (window.confirm('Are you sure? All progress will be lost!')) {
              hardReset()
            }
          }}
          className="py-2 px-4 rounded text-sm font-medium bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 transition-colors"
        >
          Hard Reset
        </button>
      </div>
    </div>
  )
}
