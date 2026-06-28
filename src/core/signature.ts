import Decimal from 'break_infinity.js'
import type { SignatureDomain } from '../store/types'

export const SIGNATURE_BUDGET = 1
export const SIGNATURE_DOMAINS: readonly SignatureDomain[] = [
  'percussion',
  'strings',
  'brass',
  'woodwinds',
  'harmony',
] as const

export const ZERO_SIGNATURE_ALLOCATION: Record<SignatureDomain, number> = {
  percussion: 0,
  strings: 0,
  brass: 0,
  woodwinds: 0,
  harmony: 0,
}

const SIGNATURE_EFFICIENCY_LOG_SCALE = 0.35 // TBD-tune (sim/playtest)
const SIGNATURE_EFFICIENCY_LOG_MULT = 0.55 // TBD-tune (sim/playtest)
const SIGNATURE_EFFICIENCY_CAP = 1.75 // TBD-tune (sim/playtest)
const PERCUSSION_TEMPO_BONUS_MAX = 0.08 // TBD-tune (sim/playtest)
const STRINGS_CRESCENDO_BONUS_MAX = 0.25 // TBD-tune (sim/playtest)
const BRASS_PROD_ADD_MAX = 0.25 // TBD-tune (sim/playtest)
const WOODWINDS_COST_REDUCTION_MAX = 0.08 // TBD-tune (sim/playtest)
const HARMONY_PROD_ADD_MAX = 0.18 // TBD-tune (sim/playtest)
const HARMONY_EVENNESS_EXPONENT = 1 // TBD-tune (sim/playtest)
const MIN_SIGNATURE_COST_MULT = 0.5 // TBD-tune (sim/playtest)

export interface SignatureEffects {
  prodMult: Decimal
  tempoBonus: number
  crescendoBonus: number
  costMult: number
  harmonyMult: Decimal
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function allocationValue(
  alloc: Partial<Record<SignatureDomain, number>> | undefined,
  domain: SignatureDomain,
): number {
  const value = alloc?.[domain] ?? 0
  return Math.min(1, finiteNonNegative(value))
}

function allocationSum(alloc: Partial<Record<SignatureDomain, number>> | undefined): number {
  return SIGNATURE_DOMAINS.reduce((sum, domain) => sum + allocationValue(alloc, domain), 0)
}

function allocationEvenness(alloc: Partial<Record<SignatureDomain, number>> | undefined): number {
  const total = allocationSum(alloc)
  if (total <= 0) return 0

  let concentration = 0
  for (const domain of SIGNATURE_DOMAINS) {
    const share = allocationValue(alloc, domain) / total
    concentration += share * share
  }

  const effectiveDomains = concentration > 0 ? 1 / concentration : 0
  const evenness = (effectiveDomains - 1) / (SIGNATURE_DOMAINS.length - 1)
  const spentBreadth = Math.min(1, total / SIGNATURE_BUDGET)
  return Math.pow(Math.max(0, Math.min(1, evenness * spentBreadth)), HARMONY_EVENNESS_EXPONENT)
}

export function getSignatureEfficiency(signatureCount: number): number {
  const count = finiteNonNegative(signatureCount)
  if (count <= 0) return 1
  const logTerm = Math.log10(1 + count * SIGNATURE_EFFICIENCY_LOG_SCALE)
  const add = Math.min(logTerm * SIGNATURE_EFFICIENCY_LOG_MULT, SIGNATURE_EFFICIENCY_CAP - 1)
  const efficiency = 1 + add
  return Number.isFinite(efficiency)
    ? Math.min(SIGNATURE_EFFICIENCY_CAP, Math.max(1, efficiency))
    : SIGNATURE_EFFICIENCY_CAP
}

export function getSignatureEffects(
  alloc: Partial<Record<SignatureDomain, number>> | undefined,
  efficiency: number,
): SignatureEffects {
  if (allocationSum(alloc) <= 0) {
    return {
      prodMult: new Decimal(1),
      tempoBonus: 0,
      crescendoBonus: 0,
      costMult: 1,
      harmonyMult: new Decimal(1),
    }
  }

  const e = Math.max(0, Number.isFinite(efficiency) ? efficiency : 1)
  const percussion = allocationValue(alloc, 'percussion') * e
  const strings = allocationValue(alloc, 'strings') * e
  const brass = allocationValue(alloc, 'brass') * e
  const woodwinds = allocationValue(alloc, 'woodwinds') * e
  const harmony = allocationValue(alloc, 'harmony') * e
  const evenness = allocationEvenness(alloc)

  const prodMult = new Decimal(1 + brass * BRASS_PROD_ADD_MAX)
  const tempoBonus = percussion * PERCUSSION_TEMPO_BONUS_MAX
  const crescendoBonus = strings * STRINGS_CRESCENDO_BONUS_MAX
  const rawCostMult = 1 - woodwinds * WOODWINDS_COST_REDUCTION_MAX
  const costMult = Math.max(MIN_SIGNATURE_COST_MULT, Math.min(1, rawCostMult))
  const harmonyMult = new Decimal(1 + harmony * evenness * HARMONY_PROD_ADD_MAX)

  return { prodMult, tempoBonus, crescendoBonus, costMult, harmonyMult }
}

export function getSignatureProductionMultiplier(
  alloc: Partial<Record<SignatureDomain, number>> | undefined,
  signatureCount: number,
): Decimal {
  const effects = getSignatureEffects(alloc, getSignatureEfficiency(signatureCount))
  return effects.prodMult.times(effects.harmonyMult)
}
