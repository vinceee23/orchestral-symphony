import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { formatNumber } from '../../core/format'
import { getEncoreCost, getMagnumOpusCost, ENCORE_WALL_COUNT } from '../../core/constants'
import { getEncoreMultiplier, getOpusBPMMultiplier, getEncoreGain } from '../../core/formulas'
import { ENCORE_UPGRADES, getEncoreUpgradeCost, getOvertureGainMultiplier } from '../../core/encoreUpgrades'
import { playPrestigeSound, playBuySound } from '../../core/audio'
import { getChallengeById, getActiveChallengeModifiers } from '../../core/challenges'
import { PrestigeDialog, type PrestigeKind } from './PrestigeDialog'

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
  const layer1WallReached = useGameStore((s) => s.layer1WallReached)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const opusCount = useGameStore((s) => s.opusCount)
  const performEncore = useGameStore((s) => s.performEncore)
  const performMagnumOpus = useGameStore((s) => s.performMagnumOpus)
  const buyEncoreUpgrade = useGameStore((s) => s.buyEncoreUpgrade)
  const activeChallenge = useGameStore((s) => s.activeChallenge)

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
  const currentOpusMult = getOpusBPMMultiplier(opusPoints)

  const run = (kind: PrestigeKind) => {
    if (kind === 'encore') performEncore()
    else if (kind === 'mo') performMagnumOpus()
    playPrestigeSound()
    setPending(null)
  }
  const tryPrestige = (kind: PrestigeKind) => {
    if (localStorage.getItem(`prestige_skip_${kind}`)) run(kind)
    else setPending(kind)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-accent-gold tracking-wide">Prestige</h1>
        <p className="text-sm text-text-muted mt-1">Reset what you've built to rise on a higher arc.</p>
      </header>

      {/* Prestige ladder */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {LADDER.map((l, i) => {
          const unlocked = i === 0 || (i === 1 && layer1WallReached)
          return (
            <div key={l.name} className="flex items-center gap-1.5">
              <div
                className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border text-center ${
                  unlocked ? 'border-accent-gold/40 bg-accent-gold/10' : 'border-border/40 bg-bg-secondary/30 opacity-50'
                }`}
                title={unlocked ? l.name : 'A future layer — keep playing to reveal it'}
              >
                <span className="text-base">{unlocked ? l.icon : '\u{1F512}'}</span>
                <span className="text-[9px] text-text-muted mt-0.5">{unlocked ? l.name : '???'}</span>
              </div>
              {i < LADDER.length - 1 && <span className="text-text-muted/40 text-xs">{'→'}</span>}
            </div>
          )
        })}
      </div>

      {/* Encore — Layer 1 */}
      <section className="rounded-2xl border border-accent-gold/30 bg-gradient-to-b from-accent-gold/10 to-transparent p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-display font-semibold text-accent-gold">Encore</h2>
            <p className="text-xs text-text-muted mt-0.5">Layer 1 · the performance, replayed</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent-gold tabular-nums">x{formatNumber(currentEncoreMult, 2)}</div>
            <div className="text-[10px] text-text-muted">production from {lifetimeEncorePoints} total Applause</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-bg-secondary/50 p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Spendable Applause</div>
            <div className="text-lg font-semibold text-text-primary">{encorePoints}</div>
          </div>
          <div className="rounded-lg bg-bg-secondary/50 p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Next Encore grants</div>
            <div className="text-lg font-semibold text-success">+{projectedGain} Applause</div>
          </div>
        </div>

        {!canEncore ? (
          <div className="mt-4">
            <div className="text-xs text-text-muted mb-1">
              {encorePurchased}/{encoreCost.amount} {encoreCost.tierName} to perform an Encore
            </div>
            <div className="h-2 rounded-full bg-bg-primary overflow-hidden">
              <div className="h-full rounded-full bg-accent-gold/50 transition-all" style={{ width: `${encoreProgress}%` }} />
            </div>
          </div>
        ) : (
          <button
            onClick={() => tryPrestige('encore')}
            className="mt-4 w-full py-3 rounded-xl border border-accent-gold/50 bg-accent-gold/15 text-accent-gold font-display font-semibold text-lg hover:bg-accent-gold/25 hover:brightness-110 transition-all"
          >
            Perform Encore  ·  x{formatNumber(currentEncoreMult, 2)} {'→'} x{formatNumber(nextEncoreMult, 2)}
          </button>
        )}
        {encoreCount === 0 && (
          <p className="text-[11px] text-text-muted mt-2 text-center">Your first Encore unlocks Movements & Symphonies.</p>
        )}
      </section>

      {/* Encore Upgrades */}
      {encoreCount > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-display font-semibold text-accent-gold uppercase tracking-wider">Encore Upgrades</h3>
            <span className="text-xs text-text-muted">{encorePoints} Applause to spend</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ENCORE_UPGRADES.map((u) => {
              const level = encoreUpgrades[u.id] ?? 0
              const maxed = level >= u.maxLevel
              const cost = getEncoreUpgradeCost(u, level)
              const affordable = encorePoints >= cost
              const buy = () => { if (!maxed && affordable) { buyEncoreUpgrade(u.id); playBuySound(7) } }
              return (
                <button
                  key={u.id}
                  onClick={buy}
                  disabled={maxed || !affordable}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    maxed ? 'bg-bg-secondary/40 border-border/40 opacity-60 cursor-default'
                      : affordable ? 'bg-accent-gold/10 border-accent-gold/30 hover:bg-accent-gold/20 cursor-pointer'
                        : 'bg-bg-secondary/50 border-border/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-primary">{u.name}</span>
                    <span className="text-[10px] text-text-muted">Lv {level}/{u.maxLevel}</span>
                  </div>
                  <div className="text-[11px] text-text-muted mt-1 leading-snug">{u.description}</div>
                  <div className={`text-xs mt-2 font-medium ${maxed || !affordable ? 'text-text-muted' : 'text-accent-gold'}`}>
                    {maxed ? 'MAX' : `${cost} Applause`}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Magnum Opus — Layer 2 */}
      <section className={`rounded-2xl border p-5 ${layer1WallReached ? 'border-accent-purple/40 bg-gradient-to-b from-accent-purple/10 to-transparent' : 'border-border/50 bg-bg-secondary/30'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-display font-semibold ${layer1WallReached ? 'text-accent-purple' : 'text-text-muted'}`}>
            {layer1WallReached ? 'Magnum Opus' : '\u{1F512} ???'}
          </h2>
          <span className="text-[10px] text-text-muted">{layer1WallReached ? 'Layer 2 · record the album' : 'Layer 2 · ???'}</span>
        </div>

        {!layer1WallReached ? (
          <div className="mt-3">
            <p className="text-sm text-text-secondary leading-relaxed">
              Perform <span className="text-text-primary">{ENCORE_WALL_COUNT} Encores</span> to master the stage — then a new path will reveal itself.
            </p>
            <div className="mt-2 text-xs text-text-muted">{encoreCount}/{ENCORE_WALL_COUNT} Encores</div>
            <div className="mt-1 h-2 rounded-full bg-bg-primary overflow-hidden">
              <div className="h-full rounded-full bg-text-muted/40 transition-all" style={{ width: `${wallProgress}%` }} />
            </div>
          </div>
        ) : (
          <div className="mt-3">
            {opusCount === 0 && (
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                You've mastered the stage. A performance fades by morning — to make your music <em>endure</em>, record it.
              </p>
            )}
            <div className="text-right text-xs text-text-muted mb-2">Tempo x{currentOpusMult} {opusCount > 0 ? `· ${opusPoints} OP` : ''}</div>
            <button
              onClick={() => canMO && tryPrestige('mo')}
              disabled={!canMO}
              className={`w-full py-3 rounded-xl border font-display font-semibold transition-all ${
                canMO ? 'border-accent-purple/50 bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25' : 'border-border/50 bg-bg-secondary/50 text-text-muted cursor-not-allowed'
              }`}
            >
              {canMO ? 'Perform Magnum Opus' : `${moPurchased}/${moCost.amount} ${moCost.tierName}`}
            </button>
          </div>
        )}
      </section>

      {pending && <PrestigeDialog type={pending} onConfirm={() => run(pending)} onCancel={() => setPending(null)} />}
    </div>
  )
}
