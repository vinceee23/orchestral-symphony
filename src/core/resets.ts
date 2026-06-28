import Decimal from 'break_infinity.js'
import type { GameState } from '../store/types'
import {
  PLATINUM_THRESHOLD,
  STARTING_SOUNDWAVES,
  TIER_CONFIGS,
} from './constants'
import { getAchievementStartingSW } from './achievements'
import { getChallengeMultipliers } from './challenges'
import {
  CRESCENDO_HEADSTART,
  TEMPO_HEADSTART_LEVEL,
  WARMUP_BONUS_SW,
  WARMUP_TIERS,
  hasPerk,
} from './perks'
import { getMilestoneMultiplier, getTempoBPM, getTempoTickInterval } from './formulas'
import { L3 } from './worldTour'

export type ResetTier = 'encore' | 'magnumOpus' | 'tour' | 'signature' | 'virtuoso'
  | 'canon' | 'grandFinale' | 'fall'

const RESET_DEPTH: Record<ResetTier, number> = {
  encore: 1,
  magnumOpus: 2,
  tour: 3,
  signature: 4,
  virtuoso: 5,
  canon: 6,
  grandFinale: 7,
  fall: 8,
}

function getChallengeMilestoneStrength(state: GameState): number {
  return getChallengeMultipliers(
    state.completedChallenges,
    state.challengeBestTimes ?? {},
    state.keepChallenges ?? false,
  ).milestoneStrength
}

/** Reset tiers, soundwaves, and tempo to initial state, with achievement starting SW bonus */
export function resetTiersAndSW(achievementIds: string[], milestoneStrength = 0): Partial<GameState> {
  const achSet = new Set(achievementIds)
  const bonusSW = getAchievementStartingSW(achSet)
  // Distinct head-start perks (all gated behind their achievements):
  // - warmup: first WARMUP_TIERS tiers pre-bought (a milestone bracket each) + bonus SW
  // - tempo-headstart: begin each run at Tempo level TEMPO_HEADSTART_LEVEL
  // - crescendo-headstart: begin each run with Crescendo seeded (only added when the perk is owned, so
  //   non-perk Encore behaviour - crescendo persisting across the reset - is unchanged)
  const warmup = hasPerk(achSet, 'perk-warmup')
  const tempoLevel = hasPerk(achSet, 'perk-tempo-headstart') ? TEMPO_HEADSTART_LEVEL : 0
  const crescHeadstart = hasPerk(achSet, 'perk-crescendo-headstart')
  return {
    soundwaves: STARTING_SOUNDWAVES.plus(bonusSW).plus(warmup ? WARMUP_BONUS_SW : 0),
    tiers: TIER_CONFIGS.map((config, idx) => {
      const preBought = warmup && idx < WARMUP_TIERS
      return {
        id: config.id,
        name: config.name,
        quantity: new Decimal(preBought ? 10 : 0),
        purchased: preBought ? 10 : 0,
        multiplier: preBought ? getMilestoneMultiplier(10, milestoneStrength) : new Decimal(1),
        unlocked: config.id === 1 || (warmup && idx <= WARMUP_TIERS),
      }
    }),
    tempo: {
      level: tempoLevel,
      tickInterval: getTempoTickInterval(tempoLevel),
      baseBPM: getTempoBPM(tempoLevel),
    },
    ...(crescHeadstart ? { crescendo: CRESCENDO_HEADSTART } : {}),
    currentRunStartTime: Date.now(),
    producedThisRun: new Decimal(0),
    tempoPurchasesThisRun: 0,
  }
}

