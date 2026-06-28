import Decimal from 'break_infinity.js'
import { useGameStore } from '../../store/gameStore'
import { useUiStore } from '../../store/uiStore'
import { ACHIEVEMENTS, getAchievementTierMultiplier } from '../../core/achievements'
import { getChallengeMultipliers } from '../../core/challenges'
import { getChallengeById } from '../../core/challenges'
import { TIER_CONFIGS } from '../../core/constants'
import { formatNumber } from '../../core/format'
import { getTierProductionPerSec } from '../../core/formulas'
import { getCrescendoMultiplier } from '../../core/crescendo'
import { getEra, eraTintCss } from '../../core/eraTheme'
import { getProductionMultiplier } from '../../core/multiplierRegistry'
import { SmoothNumber } from '../shared/SmoothNumber'
import { SonanceLogo } from '../shared/SonanceLogo'

export function Header() {
  const soundwaves = useGameStore((s) => s.soundwaves)
  const tiers = useGameStore((s) => s.tiers)
  const tempo = useGameStore((s) => s.tempo)
  const achievements = useGameStore((s) => s.achievements)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const encoreUpgrades = useGameStore((s) => s.encoreUpgrades)
  const opusUpgrades = useGameStore((s) => s.opusUpgrades)
  const crescendo = useGameStore((s) => s.crescendo)
  const recordsSold = useGameStore((s) => s.recordsSold)
  const platinum = useGameStore((s) => s.platinum)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const activeChallenge = useGameStore((s) => s.activeChallenge)
  const opusCount = useGameStore((s) => s.opusCount)
  const worldTourUnlocked = useGameStore((s) => s.worldTourUnlocked)
  const signatureAllocation = useGameStore((s) => s.signatureAllocation)
  const signatureCount = useGameStore((s) => s.signatureCount)
  const lifetimeAcclaim = useGameStore((s) => s.lifetimeAcclaim)
  const completedChallenges = useGameStore((s) => s.completedChallenges)
  const challengeBestTimes = useGameStore((s) => s.challengeBestTimes)
  const keepChallenges = useGameStore((s) => s.keepChallenges)
  const warmUpLevel = useGameStore((s) => s.warmUpLevel)
  const conducting = useUiStore((s) => s.conducting)
  const toggleHelp = useUiStore((s) => s.toggleHelp)

  // Subtle live Crescendo readout — visible on EVERY tab while the swell is up or you're conducting,
  // so global Space-conduct (AppShell) is felt off the Compose stage. Hidden when fully decayed & idle.
  const crescendoMult = getCrescendoMultiplier(
    crescendo, opusUpgrades,
    getChallengeMultipliers(completedChallenges, challengeBestTimes, keepChallenges).crescendoBonus,
  )
  const showCrescendo = opusCount > 0 && (conducting || crescendo > 0.02)

  // Reactive logo: the wordmark glow SWELLS with crescendo / while conducting — the logo resonates as you play.
  const resonance = Math.min(1, crescendo + (conducting ? 0.15 : 0))

  const era = getEra(lifetimeEncorePoints, opusCount, finalePoints, worldTourUnlocked, signatureCount)
  const achievementSet = new Set(achievements)
  const globalMult = getProductionMultiplier({
    achievements,
    completedChallenges,
    challengeBestTimes,
    keepChallenges,
    activeChallenge,
    lifetimeEncorePoints,
    finalePoints,
    encoreUpgrades,
    tempo,
    tiers,
    opusUpgrades,
    crescendo,
    recordsSold,
    platinum,
    worldTourUnlocked,
    lifetimeAcclaim,
    warmUpLevel,
    signatureAllocation,
    signatureCount,
  })
  const tier1 = tiers[0]
  const fullMult = globalMult.times(getAchievementTierMultiplier(achievementSet, 1))
  const swPerSec = tier1?.unlocked
    ? getTierProductionPerSec(tier1, TIER_CONFIGS[0], fullMult)
    : new Decimal(0)

  const activeCh = activeChallenge
    ? getChallengeById(activeChallenge.challengeId)
    : null

  return (
    <header
      className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-bg-secondary/90"
      style={{ backgroundImage: eraTintCss(era) }}
    >
      <div className="flex items-center gap-3">
        <h1 className="m-0 leading-none">
          <SonanceLogo size={20} glow={resonance} />
        </h1>
      </div>
      <div className="flex items-center gap-5">
        {showCrescendo && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border tabular-nums transition-colors ${conducting ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold' : 'border-accent-gold/20 bg-accent-gold/5 text-text-secondary'}`}
            title="Crescendo — hold Space (any tab) to swell"
          >
            <span className={conducting ? 'animate-pulse' : ''}>♪</span>
            <span className="text-xs font-medium">×{crescendoMult.toFixed(2)}</span>
          </div>
        )}
        {activeCh && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-purple/10 border border-accent-purple/30">
            <span className="text-xs">{activeCh.icon}</span>
            <span className="text-[11px] text-accent-purple font-medium">{activeCh.name}</span>
          </div>
        )}
        <div className="flex items-baseline gap-2 px-3.5 py-1.5 rounded-lg border border-accent-gold/25 bg-accent-gold/5">
          <span className="text-[11px] text-text-muted uppercase tracking-wider">SW</span>
          <span className="text-base font-semibold text-accent-gold tabular-nums">
            <SmoothNumber value={soundwaves} rate={swPerSec} />
          </span>
          {swPerSec.gt(0) && (
            <span className="text-[11px] text-text-secondary tabular-nums">
              +{formatNumber(swPerSec)}/s
            </span>
          )}
        </div>
        <div className="text-xs text-text-muted tabular-nums">
          {achievements.length} / {ACHIEVEMENTS.length}<span className="hidden md:inline"> achievements</span>
        </div>
        <a
          href="https://ko-fi.com/vinceangelolmacaraig"
          target="_blank"
          rel="noopener noreferrer"
          title="Support the dev — buy me a coffee on Ko-fi"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-light text-text-secondary hover:text-accent-gold hover:border-accent-gold/50 transition-colors text-xs"
        >
          <span aria-hidden="true">☕</span>
          <span className="hidden md:inline">Support</span>
        </a>
        <button
          onClick={toggleHelp}
          title="Help & hotkeys (H)"
          className="w-8 h-8 flex items-center justify-center rounded-full border border-border-light text-text-secondary hover:text-accent-gold hover:border-accent-gold/50 transition-colors text-sm"
        >
          ?
        </button>
      </div>
    </header>
  )
}
