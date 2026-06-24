import { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ComposePage } from '../compose/ComposePage'
import { PrestigePage } from '../prestige/PrestigePage'
import { AchievementsPage } from '../achievements/AchievementsPage'
import { ChallengesPage } from '../challenges/ChallengesPage'
import { OpusPage } from '../opus/OpusPage'
import { AutobuyersPage } from '../autobuyers/AutobuyersPage'
import { StatsPanel } from '../shared/StatsPanel'

// Dev/screenshot convenience: open a specific tab with ?tab=prestige (etc.). Harmless in prod.
const initialTab = (() => {
  const m = /[?&]tab=([a-z]+)/.exec(location.search)
  return m ? m[1] : 'compose'
})()

export function AppShell() {
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {activeTab === 'compose' && <ComposePage />}
          {activeTab === 'prestige' && <PrestigePage />}
          {activeTab === 'opus' && <OpusPage />}
          {activeTab === 'autobuyers' && <AutobuyersPage />}
          {activeTab === 'achievements' && <AchievementsPage />}
          {activeTab === 'challenges' && <ChallengesPage />}
          {activeTab === 'stats' && <StatsPanel />}
        </main>
      </div>
    </div>
  )
}
