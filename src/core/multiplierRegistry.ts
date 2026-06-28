import Decimal from 'break_infinity.js'
import type { GameState } from '../store/types'
import { getAchievementGlobalMultiplier, getAchievementTempoBonus } from './achievements'
import { getActiveChallengeModifiers, getChallengeById, getChallengeMultipliers } from './challenges'
import { getCoreProductionMultiplier } from './formulas'
import { hasPerk } from './perks'
import {
  ZERO_SIGNATURE_ALLOCATION,
  getSignatureEffects,
  getSignatureEfficiency,
  getSignatureProductionMultiplier,
} from './signature'
import { getAcclaimMultiplier } from './worldTour'
import { warmUpMultiplier } from './warmup'

export type MultChannel =
  | 'core'
  | 'domain'

export interface MultEntry {
  source: string
  value: Decimal
  channel: MultChannel
}

/** Per-channel hard caps (add form: a channel's product is capped at 1 + cap). 'core' stays uncapped
 *  (the funnel has its own internal caps). 'domain' (L4 Signature) gets a SAFETY ceiling well above its
 *  legit max (~×1.44 at full Brass × the efficiency cap) so a future magnitude/efficiency change can't
 *  run the channel away (the B3 runaway the registry exists to prevent). */
export const CHANNEL_CAPS: Partial<Record<MultChannel, number>> = {
  domain: 1.0, // TBD-tune (sim/playtest) — ×2.0 ceiling; raise only if a sim shows a legit need
}

export function composeMultiplier(entries: MultEntry[]): Decimal {
  if (entries.length === 0) return new Decimal(1)
  if (entries.length === 1 && CHANNEL_CAPS[entries[0].channel] === undefined) {
    return entries[0].value
  }

  const byChannel = new Map<MultChannel, Decimal>()
  for (const entry of entries) {
    const current = byChannel.get(entry.channel)
    byChannel.set(entry.channel, current ? current.times(entry.value) : entry.value)
  }

  let total = new Decimal(1)
  for (const [channel, rawProduct] of byChannel.entries()) {
    const cap = CHANNEL_CAPS[channel]
    const product = cap === undefined
      ? rawProduct
      : Decimal.min(rawProduct, new Decimal(1).plus(cap))
    total = total.times(product)
  }
  return total
}

type ProductionMultiplierState = Pick<
  GameState,
  | 'achievements'
  | 'completedChallenges'
  | 'challengeBestTimes'
  | 'keepChallenges'
  | 'activeChallenge'
  | 'lifetimeEncorePoints'
  | 'finalePoints'
  | 'encoreUpgrades'
  | 'tempo'
  | 'tiers'
  | 'opusUpgrades'
  | 'crescendo'
  | 'recordsSold'
  | 'platinum'
  | 'worldTourUnlocked'
  | 'lifetimeAcclaim'
  | 'warmUpLevel'
  | 'signatureAllocation'
  | 'signatureCount'
>

export interface ProductionMultiplierOptions {
  crescendoLevel?: number
  recordsSold?: number
  platinum?: boolean
  noPrestige?: boolean
  warmUpMult?: number
}

function isNoPrestigeActive(state: ProductionMultiplierState): boolean {
  if (!state.activeChallenge) return false
  const challenge = getChallengeById(state.activeChallenge.challengeId)
  return challenge ? getActiveChallengeModifiers(challenge).noPrestige : false
}

export function getProductionMultiplier(
  state: ProductionMultiplierState,
  options: ProductionMultiplierOptions = {},
): Decimal {
  const achievementSet = new Set(state.achievements)
  const challengeMults = getChallengeMultipliers(
    state.completedChallenges,
    state.challengeBestTimes ?? {},
    state.keepChallenges ?? false,
  )
  const noPrestige = options.noPrestige ?? isNoPrestigeActive(state)
  const signatureAllocation = noPrestige
    ? ZERO_SIGNATURE_ALLOCATION
    : (state.signatureAllocation ?? ZERO_SIGNATURE_ALLOCATION)
  const signatureCount = noPrestige ? 0 : (state.signatureCount ?? 0)
  const signatureEffects = getSignatureEffects(
    signatureAllocation,
    getSignatureEfficiency(signatureCount),
  )
  const recordsSold = options.recordsSold ?? state.recordsSold
  const platinum = options.platinum ?? state.platinum
  const crescendoLevel = options.crescendoLevel ?? state.crescendo
  const warmUpMult = options.warmUpMult ?? (
    state.activeChallenge ? 1 : warmUpMultiplier(state.warmUpLevel ?? 0)
  )
  const entries: MultEntry[] = [
    {
      source: 'core',
      channel: 'core',
      value: getCoreProductionMultiplier({
        lifetimeEncorePoints: noPrestige ? 0 : state.lifetimeEncorePoints,
        finalePoints: noPrestige ? 0 : state.finalePoints,
        encoreUpgrades: state.encoreUpgrades,
        tempoLevel: state.tempo.level,
        tiers: state.tiers,
        opusUpgrades: state.opusUpgrades,
        crescendoLevel,
        recordsSold,
        platinum,
        massProduction: hasPerk(achievementSet, 'perk-bulk-unlock'),
        achievementTempoBonus: getAchievementTempoBonus(achievementSet)
          + challengeMults.tempoBonus
          + signatureEffects.tempoBonus,
        acclaimMult: state.worldTourUnlocked && !noPrestige
          ? getAcclaimMultiplier(state.lifetimeAcclaim)
          : 1,
        challengeGlobalProdMult: challengeMults.globalProdMult,
        warmUpMult,
        crescendoBonus: challengeMults.crescendoBonus + signatureEffects.crescendoBonus,
      }),
    },
    {
      source: 'signature:domain',
      channel: 'domain',
      value: getSignatureProductionMultiplier(signatureAllocation, signatureCount),
    },
  ]

  return getAchievementGlobalMultiplier(achievementSet).times(composeMultiplier(entries))
}
