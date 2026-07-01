import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { getNextStoryBeat, type StoryBeatDefinition } from './beats'

/**
 * Resolves the next unseen story beat and manages the display lifecycle
 * (keeps the overlay mounted through the exit fade before marking seen).
 */
export function useStoryBeats() {
  const seenStoryBeats = useGameStore((s) => s.seenStoryBeats)
  const encoreCount = useGameStore((s) => s.encoreCount)
  const lifetimeEncoreCount = useGameStore((s) => s.lifetimeEncoreCount)
  const opusCount = useGameStore((s) => s.opusCount)
  const platinum = useGameStore((s) => s.platinum)
  const worldTourUnlocked = useGameStore((s) => s.worldTourUnlocked)
  const layer1WallReached = useGameStore((s) => s.layer1WallReached)
  const recordsSold = useGameStore((s) => s.recordsSold)
  const signatureCount = useGameStore((s) => s.signatureCount)
  const circuitComplete = useGameStore((s) => s.circuitComplete)
  const setStoryBeatSeen = useGameStore((s) => s.setStoryBeatSeen)

  const nextBeat = useMemo(
    () =>
      getNextStoryBeat(seenStoryBeats, {
        encoreCount,
        lifetimeEncoreCount,
        opusCount,
        platinum,
        worldTourUnlocked,
        layer1WallReached,
        recordsSold,
        signatureCount,
        circuitComplete,
      }),
    [
      seenStoryBeats, encoreCount, lifetimeEncoreCount, opusCount, platinum,
      worldTourUnlocked, layer1WallReached, recordsSold, signatureCount, circuitComplete,
    ],
  )

  const [displayedBeat, setDisplayedBeat] = useState<StoryBeatDefinition | null>(null)

  useEffect(() => {
    if (nextBeat && !displayedBeat) {
      setDisplayedBeat(nextBeat)
    }
  }, [nextBeat, displayedBeat])

  const dismiss = useCallback(() => {
    if (!displayedBeat) return
    setStoryBeatSeen(displayedBeat.id)
    setDisplayedBeat(null)
  }, [displayedBeat, setStoryBeatSeen])

  return { activeBeat: displayedBeat, dismiss }
}
