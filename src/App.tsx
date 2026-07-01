import { useEffect } from 'react'
import { useGameLoop } from './hooks/useGameLoop'
import { useAutoSave } from './hooks/useAutoSave'
import { useHotkeys } from './hooks/useHotkeys'
import { useGameStore } from './store/gameStore'
import { applySettings } from './core/settingsSync'
import { AppShell } from './components/layout/AppShell'
import { AchievementToast } from './components/shared/AchievementToast'
import { HelpModal } from './components/shared/HelpModal'
import { EncoreCelebration } from './components/compose/EncoreCelebration'
import { StoryBeatOverlay } from './components/story/StoryBeatOverlay'
import { OfflineSummary } from './components/shared/OfflineSummary'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { DevPanel } from './dev/DevPanel'

function App() {
  useGameLoop()
  useAutoSave()
  useHotkeys()

  const settings = useGameStore((s) => s.settings)
  // Apply prefs to audio/format singletons + the reduced-motion document flag on load and every change.
  useEffect(() => {
    applySettings(settings, document.hidden)
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion)
  }, [settings])
  // Mute-when-unfocused: re-evaluate the audio mute as the tab is hidden/shown.
  useEffect(() => {
    const onVis = () => applySettings(useGameStore.getState().settings, document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return (
    <ErrorBoundary>
      <AchievementToast />
      <OfflineSummary />
      <StoryBeatOverlay />
      <AppShell />
      <HelpModal />
      <EncoreCelebration />
      <DevPanel />
    </ErrorBoundary>
  )
}

export default App
