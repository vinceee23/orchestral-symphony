import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { formatNumber } from '../../core/format'
import { getEncoreCost, getMagnumOpusCost, ENCORE_WALL_COUNT } from '../../core/constants'
import { getEncoreMultiplier, getEncoreGain } from '../../core/formulas'
import { getOpusGain } from '../../core/records'
import { ENCORE_UPGRADES, getEncoreUpgradeCost, getOvertureGainMultiplier } from '../../core/encoreUpgrades'
import { hasPerk, ENCORE_UPGRADE_DISCOUNT } from '../../core/perks'
import { playPrestigeSound, playBuySound } from '../../core/audio'
import { getChallengeById, getActiveChallengeModifiers } from '../../core/challenges'
import { PrestigeDialog, type PrestigeKind } from './PrestigeDialog'
import { useUiStore } from '../../store/uiStore'
import { Button } from '../shared/Button'

const LADDER = [
  { name: 'Encore', icon: '\u{266A}' },
  { name: 'Magnum Opus', icon: '\u{1F3BC}' },
  { name: 'Repertoire', icon: '\u{1F3AD}' },
  { name: 'Genre', icon: '\u{1F3A8}' },
  { name: 'Virtuoso', icon: '\u{1F3C6}' },
  { name: 'Canon', icon: '\u{1F4DC}' },
]

