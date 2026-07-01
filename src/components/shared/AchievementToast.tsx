import { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import { ACHIEVEMENTS } from '../../core/achievements'
import { playAchievementSound } from '../../core/audio'

interface ToastItem {
  id: string
  name: string
  icon: string
  rewardDescription: string
  key: number
}

let toastKey = 0

export function AchievementToast() {
  const achievements = useGameStore((s) => s.achievements)
  const prevCountRef = useRef(achievements.length)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    if (achievements.length <= prevCountRef.current) {
      prevCountRef.current = achievements.length
      return
    }

    // Find newly added achievements
    const newIds = achievements.slice(prevCountRef.current)
    prevCountRef.current = achievements.length

    // A large batch landing at once = a bulk grant (dev layer-jump / migration), not organic play.
    // Don't storm the screen with a minutes-long toast train.
    if (newIds.length > 8) return

    const newToasts: ToastItem[] = []
    for (const id of newIds) {
      const ach = ACHIEVEMENTS.find((a) => a.id === id)
      if (ach) {
        newToasts.push({
          id: ach.id,
          name: ach.name,
          icon: ach.icon,
          rewardDescription: ach.rewardDescription,
          key: ++toastKey,
        })
      }
    }

    if (newToasts.length > 0) {
      setToasts((prev) => [...prev, ...newToasts])
      playAchievementSound() // a bright chime on a new unlock (one per batch, however many landed)
    }
  }, [achievements])

  // Auto-dismiss after 4s
  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, 4000)
    return () => clearTimeout(timer)
  }, [toasts])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.key}
          className="pointer-events-auto animate-slide-in-right bg-bg-primary/95 backdrop-blur border border-accent-gold/40 rounded-lg p-3 shadow-lg shadow-accent-gold/10 max-w-xs"
        >
          <div className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}achievements/${toast.id}.png`}
              alt=""
              className="w-9 h-9 shrink-0 rounded object-cover"
              onError={(e) => { e.currentTarget.src = `${import.meta.env.BASE_URL}achievements/_placeholder.png` }}
            />
            <div className="min-w-0">
              <div className="text-xs text-accent-gold font-semibold truncate">
                {toast.name}
              </div>
              <div className="text-[10px] text-text-muted">
                {toast.rewardDescription}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
