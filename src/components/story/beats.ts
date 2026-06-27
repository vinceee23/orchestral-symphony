import type { GameState } from '../../store/types'

/** Story beat ids — extend with L4–L9 when those layers ship. */
export type StoryBeatId =
  | 'intro'
  | 'encore'
  | 'magnum_opus'
  | 'platinum'
  | 'world_tour'
  // Future (copy in STORY-SPEC §7; triggers not wired yet):
  | 'signature'
  | 'virtuoso'
  | 'canon'
  | 'grand_finale'
  | 'redemption'
  | 'the_gods'

export interface StoryBeatDefinition {
  id: StoryBeatId
  /** 0..1 — gold/black balance for the breathing orb (rises L1→L7, inverts L8+). */
  goldLevel: number
  lines: string[]
}

/** Reachable beats in narrative order — only these fire in the current build. */
export const STORY_BEAT_ORDER: StoryBeatId[] = [
  'intro',
  'encore',
  'magnum_opus',
  'platinum',
  'world_tour',
]

export const STORY_BEATS: Record<StoryBeatId, StoryBeatDefinition> = {
  intro: {
    id: 'intro',
    goldLevel: 0.15,
    lines: [
      'Before the first note, there was silence.',
      'Then you reached into the dark — and the dark answered.',
    ],
  },
  encore: {
    id: 'encore',
    goldLevel: 0.25,
    lines: [
      'You end. And you begin again. The mark of someone who means to be heard.',
    ],
  },
  magnum_opus: {
    id: 'magnum_opus',
    goldLevel: 0.4,
    lines: [
      'Not a song now. A work — something that outlives its own playing.',
    ],
  },
  platinum: {
    id: 'platinum',
    goldLevel: 0.55,
    lines: [
      'A million voices carry your name.',
      '…Who are you, young musician?',
    ],
  },
  world_tour: {
    id: 'world_tour',
    goldLevel: 0.7,
    lines: [
      'The world learns your name. We have always known names. They fade.',
    ],
  },
  // --- L4–L9: registry placeholders for future wiring ---
  signature: {
    id: 'signature',
    goldLevel: 0.75,
    lines: [
      'Now you sound like no one else. Now you sound like yourself. …Curious.',
    ],
  },
  virtuoso: {
    id: 'virtuoso',
    goldLevel: 0.82,
    lines: ['There is nothing left for the living to teach you.'],
  },
  canon: {
    id: 'canon',
    goldLevel: 0.88,
    lines: [
      'They will play your work when you are dust. The mortals call that immortality. We call it a beginning.',
    ],
  },
  grand_finale: {
    id: 'grand_finale',
    goldLevel: 1,
    lines: [
      'This is the greatest performance of your life. The last note. The end of the song.',
    ],
  },
  redemption: {
    id: 'redemption',
    goldLevel: 0.12,
    lines: [
      'Then — silence. The records gather dust. The world forgets your name.',
      '…The applause was never theirs. It was ours. Rise again, young musician — show us the first time was no accident. Come.',
    ],
  },
  the_gods: {
    id: 'the_gods',
    goldLevel: 0.05,
    lines: [
      'Anyone can rise once. You rose again. Now — stand with us.',
    ],
  },
}

type BeatGateState = Pick<
  GameState,
  'encoreCount' | 'lifetimeEncoreCount' | 'opusCount' | 'platinum' | 'worldTourUnlocked'
>

/** Whether a beat's milestone condition is satisfied (independent of seenStoryBeats). */
export function isBeatConditionMet(id: StoryBeatId, state: BeatGateState): boolean {
  switch (id) {
    case 'intro':
      return true
    case 'encore':
      return state.encoreCount >= 1 || state.lifetimeEncoreCount >= 1
    case 'magnum_opus':
      return state.opusCount >= 1
    case 'platinum':
      return state.platinum
    case 'world_tour':
      return state.worldTourUnlocked
    default:
      return false
  }
}

/** First unseen beat in narrative order whose trigger is met. */
export function getNextStoryBeat(
  seenStoryBeats: string[],
  state: BeatGateState,
): StoryBeatDefinition | null {
  const seen = new Set(seenStoryBeats)
  for (const id of STORY_BEAT_ORDER) {
    if (seen.has(id)) continue
    if (!isBeatConditionMet(id, state)) continue
    return STORY_BEATS[id]
  }
  return null
}

type MigrationState = Pick<
  GameState,
  | 'lifetimeEncorePoints'
  | 'encoreCount'
  | 'lifetimeEncoreCount'
  | 'opusCount'
  | 'platinum'
  | 'worldTourUnlocked'
>

/** True when a save predates story beats and already has meaningful progress. */
export function hasPreStoryProgress(state: MigrationState): boolean {
  return (
    state.lifetimeEncorePoints > 0
    || state.encoreCount > 0
    || state.lifetimeEncoreCount > 0
    || state.opusCount > 0
    || state.platinum
    || state.worldTourUnlocked
  )
}

/**
 * Seed seenStoryBeats for existing saves so milestones don't retroactively fire mid-game.
 * Only call when seenStoryBeats is empty on a save with prior progress.
 */
export function seedSeenStoryBeatsFromProgress(state: MigrationState): string[] {
  const seen: StoryBeatId[] = []
  if (hasPreStoryProgress(state)) seen.push('intro')
  if (state.lifetimeEncoreCount >= 1 || state.encoreCount >= 1) seen.push('encore')
  if (state.opusCount >= 1) seen.push('magnum_opus')
  if (state.platinum) seen.push('platinum')
  if (state.worldTourUnlocked) seen.push('world_tour')
  return seen
}
