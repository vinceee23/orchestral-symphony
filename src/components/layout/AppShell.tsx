import { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ComposePage } from '../compose/ComposePage'
import { PrestigePage } from '../prestige/PrestigePage'
import { AchievementsPage } from '../achievements/AchievementsPage'
import { ChallengesPage } from '../challenges/ChallengesPage'
import { OpusPage } from '../opus/OpusPage'
import { StatsPanel } from '../shared/StatsPanel'

export function AppShell() {
  const [activeTab, setActiveTab] = useState('compose')

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'compose' && <ComposePage />}
          {activeTab === 'prestige' && <PrestigePage />}
          {activeTab === 'opus' && <OpusPage />}
          {activeTab === 'achievements' && <AchievementsPage />}
          {activeTab === 'challenges' && <ChallengesPage />}
          {activeTab === 'stats' && <StatsPanel />}
        </main>
      </div>
    </div>
  )
}
