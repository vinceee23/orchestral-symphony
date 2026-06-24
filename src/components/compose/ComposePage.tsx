import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { SoundwaveDisplay } from './SoundwaveDisplay'
import { TempoBar } from './TempoBar'
import { BuyAmountToggle } from './BuyAmountToggle'
import { OrchestraStage } from './OrchestraStage'
import { getEncoreCost } from '../../core/constants'
import { getEncoreGain, getLiveliness } from '../../core/formulas'
import { getOvertureGainMultiplier } from '../../core/encoreUpgrades'
import { playPrestigeSound } from '../../core/audio'
import { getChallengeById, getActiveChallengeModifiers } from '../../core/challenges'
import { PrestigeDialog } from '../prestige/PrestigeDialog'

export function ComposePage() {
  const tiers = useGameStore((s) => s.tiers)
  const peakSoundwaves = useGameStore((s) => s.peakSoundwaves)
  const encoreCount = useGameStore((s) => s.encoreCount)
  const encoreUpgrades = useGameStore((s) => s.encoreUpgrades)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const opusPoints = useGameStore((s) => s.opusPoints)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const tempo = useGameStore((s) => s.tempo)
  const performEncore = useGameStore((s) => s.performEncore)
  const activeChallenge = useGameStore((s) => s.activeChallenge)

  const [pendingEncore, setPendingEncore] = useState(false)

  const activeCh = activeChallenge ? getChallengeById(activeChallenge.challengeId) ?? null : null
  const prestigeBlocked = getActiveChallengeModifiers(activeCh).noPrestige
  const encoreCost = getEncoreCost(encoreCount)
  const encorePurchased = tiers[encoreCost.tierIndex]?.purchased ?? 0
  const canEncore = !prestigeBlocked && encorePurchased >= encoreCost.amount
  const projectedGain = Math.floor(getEncoreGain(peakSoundwaves) * getOvertureGainMultiplier(encoreUpgrades))

  // Spotlight heartbeat (capped) + ambient liveliness (bland pre-Encore, warmer each layer).
  const pulseDur = Math.min(2, Math.max(0.5, 60 / (tempo.baseBPM || 60)))
  const liveliness = getLiveliness(lifetimeEncorePoints, opusPoints, finalePoints)
  const goldWash = (0.04 + liveliness * 0.12).toFixed(3)
  const purpleWash = (liveliness * 0.1).toFixed(3)

  const doEncore = () => { performEncore(); playPrestigeSound(); setPendingEncore(false) }
  const onEncore = () => {
    if (localStorage.getItem('prestige_skip_encore')) doEncore()
    else setPendingEncore(true)
  }

  return (
    <div
      className="relative h-full overflow-hidden"
      style={{
        background:
          `radial-gradient(110% 65% at 50% -5%, rgba(212,168,67,${goldWash}), transparent 50%),` +
          `radial-gradient(90% 55% at 50% 118%, rgba(124,58,237,${purpleWash}), transparent 60%),` +
          'linear-gradient(180deg, #050507 0%, #020203 100%)',
      }}
    >
      {/* spotlight beam from above */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 z-0"
        style={{
          width: '72%', height: '80%',
          background: 'linear-gradient(180deg, rgba(212,168,67,0.20), rgba(212,168,67,0.05) 50%, transparent 80%)',
          clipPath: 'polygon(46% 0%, 54% 0%, 100% 100%, 0% 100%)',
        }}
      />
      {/* lamp source + capped tempo heartbeat */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 z-0"
        style={{
          width: 170, height: 130,
          background: 'radial-gradient(50% 70% at 50% 0%, rgba(255,236,180,0.55), rgba(212,168,67,0.18) 45%, transparent 75%)',
          animation: `tempo-pulse ${pulseDur}s ease-in-out infinite`,
        }}
      />
      {/* stage floor pool */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 z-0"
        style={{ background: 'radial-gradient(55% 100% at 50% 100%, rgba(212,168,67,0.12), transparent 70%)' }}
      />

      {/* content */}
      <div className="relative z-10 h-full overflow-y-auto flex flex-col items-center px-4 py-5">
        <SoundwaveDisplay />
        <div className="w-full max-w-3xl mt-1"><TempoBar /></div>

        <div className="w-full max-w-5xl flex items-center justify-between mt-5 mb-1">
          <h2 className="text-lg font-display font-semibold text-accent-gold tracking-wide">Your Orchestra</h2>
          <BuyAmountToggle />
        </div>

        <div className="w-full max-w-5xl flex-1 flex items-center justify-center pb-28">
          <OrchestraStage />
        </div>
      </div>

      {/* Prominent Encore call-to-action when ready (full detail lives in the Prestige tab) */}
      {canEncore && (
        <button
          onClick={onEncore}
          className="absolute left-1/2 -translate-x-1/2 bottom-6 z-20 px-6 py-3 rounded-full border border-accent-gold/60 bg-accent-gold/15 backdrop-blur text-accent-gold font-display font-semibold shadow-2xl hover:bg-accent-gold/25 hover:brightness-110 transition-all animate-pulse-gold"
        >
          ✦ Encore Ready{projectedGain > 0 ? ` · +${projectedGain} Applause` : ''} ✦
        </button>
      )}

      {pendingEncore && <PrestigeDialog type="encore" onConfirm={doEncore} onCancel={() => setPendingEncore(false)} />}
    </div>
  )
}
