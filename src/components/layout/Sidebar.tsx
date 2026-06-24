import { useGameStore } from '../../store/gameStore'
import { Icon, type IconName } from '../shared/Icon'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const BASE_TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'compose', label: 'Compose', icon: 'note' },
  { id: 'prestige', label: 'Prestige', icon: 'sparkle' },
  { id: 'achievements', label: 'Achievements', icon: 'medal' },
  { id: 'stats', label: 'Stats', icon: 'bars' },
  // Challenges hidden until Layer 5 (Virtuoso) — they ARE that layer's voluntary-difficulty content.
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const opusCount = useGameStore((s) => s.opusCount)
  const tabs = opusCount > 0
    ? [
        BASE_TABS[0],
        BASE_TABS[1],
        { id: 'opus', label: 'Opus', icon: 'sparkle' as IconName },
        ...BASE_TABS.slice(2),
      ]
    : BASE_TABS

  return (
    <nav className="w-14 md:w-44 bg-bg-secondary border-r border-border flex flex-col py-3 shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-150
            ${activeTab === tab.id
              ? 'bg-bg-tertiary text-accent-gold border-r-2 border-accent-gold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }
          `}
        >
          <Icon name={tab.icon} size={20} />
          <span className="hidden md:inline text-sm font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
