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

export interface ChallengeReward {
  /** Flat global production × (stacked multiplicatively across clears). */
  globalProdMult?: number
  /** Tier cost ×<1 (stacked multiplicatively). */
  costMult?: number
  /** Additive tempo speed bonus (stacked additively). */
  tempoBonus?: number
  /** Additive crescendo ceiling boost (stacked additively). */
  crescendoBonus?: number
  /** Raises per-milestone base above MILESTONE_MULTIPLIER (stacked additively). */
  milestoneStrength?: number
  /** Speed-scaled global × capstone (suite-wide; activates only when all 12 cleared). */
  capstone?: boolean
  /** Applause Points granted on first clear only — TUNE in §2.8 sim. */
  ap: number
}

export interface ChallengeConfig {
  id: string
  name: string
  description: string
  icon: string
  targetSoundwaves: Decimal
  constraint: ChallengeConstraint
  reward: ChallengeReward
  /** Automation unlock — only ch_acoustic / ch_reverse / ch_unplugged grant one. */
  unlocksAutobuyer: string | null
  unlockThreshold: ChallengeUnlockThreshold
}

export interface ChallengeMultipliers {
  globalProdMult: number
  costMult: number
  tempoBonus: number
  crescendoBonus: number
  milestoneStrength: number
}

/** Identity multipliers — all hooks inert pre-challenge. */
export const CHALLENGE_MULT_IDENTITY: ChallengeMultipliers = {
  globalProdMult: 1,
  costMult: 1,
  tempoBonus: 0,
  crescendoBonus: 0,
  milestoneStrength: 0,
}

// Speed-scaled capstone (ch_unplugged) — sim-tunable curve constants.
/** Total best-time (ms) at or above this → floor ×mult. */
export const CAPSTONE_TIME_FLOOR_MS = 70 * 60 * 1000
/** Total best-time (ms) at or below this → cap ×mult. */
export const CAPSTONE_TIME_CAP_MS = 20 * 60 * 1000
export const CAPSTONE_MULT_FLOOR = 2.0
export const CAPSTONE_MULT_CAP = 4.0

/** Map total cleared-challenge best-time (ms) to the Unplugged capstone global ×. */
export function speedScaledCapstone(totalTimeMs: number): number {
  if (totalTimeMs >= CAPSTONE_TIME_FLOOR_MS) return CAPSTONE_MULT_FLOOR
  if (totalTimeMs <= CAPSTONE_TIME_CAP_MS) return CAPSTONE_MULT_CAP
  const t = (totalTimeMs - CAPSTONE_TIME_CAP_MS) / (CAPSTONE_TIME_FLOOR_MS - CAPSTONE_TIME_CAP_MS)
  return CAPSTONE_MULT_CAP + t * (CAPSTONE_MULT_FLOOR - CAPSTONE_MULT_CAP)
}

/**
 * Aggregate challenge reward multipliers from completed clears + best-times.
 * Derived (not stored) — follows getAchievementGlobalMultiplier precedent.
 * keepChallenges is unused here (only affects L4 ascension reset); accepted for call-site symmetry.
 */
export function getChallengeMultipliers(
  completedChallenges: string[],
  challengeBestTimes: Record<string, number>,
  _keepChallenges = false,
): ChallengeMultipliers {
  if (completedChallenges.length === 0) return { ...CHALLENGE_MULT_IDENTITY }

  const completed = new Set(completedChallenges)
  let globalProdMult = 1
  let costMult = 1
  let tempoBonus = 0
  let crescendoBonus = 0
  let milestoneStrength = 0

  for (const ch of CHALLENGES) {
    if (!completed.has(ch.id)) continue
    const r = ch.reward
    if (r.globalProdMult !== undefined) globalProdMult *= r.globalProdMult
    if (r.costMult !== undefined) costMult *= r.costMult
    if (r.tempoBonus !== undefined) tempoBonus += r.tempoBonus
    if (r.crescendoBonus !== undefined) crescendoBonus += r.crescendoBonus
    if (r.milestoneStrength !== undefined) milestoneStrength += r.milestoneStrength
  }

  // Capstone: suite reward — only when all 12 cleared; total = sum of all 12 best-times.
  if (completed.size === CHALLENGES.length) {
    let totalTime = 0
    for (const ch of CHALLENGES) {
      totalTime += challengeBestTimes[ch.id] ?? 0
    }
    globalProdMult *= speedScaledCapstone(totalTime)
  }

  return { globalProdMult, costMult, tempoBonus, crescendoBonus, milestoneStrength }
}

