import type { GameState } from '../../store/types'
import { getEncoreCost, getMagnumOpusCost } from '../../core/constants'
import { canUnlockWorldTour } from '../../core/worldTour'
import { CHALLENGES, getActiveChallengeModifiers, getChallengeById, isChallengeUnlocked } from '../../core/challenges'

export type OnboardingHintId =
  | 'first_buy'
  | 'conduct'
  | 'encore'
  | 'magnum_opus'
  | 'world_tour'
  | 'challenges'
  | 'signature'

export interface OnboardingHintDefinition {
  id: OnboardingHintId
  text: string
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
  'conduct',
  'encore',
  'magnum_opus',
  'world_tour',
  'challenges',
  'signature',
]

export const ONBOARDING_HINTS: Record<OnboardingHintId, OnboardingHintDefinition> = {
  first_buy: {
    id: 'first_buy',
    text: 'Compose your first note.',
    isMet: (state) => !state.activeChallenge && !hasAnyProgress(state),
  },
  conduct: {
    id: 'conduct',
    text: 'Tap Conduct (or Space) for a Crescendo — a short production burst.',
    isMet: (state) => state.opusCount > 0 && !state.activeChallenge,
  },
  encore: {
    id: 'encore',
    text: 'Prestige: reset now for a permanent multiplier.',
    isMet: (state) =>
      state.encoreCount === 0 &&
      state.lifetimeEncoreCount === 0 &&
      canPerformEncore(state),
  },
  magnum_opus: {
    id: 'magnum_opus',
    text: 'Magnum Opus records a work for Opus Points and deeper upgrades.',
    isMet: (state) => state.opusCount === 0 && canPerformMagnumOpus(state),
  },
  world_tour: {
    id: 'world_tour',
    text: 'World Tour is open: build venues to turn your catalogue into Acclaim.',
    isMet: (state) => state.worldTourUnlocked && !state.activeChallenge,
  },
  challenges: {
    id: 'challenges',
    text: 'Challenges are open: clear constraint runs for permanent rewards.',
    isMet: (state) => hasUnlockedChallenge(state) && !state.activeChallenge,
  },
  signature: {
    id: 'signature',
    text: 'Signature: at ascension, shape your sound across five instrument domains.',
    isMet: (state) => !!state.signatureUnlocked && !state.activeChallenge,
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
  if (state.opusCount > 0 || state.worldTourUnlocked || canPerformMagnumOpus(state)) seen.push('magnum_opus')
  if (hasPassedWorldTour(state)) seen.push('world_tour')
  if (hasPassedWorldTour(state) || hasUnlockedChallenge(state)) seen.push('challenges')
  if (state.signatureUnlocked || state.signatureCount > 0) seen.push('signature')
  return seen
}
