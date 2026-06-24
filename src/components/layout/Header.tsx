import Decimal from 'break_infinity.js'
import { useGameStore } from '../../store/gameStore'
import { useUiStore } from '../../store/uiStore'
import { ACHIEVEMENTS, getAchievementGlobalMultiplier, getAchievementTierMultiplier } from '../../core/achievements'
import { getChallengeById } from '../../core/challenges'
import { TIER_CONFIGS } from '../../core/constants'
import { formatNumber } from '../../core/format'
import { getTierProductionPerSec, getCoreProductionMultiplier } from '../../core/formulas'
import { SmoothNumber } from '../shared/SmoothNumber'

export function Header() {
  const soundwaves = useGameStore((s) => s.soundwaves)
  const tiers = useGameStore((s) => s.tiers)
  const tempo = useGameStore((s) => s.tempo)
  const achievements = useGameStore((s) => s.achievements)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const encoreUpgrades = useGameStore((s) => s.encoreUpgrades)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const activeChallenge = useGameStore((s) => s.activeChallenge)
  const toggleHelp = useUiStore((s) => s.toggleHelp)

  const achievementSet = new Set(achievements)
  const globalMult = getAchievementGlobalMultiplier(achievementSet).times(getCoreProductionMultiplier({
    lifetimeEncorePoints, finalePoints, opusPoints, encoreUpgrades, tempoLevel: tempo.level, tiers,
  }))
  const tier1 = tiers[0]
  const fullMult = globalMult.times(getAchievementTierMultiplier(achievementSet, 1))
  const swPerSec = tier1?.unlocked
    ? getTierProductionPerSec(tier1, TIER_CONFIGS[0], fullMult)
    : new Decimal(0)

  const activeCh = activeChallenge
    ? getChallengeById(activeChallenge.challengeId)
    : null

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-secondary/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="text-xl">{'\u{1F3BC}'}</div>
        <h1 className="text-base font-display font-semibold text-accent-gold tracking-wide">
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
        <div className="flex items-baseline gap-1.5 px-2.5 py-1 rounded-lg border border-accent-gold/25 bg-accent-gold/5">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">SW</span>
          <span className="text-sm font-semibold text-accent-gold tabular-nums">
            <SmoothNumber value={soundwaves} rate={swPerSec} />
          </span>
          {swPerSec.gt(0) && (
            <span className="text-[10px] text-text-secondary tabular-nums">
              +{formatNumber(swPerSec)}/s
            </span>
          )}
        </div>
        <div className="text-xs text-text-muted">
          {achievements.length} / {ACHIEVEMENTS.length} achievements
        </div>
        <button
          onClick={toggleHelp}
          title="Help & hotkeys (H)"
          className="w-7 h-7 flex items-center justify-center rounded-full border border-border-light text-text-secondary hover:text-accent-gold hover:border-accent-gold/50 transition-colors text-sm"
        >
          ?
        </button>
      </div>
    </header>
  )
}
