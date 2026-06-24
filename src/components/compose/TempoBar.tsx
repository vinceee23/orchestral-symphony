import { useGameStore } from '../../store/gameStore'
import { getTempoCost, getTempoBPM, getTempoTickInterval, getMaxTempoLevels, getMilestoneTickspeedMultiplier } from '../../core/formulas'
import { formatCost } from '../../core/format'
import { playTempoSound } from '../../core/audio'
import { getTempoOpMultiplier } from '../../core/opusUpgrades'
import { getChallengeById, getActiveChallengeModifiers } from '../../core/challenges'
import { Icon } from '../shared/Icon'

export function TempoBar() {
  const tempo = useGameStore((s) => s.tempo)
  const soundwaves = useGameStore((s) => s.soundwaves)
  const tiers = useGameStore((s) => s.tiers)
  const opusUpgrades = useGameStore((s) => s.opusUpgrades)
  const autobuyers = useGameStore((s) => s.autobuyers)
  const buyTempo = useGameStore((s) => s.buyTempo)
  const buyMaxTempo = useGameStore((s) => s.buyMaxTempo)
  const toggleAutobuyer = useGameStore((s) => s.toggleAutobuyer)
  const activeChallenge = useGameStore((s) => s.activeChallenge)

  // Check noTempo challenge constraint
  const activeCh = activeChallenge
    ? getChallengeById(activeChallenge.challengeId) ?? null
    : null
  const mods = getActiveChallengeModifiers(activeCh)

  const cost = getTempoCost(tempo.level)
  const canAfford = !mods.noTempo && soundwaves.gte(cost)
  const nextBPM = getTempoBPM(tempo.level + 1)

  const tempoAb = autobuyers['tempo']
  const hasAutoTempo = tempoAb?.unlocked ?? false
  const isAutoOn = tempoAb?.enabled ?? false

  // Display effective ticks/s with milestone tickspeed bonus
  const milestoneTSMult = getMilestoneTickspeedMultiplier(tiers)
  const effectiveInterval = Math.max(1, tempo.tickInterval / milestoneTSMult)
  const ticksPerSec = (1000 / effectiveInterval).toFixed(1)

  // Next level effective ticks/s
  const nextInterval = getTempoTickInterval(tempo.level + 1)
  const nextEffective = Math.max(1, nextInterval / milestoneTSMult)
  const nextTicksPerSec = (1000 / nextEffective).toFixed(1)

  // Max buyable levels
  const maxLevels = getMaxTempoLevels(tempo.level, soundwaves)
  const canBuyMax = !mods.noTempo && maxLevels > 1

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary rounded-lg border border-border">
      <div className="flex items-center gap-2 min-w-0">
        <Icon name="metronome" size={22} className="text-accent-purple shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-accent-purple">
            {tempo.baseBPM} BPM
            {(opusUpgrades['tempo-op-mult'] ?? 0) > 0 && (
              <span className="text-[10px] text-accent-purple ml-1.5">
                (×{getTempoOpMultiplier(opusUpgrades).toFixed(2)} OP tempo)
              </span>
            )}
          </div>
          <div className="text-[10px] text-text-muted">
            {ticksPerSec}/s
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {hasAutoTempo && (
        <button
          onClick={() => toggleAutobuyer('tempo')}
          className={`
            py-1 px-2 rounded text-[10px] font-medium transition-all duration-150 border
            ${isAutoOn
              ? 'bg-success/20 text-success border-success/30'
              : 'bg-bg-tertiary text-text-muted border-border hover:text-text-secondary'
            }
          `}
        >
          {isAutoOn ? 'AUTO' : 'Auto'}
        </button>
      )}

      {canBuyMax && (
        <button
          onClick={() => { buyMaxTempo(); playTempoSound() }}
          className="py-1.5 px-2 rounded text-[10px] font-medium transition-all duration-150 bg-accent-purple/10 text-accent-purple border border-accent-purple/20 hover:bg-accent-purple/20 active:scale-[0.98]"
        >
          Max ({maxLevels})
        </button>
      )}

      <button
        onClick={() => { buyTempo(); playTempoSound() }}
        disabled={!canAfford}
        className={`
          py-1.5 px-3 rounded text-xs font-medium transition-all duration-150
          ${canAfford
            ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/30 active:scale-[0.98]'
            : 'bg-bg-tertiary text-text-muted border border-border cursor-not-allowed'
          }
        `}
      >
        <span>{'\u{2192}'} {nextBPM} BPM ({nextTicksPerSec}/s)</span>
        <span className="ml-2 opacity-75">{formatCost(cost)} SW</span>
      </button>
    </div>
  )
}
