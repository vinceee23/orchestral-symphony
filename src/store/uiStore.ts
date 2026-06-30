import { create } from 'zustand'
import type Decimal from 'break_infinity.js'
import { CONDUCT_BURST_MS } from '../core/constants'
import { playConductSound, playBuySound } from '../core/audio'

export interface OfflineSummary {
  awayMs: number
  soundwaves: Decimal
  records: number
  acclaim: Decimal
}

// Ephemeral UI state (not persisted) — e.g. the Help overlay, the Encore celebration.
interface UiState {
  helpOpen: boolean
  toggleHelp: () => void
  setHelp: (open: boolean) => void
  // "Welcome back" offline-earnings summary, set once at load from the offline replay; null = dismissed.
  offlineSummary: OfflineSummary | null
  setOfflineSummary: (s: OfflineSummary) => void
  clearOfflineSummary: () => void
  // Encore "monumental moment": from/to production multiplier for the count-up overlay.
  encoreCelebration: { from: number; to: number } | null
  celebrateEncore: (from: number, to: number) => void
  clearEncoreCelebration: () => void
  // Conduct is TAP-to-trigger (no holding — kills the sustained-hold ergonomic/RSI risk, genre-audit C4).
  // A tap (Spacebar from any tab, or the Compose button) starts/refreshes a fixed burst window during
  // which `conducting` is true and the crescendo swells; when the window lapses it decays. The game loop
  // calls expireConductIfDone() each frame to end the window. Auto-Conduct (idle floor) is independent.
  conducting: boolean
  conductBurstEndsAt: number | null
  triggerConduct: () => void
  expireConductIfDone: (now: number) => void
  releaseConduct: () => void
  // Last tier buy (from EITHER a pod click or a 1-7 hotkey) — drives the on-stage flash/+N juice + buy
  // sound from one place, so keyboard and mouse buys feel identical. seq makes each buy a distinct event.
  lastBuy: { tierId: number; amount?: number; seq: number } | null
  registerBuy: (tierId: number, amount?: number) => void
  // DEV-only pacing tool: game-loop time multiplier (1 = normal). See DevPanel + useGameLoop.
  devSpeed: number
  setDevSpeed: (n: number) => void
}

export const useUiStore = create<UiState>((set) => ({
  helpOpen: false,
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  setHelp: (open) => set({ helpOpen: open }),
  offlineSummary: null,
  setOfflineSummary: (s) => set({ offlineSummary: s }),
  clearOfflineSummary: () => set({ offlineSummary: null }),
  encoreCelebration: null,
  celebrateEncore: (from, to) => set({ encoreCelebration: { from, to } }),
  clearEncoreCelebration: () => set({ encoreCelebration: null }),
  conducting: false,
  conductBurstEndsAt: null,
  triggerConduct: () => {
    playConductSound() // the core musical verb — one sound per tap/press (button + global Space)
    set({ conducting: true, conductBurstEndsAt: performance.now() + CONDUCT_BURST_MS })
  },
  expireConductIfDone: (now) =>
    set((s) => (s.conductBurstEndsAt !== null && now >= s.conductBurstEndsAt
      ? { conducting: false, conductBurstEndsAt: null }
      : {})),
  releaseConduct: () => set({ conducting: false, conductBurstEndsAt: null }),
  lastBuy: null,
  registerBuy: (tierId, amount) => {
    playBuySound(tierId) // rate-gated in audio.ts; one place for buy sound (click + hotkey)
    set((s) => ({ lastBuy: { tierId, amount, seq: (s.lastBuy?.seq ?? 0) + 1 } }))
  },
  devSpeed: 1,
  setDevSpeed: (n) => set({ devSpeed: n }),
}))
