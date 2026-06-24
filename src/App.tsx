import { useGameLoop } from './hooks/useGameLoop'
import { useAutoSave } from './hooks/useAutoSave'
import { useHotkeys } from './hooks/useHotkeys'
import { AppShell } from './components/layout/AppShell'
import { FloatingNotes } from './components/shared/FloatingNotes'
import { AchievementToast } from './components/shared/AchievementToast'

function App() {
  useGameLoop()
  useAutoSave()
  useHotkeys()

  return (
    <>
      <FloatingNotes />
      <AchievementToast />
      <AppShell />
    </>
  )
}

export default App
