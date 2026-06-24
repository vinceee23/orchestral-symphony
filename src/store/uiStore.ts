import { create } from 'zustand'

// Ephemeral UI state (not persisted) — e.g. the Help overlay, the Encore celebration.
interface UiState {
  helpOpen: boolean
  toggleHelp: () => void
  setHelp: (open: boolean) => void
  // Encore "monumental moment": from/to production multiplier for the count-up overlay.
  encoreCelebration: { from: number; to: number } | null
  celebrateEncore: (from: number, to: number) => void
  clearEncoreCelebration: () => void
  // Conduct from TWO independent held-sources — Spacebar (global, any tab) and the pointer button
  // (Compose only). conducting = either is held, so neither release can cancel the other's hold.
  spaceHeld: boolean
  pointerHeld: boolean
  conducting: boolean
  setSpaceHeld: (b: boolean) => void
  setPointerHeld: (b: boolean) => void
  releaseConduct: () => void
  // DEV-only pacing tool: game-loop time multiplier (1 = normal). See DevPanel + useGameLoop.
  devSpeed: number
  setDevSpeed: (n: number) => void
}

export const useUiStore = create<UiState>((set) => ({
  helpOpen: false,
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  setHelp: (open) => set({ helpOpen: open }),
  encoreCelebration: null,
  celebrateEncore: (from, to) => set({ encoreCelebration: { from, to } }),
  clearEncoreCelebration: () => set({ encoreCelebration: null }),
  spaceHeld: false,
  pointerHeld: false,
  conducting: false,
  setSpaceHeld: (b) => set((s) => ({ spaceHeld: b, conducting: b || s.pointerHeld })),
  setPointerHeld: (b) => set((s) => ({ pointerHeld: b, conducting: s.spaceHeld || b })),
  releaseConduct: () => set({ spaceHeld: false, pointerHeld: false, conducting: false }),
  devSpeed: 1,
  setDevSpeed: (n) => set({ devSpeed: n }),
}))
