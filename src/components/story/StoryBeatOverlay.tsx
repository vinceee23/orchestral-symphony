import { StoryBeat } from './StoryBeat'
import { useStoryBeats } from './useStoryBeats'

/** Mount at app root — overlays the full game when a story beat triggers. */
export function StoryBeatOverlay() {
  const { activeBeat, dismiss } = useStoryBeats()

  if (!activeBeat) return null

  return (
    <StoryBeat
      key={activeBeat.id}
      lines={activeBeat.lines}
      goldLevel={activeBeat.goldLevel}
      onDone={dismiss}
      logo={activeBeat.id === 'intro'}
    />
  )
}
