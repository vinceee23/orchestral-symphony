import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { ACHIEVEMENTS } from '../../core/achievements'
import { getMilestoneTickspeedMultiplier } from '../../core/formulas'

const COLS = 7

export function AchievementsPage() {
  const achievements = useGameStore((s) => s.achievements)
  const tiers = useGameStore((s) => s.tiers)
  const achievementSet = new Set(achievements)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hideCompleted, setHideCompleted] = useState(false)

  const displayId = hoveredId ?? selectedId
  const displayed = displayId ? ACHIEVEMENTS.find((a) => a.id === displayId) : null
  const isDisplayedUnlocked = displayId ? achievementSet.has(displayId) : false

  const milestoneMult = getMilestoneTickspeedMultiplier(tiers)
  const milestonePercent = Math.round((milestoneMult - 1) * 100)

  // Split achievements into rows of 7
  const rows: typeof ACHIEVEMENTS[] = []
  for (let i = 0; i < ACHIEVEMENTS.length; i += COLS) {
    rows.push(ACHIEVEMENTS.slice(i, i + COLS))
  }

  // Determine which rows are fully completed
  const isRowComplete = (row: typeof ACHIEVEMENTS) =>
    row.every((ach) => achievementSet.has(ach.id))

  const visibleRows = hideCompleted ? rows.filter((row) => !isRowComplete(row)) : rows
  const hiddenCount = rows.length - visibleRows.length

  return (
    <div className="p-4 md:p-6 h-full">
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Achievements</h2>
        <p className="text-sm text-text-secondary">
          {achievements.length} / {ACHIEVEMENTS.length} unlocked
        </p>
        {milestonePercent > 0 && (
          <p className="text-xs text-accent-purple mt-1">
            Milestone rows bonus: +{milestonePercent}% tick speed
          </p>
        )}
      </div>

      <div className="flex gap-4">
        {/* Left: Grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-end mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border accent-accent-gold"
              />
              <span className="text-[10px] text-text-muted">Hide completed rows</span>
            </label>
          </div>

          <div className="space-y-2">
            {visibleRows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-7 gap-2">
                {row.map((ach) => {
                  const unlocked = achievementSet.has(ach.id)
                  const isSelected = selectedId === ach.id
                  return (
                    <button
                      key={ach.id}
                      onMouseEnter={() => setHoveredId(ach.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => setSelectedId(isSelected ? null : ach.id)}
                      className={`
                        aspect-square rounded-lg border flex items-center justify-center text-2xl transition-all duration-200
                        ${unlocked
                          ? 'bg-accent-gold/10 border-accent-gold/40 shadow-[0_0_8px_rgba(255,215,0,0.15)]'
                          : 'bg-bg-secondary/50 border-border/50 grayscale opacity-40'
                        }
                        ${isSelected ? 'ring-2 ring-accent-gold/60' : ''}
                        hover:scale-105
                      `}
                    >
                      {ach.icon}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {hideCompleted && hiddenCount > 0 && (
            <p className="text-[10px] text-text-muted text-center mt-2">
              {hiddenCount} completed row{hiddenCount > 1 ? 's' : ''} hidden
            </p>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="w-64 shrink-0">
          {displayed ? (
            <div className={`p-4 rounded-lg border sticky top-4 transition-all ${
              isDisplayedUnlocked
                ? 'bg-accent-gold/5 border-accent-gold/30'
                : 'bg-bg-secondary border-border'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{displayed.icon}</span>
                {isDisplayedUnlocked && (
                  <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded">UNLOCKED</span>
                )}
              </div>
              <div className={`text-sm font-semibold mb-1 ${isDisplayedUnlocked ? 'text-accent-gold' : 'text-text-secondary'}`}>
                {displayed.name}
              </div>
              <div className="text-xs text-text-secondary mb-2">{displayed.description}</div>
              <div className="border-t border-border/50 pt-2">
                <div className="text-[10px] text-text-muted uppercase mb-1">Reward</div>
                <div className={`text-xs ${displayed.reward.none ? 'text-text-muted italic' : 'text-success'}`}>
                  {displayed.rewardDescription}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-border bg-bg-secondary text-center sticky top-4">
              <div className="text-2xl mb-2 opacity-30">{'\u{1F3B5}'}</div>
              <span className="text-xs text-text-muted">
                Click an achievement to see details
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