export function PrestigePage() {
  const tiers = useGameStore((s) => s.tiers)
  const peakSoundwaves = useGameStore((s) => s.peakSoundwaves)
  const encorePoints = useGameStore((s) => s.encorePoints)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const encoreCount = useGameStore((s) => s.encoreCount)
  const encoreUpgrades = useGameStore((s) => s.encoreUpgrades)
  const achievements = useGameStore((s) => s.achievements)
  const layer1WallReached = useGameStore((s) => s.layer1WallReached)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const opusCount = useGameStore((s) => s.opusCount)
  const opusUpgrades = useGameStore((s) => s.opusUpgrades)
  const peakCrescendoMult = useGameStore((s) => s.peakCrescendoMult)
  const platinum = useGameStore((s) => s.platinum)
  const performEncore = useGameStore((s) => s.performEncore)
  const performMagnumOpus = useGameStore((s) => s.performMagnumOpus)
  const buyEncoreUpgrade = useGameStore((s) => s.buyEncoreUpgrade)
  const activeChallenge = useGameStore((s) => s.activeChallenge)
  const celebrateEncore = useUiStore((s) => s.celebrateEncore)

  const [pending, setPending] = useState<PrestigeKind | null>(null)

  const activeCh = activeChallenge ? getChallengeById(activeChallenge.challengeId) ?? null : null
  const prestigeBlocked = getActiveChallengeModifiers(activeCh).noPrestige

  const encoreCost = getEncoreCost(encoreCount)
  const encorePurchased = tiers[encoreCost.tierIndex]?.purchased ?? 0
  const canEncore = !prestigeBlocked && encorePurchased >= encoreCost.amount
  const encoreProgress = Math.min(100, (encorePurchased / encoreCost.amount) * 100)

  const moCost = getMagnumOpusCost(opusCount)
  const moPurchased = tiers[moCost.tierIndex]?.purchased ?? 0
  const canMO = !prestigeBlocked && layer1WallReached && moPurchased >= moCost.amount
  const wallProgress = Math.min(100, (encoreCount / ENCORE_WALL_COUNT) * 100)

  const overtureMult = getOvertureGainMultiplier(encoreUpgrades)
  const projectedGain = Math.floor(getEncoreGain(peakSoundwaves) * overtureMult)
  const currentEncoreMult = getEncoreMultiplier(lifetimeEncorePoints)
  const nextEncoreMult = getEncoreMultiplier(lifetimeEncorePoints + projectedGain)
  const projectedOpGain = getOpusGain({
    platinum,
    opGainFlatLevel: opusUpgrades['op-gain-flat'] ?? 0,
    opusCount,
    peakCrescendoMult,
    levels: opusUpgrades,
  })

  const run = (kind: PrestigeKind) => {
    if (kind === 'encore') {
      celebrateEncore(currentEncoreMult.toNumber(), nextEncoreMult.toNumber())
      performEncore()
    }
    else if (kind === 'mo') performMagnumOpus()
    playPrestigeSound()
    setPending(null)
  }
  const tryPrestige = (kind: PrestigeKind) => {
    if (localStorage.getItem(`prestige_skip_${kind}`)) run(kind)
    else setPending(kind)
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-accent-gold tracking-wide">Prestige</h1>
        <p className="text-sm text-text-muted mt-2">Reset what you've built to rise on a higher arc.</p>
      </header>

      {/* Prestige ladder */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {LADDER.map((l, i) => {
          const unlocked = i === 0 || (i === 1 && layer1WallReached)
          return (
            <div key={l.name} className="flex items-center gap-2">
              <div
                className={`flex flex-col items-center px-3 py-2 rounded-xl border text-center ${
                  unlocked ? 'border-accent-gold/40 bg-accent-gold/10' : 'border-border bg-bg-secondary/40 opacity-50'
                }`}
                title={unlocked ? l.name : 'A future layer — keep playing to reveal it'}
              >
                <span className="text-base">{unlocked ? l.icon : '\u{1F512}'}</span>
                <span className="text-xs text-text-muted mt-1">{unlocked ? l.name : '???'}</span>
              </div>
              {i < LADDER.length - 1 && <span className="text-text-muted/40 text-xs">{'→'}</span>}
            </div>
          )
        })}
      </div>

      {/* Encore — Layer 1 */}
      <section className="rounded-xl border border-accent-gold/30 bg-bg-secondary/40 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-accent-gold">Encore</h2>
            <p className="text-xs text-text-muted mt-1">Layer 1 · the performance, replayed</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-display font-bold text-accent-gold tabular-nums">x{formatNumber(currentEncoreMult, 2)}</div>
            <div className="text-xs text-text-muted tabular-nums">production from {lifetimeEncorePoints} total Applause</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-bg-primary/50 p-4">
            <div className="text-xs text-text-muted uppercase tracking-wider">Spendable Applause</div>
            <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">{encorePoints}</div>
          </div>
          <div className="rounded-xl border border-border bg-bg-primary/50 p-4">
            <div className="text-xs text-text-muted uppercase tracking-wider">Next Encore grants</div>
            <div className="text-lg font-display font-semibold text-success tabular-nums mt-1">+{projectedGain} Applause</div>
          </div>
        </div>

        {!canEncore ? (
          <div>
            <div className="text-sm text-text-muted mb-2 tabular-nums">
              {encorePurchased}/{encoreCost.amount} {encoreCost.tierName} to perform an Encore
            </div>
            <div className="h-2 rounded-full bg-bg-primary overflow-hidden">
              <div className="h-full rounded-full bg-accent-gold/50 transition-all" style={{ width: `${encoreProgress}%` }} />
            </div>
          </div>
        ) : (
          <Button
            onClick={() => tryPrestige('encore')}
            variant="gold"
            size="lg"
            display
            className="w-full"
          >
            Perform Encore  ·  x{formatNumber(currentEncoreMult, 2)} {'→'} x{formatNumber(nextEncoreMult, 2)}
          </Button>
        )}
        {encoreCount === 0 && (
          <p className="text-xs text-text-muted text-center">Your first Encore unlocks Movements — Symphonies arrive a few Encores later.</p>
        )}
      </section>

      {/* Encore Upgrades */}
      {encoreCount > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-accent-gold uppercase tracking-wider">Encore Upgrades</h3>
            <span className="text-xs text-text-muted tabular-nums">{encorePoints} Applause to spend</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ENCORE_UPGRADES.map((u) => {
              const level = encoreUpgrades[u.id] ?? 0
              const maxed = level >= u.maxLevel
              const encDiscount = hasPerk(new Set(achievements), 'perk-encore-discount') ? ENCORE_UPGRADE_DISCOUNT : 0
              const cost = getEncoreUpgradeCost(u, level, encDiscount)
              const affordable = encorePoints >= cost
              const buy = () => { if (!maxed && affordable) { buyEncoreUpgrade(u.id); playBuySound(7) } }
              return (
                <Button
                  key={u.id}
                  onClick={buy}
                  disabled={maxed || !affordable}
                  variant={maxed ? 'ghost' : affordable ? 'gold' : 'ghost'}
                  size="md"
                  className="w-full !flex !flex-col !items-stretch !justify-start text-left gap-1.5"
                >
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span className="text-sm font-semibold text-text-primary">{u.name}</span>
                    <span className="text-xs text-text-muted tabular-nums shrink-0">Lv {level}/{u.maxLevel}</span>
                  </div>
                  <div className="text-sm text-text-muted leading-relaxed">{u.description}</div>
                  <div className={`text-xs font-medium tabular-nums ${maxed || !affordable ? 'text-text-muted' : 'text-accent-gold'}`}>
                    {maxed ? 'MAX' : `${cost} Applause`}
                  </div>
                </Button>
              )
            })}
          </div>
        </section>
      )}

      {/* Magnum Opus — Layer 2 */}
      <section className={`rounded-xl border p-5 space-y-4 ${layer1WallReached ? 'border-accent-purple/40 bg-bg-secondary/40' : 'border-border bg-bg-secondary/40'}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={`text-lg font-display font-semibold ${layer1WallReached ? 'text-accent-purple' : 'text-text-muted'}`}>
            {layer1WallReached ? 'Magnum Opus' : '\u{1F512} ???'}
          </h2>
          <span className="text-xs text-text-muted">{layer1WallReached ? 'Layer 2 · record the album' : 'Layer 2 · ???'}</span>
        </div>

        {!layer1WallReached ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary leading-relaxed">
              Perform <span className="text-text-primary">{ENCORE_WALL_COUNT} Encores</span> to master the stage — then a new path will reveal itself.
            </p>
            <div className="text-sm text-text-muted tabular-nums">{encoreCount}/{ENCORE_WALL_COUNT} Encores</div>
            <div className="h-2 rounded-full bg-bg-primary overflow-hidden">
              <div className="h-full rounded-full bg-text-muted/40 transition-all" style={{ width: `${wallProgress}%` }} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {opusCount === 0 && (
              <p className="text-sm text-text-secondary leading-relaxed">
                You've mastered the stage. A performance fades by morning — to make your music <em>endure</em>, record it.
              </p>
            )}
            <div className="text-right text-sm text-text-muted tabular-nums">
              {opusCount > 0 ? `${opusPoints} OP · Next MO +${projectedOpGain} OP` : `Next MO +${projectedOpGain} OP`}
            </div>
            <Button
              onClick={() => canMO && tryPrestige('mo')}
              disabled={!canMO}
              variant="purple"
              size="lg"
              display
              className="w-full"
            >
              {canMO ? 'Perform Magnum Opus' : `${moPurchased}/${moCost.amount} ${moCost.tierName}`}
            </Button>
          </div>
        )}
      </section>

      {pending && <PrestigeDialog type={pending} onConfirm={() => run(pending)} onCancel={() => setPending(null)} />}
    </div>
  )
}
