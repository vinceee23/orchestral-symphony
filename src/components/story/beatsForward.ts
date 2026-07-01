import type { StoryBeatId, StoryBeatDefinition } from './beats'

/**
 * L4+ forward story beats — the SPOILER lines (the gods' voice for Signature and beyond).
 * Kept out of beats.ts so the TRIAL build tree-shakes this module away entirely:
 * beats.ts includes these only under `L4_UNLOCKED ? … : stubs`, which Rollup folds at build time.
 * scripts/check-trial-spoilers.mjs (postbuild) fails the build if any of these lines reach a trial dist.
 */
export const FORWARD_STORY_BEATS: Record<string, StoryBeatDefinition> = {
  signature: {
    id: 'signature' as StoryBeatId,
    goldLevel: 0.75,
    lines: [
      'Now you sound like no one else.',
      'Now you sound like… one of us.',
      '…Curious.',
    ],
  },
  virtuoso: {
    id: 'virtuoso' as StoryBeatId,
    goldLevel: 0.82,
    lines: [
      'There is nothing left for the living to teach you.',
      '(We were never the living.)',
    ],
  },
  canon: {
    id: 'canon' as StoryBeatId,
    goldLevel: 0.88,
    lines: [
      'They will play your work long after you are dust.',
      'Mortals call that immortality.',
      'We call it a beginning.',
    ],
  },
  redemption: {
    id: 'redemption' as StoryBeatId,
    goldLevel: 0.12,
    lines: [
      'Then: silence.',
      'The records gather dust. The world forgets your name.',
      '…But the applause never stopped.',
      'It was never theirs. It was ours.',
      'Rise. Show us the first time was no accident. Come.',
    ],
  },
  the_gods: {
    id: 'the_gods' as StoryBeatId,
    goldLevel: 0.05,
    lines: [
      'Anyone can rise once.',
      'You fell, and rose again.',
      'Now you know our faces.',
      'Stand with us.',
    ],
  },
}

// NOTE: the trial-build stubs live in beats.ts (NOT here) — deriving them from this object would
// create a runtime dependency that defeats the tree-shake and ships the lines anyway.
