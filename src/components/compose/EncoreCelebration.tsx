import { useEffect, useRef, useState } from 'react'
import { useUiStore } from '../../store/uiStore'
import { formatNumber } from '../../core/format'

const DURATION_MS = 1600
const COUNTUP_MS = 950

/**
 * The "monumental Encore moment": a gold bloom, velvet curtains framing the edges,
 * and the production multiplier counting up. Non-blocking (pointer-events-none) and
 * auto-clears after DURATION_MS — encores are frequent, so it stays brief and out of the way.
 */
export function EncoreCelebration() {
  const celebration = useUiStore((s) => s.encoreCelebration)
  const clear = useUiStore((s) => s.clearEncoreCelebration)
  const [shown, setShown] = useState<number>(celebration?.to ?? 0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!celebration) return
    const { from, to } = celebration
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNTUP_MS)
      const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
      setShown(from + (to - from) * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    const t = setTimeout(clear, DURATION_MS)
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(t) }
  }, [celebration, clear])

  if (!celebration) return null

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden flex items-center justify-center">
      {/* velvet curtains framing the edges */}
      <div className="encore-curtain-l absolute inset-y-0 left-0 w-[16%] bg-gradient-to-r from-[#3a1020] to-transparent" />
      <div className="encore-curtain-r absolute inset-y-0 right-0 w-[16%] bg-gradient-to-l from-[#3a1020] to-transparent" />
      {/* gold bloom */}
      <div
        className="encore-bloom absolute w-[42rem] h-[42rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.55) 0%, rgba(212,168,67,0.12) 35%, transparent 70%)' }}
      />
      {/* multiplier count-up */}
      <div className="encore-pop relative text-center">
        <div className="font-display text-sm uppercase tracking-[0.3em] text-accent-gold/80">Encore</div>
        <div className="font-display font-bold text-7xl text-accent-gold drop-shadow-[0_0_24px_rgba(212,168,67,0.6)] tabular-nums">
          ×{formatNumber(shown, 2)}
        </div>
      </div>
    </div>
  )
}
