import { useGameStore } from '../../store/gameStore'
import { Icon, type IconName } from '../shared/Icon'
import { getEra, eraTintCss } from '../../core/eraTheme'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const BASE_TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'compose', label: 'Compose', icon: 'note' },
  { id: 'prestige', label: 'Prestige', icon: 'sparkle' },
  { id: 'achievements', label: 'Achievements', icon: 'medal' },
  { id: 'stats', label: 'Stats', icon: 'bars' },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const opusCount = useGameStore((s) => s.opusCount)
  const worldTourUnlocked = useGameStore((s) => s.worldTourUnlocked)
  const signatureUnlocked = useGameStore((s) => s.signatureUnlocked)
  const signatureCount = useGameStore((s) => s.signatureCount)
  const lifetimeEncorePoints = useGameStore((s) => s.lifetimeEncorePoints)
  const finalePoints = useGameStore((s) => s.finalePoints)
  const era = getEra(lifetimeEncorePoints, opusCount, finalePoints, worldTourUnlocked, signatureCount)
  let tabs = opusCount > 0
    ? [
        BASE_TABS[0],
        BASE_TABS[1],
        { id: 'opus', label: 'Opus', icon: 'disc' as IconName },
        { id: 'autobuyers', label: 'Autobuyers', icon: 'gear' as IconName },
        ...BASE_TABS.slice(2),
      ]
    : BASE_TABS
  if (worldTourUnlocked) {
    const insertAt = tabs.findIndex((t) => t.id === 'autobuyers') + 1
    tabs = [
      ...tabs.slice(0, insertAt),
      { id: 'worldtour', label: 'World Tour', icon: 'sparkle' as IconName },
      { id: 'challenges', label: 'Challenges', icon: 'metronome' as IconName },
      ...tabs.slice(insertAt),
    ]
  }
  if (signatureUnlocked) {
    const worldTourIndex = tabs.findIndex((t) => t.id === 'worldtour')
    const autobuyersIndex = tabs.findIndex((t) => t.id === 'autobuyers')
    const insertAt = worldTourIndex >= 0
      ? worldTourIndex + 1
      : autobuyersIndex >= 0
        ? autobuyersIndex + 1
        : 2
    tabs = [
      ...tabs.slice(0, insertAt),
      { id: 'signature', label: 'Signature', icon: 'disc' as IconName },
      ...tabs.slice(insertAt),
    ]
  }

  return (
    <nav
      className="w-16 md:w-52 bg-bg-secondary border-r border-border flex flex-col py-4 gap-0.5 shrink-0"
      style={{ backgroundImage: eraTintCss(era) }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150
            ${activeTab === tab.id
              ? 'bg-bg-tertiary text-accent-gold border-r-2 border-accent-gold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }
          `}
        >
          <Icon name={tab.icon} size={21} />
          <span className="hidden md:inline text-sm font-medium tracking-wide">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
