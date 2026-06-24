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
  conducting: boolean
  setConducting: (b: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  helpOpen: false,
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  setHelp: (open) => set({ helpOpen: open }),
  encoreCelebration: null,
  celebrateEncore: (from, to) => set({ encoreCelebration: { from, to } }),
  clearEncoreCelebration: () => set({ encoreCelebration: null }),
  conducting: false,
  setConducting: (b) => set({ conducting: b }),
}))
