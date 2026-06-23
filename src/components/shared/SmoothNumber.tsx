import { useEffect, useRef, useState } from 'react'
import Decimal from 'break_infinity.js'
import { formatNumber } from '../../core/format'

interface SmoothNumberProps {
  value: Decimal
  rate: Decimal
  precision?: number
  className?: string
}

/**
 * Displays a number that smoothly interpolates between ticks
 * using the provided production rate for frame-by-frame projection.
 */
export function SmoothNumber({ value, rate, precision = 1, className = '' }: SmoothNumberProps) {
  const [display, setDisplay] = useState(() => new Decimal(value))
  const lastFrameRef = useRef(performance.now())
  const rateRef = useRef(rate)
  const baseValueRef = useRef(value)
  const baseTimeRef = useRef(performance.now())

  // Keep rate ref fresh
  rateRef.current = rate

  // When the real value changes, reset projection base
  useEffect(() => {
    baseValueRef.current = value
    baseTimeRef.current = performance.now()
  }, [value.toString()])

  useEffect(() => {
    let rafId: number
    const animate = (now: number) => {
      lastFrameRef.current = now
      const r = rateRef.current
      const base = baseValueRef.current

      if (r.lte(0)) {
        setDisplay(base)
      } else {
        // Project forward from the last known real value
        const elapsed = (now - baseTimeRef.current) / 1000
        const projected = base.plus(r.times(elapsed))
        setDisplay(projected)
      }

      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return <span className={className}>{formatNumber(display, precision)}</span>
}
