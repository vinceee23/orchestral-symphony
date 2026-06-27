import Decimal from 'break_infinity.js'
import type { GameState } from '../store/types'
import { TIER_CONFIGS, STARTING_SOUNDWAVES } from './constants'
import { getTierCost } from './formulas'
import { getAchievementCostReduction } from './achievements'

export type ChallengeConstraint =
  | { type: 'singleTier'; tierId: number }
  | { type: 'maxTiers'; count: number }
  | { type: 'nerfedTickspeed'; factor: number }
  | { type: 'inflatedCosts'; factor: number }
  | { type: 'maxPerTier'; limit: number }
  | { type: 'noTempo' }
  | { type: 'nerfedProduction'; factor: number }
  | { type: 'noMilestones' }
  | { type: 'swDecay'; percentPerTick: number }
  | { type: 'risingCosts'; ratePerSec: number }
  | { type: 'reversedProduction' }
  | { type: 'noPrestige' }

/** Per-challenge gate once World Tour (L3) is unlocked — spread across L3 progression. */
export interface ChallengeUnlockThreshold {
  peakSoundwaves?: number | string
  encoreCount?: number
  opusCount?: number
}

export interface ChallengeConfig {
  id: string
  name: string
  description: string
  icon: string
  targetSoundwaves: Decimal
  constraint: ChallengeConstraint
  unlocksAutobuyer: string
  unlockThreshold: ChallengeUnlockThreshold
}

export function isChallengeUnlocked(
  state: Pick<GameState, 'worldTourUnlocked' | 'peakSoundwaves' | 'encoreCount' | 'opusCount'>,
  challenge: ChallengeConfig,
): boolean {
  if (!state.worldTourUnlocked) return false
  const t = challenge.unlockThreshold
  if (t.peakSoundwaves !== undefined && !state.peakSoundwaves.gte(t.peakSoundwaves)) return false
  if (t.encoreCount !== undefined && state.encoreCount < t.encoreCount) return false
  if (t.opusCount !== undefined && state.opusCount < t.opusCount) return false
  return true
}

export interface ChallengeModifiers {
  tickspeedDivisor: number
  costMultiplier: number
  productionDivisor: number
  maxTiers: number
  maxPerTier: number | null
  noTempo: boolean
  noMilestones: boolean
  swDecayPercent: number
  risingCostRate: number
  reversedProduction: boolean
  noPrestige: boolean
  singleTierId: number | null
}

const DEFAULT_MODIFIERS: ChallengeModifiers = {
  tickspeedDivisor: 1,
  costMultiplier: 1,
  productionDivisor: 1,
  maxTiers: 7,
  maxPerTier: null,
  noTempo: false,
  noMilestones: false,
  swDecayPercent: 0,
  risingCostRate: 0,
  reversedProduction: false,
  noPrestige: false,
  singleTierId: null,
}

export function getActiveChallengeModifiers(challenge: ChallengeConfig | null): ChallengeModifiers {
  if (!challenge) return { ...DEFAULT_MODIFIERS }

  const mods = { ...DEFAULT_MODIFIERS }
  const c = challenge.constraint

  switch (c.type) {
    case 'singleTier':
      mods.singleTierId = c.tierId
      mods.maxTiers = 1
      break
    case 'maxTiers':
      mods.maxTiers = c.count
      break
    case 'nerfedTickspeed':
      mods.tickspeedDivisor = c.factor
      break
    case 'inflatedCosts':
      mods.costMultiplier = c.factor
      break
    case 'maxPerTier':
      mods.maxPerTier = c.limit
      break
    case 'noTempo':
      mods.noTempo = true
      break
    case 'nerfedProduction':
      mods.productionDivisor = c.factor
      break
    case 'noMilestones':
      mods.noMilestones = true
      break
    case 'swDecay':
      mods.swDecayPercent = c.percentPerTick
      break
    case 'risingCosts':
      mods.risingCostRate = c.ratePerSec
      break
    case 'reversedProduction':
      mods.reversedProduction = true
      break
    case 'noPrestige':
      mods.noPrestige = true
      break
  }

  return mods
}

/** Challenge-run starting SW — inflatedCosts grants enough to afford the first tier. */
export function getChallengeStartingSoundwaves(
  challenge: ChallengeConfig,
  achievements: string[],
): Decimal {
  const mods = getActiveChallengeModifiers(challenge)
  if (mods.costMultiplier <= 1) return new Decimal(STARTING_SOUNDWAVES)

  const achCostRed = getAchievementCostReduction(new Set(achievements))
  const firstCost = getTierCost(TIER_CONFIGS[0], 0, mods.costMultiplier * achCostRed)
  return Decimal.max(STARTING_SOUNDWAVES, firstCost)
}

