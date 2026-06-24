import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { ACHIEVEMENTS, type AchievementConfig } from '../../core/achievements'
import { getMilestoneTickspeedMultiplier } from '../../core/formulas'

const COLS = 7

function achievementDisplay(ach: AchievementConfig, unlocked: boolean) {
  const masked = Boolean(ach.hidden) && !unlocked
  return {
    masked,
    name: masked ? '???' : ach.name,
    description: masked ? '???' : ach.description,
    rewardDescription: masked ? '???' : ach.rewardDescription,
  }
}

function AchievementImage({
  id,
  icon,
  dim,
  masked,
}: {
  id: string
  icon: string
  dim: boolean
  masked: boolean
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [id])

  const dimClass = dim ? 'grayscale opacity-40' : ''

  if (masked) {
    return (
      <span className={`flex items-center justify-center w-full h-full text-lg font-display text-text-muted ${dimClass}`}>
        ???
      </span>
    )
  }

  if (failed) {
    return (
      <span className={`flex items-center justify-center w-full h-full ${dimClass}`}>
        {icon}
      </span>
    )
  }

  return (
    <img
      src={`/achievements/${id}.jpg`}
      alt=""
      className={`w-full h-full object-cover ${dimClass}`}
      onError={() => setFailed(true)}
    />
  )
}

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
  const displayedInfo = displayed ? achievementDisplay(displayed, isDisplayedUnlocked) : null

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
    <div className="p-6 md:p-8 max-w-4xl mx-auto h-full space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-text-primary">Achievements</h1>
        <p className="text-sm text-text-secondary mt-2 tabular-nums">
          {achievements.length} / {ACHIEVEMENTS.length} unlocked
        </p>
        {milestonePercent > 0 && (
          <p className="text-xs text-accent-purple mt-2 tabular-nums">
            Milestone rows bonus: +{milestonePercent}% tick speed
          </p>
        )}
      </header>

      <div className="flex gap-6">
        {/* Left: Grid */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-accent-gold"
              />
              <span className="text-xs text-text-muted">Hide completed rows</span>
            </label>
          </div>

          <div className="space-y-3">
            {visibleRows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-7 gap-3">
                {row.map((ach) => {
                  const unlocked = achievementSet.has(ach.id)
                  const info = achievementDisplay(ach, unlocked)
                  const isSelected = selectedId === ach.id
                  return (
                    <button
                      key={ach.id}
                      onMouseEnter={() => setHoveredId(ach.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => setSelectedId(isSelected ? null : ach.id)}
                      className={`
                        relative aspect-square rounded-xl border overflow-hidden text-2xl transition-all duration-200
                        ${unlocked
                          ? 'bg-accent-gold/10 border-accent-gold/40 shadow-[0_0_8px_rgba(255,215,0,0.15)]'
                          : 'bg-bg-secondary/50 border-border grayscale opacity-40'
                        }
                        ${isSelected ? 'ring-2 ring-accent-gold/60' : ''}
                        hover:scale-105
                      `}
                      title={!unlocked && !info.masked ? info.description : undefined}
                    >
                      {ach.reward.perk && (
                        <span className="absolute top-0.5 right-0.5 z-10 text-[9px] leading-none bg-accent-purple/25 text-accent-purple px-1 py-0.5 rounded font-medium">
                          PERK
                        </span>
                      )}
                      <AchievementImage
                        id={ach.id}
                        icon={ach.icon}
                        dim={!unlocked}
                        masked={info.masked}
                      />
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {hideCompleted && hiddenCount > 0 && (
            <p className="text-xs text-text-muted text-center">
              {hiddenCount} completed row{hiddenCount > 1 ? 's' : ''} hidden
            </p>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="w-72 shrink-0">
          {displayed && displayedInfo ? (
            <div className={`p-4 rounded-xl border sticky top-4 transition-all space-y-3 ${
              isDisplayedUnlocked
                ? 'bg-accent-gold/5 border-accent-gold/30'
                : 'bg-bg-secondary/40 border-border'
            }`}>
              <div className="aspect-video rounded-xl overflow-hidden text-4xl">
                <AchievementImage
                  id={displayed.id}
                  icon={displayed.icon}
                  dim={!isDisplayedUnlocked}
                  masked={displayedInfo.masked}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isDisplayedUnlocked && (
                  <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-lg font-medium">UNLOCKED</span>
                )}
                {!isDisplayedUnlocked && !displayedInfo.masked && (
                  <span className="text-xs bg-bg-secondary text-text-muted px-2 py-0.5 rounded-lg font-medium">LOCKED</span>
                )}
                {displayed.reward.perk && (
                  <span className="text-xs bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded-lg font-medium">PERK</span>
                )}
              </div>
              <div className={`text-base font-display font-semibold ${isDisplayedUnlocked ? 'text-accent-gold' : 'text-text-secondary'}`}>
                {displayedInfo.name}
              </div>
              <div className="text-sm text-text-secondary leading-relaxed">{displayedInfo.description}</div>
              <div className="border-t border-border/50 pt-3 space-y-1">
                <div className="text-xs text-text-muted uppercase tracking-wider">Reward</div>
                <div className={`text-sm ${
                  displayed.reward.none
                    ? 'text-text-muted italic'
                    : displayed.reward.perk
                      ? 'text-accent-purple'
                      : 'text-success'
                }`}>
                  {displayedInfo.rewardDescription}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-border bg-bg-secondary/40 text-center sticky top-4 space-y-2">
              <div className="text-2xl opacity-30">{'\u{1F3B5}'}</div>
              <span className="text-sm text-text-muted">
                Click an achievement to see details
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