export function applyReset(state: GameState, tier: ResetTier): Partial<GameState> {
  const depth = RESET_DEPTH[tier]
  const achSet = new Set(state.achievements)
  const keepEncoreUpgrades = hasPerk(achSet, 'perk-keep-encore-upgrades')
  const skipWall = hasPerk(achSet, 'perk-skip-wall')
  const crescendoSeed = hasPerk(achSet, 'perk-crescendo-headstart') ? CRESCENDO_HEADSTART : 0
  const carriedRecords = Math.floor(state.recordsSold * L3.LEGACY_RECORDS_FRACTION)

  const patch: Partial<GameState> = {
    ...resetTiersAndSW(state.achievements, getChallengeMilestoneStrength(state)),
    peakSoundwaves: new Decimal(0),
  }

  if (tier === 'magnumOpus') {
    Object.assign(patch, {
      encorePoints: 0,
      lifetimeEncorePoints: 0,
      encoreCount: 0,
      encoreUpgrades: keepEncoreUpgrades ? state.encoreUpgrades : {},
      layer1WallReached: skipWall,
      crescendo: crescendoSeed,
      peakCrescendoMult: 1,
    } satisfies Partial<GameState>)
  }

  if (tier === 'tour') {
    Object.assign(patch, {
      encorePoints: 0,
      lifetimeEncorePoints: 0,
      encoreCount: 3,
      encoreUpgrades: keepEncoreUpgrades ? state.encoreUpgrades : {},
      layer1WallReached: true,
      opusPoints: 0,
      opusUpgrades: {},
      crescendo: crescendoSeed,
      peakCrescendoMult: 1,
      recordsSold: carriedRecords,
      platinum: carriedRecords >= PLATINUM_THRESHOLD,
      autobuyers: state.keepAutobuyers ? { ...state.autobuyers } : {},
      autoMO: state.keepAutobuyers ? state.autoMO : false,
      autoMOEnabled: state.keepAutobuyers ? state.autoMOEnabled : true,
      autoTour: state.keepAutobuyers ? state.autoTour : false,
      autoTourEnabled: state.keepAutobuyers ? state.autoTourEnabled : true,
    } satisfies Partial<GameState>)
  }

  if (tier === 'grandFinale') {
    // Byte-identical quirk: Finale omits crescendo, peakCrescendoMult, layer1WallReached,
    // and opusUpgrades; only resetTiersAndSW's optional crescendo head-start can write it.
    Object.assign(patch, {
      encorePoints: 0,
      lifetimeEncorePoints: 0,
      encoreCount: 0,
      encoreUpgrades: {},
      opusPoints: 0,
      opusCount: 0,
    } satisfies Partial<GameState>)
  }

  if (depth >= RESET_DEPTH.signature && tier !== 'grandFinale') {
    Object.assign(patch, {
      encorePoints: 0,
      lifetimeEncorePoints: 0,
      encoreCount: 3,
      encoreUpgrades: keepEncoreUpgrades ? state.encoreUpgrades : {},
      layer1WallReached: true,
      opusPoints: 0,
      opusUpgrades: {},
      opusCount: 0,
      crescendo: crescendoSeed,
      peakCrescendoMult: 1,
      recordsSold: 0,
      platinum: false,
      acclaim: new Decimal(0),
      lifetimeAcclaim: new Decimal(0),
      tourCount: 0,
      currentVenue: 0,
      venueBuffer: new Decimal(0),
      venueSoldOut: false,
      components: {},
      catalogueSnapshot: new Decimal(1),
      worldTourUnlocked: false,
      autoCollect: false,
      keepAutobuyers: false,
      autoMO: false,
      autoMOEnabled: true,
      autoGraduate: false,
      autoTour: false,
      autoTourEnabled: true,
      circuitComplete: false,
      completedChallenges: state.keepChallenges ? state.completedChallenges : [],
      autobuyers: {},
    } satisfies Partial<GameState>)
  }

  if (depth >= RESET_DEPTH.grandFinale) {
    Object.assign(patch, {
      encorePoints: 0,
      lifetimeEncorePoints: 0,
      encoreCount: 0,
      encoreUpgrades: {},
      opusPoints: 0,
      opusCount: 0,
    } satisfies Partial<GameState>)
  }

  return patch
}
