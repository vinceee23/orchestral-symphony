import { useGameLoop } from './hooks/useGameLoop'
import { useAutoSave } from './hooks/useAutoSave'
import { useHotkeys } from './hooks/useHotkeys'
import { AppShell } from './components/layout/AppShell'
import { FloatingNotes } from './components/shared/FloatingNotes'
import { AchievementToast } from './components/shared/AchievementToast'
import { HelpModal } from './components/shared/HelpModal'

function App() {
  useGameLoop()
  useAutoSave()
  useHotkeys()

  return (
    <>
      <FloatingNotes />
      <AchievementToast />
      <AppShell />
      <HelpModal />
    </>
  )
}

export default App
