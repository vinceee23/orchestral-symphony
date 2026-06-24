import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { TIER_COUNT } from '../core/constants'

/**
 * Keyboard shortcuts (AD-style, the "Max + Hold" QoL):
 *   1-7  buy that tier at the current buy-amount
 *   M    buy MAX of every tier
 *   T    buy MAX tempo
 * Hold any of them to repeat (~11x/sec) — hold M to keep maxing everything.
 */
const REPEAT_MS = 90

function buyTier(id: number) {
  const s = useGameStore.getState()
  if (s.buyAmount === 'max') s.buyMaxTier(id)
  else s.buyTier(id, s.buyAmount === 10 ? 10 : 1)
}

function act(key: string) {
  const s = useGameStore.getState()
  if (key >= '1' && key <= '7') buyTier(Number(key))
  else if (key === 'm') { for (let id = 1; id <= TIER_COUNT; id++) s.buyMaxTier(id); s.buyMaxTempo() } // max EVERYTHING (AD-style)
  else if (key === 't') s.buyMaxTempo()
}

const isHotkey = (k: string) => (k >= '1' && k <= '7') || k === 'm' || k === 't'

export function useHotkeys() {
  useEffect(() => {
    const held = new Set<string>()
    let timer: ReturnType<typeof setInterval> | null = null

    const stop = () => { if (timer) { clearInterval(timer); timer = null } }
    const onDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const k = e.key.toLowerCase()
      if (!isHotkey(k) || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      if (!held.has(k)) { held.add(k); act(k) } // fire immediately on first press
      if (timer === null) {
        timer = setInterval(() => {
          held.forEach(act)
          if (held.size === 0) stop()
        }, REPEAT_MS)
      }
    }
    const onUp = (e: KeyboardEvent) => { held.delete(e.key.toLowerCase()); if (held.size === 0) stop() }
    const onBlur = () => { held.clear(); stop() }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
      stop()
    }
  }, [])
}
