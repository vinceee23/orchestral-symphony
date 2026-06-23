interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const TABS = [
  { id: 'compose', label: 'Compose', icon: '\u{1F3B5}' },
  { id: 'achievements', label: 'Achievements', icon: '\u{1F3C6}' },
  { id: 'challenges', label: 'Challenges', icon: '\u{2694}' },
  { id: 'stats', label: 'Stats', icon: '\u{1F4CA}' },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <nav className="w-14 md:w-44 bg-bg-secondary border-r border-border flex flex-col py-3 shrink-0">
      {TABS.map((tab) => (
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
          <span className="text-base">{tab.icon}</span>
          <span className="hidden md:inline text-sm font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
