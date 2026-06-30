import { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { DEFAULT_HOTKEYS } from '../../core/constants'
import { useUiStore } from '../../store/uiStore'
import { getEra, eraTintCss, effectiveEra } from '../../core/eraTheme'
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
import { SettingsPanel } from '../shared/SettingsPanel'

// Dev/screenshot convenience: open a specific tab with ?tab=prestige (etc.). Harmless in prod.
const initialTab = (() => {
  const m = /[?&]tab=([a-z]+)/.exec(location.search)
  return m ? m[1] : 'compose'
})()

export function AppShell() {
  const [activeTab, setActiveTab] = useState(initialTab)

  // Global Conduct: TAP Space to trigger a crescendo burst from ANY tab (active after the first Magnum
  // Opus). Lives in the always-mounted shell so the listener spans tabs. The Compose "Conduct" button is
  // the other tap source (see uiStore.triggerConduct). No holding — a tap rides a fixed window, then decays.
  const opusCount = useGameStore((s) => s.opusCount)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const worldTourUnlocked = useGameStore((s) => s.worldTourUnlocked)
  const signatureCount = useGameStore((s) => s.signatureCount)
  const signatureUnlocked = useGameStore((s) => s.signatureUnlocked)
  const settings = useGameStore((s) => s.settings)
  const era = effectiveEra(getEra(lifetimeEncorePoints, opusCount, finalePoints, worldTourUnlocked, signatureCount), settings)
  useEffect(() => {
    if (opusCount <= 0) return
    const { triggerConduct, releaseConduct } = useUiStore.getState()
    // Tap Space to trigger a conduct burst (no holding). Repeat-keydown is ignored; tap again to sustain.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const conductKey = (useGameStore.getState().settings.hotkeys ?? DEFAULT_HOTKEYS).conduct
      const k = e.key === ' ' ? ' ' : e.key.toLowerCase()
      if (k !== conductKey) return
      const t = e.target as HTMLElement
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return
      e.preventDefault()
      triggerConduct()
    }
    const onBlur = () => releaseConduct()
    const onVisibility = () => { if (document.hidden) releaseConduct() }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
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
          {activeTab === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  )
}
