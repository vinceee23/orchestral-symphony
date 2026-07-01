import { useState, useEffect, useRef } from 'react'
import Decimal from 'break_infinity.js'
import { useGameStore } from '../../store/gameStore'
import { TIER_CONFIGS } from '../../core/constants'
import {
  getTierProductionPerSec, getTierBatchCost, getMaxBuyable,
} from '../../core/formulas'
import { getAchievementTierMultiplier } from '../../core/achievements'
import { formatNumber, formatCost } from '../../core/format'
import { useUiStore } from '../../store/uiStore'
import { getProductionMultiplier } from '../../core/multiplierRegistry'
import { SmoothNumber } from '../shared/SmoothNumber'

// Cache processed (background-keyed) emblem data URLs so we only do canvas work once per emblem.
const emblemCache = new Map<string, string | null>() // name -> dataURL, or null = no art (use glyph)

/** A tier's gilded emblem. Keys out the near-black JPEG background to true transparency via canvas,
 *  then renders the gold cutout. Falls back to the unicode glyph if the art isn't generated yet. */
function EmblemIcon({ name, glyph, glow }: { name: string; glyph: string; glow: number }) {
  const [src, setSrc] = useState<string | null | undefined>(emblemCache.get(name))

  useEffect(() => {
    if (emblemCache.has(name)) { setSrc(emblemCache.get(name)); return }
    let cancelled = false
    const img = new Image()
    img.src = `${import.meta.env.BASE_URL}emblems/${name}.jpg`
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth; c.height = img.naturalHeight
        const ctx = c.getContext('2d')
        if (!ctx) throw new Error('no ctx')
        ctx.drawImage(img, 0, 0)
        const im = ctx.getImageData(0, 0, c.width, c.height)
        const d = im.data
        for (let i = 0; i < d.length; i += 4) {
          const lum = (d[i] + d[i + 1] + d[i + 2]) / 3
          if (lum < 28 || lum > 240) d[i + 3] = 0                              // black bg OR white frame -> transparent
          else if (lum < 85) d[i + 3] = Math.round(((lum - 28) / 57) * 255)    // feather dark edge
          else if (lum > 205) d[i + 3] = Math.round(((240 - lum) / 35) * 255)  // feather light edge
        }
        ctx.putImageData(im, 0, 0)
        const url = c.toDataURL('image/png')
        emblemCache.set(name, url)
        if (!cancelled) setSrc(url)
      } catch {
        emblemCache.set(name, null)
        if (!cancelled) setSrc(null)
      }
    }
    img.onerror = () => { emblemCache.set(name, null); if (!cancelled) setSrc(null) }
    return () => { cancelled = true }
  }, [name])

  const filter = `drop-shadow(0 0 ${6 + glow * 18}px rgba(212,168,67,${0.3 + glow * 0.6}))`
  const opacity = 0.55 + glow * 0.45

  if (src) {
    return <img src={src} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" style={{ filter, opacity }} />
  }
  // no art yet (still generating) or load failed -> glyph
  return <span className="text-4xl sm:text-5xl leading-none" style={{ filter, opacity }}>{glyph}</span>
}

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
  const opusUpgrades = useGameStore((s) => s.opusUpgrades)
  const crescendo = useGameStore((s) => s.crescendo)
  const recordsSold = useGameStore((s) => s.recordsSold)
  const platinum = useGameStore((s) => s.platinum)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const worldTourUnlocked = useGameStore((s) => s.worldTourUnlocked)
  const signatureAllocation = useGameStore((s) => s.signatureAllocation)
  const signatureCount = useGameStore((s) => s.signatureCount)
  const lifetimeAcclaim = useGameStore((s) => s.lifetimeAcclaim)
  const completedChallenges = useGameStore((s) => s.completedChallenges)
  const challengeBestTimes = useGameStore((s) => s.challengeBestTimes)
  const keepChallenges = useGameStore((s) => s.keepChallenges)
  const activeChallenge = useGameStore((s) => s.activeChallenge)
  const warmUpLevel = useGameStore((s) => s.warmUpLevel)
  const buyTier = useGameStore((s) => s.buyTier)
  const buyMaxTier = useGameStore((s) => s.buyMaxTier)
  const registerBuy = useUiStore((s) => s.registerBuy)
  const lastBuy = useUiStore((s) => s.lastBuy)

  const [burst, setBurst] = useState<number | null>(null)
  const [pop, setPop] = useState<{ id: number; n: number; seq: number } | null>(null)
  // §11 gold wave: while conducting (crescendo up), a brightness pulse rolls across the sections
  // (staggered per-section animation-delay). Disabled while a section is bursting from a buy.
  const waving = crescendo > 0.1

  // Resonate: when a section first unlocks, fire an expanding ring of light.
  const [resonating, setResonating] = useState<Set<number>>(() => new Set())
  const prevUnlocked = useRef<boolean[]>([])
  const unlockKey = tiers.map((t) => (t.unlocked ? 1 : 0)).join('')
  useEffect(() => {
    const newly = tiers.filter((t, i) => t.unlocked && prevUnlocked.current[i] === false).map((t) => t.id)
    prevUnlocked.current = tiers.map((t) => t.unlocked)
    if (newly.length === 0) return
    setResonating((prev) => new Set([...prev, ...newly]))
    const t = setTimeout(() => setResonating((prev) => {
      const n = new Set(prev); newly.forEach((id) => n.delete(id)); return n
    }), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockKey])

  // Buy juice for BOTH pointer + keyboard: flash the section + float a +N pop on every registered buy.
  useEffect(() => {
    if (!lastBuy) return
    const { tierId, amount, seq } = lastBuy
    setBurst(tierId)
    if (amount !== undefined) setPop({ id: tierId, n: amount, seq })
    const t = setTimeout(() => setBurst((b) => (b === tierId ? null : b)), 380)
    return () => clearTimeout(t)
  }, [lastBuy])

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

  return (
    <div className="w-full overflow-x-auto">
      {/* generous padding so the buy-pop (rises ~22px), unlock/milestone rings (scale to 1.9x) and the
          arc translateY never overflow this scroll box — otherwise overflow-x:auto forces a transient
          overflow-y scrollbar on every buy. */}
      <div className="flex items-end justify-center gap-3 sm:gap-5 min-w-max px-8 pt-12 pb-24">
        {TIER_CONFIGS.map((config, i) => {
          const tier = tiers[i]
          const arc = Math.pow((i - 3) / 3, 2) * 50 // parabola: center sits highest (stage curve)
          if (!tier?.unlocked) {
            // The immediate next tier to unlock (its predecessor is already unlocked) gets teased with a
            // dim silhouette + how-to-unlock hint + a soft "ready" breathe. Deeper tiers stay a mystery.
            const isNext = i > 0 && tiers[i - 1]?.unlocked
            return (
              <div
                key={config.id}
                className={`relative flex flex-col items-center justify-center w-[112px] sm:w-[140px] h-[164px] rounded-2xl border bg-bg-secondary/30 ${
                  isNext ? 'border-accent-gold/25' : 'border-border/40'
                }`}
                style={{ transform: `translateY(${arc}px)` }}
                title={isNext
                  ? `${config.name} — unlocks by owning 1 ${TIER_CONFIGS[i - 1].name}`
                  : 'Locked — grow the earlier sections to reveal this one'}
              >
                {isNext ? (
                  <>
                    <span
                      className="animate-pod-breathe pointer-events-none absolute inset-0 rounded-2xl"
                      style={{ background: 'radial-gradient(60% 60% at 50% 45%, rgba(212,168,67,0.16), transparent 75%)' }}
                    />
                    <span className="opacity-40 grayscale">
                      <EmblemIcon name={config.name.toLowerCase()} glyph={config.icon} glow={0.15} />
                    </span>
                    <span className="mt-1.5 text-[11px] font-display font-semibold text-text-muted/70 tracking-wide">
                      {config.name}
                    </span>
                    <span className="mt-1 px-1 text-center text-[9px] leading-tight text-accent-gold/60">
                      Unlocks by owning 1 {TIER_CONFIGS[i - 1].name}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl opacity-20">{'\u{1F512}'}</span>
                    <span className="mt-1 text-xs text-text-muted/60 font-display">???</span>
                  </>
                )}
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
          // This section's count grows from the tier ABOVE it — that's its live fill rate.
          const producer = tiers[i + 1]
          const fillRate = producer?.unlocked
            ? getTierProductionPerSec(producer, TIER_CONFIGS[i + 1], globalMult.times(getAchievementTierMultiplier(achievementSet, config.id + 1)))
            : new Decimal(0)
          const owned = Math.min(1, tier.purchased / 40) // faint base tint from ownership
          const lit = canAfford // light up ONLY when it can be upgraded — clarity on what's ready
          const milestone = tier.purchased % 10 // progress toward next x2
          const nextMilestoneAt = Math.floor(tier.purchased / 10 + 1) * 10
          const hitMilestone = burst === config.id && tier.purchased > 0 && milestone === 0

          const onBuy = () => {
            if (!canAfford) return
            if (buyAmount === 'max') buyMaxTier(config.id)
            else buyTier(config.id, amount)
            registerBuy(config.id, buyAmount === 'max' ? undefined : amount)
          }

          return (
            <button
              key={config.id}
              onClick={onBuy}
              disabled={!canAfford}
              title={`${config.name} — produces ${config.produces}\nRate: ${formatNumber(rate)}/s\n${amount} for ${formatCost(cost)}\nNext x2 at ${nextMilestoneAt}`}
              aria-label={`${config.name}, ${formatNumber(rate)} per second. Buy ${amount} for ${formatCost(cost)} soundwaves.${canAfford ? '' : ' Not enough soundwaves.'}`}
              className={`group relative flex flex-col items-center w-[112px] sm:w-[140px] rounded-2xl border px-3 py-4 transition-all duration-150 ${
                burst === config.id ? 'animate-section-buy' : (waving ? 'animate-section-wave' : '')
              } ${
                lit
                  ? 'border-accent-gold/70 hover:border-accent-gold cursor-pointer'
                  : 'border-border/30 cursor-not-allowed'
              }`}
              style={{
                transform: `translateY(${arc}px)`,
                animationDelay: waving && burst !== config.id ? `${i * 0.12}s` : undefined,
                background: `linear-gradient(180deg, rgba(212,168,67,${0.03 + (lit ? 0.13 : 0) + owned * 0.05}), rgba(18,18,26,0.6))`,
                boxShadow: lit
                  ? '0 0 24px 3px rgba(212,168,67,0.4), inset 0 0 16px rgba(212,168,67,0.15)'
                  : (owned > 0 ? `inset 0 0 ${owned * 10}px rgba(212,168,67,0.1)` : 'none'),
              }}
            >
              {/* §11 liveliness: a producing section gently breathes a warm glow (looks like it's playing) */}
              {tier.quantity.gt(0) && (
                <span
                  className="animate-pod-breathe pointer-events-none absolute inset-0 rounded-2xl"
                  style={{
                    background: 'radial-gradient(60% 60% at 50% 45%, rgba(212,168,67,0.5), transparent 75%)',
                    animationDuration: `${2 + (i % 3) * 0.5}s`,
                  }}
                />
              )}
              {resonating.has(config.id) && (
                <span className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-accent-gold animate-resonate-ring" />
              )}
              {hitMilestone && (
                <span className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-accent-gold animate-resonate-ring" />
              )}
              {pop?.id === config.id && (
                <span
                  key={pop.seq}
                  className="buy-pop pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-sm font-bold text-accent-gold tabular-nums drop-shadow-[0_0_6px_rgba(212,168,67,0.7)]"
                >
                  {hitMilestone ? 'x2!' : `+${formatNumber(pop.n)}`}
                </span>
              )}
              <EmblemIcon name={config.name.toLowerCase()} glyph={config.icon} glow={lit ? 0.85 : 0.2 + owned * 0.25} />
              <span className="mt-1.5 text-[11px] font-display font-semibold text-accent-gold tracking-wide">
                {config.name}
              </span>
              <SmoothNumber
                value={tier.quantity}
                rate={fillRate}
                precision={0}
                className="text-[15px] font-bold text-text-primary tabular-nums"
              />
              {/* milestone-to-next-x2 micro bar */}
              <div className="mt-1 h-[3px] w-full rounded-full bg-bg-primary/70 overflow-hidden">
                <div className="h-full rounded-full bg-accent-gold/60" style={{ width: `${milestone * 10}%` }} />
              </div>
              <span className={`mt-1 text-[10px] font-semibold tabular-nums ${milestone >= 7 ? 'text-accent-gold' : 'text-text-muted'}`}>
                next x2 at {nextMilestoneAt}
              </span>
              <span className={`mt-1 text-[10px] tabular-nums ${canAfford ? 'text-accent-gold' : 'text-text-muted'}`}>
                {formatCost(cost)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
