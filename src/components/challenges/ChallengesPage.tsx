import { useGameStore } from '../../store/gameStore'
import {
  CHALLENGES,
  isChallengeUnlocked,
  speedScaledCapstone,
  CAPSTONE_TIME_FLOOR_MS,
  CAPSTONE_TIME_CAP_MS,
  CAPSTONE_MULT_FLOOR,
  CAPSTONE_MULT_CAP,
} from '../../core/challenges'
import { formatNumber } from '../../core/format'
import { Button } from '../shared/Button'
import {
  formatAutobuyerUnlock,
  formatChallengeReward,
  formatChallengeTimeMs,
  formatUnlockRequirement,
} from './challengeLabels'

type CardState = 'locked' | 'available' | 'completed' | 'active'

export function ChallengesPage() {
  const completedChallenges = useGameStore((s) => s.completedChallenges)
  const challengeBestTimes = useGameStore((s) => s.challengeBestTimes)
  const activeChallenge = useGameStore((s) => s.activeChallenge)
  const soundwaves = useGameStore((s) => s.soundwaves)
  const challengeGate = useGameStore((s) => ({
    worldTourUnlocked: s.worldTourUnlocked,
    peakSoundwaves: s.peakSoundwaves,
    encoreCount: s.encoreCount,
    opusCount: s.opusCount,
  }))
  const startChallenge = useGameStore((s) => s.startChallenge)
  const abandonChallenge = useGameStore((s) => s.abandonChallenge)

  const completedSet = new Set(completedChallenges)

  const challengeUnlocked = (ch: (typeof CHALLENGES)[number]) =>
    isChallengeUnlocked(challengeGate, ch)

  const visibleChallenges = challengeGate.worldTourUnlocked
    ? CHALLENGES
    : CHALLENGES.filter(
        (ch) =>
          completedSet.has(ch.id) ||
          activeChallenge?.challengeId === ch.id,
      )
  const hiddenCount = CHALLENGES.length - visibleChallenges.length

  const totalBestMs = completedChallenges.reduce(
    (sum, id) => sum + (challengeBestTimes[id] ?? 0),
    0,
  )
  const unpluggedCleared = completedSet.has('ch_unplugged')
  const capstoneMult = speedScaledCapstone(totalBestMs)

  const activeCh = activeChallenge
    ? CHALLENGES.find((c) => c.id === activeChallenge.challengeId)
    : null

  const progress = activeCh
    ? Math.min(100, soundwaves.div(activeCh.targetSoundwaves).toNumber() * 100)
    : 0
  const elapsed = activeChallenge
    ? Math.floor((Date.now() - activeChallenge.startTime) / 1000)
    : 0
  const elapsedMin = Math.floor(elapsed / 60)
  const elapsedSec = elapsed % 60

  const getCardState = (ch: (typeof CHALLENGES)[number]): CardState => {
    if (activeChallenge?.challengeId === ch.id) return 'active'
    if (completedSet.has(ch.id)) return 'completed'
    if (challengeUnlocked(ch)) return 'available'
    return 'locked'
  }

  const confirmStart = (ch: (typeof CHALLENGES)[number], rerun: boolean) => {
    const msg = rerun
      ? `Re-run "${ch.name}"? Your current progress will be saved and restored when you complete or abandon the challenge. Beat your best time to grow the capstone bonus.`
      : `Start "${ch.name}"? Your current progress will be saved and restored when you complete or abandon the challenge.`
    if (window.confirm(msg)) startChallenge(ch.id)
  }

  return (
    <div className="p-4 md:p-6 h-full">
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-teal-400 mb-1">Challenges</h2>
        <p className="text-sm text-text-secondary">
          Complete challenges for permanent rewards and autobuyers
        </p>
      </div>

      {challengeGate.worldTourUnlocked && (
        <section
          className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3"
          aria-label="Challenge rewards summary"
        >
          <div className="rounded-xl border border-teal-500/30 bg-bg-secondary/40 p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Cleared</div>
            <div className="text-sm font-semibold text-teal-400 tabular-nums mt-1">
              {completedChallenges.length} / {CHALLENGES.length}
            </div>
          </div>
          <div className="rounded-xl border border-teal-500/30 bg-bg-secondary/40 p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Total best time</div>
            <div className="text-sm font-semibold text-teal-400 tabular-nums mt-1">
              {completedChallenges.length > 0 ? formatChallengeTimeMs(totalBestMs) : '—'}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-teal-500/30 bg-bg-secondary/40 p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Capstone bonus</div>
            {unpluggedCleared ? (
              <>
                <div className="text-sm font-semibold text-teal-400 tabular-nums mt-1">
                  ×{capstoneMult.toFixed(2)}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 leading-snug">
                  ×{CAPSTONE_MULT_FLOOR.toFixed(0)} at ≥{formatChallengeTimeMs(CAPSTONE_TIME_FLOOR_MS)} total
                  {' → '}
                  ×{CAPSTONE_MULT_CAP.toFixed(0)} at ≤{formatChallengeTimeMs(CAPSTONE_TIME_CAP_MS)}
                </div>
              </>
            ) : (
              <div className="text-[10px] text-text-muted mt-1 leading-snug">
                Clear Unplugged Finale to activate
              </div>
            )}
          </div>
        </section>
      )}

      {activeCh && activeChallenge && (
        <div className="mb-4 p-4 rounded-lg border border-teal-500/40 bg-teal-950/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>{activeCh.icon}</span>
              <div>
                <div className="text-sm font-semibold text-teal-400">{activeCh.name}</div>
                <div className="text-[10px] text-text-muted tabular-nums">
                  {elapsedMin}:{elapsedSec.toString().padStart(2, '0')} elapsed
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (
                  window.confirm(
                    "Abandon this challenge? Your progress will be lost and you'll return to your pre-challenge state.",
                  )
                ) {
                  abandonChallenge()
                }
              }}
              className="border-danger/45 bg-danger/12 text-danger hover:bg-danger/22 hover:border-danger/70"
              aria-label={`Abandon ${activeCh.name} challenge`}
            >
              Abandon
            </Button>
          </div>
          <div className="text-xs text-text-secondary mb-2">{activeCh.description}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-bg-primary overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500/70 transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${activeCh.name} progress`}
              />
            </div>
            <div className="text-[10px] text-text-muted shrink-0 tabular-nums">
              {formatNumber(soundwaves)} / {formatNumber(activeCh.targetSoundwaves)}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleChallenges.map((ch) => {
          const state = getCardState(ch)
          const rewardLabel = formatChallengeReward(ch.reward)
          const bestMs = challengeBestTimes[ch.id]
          const gateLabel = formatUnlockRequirement(ch, challengeGate)

          return (
            <div
              key={ch.id}
              className={`p-3 rounded-lg border transition-all ${
                state === 'completed'
                  ? 'bg-success/5 border-success/30'
                  : state === 'active'
                    ? 'bg-teal-950/30 border-teal-500/40'
                    : state === 'locked'
                      ? 'bg-bg-secondary/60 border-border opacity-70'
                      : 'bg-bg-secondary border-border hover:border-teal-500/30'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xl shrink-0" aria-hidden>{ch.icon}</span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-semibold ${
                      state === 'completed'
                        ? 'text-success'
                        : state === 'active'
                          ? 'text-teal-400'
                          : state === 'locked'
                            ? 'text-text-muted'
                            : 'text-text-primary'
                    }`}
                  >
                    {ch.name}
                  </div>
                  {state === 'completed' && bestMs !== undefined && (
                    <div className="text-[10px] text-success tabular-nums">
                      <span aria-hidden>{'\u{2713}'}</span> Best {formatChallengeTimeMs(bestMs)}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-text-secondary mb-2 leading-relaxed">
                {ch.description}
              </div>

              <div className="text-[10px] text-text-muted mb-1">
                Target: {formatNumber(ch.targetSoundwaves)} SW
              </div>

              {rewardLabel && (
                <div className="text-[10px] text-teal-400/90 mb-1">{rewardLabel}</div>
              )}

              {ch.unlocksAutobuyer && (
                <div className="text-[10px] text-teal-300/80 mb-2">
                  Unlocks: {formatAutobuyerUnlock(ch.unlocksAutobuyer)}
                </div>
              )}

              {state === 'locked' && gateLabel && (
                <div className="text-[10px] text-text-muted text-center py-1" aria-disabled>
                  {gateLabel}
                </div>
              )}

              {state === 'available' && !activeChallenge && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-full border-teal-500/45 bg-teal-500/12 text-teal-400 hover:bg-teal-500/22 hover:border-teal-500/70"
                  onClick={() => confirmStart(ch, false)}
                  aria-label={`Start ${ch.name} challenge`}
                >
                  Start
                </Button>
              )}

              {state === 'active' && (
                <div className="text-[10px] text-teal-400 text-center py-1">In Progress…</div>
              )}

              {state === 'completed' && !activeChallenge && (
                <Button
                  type="button"
                  size="sm"
                  variant="success"
                  className="w-full"
                  onClick={() => confirmStart(ch, true)}
                  aria-label={`Re-run ${ch.name} challenge`}
                >
                  Re-run
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="text-center mt-4 text-xs text-text-muted">
          Unlock World Tour to discover {hiddenCount} challenge{hiddenCount > 1 ? 's' : ''}…
        </div>
      )}
    </div>
  )
}
