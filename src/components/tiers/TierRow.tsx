import Decimal from 'break_infinity.js'
import { useGameStore } from '../../store/gameStore'
import { TIER_CONFIGS } from '../../core/constants'
import { getTierProductionPerSec, getMilestoneMultiplier, getTierBatchCost, getMaxBuyable, getEncoreMultiplier, getFinaleMultiplier } from '../../core/formulas'
import { formatNumber, formatCost } from '../../core/format'
import { SmoothNumber } from '../shared/SmoothNumber'
import { ProgressBar } from '../shared/ProgressBar'
import { getAchievementGlobalMultiplier, getAchievementTierMultiplier } from '../../core/achievements'
import { playBuySound } from '../../core/audio'

interface TierRowProps {
  tierId: number
}

export function TierRow({ tierId }: TierRowProps) {
  const tier = useGameStore((s) => s.tiers[tierId - 1])
  const soundwaves = useGameStore((s) => s.soundwaves)
  const buyAmount = useGameStore((s) => s.buyAmount)
  const achievements = useGameStore((s) => s.achievements)
  const autobuyers = useGameStore((s) => s.autobuyers)
  const encorePoints = useGameStore((s) => s.encorePoints)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const buyTier = useGameStore((s) => s.buyTier)
  const buyMaxTier = useGameStore((s) => s.buyMaxTier)
  const toggleAutobuyer = useGameStore((s) => s.toggleAutobuyer)

  if (!tier || !tier.unlocked) return null

  const config = TIER_CONFIGS[tierId - 1]
  let displayAmount: number
  let displayCost: Decimal
  if (buyAmount === 'max') {
    displayAmount = getMaxBuyable(config, tier.purchased, soundwaves)
    displayCost = displayAmount > 0 ? getTierBatchCost(config, tier.purchased, displayAmount) : getTierBatchCost(config, tier.purchased, 1)
  } else if (buyAmount === 10) {
    // "Next 10" — buy up to the next multiple of 10
    const remainder = tier.purchased % 10
    displayAmount = remainder === 0 ? 10 : 10 - remainder
    displayCost = getTierBatchCost(config, tier.purchased, displayAmount)
  } else {
    displayAmount = buyAmount
    displayCost = getTierBatchCost(config, tier.purchased, buyAmount)
  }
  const canAffordBatch = soundwaves.gte(displayCost) && displayAmount > 0

  // Build the full multiplier stack
  const achievementSet = new Set(achievements)
  const achievementGlobal = getAchievementGlobalMultiplier(achievementSet)
  const encoreMult = getEncoreMultiplier(encorePoints)
  const finaleMult = getFinaleMultiplier(finalePoints)
  const globalMult = achievementGlobal.times(encoreMult).times(finaleMult)
  const tierAchMult = getAchievementTierMultiplier(achievementSet, tierId)
  const fullMult = globalMult.times(tierAchMult)

  const productionPerSec = getTierProductionPerSec(tier, config, fullMult)

  // Rate at which THIS tier's quantity grows (production from the tier above)
  const producerIndex = tierId // tierId is 1-based, so tiers[tierId] is the tier above
  const producerTier = useGameStore.getState().tiers[producerIndex]
  const producerConfig = TIER_CONFIGS[producerIndex]
  let quantityRate = new Decimal(0)
  if (producerTier && producerTier.unlocked && producerConfig) {
    const prodAchMult = getAchievementTierMultiplier(achievementSet, tierId + 1)
    const prodFullMult = globalMult.times(prodAchMult)
    quantityRate = getTierProductionPerSec(producerTier, producerConfig, prodFullMult)
  }
  const milestoneProgress = tier.purchased % 10
  const nextMilestone = (Math.floor(tier.purchased / 10) + 1) * 10

  const abKey = `tier_${tierId}`
  const ab = autobuyers[abKey]
  const hasAutobuyer = ab?.unlocked ?? false
  const isAutoOn = ab?.enabled ?? false

  const handleBuy = () => {
    if (buyAmount === 'max') {
      buyMaxTier(tierId)
    } else {
      buyTier(tierId, displayAmount)
    }
    playBuySound(tierId)
  }

  return (
    <div className="animate-fade-in bg-bg-secondary rounded-lg border border-border hover:border-border-light transition-colors duration-200">
      <div className="flex items-center gap-3 p-3">
        <span className="text-xl w-7 text-center shrink-0">{config.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{config.name}</h3>
            <span className="text-[10px] text-text-muted">{'\u{2192}'} {config.produces}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-accent-gold font-medium">
              x{formatNumber(getMilestoneMultiplier(tier.purchased), 0)}
            </span>
            <ProgressBar
              current={new Decimal(milestoneProgress)}
              target={new Decimal(10)}
              className="flex-1 max-w-24"
            />
            <span className="text-[10px] text-text-muted">
              {tier.purchased}/{nextMilestone}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0 min-w-20">
          <div className="text-base font-bold text-text-primary">
            <SmoothNumber value={tier.quantity} rate={quantityRate} />
          </div>
          {productionPerSec.gt(0) && (
            <div className="text-[10px] text-success">
              +{formatNumber(productionPerSec)}/s
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasAutobuyer && (
            <button
              onClick={() => toggleAutobuyer(abKey)}
              className={`
                py-1.5 px-2 rounded text-[10px] font-medium transition-all duration-150 border
                ${isAutoOn
                  ? 'bg-success/20 text-success border-success/30'
                  : 'bg-bg-tertiary text-text-muted border-border hover:text-text-secondary'
                }
              `}
            >
              {isAutoOn ? 'ON' : 'Auto'}
            </button>
          )}
          <button
            onClick={handleBuy}
            disabled={!canAffordBatch}
            className={`
              py-1.5 px-3 rounded text-xs font-medium transition-all duration-150 min-w-[80px]
              ${canAffordBatch
                ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30 hover:bg-accent-gold/30 active:scale-[0.98]'
                : 'bg-bg-tertiary text-text-muted border border-border cursor-not-allowed'
              }
            `}
          >
            <div>{buyAmount === 'max' || buyAmount === 10 ? `Buy ${displayAmount}` : `Buy x${displayAmount}`}</div>
            <div className="text-[10px] opacity-75">{formatCost(displayCost)} SW</div>
          </button>
        </div>
      </div>
    </div>
  )
}
