import { useCallback, useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import {
  getNextOnboardingHint,
  type OnboardingHintDefinition,
} from './hints'

export function useOnboardingHint() {
  const state = useGameStore((s) => s)
  const markHintSeen = useGameStore((s) => s.markHintSeen)
  const [displayedHint, setDisplayedHint] = useState<OnboardingHintDefinition | null>(null)
  const seenHints = state.seenHints ?? []
  // Player can disable layer tutorials in Settings (undefined = on, for pre-toggle saves).
  const tutorialsOn = state.settings?.showTutorials !== false

  const activeHint =
    tutorialsOn &&
    displayedHint &&
    !seenHints.includes(displayedHint.id) &&
    displayedHint.isMet(state)
      ? displayedHint
      : null

  useEffect(() => {
    if (displayedHint || !tutorialsOn) return
    const nextHint = getNextOnboardingHint(seenHints, state)
    if (nextHint) setDisplayedHint(nextHint)
  }, [displayedHint, seenHints, state, tutorialsOn])

  useEffect(() => {
    if (!displayedHint) return
    if (activeHint) return
    if (!seenHints.includes(displayedHint.id)) {
      markHintSeen(displayedHint.id)
    }
    setDisplayedHint(null)
  }, [activeHint, displayedHint, markHintSeen, seenHints])

  const dismiss = useCallback(() => {
    if (!displayedHint) return
    markHintSeen(displayedHint.id)
    setDisplayedHint(null)
  }, [displayedHint, markHintSeen])

  return { activeHint, dismiss }
}
