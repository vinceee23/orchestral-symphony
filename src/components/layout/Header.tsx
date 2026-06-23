import { useGameStore } from '../../store/gameStore'
import { ACHIEVEMENTS } from '../../core/achievements'
import { getChallengeById } from '../../core/challenges'

export function Header() {
  const achievements = useGameStore((s) => s.achievements)
  const activeChallenge = useGameStore((s) => s.activeChallenge)

  const activeCh = activeChallenge
    ? getChallengeById(activeChallenge.challengeId)
    : null

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-secondary/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="text-xl">{'\u{1F3BC}'}</div>
        <h1 className="text-base font-semibold text-text-primary tracking-tight">
          Orchestral Symphony
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {activeCh && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent-purple/10 border border-accent-purple/30">
            <span className="text-xs">{activeCh.icon}</span>
            <span className="text-[10px] text-accent-purple font-medium">{activeCh.name}</span>
          </div>
        )}
        <div className="text-xs text-text-muted">
          {achievements.length} / {ACHIEVEMENTS.length} achievements
        </div>
      </div>
    </header>
  )
}
