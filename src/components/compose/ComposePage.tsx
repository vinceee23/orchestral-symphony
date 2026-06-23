import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { SoundwaveDisplay } from './SoundwaveDisplay'
import { TempoBar } from './TempoBar'
import { BuyAmountToggle } from './BuyAmountToggle'
import { TierPanel } from '../tiers/TierPanel'
import { formatNumber } from '../../core/format'
import {
  getEncoreCost,
  getMagnumOpusCost,
  GRAND_FINALE_SW_THRESHOLD,
  ENCORE_WALL_COUNT,
} from '../../core/constants'
import { getEncoreMultiplier, getFinaleMultiplier, getOpusBPMMultiplier, getEncoreGain } from '../../core/formulas'
import { ENCORE_UPGRADES, getEncoreUpgradeCost, getOvertureGainMultiplier } from '../../core/encoreUpgrades'
import Decimal from 'break_infinity.js'
import { playPrestigeSound, playBuySound } from '../../core/audio'
import { getChallengeById, getActiveChallengeModifiers } from '../../core/challenges'

interface PrestigeDialogProps {
  type: 'encore' | 'mo' | 'gf'
  onConfirm: () => void
  onCancel: () => void
}

const PRESTIGE_INFO = {
  encore: {
    title: 'Encore',
    color: 'text-accent-gold',
    border: 'border-accent-gold/40',
    bg: 'bg-accent-gold/10',
    description: [
      'Take a bow and play again. An Encore resets your tiers, soundwaves, and tempo to the start.',
      'In return you earn Applause. Your total Applause permanently multiplies all production — and you keep a spendable pool to buy Encore upgrades.',
      'Each Encore is faster than the last. Keep performing to build toward your Magnum Opus.',
    ],
  },
  mo: {
    title: 'Magnum Opus',
    color: 'text-red-400',
    border: 'border-red-500/40',
    bg: 'bg-red-500/10',
    description: [
      'A Magnum Opus is a bigger reset. It resets everything an Encore does, plus your Encore Points.',
      'In return, you gain +1 Opus Point (OP). Each OP permanently doubles your BPM (tick speed).',
      'This is a powerful boost — tick speed is the biggest factor in production!',
    ],
  },
  gf: {
    title: 'Grand Finale',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    description: [
      'The Grand Finale is the ultimate reset. It resets everything — tiers, EP, and OP.',
      'In return, you gain +1 Finale Point (FP). Each FP gives a permanent x10 multiplier to all production.',
      'Grand Finales also unlock new challenges as you accumulate them!',
    ],
  },
}

