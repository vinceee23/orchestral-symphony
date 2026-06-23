import Decimal from 'break_infinity.js'
import { useGameStore } from '../../store/gameStore'
import { formatNumber } from '../../core/format'
import { TIER_CONFIGS } from '../../core/constants'
import { getTierProductionPerSec, getEncoreMultiplier, getFinaleMultiplier } from '../../core/formulas'
import { getAchievementGlobalMultiplier, getAchievementTierMultiplier } from '../../core/achievements'
import { SmoothNumber } from '../shared/SmoothNumber'

export function SoundwaveDisplay() {
  const soundwaves = useGameStore((s) => s.soundwaves)
  const tiers = useGameStore((s) => s.tiers)
  const achievements = useGameStore((s) => s.achievements)
  const encorePoints = useGameStore((s) => s.encorePoints)
  const finalePoints = useGameStore((s) => s.finalePoints)

  const achievementSet = new Set(achievements)
  const achievementGlobal = getAchievementGlobalMultiplier(achievementSet)
  const encoreMult = getEncoreMultiplier(encorePoints)
  const finaleMult = getFinaleMultiplier(finalePoints)
  const globalMult = achievementGlobal.times(encoreMult).times(finaleMult)

  const tier1 = tiers[0]
  const config1 = TIER_CONFIGS[0]
  const tierAchMult = getAchievementTierMultiplier(achievementSet, 1)
  const fullMult = globalMult.times(tierAchMult)
  const swPerSec = tier1 && tier1.unlocked
    ? getTierProductionPerSec(tier1, config1, fullMult)
    : new Decimal(0)

  return (
    <div className="text-center py-6">
      <div className="text-xs text-text-muted uppercase tracking-[0.2em] mb-2">
        Soundwaves
      </div>
      <div className="text-4xl md:text-5xl font-bold text-accent-gold animate-pulse-gold mb-1">
        <SmoothNumber value={soundwaves} rate={swPerSec} />
      </div>
      {swPerSec.gt(0) && (
        <div className="text-sm text-text-secondary">
          +{formatNumber(swPerSec)}/s
        </div>
      )}
      {encorePoints > 0 && (
        <div className="text-[10px] text-accent-gold mt-1">
          EP: {encorePoints} (x{formatNumber(encoreMult, 0)})
        </div>
      )}
      {finalePoints > 0 && (
        <div className="text-[10px] text-amber-400 mt-1">
          FP: {finalePoints} (x{formatNumber(finaleMult, 0)})
        </div>
      )}
    </div>
  )
}
