import type { GameState } from '../../store/types'
import { L4_UNLOCKED, getEncoreCost, getMagnumOpusCost } from '../../core/constants'
import { canUnlockWorldTour } from '../../core/worldTour'
import { CHALLENGES, getActiveChallengeModifiers, getChallengeById, isChallengeUnlocked } from '../../core/challenges'

export type OnboardingHintId =
  | 'first_buy'
  | 'conduct'
  | 'encore'
  | 'encore_done'
  | 'magnum_opus'
  | 'magnum_opus_done'
  | 'world_tour'
  | 'challenges'
  | 'signature'

export interface OnboardingHintDefinition {
  id: OnboardingHintId
  /** A one-line NUDGE (discovery — "you can do X now"). */
  text?: string
  /** A richer post-event ORIENTATION card (heading + 2-3 lines). When set, takes precedence over `text`. */
  title?: string
  body?: string[]
  isMet: (state: GameState) => boolean
}

function hasPurchasedAnyTier(state: Pick<GameState, 'tiers'>): boolean {
  return state.tiers.some((tier) => tier.purchased > 0)
}

function hasAnyProgress(state: GameState): boolean {
  return (
    hasPurchasedAnyTier(state)
    || state.tempo.level > 0
    || state.lifetimeEncorePoints > 0
    || state.encoreCount > 0
    || state.lifetimeEncoreCount > 0
    || state.layer1WallReached
    || state.opusCount > 0
    || state.recordsSold > 0
    || state.platinum
    || state.worldTourUnlocked
    || state.tourCount > 0
    || state.completedChallenges.length > 0
    || state.finaleCount > 0
  )
}

function isPrestigeBlocked(state: GameState): boolean {
  const activeChallenge = state.activeChallenge
    ? getChallengeById(state.activeChallenge.challengeId) ?? null
    : null
  return getActiveChallengeModifiers(activeChallenge).noPrestige
}

function canPerformEncore(state: GameState): boolean {
  if (isPrestigeBlocked(state)) return false
  const cost = getEncoreCost(state.encoreCount)
  return (state.tiers[cost.tierIndex]?.purchased ?? 0) >= cost.amount
}

function canPerformMagnumOpus(state: GameState): boolean {
  if (isPrestigeBlocked(state) || !state.layer1WallReached) return false
  const cost = getMagnumOpusCost(state.opusCount)
  return (state.tiers[cost.tierIndex]?.purchased ?? 0) >= cost.amount
}

function hasUnlockedChallenge(state: GameState): boolean {
  return CHALLENGES.some((challenge) => isChallengeUnlocked(state, challenge))
}

function hasPassedWorldTour(state: GameState): boolean {
  return state.worldTourUnlocked || state.tourCount > 0 || canUnlockWorldTour(state)
}

export const ONBOARDING_HINT_ORDER: OnboardingHintId[] = [
  'first_buy',
  'encore',          // nudge (pre-reset, discovery)
  'encore_done',     // orientation (post-first-reset)
  'magnum_opus',     // nudge
  'magnum_opus_done',// orientation
  'conduct',         // orientation (the active verb, unlocks with MO)
  'world_tour',      // orientation (unlocks at the reset that opens it)
  'challenges',      // nudge
  'signature',       // orientation
]

