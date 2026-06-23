import Decimal from 'break_infinity.js'

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

export interface ChallengeConfig {
  id: string
  name: string
  description: string
  icon: string
  targetSoundwaves: Decimal
  constraint: ChallengeConstraint
  unlocksAutobuyer: string
  unlockAt: number  // Grand Finale count needed to reveal this challenge
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

export const CHALLENGES: ChallengeConfig[] = [
  {
    id: 'ch_solo',
    name: 'Solo Performance',
    description: 'Reach the target using only Notes. No other tiers available.',
    icon: '\u{1F3B5}',
    targetSoundwaves: new Decimal(1e6),
    constraint: { type: 'singleTier', tierId: 1 },
    unlocksAutobuyer: 'tier_1',
    unlockAt: 1,
  },
  {
    id: 'ch_duet',
    name: 'Dynamic Duo',
    description: 'Reach the target using only Notes and Motifs.',
    icon: '\u{1F46F}',
    targetSoundwaves: new Decimal(1e8),
    constraint: { type: 'maxTiers', count: 2 },
    unlocksAutobuyer: 'tier_2',
    unlockAt: 1,
  },
  {
    id: 'ch_adagio',
    name: 'Super SLOOOW!',
    description: 'Reach the target with tick speed reduced by 10x.',
    icon: '\u{1F40C}',
    targetSoundwaves: new Decimal(1e10),
    constraint: { type: 'nerfedTickspeed', factor: 10 },
    unlocksAutobuyer: 'tier_3',
    unlockAt: 2,
  },
  {
    id: 'ch_inflation',
    name: 'Inflation Etude',
    description: 'Reach the target with all costs multiplied by 10x.',
    icon: '\u{1F4B8}',
    targetSoundwaves: new Decimal(1e8),
    constraint: { type: 'inflatedCosts', factor: 10 },
    unlocksAutobuyer: 'tier_4',
    unlockAt: 2,
  },
  {
    id: 'ch_one_hit',
    name: 'One-Hit Wonder',
    description: 'Reach the target with a max of 10 purchases per tier.',
    icon: '\u{261D}',
    targetSoundwaves: new Decimal(1e6),
    constraint: { type: 'maxPerTier', limit: 10 },
    unlocksAutobuyer: 'tier_5',
    unlockAt: 3,
  },
  {
    id: 'ch_acoustic',
    name: 'Acoustic Set',
    description: 'Reach the target without upgrading tempo. Stuck at 60 BPM.',
    icon: '\u{1F3B8}',
    targetSoundwaves: new Decimal(1e12),
    constraint: { type: 'noTempo' },
    unlocksAutobuyer: 'tier_6',
    unlockAt: 3,
  },
  {
    id: 'ch_diminuendo',
    name: 'Diminuendo',
    description: 'Reach the target with all production divided by 100.',
    icon: '\u{1F509}',
    targetSoundwaves: new Decimal(1e8),
    constraint: { type: 'nerfedProduction', factor: 100 },
    unlocksAutobuyer: 'tier_7',
    unlockAt: 4,
  },
  {
    id: 'ch_flat',
    name: 'Playing It Flat',
    description: 'Reach the target without milestone multipliers (no x2 per 10).',
    icon: '\u{266D}',
    targetSoundwaves: new Decimal(1e10),
    constraint: { type: 'noMilestones' },
    unlocksAutobuyer: 'tempo',
    unlockAt: 5,
  },
  {
    id: 'ch_leaky',
    name: 'Leaky Auditorium',
    description: 'Reach the target while losing 2% of your Soundwaves every tick.',
    icon: '\u{1F4A7}',
    targetSoundwaves: new Decimal(1e8),
    constraint: { type: 'swDecay', percentPerTick: 2 },
    unlocksAutobuyer: 'encore',
    unlockAt: 6,
  },
  {
    id: 'ch_opening',
    name: 'Opening Night Jitters',
    description: 'Reach the target while costs increase by 1% every second.',
    icon: '\u{1F630}',
    targetSoundwaves: new Decimal(1e10),
    constraint: { type: 'risingCosts', ratePerSec: 1.01 },
    unlocksAutobuyer: 'mo_auto',
    unlockAt: 8,
  },
  {
    id: 'ch_reverse',
    name: 'Reverse Rehearsal',
    description: 'Reach the target with reversed production (lower tiers produce higher).',
    icon: '\u{1F500}',
    targetSoundwaves: new Decimal(1e6),
    constraint: { type: 'reversedProduction' },
    unlocksAutobuyer: 'finale_auto',
    unlockAt: 10,
  },
  {
    id: 'ch_unplugged',
    name: 'Unplugged Finale',
    description: 'Reach the target without any prestige bonuses (EP/OP/FP ignored).',
    icon: '\u{1F50C}',
    targetSoundwaves: new Decimal(1e15),
    constraint: { type: 'noPrestige' },
    unlocksAutobuyer: 'all_auto',
    unlockAt: 15,
  },
]

export function getChallengeById(id: string): ChallengeConfig | undefined {
  return CHALLENGES.find((c) => c.id === id)
}
