import { create } from 'zustand'

// Ephemeral UI state (not persisted) — e.g. the Help overlay.
interface UiState {
  helpOpen: boolean
  toggleHelp: () => void
  setHelp: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  helpOpen: false,
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  setHelp: (open) => set({ helpOpen: open }),
}))
