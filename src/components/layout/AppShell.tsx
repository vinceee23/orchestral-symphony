import { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useUiStore } from '../../store/uiStore'
import { getEra, eraTintCss } from '../../core/eraTheme'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ComposePage } from '../compose/ComposePage'
import { PrestigePage } from '../prestige/PrestigePage'
import { AchievementsPage } from '../achievements/AchievementsPage'
import { ChallengesPage } from '../challenges/ChallengesPage'
import { OpusPage } from '../opus/OpusPage'
import { AutobuyersPage } from '../autobuyers/AutobuyersPage'
import { WorldTourPage } from '../worldtour/WorldTourPage'
import { SignaturePage } from '../signature/SignaturePage'
import { StatsPanel } from '../shared/StatsPanel'

// Dev/screenshot convenience: open a specific tab with ?tab=prestige (etc.). Harmless in prod.
const initialTab = (() => {
  const m = /[?&]tab=([a-z]+)/.exec(location.search)
  return m ? m[1] : 'compose'
})()

export function AppShell() {
  const [activeTab, setActiveTab] = useState(initialTab)

  // Global Conduct: hold Space to swell the crescendo from ANY tab (active after the first Magnum
  // Opus). Lives in the always-mounted shell so switching tabs doesn't drop the hold. The pointer
  // "Conduct" button on the Compose stage is the other held-source (see uiStore.setPointerHeld).
  const opusCount = useGameStore((s) => s.opusCount)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const worldTourUnlocked = useGameStore((s) => s.worldTourUnlocked)
  const signatureCount = useGameStore((s) => s.signatureCount)
  const signatureUnlocked = useGameStore((s) => s.signatureUnlocked)
  const era = getEra(lifetimeEncorePoints, opusCount, finalePoints, worldTourUnlocked, signatureCount)
  useEffect(() => {
    if (opusCount <= 0) return
    const { setSpaceHeld, releaseConduct } = useUiStore.getState()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      const t = e.target as HTMLElement
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return
      e.preventDefault()
      setSpaceHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    const onBlur = () => releaseConduct()
    const onVisibility = () => { if (document.hidden) releaseConduct() }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
      releaseConduct()
    }
  }, [opusCount])

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        {/* main starts after the sidebar, so centered content lands right-of-screen. Padding-right ==
            sidebar width (w-16/w-52) makes the centering box symmetric about the TRUE viewport. Compose
            is full-bleed (its stage centers itself), so skip it. */}
        <main
          className={`flex-1 min-w-0 overflow-y-auto ${activeTab === 'compose' ? '' : 'pr-16 md:pr-52'}`}
          style={{ backgroundImage: eraTintCss(era, 0.7) }}
        >
          {activeTab === 'compose' && <ComposePage />}
          {activeTab === 'prestige' && <PrestigePage />}
          {activeTab === 'opus' && <OpusPage />}
          {activeTab === 'autobuyers' && <AutobuyersPage />}
          {activeTab === 'worldtour' && <WorldTourPage />}
          {activeTab === 'signature' && signatureUnlocked && <SignaturePage />}
          {activeTab === 'achievements' && <AchievementsPage />}
          {activeTab === 'challenges' && <ChallengesPage />}
          {activeTab === 'stats' && <StatsPanel />}
        </main>
      </div>
    </div>
  )
}
