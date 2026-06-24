import Decimal from 'break_infinity.js'
import { useGameStore } from '../../store/gameStore'
import { formatNumber } from '../../core/format'
import { TIER_CONFIGS } from '../../core/constants'
import { getTierProductionPerSec, getEncoreMultiplier, getFinaleMultiplier, getCoreProductionMultiplier } from '../../core/formulas'
import { getAchievementGlobalMultiplier, getAchievementTierMultiplier } from '../../core/achievements'
import { hasPerk } from '../../core/perks'
import { SmoothNumber } from '../shared/SmoothNumber'

export function SoundwaveDisplay() {
  const soundwaves = useGameStore((s) => s.soundwaves)
  const tiers = useGameStore((s) => s.tiers)
  const tempo = useGameStore((s) => s.tempo)
  const achievements = useGameStore((s) => s.achievements)
  const encorePoints = useGameStore((s) => s.encorePoints)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const encoreUpgrades = useGameStore((s) => s.encoreUpgrades)
  const opusUpgrades = useGameStore((s) => s.opusUpgrades)
  const crescendo = useGameStore((s) => s.crescendo)
  const recordsSold = useGameStore((s) => s.recordsSold)
  const platinum = useGameStore((s) => s.platinum)
  const finalePoints = useGameStore((s) => s.finalePoints)

  const achievementSet = new Set(achievements)
  const achievementGlobal = getAchievementGlobalMultiplier(achievementSet)
  // Production multiplier shared with the tick (prevents the displayed rate from drifting).
  const encoreMult = getEncoreMultiplier(lifetimeEncorePoints) // for the EP label below
  const globalMult = achievementGlobal.times(getCoreProductionMultiplier({
    lifetimeEncorePoints, finalePoints, encoreUpgrades, tempoLevel: tempo.level, tiers,
    opusUpgrades, crescendoLevel: crescendo, recordsSold, platinum,
    massProduction: hasPerk(achievementSet, 'perk-bulk-unlock'),
  }))

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
      {lifetimeEncorePoints > 0 && (
        <div className="text-[10px] text-accent-gold mt-1">
          Applause: {encorePoints} spendable · x{formatNumber(encoreMult, 2)} production
        </div>
      )}
      {finalePoints > 0 && (
        <div className="text-[10px] text-amber-400 mt-1">
          FP: {finalePoints} (x{formatNumber(getFinaleMultiplier(finalePoints), 0)})
        </div>
      )}
    </div>
  )
}