// TODO(L4): completedChallenges resets on Signature ascension — LAYER3-SPEC §2.8.
export const CHALLENGES: ChallengeConfig[] = [
  {
    id: 'ch_solo',
    name: 'Solo Performance',
    description: 'Reach the target using only Notes. No other tiers available.',
    icon: '\u{1F3B5}',
    targetSoundwaves: new Decimal(5e7),
    constraint: { type: 'singleTier', tierId: 1 },
    unlocksAutobuyer: 'tier_1',
    unlockThreshold: {},
  },
  {
    id: 'ch_duet',
    name: 'Dynamic Duo',
    description: 'Reach the target using only Notes and Motifs.',
    icon: '\u{1F46F}',
    targetSoundwaves: new Decimal(2.5e15),
    constraint: { type: 'maxTiers', count: 2 },
    unlocksAutobuyer: 'tier_2',
    unlockThreshold: { opusCount: 4 },
  },
  {
    id: 'ch_inflation',
    name: 'Inflation Etude',
    description: 'Reach the target with all costs multiplied by 10x.',
    icon: '\u{1F4B8}',
    targetSoundwaves: new Decimal('1.6e58'),
    constraint: { type: 'inflatedCosts', factor: 10 },
    unlocksAutobuyer: 'tier_4',
    unlockThreshold: { opusCount: 5 },
  },
  {
    id: 'ch_diminuendo',
    name: 'Diminuendo',
    description: 'Reach the target with all production divided by 100.',
    icon: '\u{1F509}',
    targetSoundwaves: new Decimal('5e25'),
    constraint: { type: 'nerfedProduction', factor: 100 },
    unlocksAutobuyer: 'tier_7',
    unlockThreshold: { opusCount: 6 },
  },
  {
    id: 'ch_opening',
    name: 'Opening Night Jitters',
    description: 'Reach the target while costs increase by 1% every second.',
    icon: '\u{1F630}',
    targetSoundwaves: new Decimal('4e57'),
    constraint: { type: 'risingCosts', ratePerSec: 1.01 },
    unlocksAutobuyer: 'mo_auto',
    unlockThreshold: { opusCount: 7 },
  },
  {
    id: 'ch_adagio',
    name: 'Super SLOOOW!',
    description: 'Reach the target with tick speed reduced by 10x.',
    icon: '\u{1F40C}',
    targetSoundwaves: new Decimal('1e132'),
    constraint: { type: 'nerfedTickspeed', factor: 10 },
    unlocksAutobuyer: 'tier_3',
    unlockThreshold: { encoreCount: 8 },
  },
  {
    id: 'ch_one_hit',
    name: 'One-Hit Wonder',
    description: 'Reach the target with a max of 10 purchases per tier.',
    icon: '\u{261D}',
    targetSoundwaves: new Decimal('1e62'),
    constraint: { type: 'maxPerTier', limit: 10 },
    unlocksAutobuyer: 'tier_5',
    unlockThreshold: { encoreCount: 9 },
  },
  {
    id: 'ch_acoustic',
    name: 'Acoustic Set',
    description: 'Reach the target without upgrading tempo. Stuck at 60 BPM.',
    icon: '\u{1F3B8}',
    targetSoundwaves: new Decimal(2e21),
    constraint: { type: 'noTempo' },
    unlocksAutobuyer: 'tier_6',
    unlockThreshold: { encoreCount: 10 },
  },
  {
    id: 'ch_leaky',
    name: 'Leaky Auditorium',
    description: 'Reach the target while losing 2% of your Soundwaves every tick.',
    icon: '\u{1F4A7}',
    targetSoundwaves: new Decimal('1e165'),
    constraint: { type: 'swDecay', percentPerTick: 2 },
    unlocksAutobuyer: 'encore',
    unlockThreshold: { encoreCount: 12 },
  },
  {
    id: 'ch_flat',
    name: 'Playing It Flat',
    description: 'Reach the target without milestone multipliers (no x2 per 10).',
    icon: '\u{266D}',
    targetSoundwaves: new Decimal('1.2e62'),
    constraint: { type: 'noMilestones' },
    unlocksAutobuyer: 'tempo',
    unlockThreshold: { peakSoundwaves: '1e65' },
  },
  {
    id: 'ch_reverse',
    name: 'Reverse Rehearsal',
    description: 'Reach the target with reversed production (lower tiers produce higher).',
    icon: '\u{1F500}',
    targetSoundwaves: new Decimal('8e63'),
    constraint: { type: 'reversedProduction' },
    unlocksAutobuyer: 'finale_auto',
    unlockThreshold: { peakSoundwaves: '1e68' },
  },
  {
    id: 'ch_unplugged',
    name: 'Unplugged Finale',
    description: 'Reach the target without any prestige bonuses (EP/OP/FP ignored).',
    icon: '\u{1F50C}',
    targetSoundwaves: new Decimal('1e90'),
    constraint: { type: 'noPrestige' },
    unlocksAutobuyer: 'all_auto',
    unlockThreshold: { peakSoundwaves: '1e72' },
  },
]

export function getChallengeById(id: string): ChallengeConfig | undefined {
  return CHALLENGES.find((c) => c.id === id)
}
