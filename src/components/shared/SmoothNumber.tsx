import { useEffect, useRef, useState } from 'react'
import Decimal from 'break_infinity.js'
import { formatNumber } from '../../core/format'
import { useGameStore } from '../../store/gameStore'

interface SmoothNumberProps {
  value: Decimal
  rate: Decimal
  precision?: number
  className?: string
}

// OS reduced-motion (evaluated once — changing the OS pref mid-session is rare). The in-app toggle is
// read reactively from the store below.
const osReducedMotion =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Displays a number that smoothly interpolates between ticks using the production rate for frame-by-frame
 * projection. Under reduced motion (OS pref or the in-app toggle) it snaps to the real value and skips
 * the per-frame rAF entirely — both an accessibility and a perf win (no setState storm on the stage).
 */
export function SmoothNumber({ value, rate, precision = 1, className = '' }: SmoothNumberProps) {
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion) || osReducedMotion
  const [display, setDisplay] = useState(() => new Decimal(value))
  const rateRef = useRef(rate)
  const baseValueRef = useRef(value)
  const baseTimeRef = useRef(performance.now())

  rateRef.current = rate

  // When the real value changes, reset the projection base (and snap if we're not animating).
  useEffect(() => {
    baseValueRef.current = value
    baseTimeRef.current = performance.now()
    if (reducedMotion) setDisplay(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.toString(), reducedMotion])

  useEffect(() => {
    if (reducedMotion) return // no per-frame projection loop in reduced motion
    let rafId: number
    const animate = (now: number) => {
      const r = rateRef.current
      const base = baseValueRef.current
      if (r.lte(0)) setDisplay(base)
      else setDisplay(base.plus(r.times((now - baseTimeRef.current) / 1000)))
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [reducedMotion])

  return <span className={className}>{formatNumber(display, precision)}</span>
}