/** L4 ascension reset patch — completedChallenges clears unless keepChallenges; best-times always persist. */
export function getL4ChallengeAscensionPatch(
  state: Pick<GameState, 'completedChallenges' | 'challengeBestTimes' | 'keepChallenges'>,
): Pick<GameState, 'completedChallenges' | 'challengeBestTimes'> {
  return {
    completedChallenges: state.keepChallenges ? [...state.completedChallenges] : [],
    challengeBestTimes: { ...state.challengeBestTimes },
  }
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

// Challenge rewards — LAYER3-SPEC §2.8 (LOCKED). Multipliers derived from completedChallenges.
export const CHALLENGES: ChallengeConfig[] = [
  {
    id: 'ch_solo',
    name: 'Solo Performance',
    description: 'Reach the target using only Notes. No other tiers available.',
    icon: '\u{1F3B5}',
    targetSoundwaves: new Decimal(5e7),
    constraint: { type: 'singleTier', tierId: 1 },
    reward: { crescendoBonus: 0.5, ap: 5 }, // TUNE §2.8 sim
    unlocksAutobuyer: null,
    unlockThreshold: {},
  },
  {
    id: 'ch_duet',
    name: 'Dynamic Duo',
    description: 'Reach the target using only Notes and Motifs.',
    icon: '\u{1F46F}',
    targetSoundwaves: new Decimal(2.5e15),
    constraint: { type: 'maxTiers', count: 2 },
    reward: { globalProdMult: 1.15, ap: 5 }, // TUNE §2.8 sim
    unlocksAutobuyer: null,
    unlockThreshold: { opusCount: 4 },
  },
  {
    id: 'ch_inflation',
    name: 'Inflation Etude',
    description: 'Reach the target with all costs multiplied by 10x.',
    icon: '\u{1F4B8}',
    targetSoundwaves: new Decimal('1e55'),
    constraint: { type: 'inflatedCosts', factor: 10 },
    reward: { costMult: 0.90, ap: 5 }, // TUNE §2.8 sim
    unlocksAutobuyer: null,
    unlockThreshold: { opusCount: 5 },
  },
  {
    id: 'ch_diminuendo',
    name: 'Diminuendo',
    description: 'Reach the target with all production divided by 100.',
    icon: '\u{1F509}',
    targetSoundwaves: new Decimal('1e34'),
    constraint: { type: 'nerfedProduction', factor: 100 },
    reward: { globalProdMult: 1.5, ap: 5 }, // TUNE §2.8 sim
    unlocksAutobuyer: null,
    unlockThreshold: { opusCount: 6 },
  },
  {
    id: 'ch_opening',
    name: 'Opening Night Jitters',
    description: 'Reach the target while costs increase by 1% every second.',
    icon: '\u{1F630}',
    targetSoundwaves: new Decimal('2e56'),
    constraint: { type: 'risingCosts', ratePerSec: 1.01 },
    reward: { costMult: 0.90, ap: 5 }, // TUNE §2.8 sim
    unlocksAutobuyer: null,
    unlockThreshold: { opusCount: 7 },
  },
  {
    id: 'ch_adagio',
    name: 'Super SLOOOW!',
    description: 'Reach the target with tick speed reduced by 10x.',
    icon: '\u{1F40C}',
    targetSoundwaves: new Decimal('1e140'),
    constraint: { type: 'nerfedTickspeed', factor: 10 },
    reward: { tempoBonus: 0.15, ap: 10 }, // TUNE §2.8 sim
    unlocksAutobuyer: null,
    unlockThreshold: { encoreCount: 8 },
  },
  {
    id: 'ch_one_hit',
    name: 'One-Hit Wonder',
    description: 'Reach the target with a max of 10 purchases per tier.',
    icon: '\u{261D}',
    targetSoundwaves: new Decimal('1e66'),
    constraint: { type: 'maxPerTier', limit: 10 },
    reward: { costMult: 0.92, ap: 10 }, // TUNE §2.8 sim
    unlocksAutobuyer: null,
    unlockThreshold: { encoreCount: 9 },
  },
  {
    id: 'ch_acoustic',
    name: 'Acoustic Set',
    description: 'Reach the target without upgrading tempo. Stuck at 60 BPM.',
    icon: '\u{1F3B8}',
    targetSoundwaves: new Decimal(2e21),
    constraint: { type: 'noTempo' },
    reward: { tempoBonus: 0.05, ap: 10 }, // TUNE §2.8 sim
    unlocksAutobuyer: 'tempo',
    unlockThreshold: { encoreCount: 10 },
  },
  {
    id: 'ch_leaky',
    name: 'Leaky Auditorium',
    description: 'Reach the target while losing 2% of your Soundwaves every tick.',
    icon: '\u{1F4A7}',
    targetSoundwaves: new Decimal('1e165'),
    constraint: { type: 'swDecay', percentPerTick: 2 },
    reward: { globalProdMult: 1.25, ap: 10 }, // TUNE §2.8 sim
    unlocksAutobuyer: null,
    unlockThreshold: { encoreCount: 12 },
  },
  {
    id: 'ch_flat',
    name: 'Playing It Flat',
    description: 'Reach the target without milestone multipliers (no x2 per 10).',
    icon: '\u{266D}',
    targetSoundwaves: new Decimal('5e59'),
    constraint: { type: 'noMilestones' },
    reward: { milestoneStrength: 0.2, ap: 20 }, // TUNE §2.8 sim
    unlocksAutobuyer: null,
    unlockThreshold: { peakSoundwaves: '1e65' },
  },
  {
    id: 'ch_reverse',
    name: 'Reverse Rehearsal',
    description: 'Reach the target with reversed production (lower tiers produce higher).',
    icon: '\u{1F500}',
    targetSoundwaves: new Decimal('3e60'),
    constraint: { type: 'reversedProduction' },
    reward: { globalProdMult: 1.3, ap: 20 }, // TUNE §2.8 sim
    unlocksAutobuyer: 'finale_auto',
    unlockThreshold: { peakSoundwaves: '1e68' },
  },
  {
    id: 'ch_unplugged',
    name: 'Unplugged Finale',
    description: 'Reach the target without any prestige bonuses (EP/OP/FP ignored).',
    icon: '\u{1F50C}',
    targetSoundwaves: new Decimal('1e94'),
    constraint: { type: 'noPrestige' },
    reward: { capstone: true, ap: 40 }, // TUNE §2.8 sim
    unlocksAutobuyer: 'all_auto',
    unlockThreshold: { peakSoundwaves: '1e72' },
  },
]

export function getChallengeById(id: string): ChallengeConfig | undefined {
  return CHALLENGES.find((c) => c.id === id)
}
