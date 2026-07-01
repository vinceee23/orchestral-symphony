import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { useUiStore } from '../store/uiStore'
import { DELTA_CAP_MS } from '../core/constants'
import { setMusicScene } from '../core/audio'
import { getEra } from '../core/eraTheme'

/**
 * Drives the simulation. Ticks EVERY animation frame with the real elapsed delta, so production
 * accrues smoothly (numbers count up per-frame, not in 1-second chunks). Tempo / Opus / milestone
 * tickspeed are production MULTIPLIERS now (see tick.ts), so the loop no longer gates by tick rate.
 * Achievement/challenge checks are throttled to ~3x/sec to avoid per-frame overhead.
 */
export function useGameLoop() {
  const lastTimeRef = useRef<number>(0)
  const checkAccumRef = useRef<number>(0)
  const tickAccumRef = useRef<number>(0)

  useEffect(() => {
    let rafId: number
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      const deltaMs = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      // DEV pacing tool: multiply game-time per frame (1 in production — devSpeed is dev-gated in DevPanel).
      const cappedDelta = Math.min(deltaMs, DELTA_CAP_MS) * (useUiStore.getState().devSpeed || 1)

      // End a tap-triggered conduct burst once its window lapses (before the tick reads `conducting`).
      useUiStore.getState().expireConductIfDone(timestamp)

      // Refresh-rate cap: accumulate game-time and tick at most fpsCap times/sec. Production is delta-based,
      // so capping only reduces update frequency/CPU — the FULL accumulated time is applied when we do tick.
      tickAccumRef.current += cappedDelta
      const fpsCap = useGameStore.getState().settings.fpsCap
      const frameInterval = fpsCap > 0 ? 1000 / fpsCap : 0
      if (tickAccumRef.current >= frameInterval) {
        const step = tickAccumRef.current
        tickAccumRef.current = 0
        if (step > 0) {
          useGameStore.getState().tick(step)
          checkAccumRef.current += step
          if (checkAccumRef.current >= 300) {
            checkAccumRef.current = 0
            const s = useGameStore.getState()
            s.checkAchievements()
            s.checkChallengeCompletion()
            // Feed the ambient bed what the game is doing (era + live crescendo) — the music grows
            // with the journey. Throttled here (~3×/sec) so it costs nothing per frame.
            setMusicScene({
              era: getEra(s.lifetimeEncorePoints, s.opusCount, s.finalePoints, s.worldTourUnlocked, s.signatureCount),
              crescendo: s.crescendo,
            })
          }
        }
      }

      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])
}
