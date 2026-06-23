import { useGameStore } from '../../store/gameStore'
import { CHALLENGES } from '../../core/challenges'
import { formatNumber } from '../../core/format'

export function ChallengesPage() {
  const completedChallenges = useGameStore((s) => s.completedChallenges)
  const activeChallenge = useGameStore((s) => s.activeChallenge)
  const soundwaves = useGameStore((s) => s.soundwaves)
  const finaleCount = useGameStore((s) => s.finaleCount)
  const startChallenge = useGameStore((s) => s.startChallenge)
  const abandonChallenge = useGameStore((s) => s.abandonChallenge)

  const completedSet = new Set(completedChallenges)

  // Filter challenges: show only unlocked (finaleCount >= unlockAt) or completed or active
  const visibleChallenges = CHALLENGES.filter((ch) =>
    completedSet.has(ch.id) ||
    activeChallenge?.challengeId === ch.id ||
    finaleCount >= ch.unlockAt
  )
  const hiddenCount = CHALLENGES.length - visibleChallenges.length

  // Find active challenge config
  const activeCh = activeChallenge
    ? CHALLENGES.find((c) => c.id === activeChallenge.challengeId)
    : null

  // Progress for active challenge
  const progress = activeCh
    ? Math.min(100, soundwaves.div(activeCh.targetSoundwaves).toNumber() * 100)
    : 0
  const elapsed = activeChallenge
    ? Math.floor((Date.now() - activeChallenge.startTime) / 1000)
    : 0
  const elapsedMin = Math.floor(elapsed / 60)
  const elapsedSec = elapsed % 60

  return (
    <div className="p-4 md:p-6 h-full">
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Challenges</h2>
        <p className="text-sm text-text-secondary">
          Complete challenges to unlock autobuyers
        </p>
        <p className="text-xs text-text-muted mt-1">
          {completedChallenges.length} / {CHALLENGES.length} completed
        </p>
      </div>

      {/* Active Challenge Banner */}
      {activeCh && activeChallenge && (
        <div className="mb-4 p-4 rounded-lg border border-accent-purple/40 bg-accent-purple/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeCh.icon}</span>
              <div>
                <div className="text-sm font-semibold text-accent-purple">{activeCh.name}</div>
                <div className="text-[10px] text-text-muted">
                  {elapsedMin}:{elapsedSec.toString().padStart(2, '0')} elapsed
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Abandon this challenge? Your progress will be lost and you\'ll return to your pre-challenge state.')) {
                  abandonChallenge()
                }
              }}
              className="px-3 py-1 text-xs rounded bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 transition-colors"
            >
              Abandon
            </button>
          </div>
          <div className="text-xs text-text-secondary mb-2">{activeCh.description}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-bg-primary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-purple transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[10px] text-text-muted shrink-0">
              {formatNumber(soundwaves)} / {formatNumber(activeCh.targetSoundwaves)}
            </div>
          </div>
        </div>
      )}

      {/* Challenge Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleChallenges.map((ch) => {
          const completed = completedSet.has(ch.id)
          const isActive = activeChallenge?.challengeId === ch.id
          const canStart = !activeChallenge && !completed

          return (
            <div
              key={ch.id}
              className={`p-3 rounded-lg border transition-all ${
                completed
                  ? 'bg-success/5 border-success/30'
                  : isActive
                    ? 'bg-accent-purple/10 border-accent-purple/40'
                    : 'bg-bg-secondary border-border hover:border-border-light'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xl shrink-0">{ch.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold ${
                    completed ? 'text-success' : isActive ? 'text-accent-purple' : 'text-text-primary'
                  }`}>
                    {ch.name}
                  </div>
                  {completed && (
                    <span className="text-[10px] text-success">{'\u{2713}'} Completed</span>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-text-secondary mb-2 leading-relaxed">
                {ch.description}
              </div>

              <div className="text-[10px] text-text-muted mb-2">
                Target: {formatNumber(ch.targetSoundwaves)} SW
              </div>

              <div className="text-[10px] text-accent-purple mb-2">
                Unlocks: {ch.unlocksAutobuyer.replace('tier_', 'Tier ').replace('_auto', ' auto')} autobuyer
              </div>

              {canStart && (
                <button
                  onClick={() => {
                    if (window.confirm(`Start "${ch.name}"? Your current progress will be saved and restored when you complete or abandon the challenge.`)) {
                      startChallenge(ch.id)
                    }
                  }}
                  className="w-full py-1.5 text-xs rounded bg-accent-purple/20 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/30 transition-colors"
                >
                  Start Challenge
                </button>
              )}

              {isActive && (
                <div className="text-[10px] text-accent-purple text-center py-1">
                  In Progress...
                </div>
              )}

              {completed && (
                <div className="text-[10px] text-success text-center py-1">
                  {'\u{1F513}'} Autobuyer Unlocked
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="text-center mt-4 text-xs text-text-muted">
          {hiddenCount} more challenge{hiddenCount > 1 ? 's' : ''} to discover...
        </div>
      )}
    </div>
  )
}
