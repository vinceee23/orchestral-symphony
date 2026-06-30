import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { useUiStore } from '../store/uiStore'
import { TIER_COUNT, DEFAULT_HOTKEYS } from '../core/constants'
import { playTempoSound } from '../core/audio'

/**
 * Keyboard shortcuts (AD-style, the "Max + Hold" QoL):
 *   1-7  buy that tier at the current buy-amount
 *   M    buy MAX of every tier
 *   T    buy MAX tempo
 * Hold any of them to repeat (~11x/sec) — hold M to keep maxing everything.
 */
const REPEAT_MS = 90

// Buy, then register it (sound + on-stage flash/+N) only if a purchase actually happened (soundwaves
// changed) — so an unaffordable keypress is silent/inert, matching the pointer path. registerBuy unifies
// the juice so keyboard buys look + sound identical to clicking a pod. Max passes no amount (flash, no +N).
function buyTier(id: number) {
  const s = useGameStore.getState()
  const before = s.soundwaves
  const amount = s.buyAmount === 'max' ? undefined : (s.buyAmount === 10 ? 10 : 1)
  if (s.buyAmount === 'max') s.buyMaxTier(id)
  else s.buyTier(id, amount as number)
  if (!useGameStore.getState().soundwaves.eq(before)) useUiStore.getState().registerBuy(id, amount)
}

function act(key: string) {
  const s = useGameStore.getState()
  const hk = s.settings.hotkeys ?? DEFAULT_HOTKEYS
  if (key >= '1' && key <= '7') buyTier(Number(key))
  else if (key === hk.maxAll) {
    const before = s.soundwaves
    for (let id = 1; id <= TIER_COUNT; id++) s.buyMaxTier(id)
    s.buyMaxTempo()
    if (!useGameStore.getState().soundwaves.eq(before)) playTempoSound() // one flourish for the whole max-all
  } else if (key === hk.maxTempo) {
    const before = s.tempo.level
    s.buyMaxTempo()
    if (useGameStore.getState().tempo.level !== before) playTempoSound()
  }
}

const isHotkey = (k: string) => {
  const hk = useGameStore.getState().settings.hotkeys ?? DEFAULT_HOTKEYS
  return (k >= '1' && k <= '7') || k === hk.maxAll || k === hk.maxTempo
}

export function useHotkeys() {
  useEffect(() => {
    const held = new Set<string>()
    let timer: ReturnType<typeof setInterval> | null = null

    const stop = () => { if (timer) { clearInterval(timer); timer = null } }
    // Release every held key + halt repeat. Guards against AD's infamous stuck-key bug:
    // hold M, press H to open help, release M behind the modal — the keyup can be missed and M
    // "sticks". We never let that happen: opening help / losing focus always fully releases.
    const release = () => { held.clear(); stop() }
    const onDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const k = e.key.toLowerCase()
      const helpOpen = useUiStore.getState().helpOpen
      if (k === 'h') {
        if (!e.repeat) { e.preventDefault(); if (!helpOpen) release(); useUiStore.getState().toggleHelp() }
        return
      }
      if (k === 'escape') { useUiStore.getState().setHelp(false); return }
      if (helpOpen) return // modal open: swallow buy hotkeys so nothing fires behind it
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
    const onVisibility = () => { if (document.hidden) release() }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [])
}
