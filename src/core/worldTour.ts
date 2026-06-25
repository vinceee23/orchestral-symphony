import Decimal from 'break_infinity.js'
import { PLATINUM_THRESHOLD } from './constants'
import type { GameState } from '../store/types'

/** Tuned L3 constants — ported from sim/l3-pacing.test.ts (single source of truth). */
export const L3 = {
  ACCLAIM_BASE: 0.168,
  CAT_EXP: 0.62,
  INSTR_PER: 0.2,
  CAP_BASE: 88,
  ROOF_PER: 0.48,
  LIGHT_FILL_PER: 0.24,
  CONDUCT_FILL_MULT: 1.75,
  MAX_COMPONENT_TIER: 5,
  GRADUATE_MIN_TIER: 3,
  GRADUATE_TOTAL_LEVELS: 9,
  CATALOGUE_OPUS_W: 1.15,
  CATALOGUE_RECORDS_W: 2.2,
  MULT_FORM: 'capped-log' as const,
  MULT_LOG_SCALE: 0.022,
  MULT_LOG_MULT: 0.72,
  MULT_LINEAR_K: 0.00032,
  MULT_LINEAR_CAP: 36,
  MULT_CAP: 48,
  GATE_POST_PLAT_MO: 2,
  GATE_MIN_PEAK_SW_LOG10: 0,
  KEEP_AUTOBUYERS_COST: 165,
  AUTO_MO_FROM_TOUR: 2,
  LEGACY_RECORDS_FRACTION: 0.12,
  COMPONENTS: {
    roof: { costBase: 215, costGrowth: 2.34, label: 'Roof', effect: 'capacity' },
    lighting: { costBase: 185, costGrowth: 2.28, label: 'Lighting', effect: 'fill speed' },
    instruments: { costBase: 235, costGrowth: 2.4, label: 'Instruments', effect: 'Acclaim rate' },
  } as const,
} as const

export type ComponentId = keyof typeof L3.COMPONENTS

export const VENUE_1 = {
  id: 0,
  name: 'The Old House',
  componentIds: ['roof', 'lighting', 'instruments'] as ComponentId[],
} as const

export function getCatalogueSnapshot(opusCount: number, recordsSold: number): number {
  const recordsNorm = recordsSold / PLATINUM_THRESHOLD
  return Math.max(1, L3.CATALOGUE_OPUS_W * opusCount + L3.CATALOGUE_RECORDS_W * recordsNorm)
}

export function getVenueCapacity(components: Record<string, number>): number {
  const roofLvl = components.roof ?? 0
  return L3.CAP_BASE * (1 + roofLvl * L3.ROOF_PER)
}

export function getAcclaimRate(
  catalogueSnapshot: Decimal | number,
  components: Record<string, number>,
): number {
  const snapshot = catalogueSnapshot instanceof Decimal
    ? catalogueSnapshot.toNumber()
    : catalogueSnapshot
  const instrumentsLvl = components.instruments ?? 0
  const cat = Math.pow(Math.max(1, snapshot), L3.CAT_EXP)
  const instr = 1 + instrumentsLvl * L3.INSTR_PER
  const raw = L3.ACCLAIM_BASE * cat * instr
  return Number.isFinite(raw) && raw > 0 ? raw : 0
}

export function getFillSpeed(
  catalogueSnapshot: Decimal | number,
  components: Record<string, number>,
  conducting: boolean,
): number {
  const rate = getAcclaimRate(catalogueSnapshot, components)
  const lightingLvl = components.lighting ?? 0
  const light = 1 + lightingLvl * L3.LIGHT_FILL_PER
  const conduct = conducting ? L3.CONDUCT_FILL_MULT : 1
  return rate * light * conduct
}

export function getComponentCost(componentId: string, level: number): number {
  const cfg = L3.COMPONENTS[componentId as ComponentId]
  if (!cfg) return Infinity
  const raw = cfg.costBase * Math.pow(cfg.costGrowth, level)
  return Number.isFinite(raw) ? raw : Infinity
}

export function isVenueGraduatable(components: Record<string, number>): boolean {
  const ids = VENUE_1.componentIds
  if (L3.GRADUATE_MIN_TIER > 0) {
    return ids.every((id) => (components[id] ?? 0) >= L3.GRADUATE_MIN_TIER)
  }
  const total = ids.reduce((s, id) => s + (components[id] ?? 0), 0)
  return total >= L3.GRADUATE_TOTAL_LEVELS
}

export function getAcclaimMultiplier(lifetimeAcclaim: Decimal | number): number {
  const la = lifetimeAcclaim instanceof Decimal
    ? lifetimeAcclaim.toNumber()
    : Math.max(0, lifetimeAcclaim)
  if (la === 0) return 1
  if (L3.MULT_FORM === 'capped-log') {
    const logTerm = Math.log10(1 + la * L3.MULT_LOG_SCALE)
    const logAdd = L3.MULT_LOG_MULT * logTerm
    const linearAdd = Math.min(la * L3.MULT_LINEAR_K, L3.MULT_LINEAR_CAP)
    const add = Math.min(logAdd + linearAdd, L3.MULT_CAP)
    const m = 1 + add
    return Number.isFinite(m) && m >= 1 ? m : 1
  }
  return 1
}

export function canUnlockWorldTour(state: GameState): boolean {
  const platinum = state.platinum || state.recordsSold >= PLATINUM_THRESHOLD
  if (!platinum) return false
  if ((state.postPlatinumMoCount ?? 0) < L3.GATE_POST_PLAT_MO) return false
  if (L3.GATE_MIN_PEAK_SW_LOG10 > 0) {
    const l10 = state.peakSoundwaves.log10()
    if (!isFinite(l10) || l10 < L3.GATE_MIN_PEAK_SW_LOG10) return false
  }
  return true
}

/** Venue buffer fill + auto-bank on cap (anti-AFK: stops after one buffer until player acts). */
export function calculateWorldTourTick(
  state: Pick<
    GameState,
    'worldTourUnlocked' | 'catalogueSnapshot' | 'components' | 'venueBuffer' | 'venueSoldOut'
    | 'acclaim' | 'lifetimeAcclaim'
  >,
  deltaMs: number,
  conducting: boolean,
): Partial<GameState> {
  if (!state.worldTourUnlocked) return {}

  const dtSec = deltaMs / 1000
  let venueBuffer = state.venueBuffer instanceof Decimal
    ? state.venueBuffer
    : new Decimal(state.venueBuffer ?? 0)
  let acclaim = state.acclaim instanceof Decimal
    ? state.acclaim
    : new Decimal(state.acclaim ?? 0)
  let lifetimeAcclaim = state.lifetimeAcclaim instanceof Decimal
    ? state.lifetimeAcclaim
    : new Decimal(state.lifetimeAcclaim ?? 0)
  let venueSoldOut = state.venueSoldOut ?? false

  const cap = getVenueCapacity(state.components)

  if (!venueSoldOut) {
    const speed = getFillSpeed(state.catalogueSnapshot, state.components, conducting)
    venueBuffer = Decimal.min(new Decimal(cap), venueBuffer.plus(speed * dtSec))
    if (venueBuffer.gte(cap - 1e-9)) {
      venueBuffer = new Decimal(cap)
      acclaim = acclaim.plus(venueBuffer)
      lifetimeAcclaim = lifetimeAcclaim.plus(venueBuffer)
      venueBuffer = new Decimal(0)
      venueSoldOut = true
    }
  }

  return { venueBuffer, acclaim, lifetimeAcclaim, venueSoldOut }
}
