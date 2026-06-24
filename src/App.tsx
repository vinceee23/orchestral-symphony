import { useGameLoop } from './hooks/useGameLoop'
import { useAutoSave } from './hooks/useAutoSave'
import { useHotkeys } from './hooks/useHotkeys'
import { AppShell } from './components/layout/AppShell'
import { AchievementToast } from './components/shared/AchievementToast'
import { HelpModal } from './components/shared/HelpModal'
import { EncoreCelebration } from './components/compose/EncoreCelebration'
import { DevPanel } from './dev/DevPanel'

function App() {
  useGameLoop()
  useAutoSave()
  useHotkeys()

  return (
    <>
      <AchievementToast />
      <AppShell />
      <HelpModal />
      <EncoreCelebration />
      <DevPanel />
    </>
  )
}

export default App
