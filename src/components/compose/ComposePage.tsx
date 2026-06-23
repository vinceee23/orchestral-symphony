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
} from '../../core/constants'
import { getEncoreMultiplier, getFinaleMultiplier, getOpusBPMMultiplier } from '../../core/formulas'
import Decimal from 'break_infinity.js'
import { playPrestigeSound } from '../../core/audio'
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
      'Performing an Encore will reset all your tiers, soundwaves, and tempo back to the beginning.',
      'In return, you gain +1 Encore Point (EP). Each EP permanently doubles all production.',
      'With this multiplier, you\'ll progress much faster on your next run!',
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
  const encorePoints = useGameStore((s) => s.encorePoints)
  const encoreCount = useGameStore((s) => s.encoreCount)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const opusCount = useGameStore((s) => s.opusCount)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const finaleCount = useGameStore((s) => s.finaleCount)
  const performEncore = useGameStore((s) => s.performEncore)
  const performMagnumOpus = useGameStore((s) => s.performMagnumOpus)
  const performGrandFinale = useGameStore((s) => s.performGrandFinale)
  const activeChallenge = useGameStore((s) => s.activeChallenge)

  const [pendingPrestige, setPendingPrestige] = useState<'encore' | 'mo' | 'gf' | null>(null)

  // Check if prestige is blocked by active challenge
  const activeCh = activeChallenge
    ? getChallengeById(activeChallenge.challengeId) ?? null
    : null
  const mods = getActiveChallengeModifiers(activeCh)
  const prestigeBlocked = mods.noPrestige

  // Escalating prestige costs
  const encoreCost = getEncoreCost(encoreCount)
  const encorePurchased = tiers[encoreCost.tierIndex]?.purchased ?? 0
  const canEncore = !prestigeBlocked && encorePurchased >= encoreCost.amount

  const moCost = getMagnumOpusCost(opusCount)
  const moPurchased = tiers[moCost.tierIndex]?.purchased ?? 0
  const canMO = !prestigeBlocked && moPurchased >= moCost.amount
  const canGF = !prestigeBlocked && new Decimal(soundwaves).gte(GRAND_FINALE_SW_THRESHOLD)

  const shouldShowDialog = (type: 'encore' | 'mo' | 'gf') => {
    return !localStorage.getItem(`prestige_skip_${type}`)
  }

  const handlePrestige = (type: 'encore' | 'mo' | 'gf') => {
    if (shouldShowDialog(type)) {
      setPendingPrestige(type)
    } else {
      doPrestige(type)
    }
  }

  const doPrestige = (type: 'encore' | 'mo' | 'gf') => {
    if (type === 'encore') performEncore()
    else if (type === 'mo') performMagnumOpus()
    else performGrandFinale()
    playPrestigeSound()
    setPendingPrestige(null)
  }

  // Progress toward thresholds
  const encoreProgress = encoreCost.amount > 0
    ? Math.min(100, (encorePurchased / encoreCost.amount) * 100)
    : 0
  const moProgress = moCost.amount > 0
    ? Math.min(100, (moPurchased / moCost.amount) * 100)
    : 0

  // Current and next multipliers
  const currentEncoreMult = getEncoreMultiplier(encorePoints)
  const nextEncoreMult = getEncoreMultiplier(encorePoints + 1)
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

      {/* Prestige Buttons */}
      {(canEncore || encoreCount > 0) && !prestigeBlocked && (
        <div className="border-t border-border pt-4 space-y-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Prestige
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Encore — Layer 1 */}
            <button
              onClick={() => canEncore && handlePrestige('encore')}
              disabled={!canEncore}
              className={`p-3 rounded-lg border text-left transition-all ${
                canEncore
                  ? 'bg-accent-gold/10 border-accent-gold/30 hover:bg-accent-gold/20 cursor-pointer'
                  : 'bg-bg-secondary/50 border-border/50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-accent-gold">
                  Encore{encoreCount > 0 ? ` (${encorePoints} EP)` : ''}
                </span>
              </div>
              <div className="text-[10px] text-text-muted mt-1">
                {encorePurchased}/{encoreCost.amount} {encoreCost.tierName} | Resets tiers & tempo
              </div>
              {!canEncore && encoreProgress > 0 && (
                <div className="mt-1 h-1 rounded-full bg-bg-primary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-gold/40 transition-all"
                    style={{ width: `${encoreProgress}%` }}
                  />
                </div>
              )}
              <div className="text-[10px] text-accent-gold mt-1">
                Production: x{formatNumber(currentEncoreMult, 0)}
                {canEncore && <span className="text-success"> {'\u{2192}'} x{formatNumber(nextEncoreMult, 0)}</span>}
                {encoreCount === 0 && ' | Unlocks Movements'}
              </div>
              {canEncore && (
                <div className="text-xs text-success mt-1">+1 EP</div>
              )}
            </button>

            {/* Magnum Opus — Layer 2 */}
            {(canMO || opusCount > 0) && (
              <button
                onClick={() => canMO && handlePrestige('mo')}
                disabled={!canMO}
                className={`p-3 rounded-lg border text-left transition-all ${
                  canMO
                    ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 cursor-pointer'
                    : 'bg-bg-secondary/50 border-border/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-red-400">
                    Magnum Opus{opusCount > 0 ? ` (${opusPoints} OP)` : ''}
                  </span>
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  {moPurchased}/{moCost.amount} {moCost.tierName} | Resets EP + tiers
                </div>
                {!canMO && moProgress > 0 && (
                  <div className="mt-1 h-1 rounded-full bg-bg-primary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500/40 transition-all"
                      style={{ width: `${moProgress}%` }}
                    />
                  </div>
                )}
                <div className="text-[10px] text-red-400 mt-1">
                  Tick speed: x{currentOpusMult}
                  {canMO && <span className="text-success"> {'\u{2192}'} x{nextOpusMult}</span>}
                </div>
                {canMO && <div className="text-xs text-success mt-1">+1 OP</div>}
              </button>
            )}

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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-400">
                    Grand Finale{finaleCount > 0 ? ` (${finalePoints} FP)` : ''}
                  </span>
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  SW {'\u{2265}'}{formatNumber(GRAND_FINALE_SW_THRESHOLD)} | Resets EP + OP + tiers
                </div>
                <div className="text-[10px] text-amber-400 mt-1">
                  Production: x{formatNumber(currentFinaleMult, 0)}
                  {canGF && <span className="text-success"> {'\u{2192}'} x{formatNumber(nextFinaleMult, 0)}</span>}
                </div>
                {canGF && <div className="text-xs text-success mt-1">+1 FP</div>}
              </button>
            )}
          </div>
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