function PrestigeDialog({ type, onConfirm, onCancel }: PrestigeDialogProps) {
  const [dontShow, setDontShow] = useState(false)
  const info = PRESTIGE_INFO[type]

  const handleConfirm = () => {
    if (dontShow) {
      localStorage.setItem(`prestige_skip_${type}`, '1')
    }
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className={`max-w-md w-full mx-4 p-5 rounded-xl border ${info.border} ${info.bg} bg-bg-primary shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-lg font-bold ${info.color} mb-3`}>{info.title}</h3>
        <div className="space-y-2 mb-4">
          {info.description.map((line, i) => (
            <p key={i} className="text-sm text-text-secondary leading-relaxed">{line}</p>
          ))}
        </div>
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-accent-gold"
          />
          <span className="text-xs text-text-muted">Don't show this again</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-3 text-sm rounded border border-border text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-2 px-3 text-sm rounded border ${info.border} ${info.color} font-semibold hover:brightness-125 transition-all`}
          >
            Confirm {info.title}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ComposePage() {
  const tiers = useGameStore((s) => s.tiers)
  const soundwaves = useGameStore((s) => s.soundwaves)
  const peakSoundwaves = useGameStore((s) => s.peakSoundwaves)
  const encorePoints = useGameStore((s) => s.encorePoints)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const encoreCount = useGameStore((s) => s.encoreCount)
  const encoreUpgrades = useGameStore((s) => s.encoreUpgrades)
  const layer1WallReached = useGameStore((s) => s.layer1WallReached)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const opusCount = useGameStore((s) => s.opusCount)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const finaleCount = useGameStore((s) => s.finaleCount)
  const performEncore = useGameStore((s) => s.performEncore)
  const performMagnumOpus = useGameStore((s) => s.performMagnumOpus)
  const performGrandFinale = useGameStore((s) => s.performGrandFinale)
  const buyEncoreUpgrade = useGameStore((s) => s.buyEncoreUpgrade)
  const activeChallenge = useGameStore((s) => s.activeChallenge)

  const [pendingPrestige, setPendingPrestige] = useState<'encore' | 'mo' | 'gf' | null>(null)

  const activeCh = activeChallenge ? getChallengeById(activeChallenge.challengeId) ?? null : null
  const mods = getActiveChallengeModifiers(activeCh)
  const prestigeBlocked = mods.noPrestige

  const encoreCost = getEncoreCost(encoreCount)
  const encorePurchased = tiers[encoreCost.tierIndex]?.purchased ?? 0
  const canEncore = !prestigeBlocked && encorePurchased >= encoreCost.amount

  const moCost = getMagnumOpusCost(opusCount)
  const moPurchased = tiers[moCost.tierIndex]?.purchased ?? 0
  const canMO = !prestigeBlocked && layer1WallReached && moPurchased >= moCost.amount
  const canGF = !prestigeBlocked && layer1WallReached && new Decimal(soundwaves).gte(GRAND_FINALE_SW_THRESHOLD)

  const shouldShowDialog = (type: 'encore' | 'mo' | 'gf') => !localStorage.getItem(`prestige_skip_${type}`)
  const handlePrestige = (type: 'encore' | 'mo' | 'gf') => {
    if (shouldShowDialog(type)) setPendingPrestige(type)
    else doPrestige(type)
  }
  const doPrestige = (type: 'encore' | 'mo' | 'gf') => {
    if (type === 'encore') performEncore()
    else if (type === 'mo') performMagnumOpus()
    else performGrandFinale()
    playPrestigeSound()
    setPendingPrestige(null)
  }

  const encoreProgress = encoreCost.amount > 0 ? Math.min(100, (encorePurchased / encoreCost.amount) * 100) : 0
  const moProgress = moCost.amount > 0 ? Math.min(100, (moPurchased / moCost.amount) * 100) : 0
  const wallProgress = Math.min(100, (encoreCount / ENCORE_WALL_COUNT) * 100)

  // Production multiplier from TOTAL Applause (lifetime); projected gain from this run's peak.
  const overtureMult = getOvertureGainMultiplier(encoreUpgrades)
  const projectedGain = Math.floor(getEncoreGain(peakSoundwaves) * overtureMult)
  const currentEncoreMult = getEncoreMultiplier(lifetimeEncorePoints)
  const nextEncoreMult = getEncoreMultiplier(lifetimeEncorePoints + projectedGain)
  const currentOpusMult = getOpusBPMMultiplier(opusPoints)
  const nextOpusMult = getOpusBPMMultiplier(opusPoints + 1)
  const currentFinaleMult = getFinaleMultiplier(finalePoints)
  const nextFinaleMult = getFinaleMultiplier(finalePoints + 1)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <SoundwaveDisplay />

      <div className="border-t border-border" />

      <TempoBar />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Composers
        </h2>
        <BuyAmountToggle />
      </div>

      <TierPanel />

      {/* Prestige */}
      {(canEncore || encoreCount > 0) && !prestigeBlocked && (
        <div className="border-t border-border pt-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Prestige
          </h2>

          {/* Encore — Layer 1 */}
          <button
            onClick={() => canEncore && handlePrestige('encore')}
            disabled={!canEncore}
            className={`w-full p-3 rounded-lg border text-left transition-all ${
              canEncore
                ? 'bg-accent-gold/10 border-accent-gold/30 hover:bg-accent-gold/20 cursor-pointer'
                : 'bg-bg-secondary/50 border-border/50 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-accent-gold">Encore</span>
              {encoreCount > 0 && (
                <span className="text-[10px] text-text-muted">#{encoreCount} · {encorePoints} Applause</span>
              )}
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              {encorePurchased}/{encoreCost.amount} {encoreCost.tierName} · resets tiers & tempo
            </div>
            {!canEncore && encoreProgress > 0 && (
              <div className="mt-1 h-1 rounded-full bg-bg-primary overflow-hidden">
                <div className="h-full rounded-full bg-accent-gold/40 transition-all" style={{ width: `${encoreProgress}%` }} />
              </div>
            )}
            <div className="text-[10px] text-accent-gold mt-1">
              Production x{formatNumber(currentEncoreMult, 2)}
              {canEncore && projectedGain > 0 && (
                <span className="text-success"> {'\u{2192}'} x{formatNumber(nextEncoreMult, 2)}</span>
              )}
              {encoreCount === 0 && ' · unlocks Movements & Symphonies'}
            </div>
            {canEncore && <div className="text-xs text-success mt-1">+{projectedGain} Applause</div>}
          </button>

          {/* Encore Upgrade shop (Applause sink) — after the first Encore */}
          {encoreCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Encore Upgrades</h3>
                <span className="text-[10px] text-accent-gold">{encorePoints} Applause to spend</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                      className={`p-2 rounded-lg border text-left transition-all ${
                        maxed
                          ? 'bg-bg-secondary/40 border-border/40 opacity-60 cursor-default'
                          : affordable
                            ? 'bg-accent-gold/10 border-accent-gold/30 hover:bg-accent-gold/20 cursor-pointer'
                            : 'bg-bg-secondary/50 border-border/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-primary">{u.name}</span>
                        <span className="text-[10px] text-text-muted">Lv {level}/{u.maxLevel}</span>
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5 leading-snug">{u.description}</div>
                      <div className={`text-[10px] mt-1 font-medium ${maxed ? 'text-text-muted' : affordable ? 'text-accent-gold' : 'text-text-muted'}`}>
                        {maxed ? 'MAX' : `${cost} Applause`}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Layer 2+ gate: locked until the Layer-1 wall (cliffhanger) */}
          {!layer1WallReached ? (
            <div className="p-3 rounded-lg border border-border/50 bg-bg-secondary/40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-muted">{'\u{1F512}'} Magnum Opus</span>
                <span className="text-[10px] text-text-muted">{encoreCount}/{ENCORE_WALL_COUNT} Encores</span>
              </div>
              <p className="text-[10px] text-text-muted mt-1 leading-snug">
                Keep performing. When you reach the limits of the concert hall, a new path will open.
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-bg-primary overflow-hidden">
                <div className="h-full rounded-full bg-text-muted/40 transition-all" style={{ width: `${wallProgress}%` }} />
              </div>
            </div>
          ) : (
            <>
              {opusCount === 0 && (
                <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10">
                  <div className="text-sm font-semibold text-red-400 mb-1">The hall has reached its limit</div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    The air itself can hold no more sound — each Encore now barely moves the needle. But a
                    performance, once <em>recorded</em>, echoes forever. Your Magnum Opus awaits.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Magnum Opus — Layer 2 */}
                <button
                  onClick={() => canMO && handlePrestige('mo')}
                  disabled={!canMO}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    canMO
                      ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 cursor-pointer'
                      : 'bg-bg-secondary/50 border-border/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-400">Magnum Opus</span>
                    {opusCount > 0 && <span className="text-[10px] text-text-muted">{opusPoints} OP</span>}
                  </div>
                  <div className="text-[10px] text-text-muted mt-1">
                    {moPurchased}/{moCost.amount} {moCost.tierName} · resets Applause + tiers
                  </div>
                  {!canMO && moProgress > 0 && (
                    <div className="mt-1 h-1 rounded-full bg-bg-primary overflow-hidden">
                      <div className="h-full rounded-full bg-red-500/40 transition-all" style={{ width: `${moProgress}%` }} />
                    </div>
                  )}
                  <div className="text-[10px] text-red-400 mt-1">
                    Tick speed x{currentOpusMult}
                    {canMO && <span className="text-success"> {'\u{2192}'} x{nextOpusMult}</span>}
                  </div>
                  {canMO && <div className="text-xs text-success mt-1">+1 OP</div>}
                </button>

                {/* Grand Finale — Layer 3 */}
                {(canGF || finaleCount > 0) && (
                  <button
                    onClick={() => canGF && handlePrestige('gf')}
                    disabled={!canGF}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      canGF
                        ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer'
                        : 'bg-bg-secondary/50 border-border/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-amber-400">Grand Finale</span>
                      {finaleCount > 0 && <span className="text-[10px] text-text-muted">{finalePoints} FP</span>}
                    </div>
                    <div className="text-[10px] text-text-muted mt-1">
                      SW {'\u{2265}'}{formatNumber(GRAND_FINALE_SW_THRESHOLD)} · resets Applause + OP + tiers
                    </div>
                    <div className="text-[10px] text-amber-400 mt-1">
                      Production x{formatNumber(currentFinaleMult, 0)}
                      {canGF && <span className="text-success"> {'\u{2192}'} x{formatNumber(nextFinaleMult, 0)}</span>}
                    </div>
                    {canGF && <div className="text-xs text-success mt-1">+1 FP</div>}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* First-time prestige explanation dialog */}
      {pendingPrestige && (
        <PrestigeDialog
          type={pendingPrestige}
          onConfirm={() => doPrestige(pendingPrestige)}
          onCancel={() => setPendingPrestige(null)}
        />
      )}
    </div>
  )
}
