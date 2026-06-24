import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { TIER_CONFIGS } from '../../core/constants'
import {
  getTierProductionPerSec, getTierBatchCost, getMaxBuyable, getCoreProductionMultiplier,
} from '../../core/formulas'
import { getAchievementGlobalMultiplier, getAchievementTierMultiplier } from '../../core/achievements'
import { formatNumber, formatCost } from '../../core/format'
import { playBuySound } from '../../core/audio'

/**
 * The Stage — the 7 tiers as glowing orchestra sections arranged on a spotlit arc.
 * Each section brightens as you own more of it; click to buy at the current buy-amount.
 * Replaces the old vertical TierPanel grid.
 */
export function OrchestraStage() {
  const tiers = useGameStore((s) => s.tiers)
  const soundwaves = useGameStore((s) => s.soundwaves)
  const buyAmount = useGameStore((s) => s.buyAmount)
  const achievements = useGameStore((s) => s.achievements)
  const tempo = useGameStore((s) => s.tempo)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const encoreUpgrades = useGameStore((s) => s.encoreUpgrades)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const buyTier = useGameStore((s) => s.buyTier)
  const buyMaxTier = useGameStore((s) => s.buyMaxTier)

  const [burst, setBurst] = useState<number | null>(null)

  const achievementSet = new Set(achievements)
  const globalMult = getAchievementGlobalMultiplier(achievementSet).times(getCoreProductionMultiplier({
    lifetimeEncorePoints, finalePoints, opusPoints, encoreUpgrades, tempoLevel: tempo.level, tiers,
  }))

  return (
    <div
      className="relative rounded-2xl border border-border/60 overflow-hidden px-3 py-6 sm:px-6 sm:py-8"
      style={{
        background:
          'radial-gradient(120% 80% at 50% -10%, rgba(212,168,67,0.16), transparent 55%),' +
          'radial-gradient(80% 50% at 50% 115%, rgba(124,58,237,0.10), transparent 60%),' +
          'linear-gradient(180deg, #0c0c14 0%, #08080d 100%)',
      }}
    >
      {/* spotlight wash */}
      <div
        className="pointer-events-none absolute inset-0 animate-spotlight"
        style={{ background: 'radial-gradient(60% 45% at 50% 0%, rgba(212,168,67,0.14), transparent 70%)' }}
      />
      {/* stage floor */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{ background: 'radial-gradient(80% 100% at 50% 100%, rgba(212,168,67,0.10), transparent 70%)' }}
      />

      <div className="relative flex justify-center items-end gap-2 sm:gap-4 flex-wrap">
        {TIER_CONFIGS.map((config, i) => {
          const tier = tiers[i]
          const arc = Math.pow((i - 3) / 3, 2) * 34 // parabola: center sits highest (stage curve)
          if (!tier?.unlocked) {
            return (
              <div
                key={config.id}
                className="flex flex-col items-center justify-center w-[88px] sm:w-[104px] h-[120px] rounded-xl border border-border/40 bg-bg-secondary/30"
                style={{ transform: `translateY(${arc}px)` }}
                title="Locked — buy the tier before it to reveal this section"
              >
                <span className="text-2xl opacity-20">{'\u{1F512}'}</span>
                <span className="mt-1 text-[10px] text-text-muted/60 font-display">???</span>
              </div>
            )
          }

          // cost at current buy-amount (mirrors TierRow semantics)
          let amount: number
          if (buyAmount === 'max') {
            amount = getMaxBuyable(config, tier.purchased, soundwaves)
          } else if (buyAmount === 10) {
            const r = tier.purchased % 10
            amount = r === 0 ? 10 : 10 - r
          } else {
            amount = buyAmount
          }
          const cost = getTierBatchCost(config, tier.purchased, Math.max(1, amount))
          const canAfford = soundwaves.gte(cost) && amount > 0
          const tierAch = getAchievementTierMultiplier(achievementSet, config.id)
          const rate = getTierProductionPerSec(tier, config, globalMult.times(tierAch))
          const glow = Math.min(1, tier.purchased / 40) // 0..1 — brighter the more you own
          const milestone = tier.purchased % 10 // progress toward next x2

          const onBuy = () => {
            if (!canAfford) return
            if (buyAmount === 'max') buyMaxTier(config.id)
            else buyTier(config.id, amount)
            playBuySound(config.id)
            setBurst(config.id)
            setTimeout(() => setBurst((b) => (b === config.id ? null : b)), 380)
          }

          return (
            <button
              key={config.id}
              onClick={onBuy}
              disabled={!canAfford}
              title={`${config.name} — produces ${config.produces}\nRate: ${formatNumber(rate)}/s\n${amount} for ${formatCost(cost)}\n${milestone}/10 to next x2`}
              className={`group relative flex flex-col items-center w-[88px] sm:w-[104px] rounded-xl border px-2 py-3 transition-all duration-150 ${
                burst === config.id ? 'animate-section-buy' : ''
              } ${
                canAfford
                  ? 'border-accent-gold/40 hover:border-accent-gold cursor-pointer'
                  : 'border-border/50 cursor-not-allowed'
              }`}
              style={{
                transform: `translateY(${arc}px)`,
                background: `linear-gradient(180deg, rgba(212,168,67,${0.05 + glow * 0.12}), rgba(18,18,26,0.6))`,
                boxShadow: glow > 0
                  ? `0 0 ${8 + glow * 34}px ${glow * 6}px rgba(212,168,67,${0.12 + glow * 0.42}), inset 0 0 ${glow * 18}px rgba(212,168,67,${glow * 0.18})`
                  : 'none',
              }}
            >
              <span
                className="text-3xl sm:text-4xl leading-none"
                style={{
                  filter: `drop-shadow(0 0 ${4 + glow * 14}px rgba(212,168,67,${0.3 + glow * 0.6}))`,
                  opacity: 0.55 + glow * 0.45,
                }}
              >
                {config.icon}
              </span>
              <span className="mt-1.5 text-[11px] font-display font-semibold text-accent-gold tracking-wide">
                {config.name}
              </span>
              <span className="text-[13px] font-bold text-text-primary tabular-nums">
                {formatNumber(tier.quantity, 0)}
              </span>
              {/* milestone-to-next-x2 micro bar */}
              <div className="mt-1 h-[3px] w-full rounded-full bg-bg-primary/70 overflow-hidden">
                <div className="h-full rounded-full bg-accent-gold/60" style={{ width: `${milestone * 10}%` }} />
              </div>
              <span className={`mt-1 text-[10px] tabular-nums ${canAfford ? 'text-accent-gold' : 'text-text-muted'}`}>
                {formatCost(cost)}
              </span>
            </button>
          )
        })}
      </div>

      <p className="relative mt-5 text-center text-[10px] text-text-muted/70 tracking-wide">
        Tap a section to bring it in · brighter sections are richer · every 10th doubles its voice
      </p>
    </div>
  )
}
