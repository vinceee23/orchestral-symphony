import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { AUTOSAVE_INTERVAL_MS } from '../core/constants'

export function useAutoSave() {
  useEffect(() => {
    const interval = setInterval(() => {
      useGameStore.setState({ lastSaveTimestamp: Date.now() })
      // Zustand persist middleware auto-saves on every setState,
      // so updating the timestamp triggers the save
    }, AUTOSAVE_INTERVAL_MS)

    // Save on page unload
    const handleUnload = () => {
      useGameStore.setState({ lastSaveTimestamp: Date.now() })
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])
}
