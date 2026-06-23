import { useGameLoop } from './hooks/useGameLoop'
import { useAutoSave } from './hooks/useAutoSave'
import { AppShell } from './components/layout/AppShell'
import { FloatingNotes } from './components/shared/FloatingNotes'
import { AchievementToast } from './components/shared/AchievementToast'

function App() {
  useGameLoop()
  useAutoSave()

  return (
    <>
      <FloatingNotes />
      <AchievementToast />
      <AppShell />
    </>
  )
}

export default App