export const ONBOARDING_HINTS: Record<OnboardingHintId, OnboardingHintDefinition> = {
  first_buy: {
    id: 'first_buy',
    text: 'Compose your first note.',
    isMet: (state) => !state.activeChallenge && !hasAnyProgress(state),
  },
  // NUDGE (pre-reset, discovery): you can Encore now.
  encore: {
    id: 'encore',
    text: 'You can Encore — reset now for a permanent boost. Open the Prestige tab.',
    isMet: (state) =>
      state.encoreCount === 0 &&
      state.lifetimeEncoreCount === 0 &&
      canPerformEncore(state),
  },
  // ORIENTATION (after your FIRST Encore): what you earned + what's now open.
  encore_done: {
    id: 'encore_done',
    title: 'Encore — Applause earned',
    body: [
      'Your total Applause permanently ×multiplies all production.',
      'Spend the Applause pool on autobuyers and Encore upgrades.',
      'Each Encore is faster than the last.',
    ],
    isMet: (state) => (state.encoreCount >= 1 || state.lifetimeEncoreCount >= 1) && !state.activeChallenge,
  },
  // NUDGE: you can Magnum Opus now.
  magnum_opus: {
    id: 'magnum_opus',
    text: 'A Magnum Opus is ready — a deeper reset for Opus Points.',
    isMet: (state) => state.opusCount === 0 && canPerformMagnumOpus(state),
  },
  // ORIENTATION (after your FIRST Magnum Opus).
  magnum_opus_done: {
    id: 'magnum_opus_done',
    title: 'Magnum Opus',
    body: [
      'Spend Opus Points in the Opus tree — its Tempo track turns them into permanent global production.',
      'Other tracks unlock automation, a stronger Crescendo, and more.',
      'And Conducting is now unlocked — see the next tip.',
    ],
    isMet: (state) => state.opusCount >= 1 && !state.activeChallenge,
  },
  // ORIENTATION: the active verb, unlocks with the first MO.
  conduct: {
    id: 'conduct',
    title: 'Conducting',
    body: [
      'Tap Conduct (or Space, any tab) to ride a Crescendo — a short production burst.',
      'No holding; tap again to sustain. Auto-Conduct keeps a floor while idle.',
    ],
    isMet: (state) => state.opusCount > 0 && !state.activeChallenge,
  },
  // ORIENTATION (at the reset that opens World Tour).
  world_tour: {
    id: 'world_tour',
    title: 'World Tour',
    body: [
      'Acclaim now flows from your catalogue — a steady production ×.',
      'Build venue components and graduate venues to grow Acclaim.',
      'Your automation (auto-collect / auto-MO / auto-tour) lives here.',
    ],
    isMet: (state) => state.worldTourUnlocked && !state.activeChallenge,
  },
  // NUDGE: challenges available.
  challenges: {
    id: 'challenges',
    text: 'Challenges are open: clear constraint runs for permanent rewards.',
    isMet: (state) => hasUnlockedChallenge(state) && !state.activeChallenge,
  },
  // ORIENTATION (first Signature ascension).
  signature: {
    id: 'signature',
    title: 'Signature',
    body: [
      'Shape your sound across five instrument domains (a zero-sum allocation).',
      'Respec is free between runs — experiment without penalty.',
      'Your dominant domain becomes your identity.',
    ],
    isMet: (state) => L4_UNLOCKED && !!state.signatureUnlocked && !state.activeChallenge,
  },
}

export function getNextOnboardingHint(
  seenHints: string[],
  state: GameState,
): OnboardingHintDefinition | null {
  const seen = new Set(seenHints)
  for (const id of ONBOARDING_HINT_ORDER) {
    if (seen.has(id)) continue
    const hint = ONBOARDING_HINTS[id]
    if (!hint.isMet(state)) continue
    return hint
  }
  return null
}

/** Seed old/offline saves so already-passed milestones do not fire as new hints. */
export function seedSeenHintsFromProgress(state: GameState): OnboardingHintId[] {
  const seen: OnboardingHintId[] = []
  if (hasAnyProgress(state)) seen.push('first_buy')
  if (state.opusCount > 0 || state.worldTourUnlocked) seen.push('conduct')
  if (state.encoreCount > 0 || state.lifetimeEncoreCount > 0 || canPerformEncore(state)) seen.push('encore')
  if (state.encoreCount > 0 || state.lifetimeEncoreCount > 0) seen.push('encore_done')
  if (state.opusCount > 0 || state.worldTourUnlocked || canPerformMagnumOpus(state)) seen.push('magnum_opus')
  if (state.opusCount > 0) seen.push('magnum_opus_done')
  if (hasPassedWorldTour(state)) seen.push('world_tour')
  if (hasPassedWorldTour(state) || hasUnlockedChallenge(state)) seen.push('challenges')
  if (L4_UNLOCKED && (state.signatureUnlocked || state.signatureCount > 0)) seen.push('signature')
  return seen
}
