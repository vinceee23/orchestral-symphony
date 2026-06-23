import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { DELTA_CAP_MS } from '../core/constants'
import { getOpusBPMMultiplier, getMilestoneTickspeedMultiplier } from '../core/formulas'
import { getAchievementTempoBonus } from '../core/achievements'
import { getChallengeById, getActiveChallengeModifiers } from '../core/challenges'

export function useGameLoop() {
  const lastTimeRef = useRef<number>(0)
  const accumulatorRef = useRef<number>(0)

  useEffect(() => {
    let rafId: number

    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      const deltaMs = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      const cappedDelta = Math.min(deltaMs, DELTA_CAP_MS)
      accumulatorRef.current += cappedDelta

      const state = useGameStore.getState()

      // Effective tick interval: tempo interval / (MO BPM * achievement bonus * milestone tickspeed)
      const opusBPMMultiplier = getOpusBPMMultiplier(state.opusPoints)
      const achTempoBonus = getAchievementTempoBonus(new Set(state.achievements))
      const milestoneTSMult = getMilestoneTickspeedMultiplier(state.tiers)
      const tempoFactor = opusBPMMultiplier * (1 + achTempoBonus) * milestoneTSMult

      // Challenge tickspeed divisor
      const activeChallenge = state.activeChallenge
        ? getChallengeById(state.activeChallenge.challengeId) ?? null
        : null
      const mods = getActiveChallengeModifiers(activeChallenge)

      const effectiveInterval = Math.max(
        1,
        Math.floor(state.tempo.tickInterval / tempoFactor * mods.tickspeedDivisor),
      )

      let ticksRun = 0
      while (accumulatorRef.current >= effectiveInterval && ticksRun < 10) {
        state.tick(effectiveInterval)
        accumulatorRef.current -= effectiveInterval
        ticksRun++
      }

      if (ticksRun > 0) {
        const s = useGameStore.getState()
        s.checkAchievements()
        s.checkChallengeCompletion()
      }

      if (accumulatorRef.current > effectiveInterval * 10) {
        accumulatorRef.current = 0
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])
}
