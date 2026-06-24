import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import { SoundwaveDisplay } from './SoundwaveDisplay'
import { TempoBar } from './TempoBar'
import { BuyAmountToggle } from './BuyAmountToggle'
import { OrchestraStage } from './OrchestraStage'
import { FloatingNotes } from '../shared/FloatingNotes'
import { StageHall } from './StageHall'
import { StageLife } from './StageLife'
import { ConductorPodium } from './ConductorPodium'
import { RecordsMeter } from './RecordsMeter'
import { getEncoreCost, getMagnumOpusCost } from '../../core/constants'
import { formatNumber } from '../../core/format'
import { getEncoreGain, getLiveliness, getEncoreMultiplier } from '../../core/formulas'
import { getCrescendoMultiplier } from '../../core/crescendo'
import { getTempoOpMultiplier } from '../../core/opusUpgrades'
import { getFameMultiplier, getOpusGain } from '../../core/records'
import { getOvertureGainMultiplier } from '../../core/encoreUpgrades'
import { playPrestigeSound } from '../../core/audio'
import { getChallengeById, getActiveChallengeModifiers } from '../../core/challenges'
import { PrestigeDialog } from '../prestige/PrestigeDialog'
import { useUiStore } from '../../store/uiStore'

export function ComposePage() {
  const tiers = useGameStore((s) => s.tiers)
  const peakSoundwaves = useGameStore((s) => s.peakSoundwaves)
  const encoreCount = useGameStore((s) => s.encoreCount)
  const encoreUpgrades = useGameStore((s) => s.encoreUpgrades)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const opusUpgrades = useGameStore((s) => s.opusUpgrades)
  const crescendo = useGameStore((s) => s.crescendo)
  const recordsSold = useGameStore((s) => s.recordsSold)
  const platinum = useGameStore((s) => s.platinum)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const layer1WallReached = useGameStore((s) => s.layer1WallReached)
  const opusCount = useGameStore((s) => s.opusCount)
  const peakCrescendoMult = useGameStore((s) => s.peakCrescendoMult)
  const performEncore = useGameStore((s) => s.performEncore)
  const performMagnumOpus = useGameStore((s) => s.performMagnumOpus)
  const activeChallenge = useGameStore((s) => s.activeChallenge)
  const celebrateEncore = useUiStore((s) => s.celebrateEncore)
  // Spacebar conduct is global now (see AppShell). This page only owns the pointer "Conduct" button.
  const setPointerHeld = useUiStore((s) => s.setPointerHeld)

  const [pendingEncore, setPendingEncore] = useState(false)
  const [pendingMO, setPendingMO] = useState(false)
  // §11 era-reveal: when the era increments (1st Encore → gold, 1st MO → violet, Finale → blaze), flash a
  // one-shot bloom as the camera pulls back to the grander hall.
  const [revealEra, setRevealEra] = useState<number | null>(null)
  const prevEra = useRef<number | null>(null)

  const activeCh = activeChallenge ? getChallengeById(activeChallenge.challengeId) ?? null : null
  const prestigeBlocked = getActiveChallengeModifiers(activeCh).noPrestige
  const encoreCost = getEncoreCost(encoreCount)
  const encorePurchased = tiers[encoreCost.tierIndex]?.purchased ?? 0
  const canEncore = !prestigeBlocked && encorePurchased >= encoreCost.amount
  const projectedGain = Math.floor(getEncoreGain(peakSoundwaves) * getOvertureGainMultiplier(encoreUpgrades))
  const encoreProgress = Math.min(100, (encorePurchased / encoreCost.amount) * 100)
  const currentEncoreMult = getEncoreMultiplier(lifetimeEncorePoints)
  const nextEncoreMult = getEncoreMultiplier(lifetimeEncorePoints + projectedGain)
  // Magnum Opus prestige — surfaced on-stage once the Layer-1 wall is reached.
  const moCost = getMagnumOpusCost(opusCount)
  const moPurchased = tiers[moCost.tierIndex]?.purchased ?? 0
  const canMO = !prestigeBlocked && layer1WallReached && moPurchased >= moCost.amount
  const moProgress = Math.min(100, (moPurchased / moCost.amount) * 100)
  const projectedOpGain = getOpusGain({ platinum, opGainFlatLevel: opusUpgrades['op-gain-flat'] ?? 0, opusCount, peakCrescendoMult, levels: opusUpgrades })

  // Ambient liveliness (bland pre-Encore, warmer each layer) — feeds the backdrop grandeur ramp.
  const liveliness = getLiveliness(lifetimeEncorePoints, opusCount, finalePoints)
  // Stage era = one hall tier per prestige layer (0 intimate · 1 Encore · 2 Magnum Opus ·
  // 3 Repertoire · 4 Genre · 5 Virtuoso · 6 Canon). Only 0-2 reachable today; finale jumps to the top tier.
  const era = finalePoints > 0 ? 6 : opusCount > 0 ? 2 : lifetimeEncorePoints > 0 ? 1 : 0
  const orchestraScale = [1, 0.93, 0.86, 0.82, 0.78, 0.74, 0.7][era] ?? 0.7 // camera pulls back per layer
  // §11 "lights up as you climb": the hall brightens with your Soundwave climb and BLAZES as you conduct.
  const climb = peakSoundwaves.gt(1) ? Math.min(1, Math.max(0, peakSoundwaves.log10()) / 100) : 0 // 0..1 across the climb
  const blaze = Math.max(0, Math.min(1, crescendo)) // crescendo fraction — rises while holding Conduct (→ StageHall)
  // Live "conduct stage" multipliers (crescendo updates as you hold Conduct).
  const crescendoMult = getCrescendoMultiplier(crescendo, opusUpgrades)
  const tempoOpMult = getTempoOpMultiplier(opusUpgrades)
  const fameMult = platinum ? getFameMultiplier(recordsSold, opusUpgrades) : 1
  const goldWash = (0.04 + liveliness * 0.10 + climb * 0.06 + blaze * 0.16).toFixed(3)
  // Magnum Opus era brings violet richness into the hall — a clear mood shift, not just brighter gold.
  const purpleWash = (opusCount > 0 ? 0.13 : liveliness * 0.03).toFixed(3)

  // §11 era-reveal: fire a one-shot bloom whenever the era steps up.
  useEffect(() => {
    if (prevEra.current !== null && era > prevEra.current) {
      setRevealEra(era)
      const t = setTimeout(() => setRevealEra(null), 1800)
      prevEra.current = era
      return () => clearTimeout(t)
    }
    prevEra.current = era
  }, [era])
  const revealColor = ['#d4a843', '#d4a843', '#7c3aed', '#2dd4bf', '#ec4899', '#ef4444', '#fbbf24'][revealEra ?? 0]

  const doEncore = () => {
    const from = getEncoreMultiplier(lifetimeEncorePoints).toNumber()
    const to = getEncoreMultiplier(lifetimeEncorePoints + projectedGain).toNumber()
    celebrateEncore(from, to)
    performEncore(); playPrestigeSound(); setPendingEncore(false)
  }
  const onEncore = () => {
    if (localStorage.getItem('prestige_skip_encore')) doEncore()
    else setPendingEncore(true)
  }
  const doMO = () => { performMagnumOpus(); playPrestigeSound(); setPendingMO(false) }
  const onMO = () => {
    if (localStorage.getItem('prestige_skip_mo')) doMO()
    else setPendingMO(true)
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
      {/* spotlight beam / lamp / floor pool removed (per Vince) — the near-abstract blurred backdrop
          carries all the stage lighting now, so nothing overwhelms the orchestra buttons. */}
      <StageHall era={era} liveliness={liveliness} blaze={blaze} />
      {/* §11 liveliness: rising gold motes that emerge + multiply per era, brighten/quicken on Conduct */}
      <StageLife era={era} blaze={blaze} />
      {/* ambient drifting notes — scoped to the Compose stage (scales with liveliness) */}
      <FloatingNotes />
      {/* §11 era-reveal bloom — one-shot flash when the era steps up (camera pulls back to a grander hall) */}
      {revealEra != null && (
        <div
          key={revealEra}
          className="era-reveal pointer-events-none absolute inset-0 z-30"
          style={{ background: `radial-gradient(60% 50% at 50% 40%, ${revealColor}55, transparent 70%)` }}
        />
      )}

      {/* content */}
      <div className="relative z-10 h-full overflow-y-auto flex flex-col items-center px-4 py-5 [scrollbar-gutter:stable_both-edges]">
        <SoundwaveDisplay />
        <div className="w-full max-w-3xl mt-1"><TempoBar /></div>

        <div className="w-full max-w-5xl flex items-center justify-between mt-5 mb-1">
          <h2 className="text-lg font-display font-semibold text-accent-gold tracking-wide">Your Orchestra</h2>
          <BuyAmountToggle />
        </div>

        <div className="w-full flex justify-center mt-3 pb-24">
          <div
            className="shrink-0 transition-transform duration-[1500ms] ease-out"
            style={{ transform: `scale(${orchestraScale})`, transformOrigin: 'top center' }}
          >
            <OrchestraStage />
          </div>
        </div>
      </div>

      {/* Reach zone — records selling → Platinum, along the bottom of the stage (L2+) */}
      <RecordsMeter />

      {/* Conduct unit, front-center bottom: a slim live readout, the Conduct button, and the podium
          stacked as ONE column (gap-spaced, no overlap) so the swell-meter rises from the podium toward
          the button. Active after the first Magnum Opus; dormant podium ("the baton awaits") before. */}
      <div className="pointer-events-none absolute left-1/2 bottom-6 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
        {opusCount > 0 && (
          <>
            <div className="text-center leading-tight tabular-nums">
              <span className={`text-sm font-display font-semibold ${crescendo > 0.02 ? 'text-accent-gold' : 'text-text-secondary'}`}>
                Crescendo ×{crescendoMult.toFixed(2)}
              </span>
              {(tempoOpMult > 1 || fameMult > 1) && (
                <span className="ml-2 text-[11px] text-text-muted">
                  {tempoOpMult > 1 && <span>· Tempo ×{tempoOpMult.toFixed(2)}</span>}
                  {fameMult > 1 && <span> · Fame ×{fameMult.toFixed(2)}</span>}
                </span>
              )}
            </div>
            <button
              type="button"
              className="pointer-events-auto px-8 py-2.5 rounded-full border border-accent-gold/50 bg-accent-gold/10 backdrop-blur text-accent-gold font-display text-sm font-semibold tracking-wide select-none touch-none hover:bg-accent-gold/20 active:bg-accent-gold/30 transition-colors"
              onPointerDown={() => setPointerHeld(true)}
              onPointerUp={() => setPointerHeld(false)}
              onPointerLeave={() => setPointerHeld(false)}
              onPointerCancel={() => setPointerHeld(false)}
            >
              Conduct <span className="opacity-60 text-[10px] font-body">(hold / Space)</span>
            </button>
          </>
        )}
        {/* conductor's podium — swell-meter + base (dormant pre-L2) */}
        <ConductorPodium active={opusCount > 0} swell={crescendo} />
      </div>

      {/* Prestige actions — top-right of the stage. Trigger here to watch the animations on-stage;
          the Prestige tab holds the full stats + the same actions. Always visible with live progress. */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 w-44">
        <button
          onClick={onEncore}
          disabled={!canEncore}
          className={`w-full text-left px-3 py-2 rounded-xl border backdrop-blur transition-all ${
            canEncore
              ? 'border-accent-gold/60 bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25 animate-pulse-gold cursor-pointer'
              : 'border-border/50 bg-bg-primary/55 text-text-secondary cursor-default'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold text-sm">Encore</span>
            <span className="text-[10px] tabular-nums">
              {canEncore ? `×${formatNumber(currentEncoreMult, 2)}→×${formatNumber(nextEncoreMult, 2)}` : `${encorePurchased}/${encoreCost.amount}`}
            </span>
          </div>
          {canEncore ? (
            <div className="text-[10px] text-text-secondary">Ready · +{projectedGain} Applause</div>
          ) : (
            <div className="mt-1 h-1 rounded-full bg-bg-primary/70 overflow-hidden">
              <div className="h-full rounded-full bg-accent-gold/50 transition-all" style={{ width: `${encoreProgress}%` }} />
            </div>
          )}
        </button>

        {layer1WallReached && (
          <button
            onClick={onMO}
            disabled={!canMO}
            className={`w-full text-left px-3 py-2 rounded-xl border backdrop-blur transition-all ${
              canMO
                ? 'border-accent-purple/60 bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 animate-pulse-gold cursor-pointer'
                : 'border-border/50 bg-bg-primary/55 text-text-secondary cursor-default'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-sm">Magnum Opus</span>
              <span className="text-[10px] tabular-nums">
                {canMO ? `+${projectedOpGain} OP` : `${moPurchased}/${moCost.amount}`}
              </span>
            </div>
            {canMO ? (
              <div className="text-[10px] text-text-secondary">Ready · record the album</div>
            ) : (
              <div className="mt-1 h-1 rounded-full bg-bg-primary/70 overflow-hidden">
                <div className="h-full rounded-full bg-accent-purple/50 transition-all" style={{ width: `${moProgress}%` }} />
              </div>
            )}
          </button>
        )}
      </div>

      {pendingEncore && <PrestigeDialog type="encore" onConfirm={doEncore} onCancel={() => setPendingEncore(false)} />}
      {pendingMO && <PrestigeDialog type="mo" onConfirm={doMO} onCancel={() => setPendingMO(false)} />}
    </div>
  )
}
