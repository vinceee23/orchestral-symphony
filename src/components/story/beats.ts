import type { GameState } from '../../store/types'
import { L4_UNLOCKED, L4_VISIBLE } from '../../core/constants'
import { FORWARD_STORY_BEATS } from './beatsForward'

/** Story beat ids — extend with L4–L9 when those layers ship. */
export type StoryBeatId =
  | 'intro'
  | 'encore'
  | 'first_wall'
  | 'magnum_opus'
  | 'first_records'
  | 'platinum'
  | 'world_tour'
  | 'trial_complete'   // trial build only (L4_UNLOCKED false)
  | 'circuit_complete' // full game only — the L4 Signature reveal
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
  'first_wall',
  'magnum_opus',
  'first_records',
  'platinum',
  'world_tour',
  'trial_complete',
  'circuit_complete',
  'signature',
  'grand_finale',
]

export const STORY_BEATS: Record<StoryBeatId, StoryBeatDefinition> = {
  intro: {
    id: 'intro',
    goldLevel: 0.15,
    lines: [
      'Before the first note, there was silence.',
      'You reached into it.',
      'Something reached back.',
    ],
  },
  encore: {
    id: 'encore',
    goldLevel: 0.25,
    lines: [
      'Again. You play it again.',
      'The first sign of someone who refuses to be forgotten.',
      'Something in the dark keeps time with you. You do not hear it yet.',
    ],
  },
  first_wall: {
    id: 'first_wall',
    goldLevel: 0.32,
    lines: [
      'You have pushed this as far as it will go.',
      'Every musician meets this wall. Most turn back.',
      'Become something larger.',
    ],
  },
  magnum_opus: {
    id: 'magnum_opus',
    goldLevel: 0.4,
    lines: [
      'Not a song this time. A work.',
      'Something that outlives the hand that made it.',
      'A breath moves through it that was never yours.',
    ],
  },
  first_records: {
    id: 'first_records',
    goldLevel: 0.48,
    lines: [
      'Your work leaves your hands now.',
      'Somewhere a stranger hears it, and goes still.',
      'This is how a name begins.',
    ],
  },
  platinum: {
    id: 'platinum',
    goldLevel: 0.55,
    lines: [
      'A million voices sing your name.',
      'Something in the dark turns to listen.',
      '…Who are you, young musician?',
    ],
  },
  world_tour: {
    id: 'world_tour',
    goldLevel: 0.7,
    lines: [
      'The world is learning your name.',
      'We have known a thousand names.',
      'They are all quiet now.',
    ],
  },
  trial_complete: {
    id: 'trial_complete',
    goldLevel: 0.78,
    lines: [
      'The last venue empties into silence.',
      'Six stages carried your name as far as this trial can take it.',
      'The Sonance continues...',
    ],
  },
  // Full-game capstone of the L3 circuit — the moment L4 Signature is revealed.
  circuit_complete: {
    id: 'circuit_complete',
    goldLevel: 0.78,
    lines: [
      'The last venue empties into silence.',
      'Six stages carried your name as far as the circuit reaches.',
      'What comes next is not louder — it is only, unmistakably, yours.',
    ],
  },
  grand_finale: {
    id: 'grand_finale',
    goldLevel: 1,
    lines: [
      'The greatest performance of your life.',
      'The last note rings out, and fades.',
      'This is the end of the song.',
    ],
  },
  // --- L4–L9 forward beats: real lines live in beatsForward.ts, included only in FULL-GAME builds.
  // The trial ships line-less stubs (these beats are condition-gated off in the trial anyway), so the
  // gods' voice can't be datamined out of the public bundle. Rollup folds the ternary at build time;
  // scripts/check-trial-spoilers.mjs (postbuild) enforces it stays that way.
  ...(L4_UNLOCKED
    ? (FORWARD_STORY_BEATS as Record<'signature' | 'virtuoso' | 'canon' | 'redemption' | 'the_gods', StoryBeatDefinition>)
    : {
        signature: { id: 'signature', goldLevel: 0.75, lines: [] },
        virtuoso: { id: 'virtuoso', goldLevel: 0.82, lines: [] },
        canon: { id: 'canon', goldLevel: 0.88, lines: [] },
        redemption: { id: 'redemption', goldLevel: 0.12, lines: [] },
        the_gods: { id: 'the_gods', goldLevel: 0.05, lines: [] },
      } satisfies Record<'signature' | 'virtuoso' | 'canon' | 'redemption' | 'the_gods', StoryBeatDefinition>),
}

type BeatGateState = Pick<
  GameState,
  'encoreCount' | 'lifetimeEncoreCount' | 'opusCount' | 'platinum' | 'worldTourUnlocked'
  | 'layer1WallReached' | 'recordsSold' | 'signatureCount' | 'circuitComplete' | 'finaleCount'
>

/** Whether a beat's milestone condition is satisfied (independent of seenStoryBeats). */
export function isBeatConditionMet(id: StoryBeatId, state: BeatGateState): boolean {
  switch (id) {
    case 'intro':
      return true
    case 'encore':
      return state.encoreCount >= 1 || state.lifetimeEncoreCount >= 1
    case 'first_wall':
      return state.layer1WallReached
    case 'magnum_opus':
      return state.opusCount >= 1
    case 'first_records':
      return state.recordsSold >= 1
    case 'platinum':
      return state.platinum
    case 'world_tour':
      return state.worldTourUnlocked
    case 'trial_complete':
      return state.circuitComplete && !L4_UNLOCKED // trial build stops here
    case 'circuit_complete':
      return state.circuitComplete && L4_UNLOCKED // full game reveals L4 here
    case 'signature':
      // Defense-in-depth: signatureCount can't move in the trial, but gate on the flag anyway so the
      // gods-tease can never fire in a PROD trial build even via an imported/modified save.
      // L4_VISIBLE (not L4_UNLOCKED) so dev-server playtests still get the beat.
      return L4_VISIBLE && state.signatureCount >= 1
    case 'grand_finale':
      return state.finaleCount >= 1 // the 1.79e308 "infinity" event — reachable trial content
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
  | 'layer1WallReached'
  | 'recordsSold'
  | 'signatureCount'
  | 'circuitComplete'
  | 'finaleCount'
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
    || state.circuitComplete
    || state.signatureCount > 0
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
  if (state.layer1WallReached) seen.push('first_wall')
  if (state.opusCount >= 1) seen.push('magnum_opus')
  if (state.recordsSold >= 1) seen.push('first_records')
  if (state.platinum) seen.push('platinum')
  if (state.worldTourUnlocked) seen.push('world_tour')
  if (state.circuitComplete) seen.push(L4_UNLOCKED ? 'circuit_complete' : 'trial_complete')
  if (state.signatureCount >= 1) seen.push('signature')
  if (state.finaleCount >= 1) seen.push('grand_finale')
  return seen
}
