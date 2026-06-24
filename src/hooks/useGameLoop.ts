import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { useUiStore } from '../store/uiStore'
import { DELTA_CAP_MS } from '../core/constants'

/**
 * Drives the simulation. Ticks EVERY animation frame with the real elapsed delta, so production
 * accrues smoothly (numbers count up per-frame, not in 1-second chunks). Tempo / Opus / milestone
 * tickspeed are production MULTIPLIERS now (see tick.ts), so the loop no longer gates by tick rate.
 * Achievement/challenge checks are throttled to ~3x/sec to avoid per-frame overhead.
 */
export function useGameLoop() {
  const lastTimeRef = useRef<number>(0)
  const checkAccumRef = useRef<number>(0)

  useEffect(() => {
    let rafId: number
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      const deltaMs = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      // DEV pacing tool: multiply game-time per frame (1 in production — devSpeed is dev-gated in DevPanel).
      const cappedDelta = Math.min(deltaMs, DELTA_CAP_MS) * (useUiStore.getState().devSpeed || 1)

      if (cappedDelta > 0) {
        useGameStore.getState().tick(cappedDelta)
        checkAccumRef.current += cappedDelta
        if (checkAccumRef.current >= 300) {
          checkAccumRef.current = 0
          const s = useGameStore.getState()
          s.checkAchievements()
          s.checkChallengeCompletion()
        }
      }

      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])
}
