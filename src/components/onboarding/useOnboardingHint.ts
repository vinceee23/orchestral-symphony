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

  const activeHint =
    displayedHint &&
    !seenHints.includes(displayedHint.id) &&
    displayedHint.isMet(state)
      ? displayedHint
      : null

  useEffect(() => {
    if (displayedHint) return
    const nextHint = getNextOnboardingHint(seenHints, state)
    if (nextHint) setDisplayedHint(nextHint)
  }, [displayedHint, seenHints, state])

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
