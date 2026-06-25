import Decimal from 'break_infinity.js'
import { PLATINUM_THRESHOLD } from './constants'
import { getMagnumOpusCost } from './constants'
import type { GameState } from '../store/types'

/** Tuned L3 constants — ported from sim/l3-pacing.test.ts (single source of truth). */
export const L3 = {
  ACCLAIM_BASE: 0.168,
  CAT_EXP: 0.62,
  INSTR_PER: 0.2,
  CROWD_PER: 0.18,
  MARKETING_PER: 0.15,
  CAP_BASE: 88,
  ROOF_PER: 0.48,
  BACKSTAGE_CAP_PER: 0.22,
  LIGHT_FILL_PER: 0.24,
  ACOUSTIC_FILL_PER: 0.14,
  CONDUCT_FILL_MULT: 1.75,
  MAX_COMPONENT_TIER: 5,
  MAX_NUMBER_TIER: 8,
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
  /** Auto-MO unlocks after this many tours started (sim pacing). */
  AUTO_MO_FROM_TOUR: 2,
  /** Auto-MO also unlocks when reaching this venue index (mid-ladder). */
  AUTO_MO_VENUE: 2,
  LEGACY_RECORDS_FRACTION: 0.12,
  COMPONENTS: {
    roof: { costBase: 215, costGrowth: 2.34, label: 'Roof', effect: 'capacity', visual: true },
    lighting: { costBase: 185, costGrowth: 2.28, label: 'Lighting', effect: 'fill speed', visual: true },
    instruments: { costBase: 235, costGrowth: 2.4, label: 'Instruments', effect: 'Acclaim rate', visual: true },
    crowd: { costBase: 275, costGrowth: 2.38, label: 'Crowd', effect: 'passive rate', visual: true },
    acoustics: { costBase: 310, costGrowth: 2.18, label: 'Acoustics', effect: 'fill speed', visual: false },
    marketing: { costBase: 295, costGrowth: 2.22, label: 'Marketing', effect: 'Acclaim rate', visual: false },
    backstage: { costBase: 330, costGrowth: 2.26, label: 'Backstage', effect: 'capacity', visual: false },
    premiere: { costBase: 395, costGrowth: 2.48, label: 'Premiere', effect: 'quality', visual: false },
  } as const,
} as const

export type ComponentId = keyof typeof L3.COMPONENTS

export interface VenueConfig {
  id: number
  name: string
  componentIds: ComponentId[]
  costScale: number
  capScale: number
}

/** Linear venue ladder — Old House through World Stage. */
export const VENUES: readonly VenueConfig[] = [
  {
    id: 0,
    name: 'The Old House',
    componentIds: ['roof', 'lighting', 'instruments'],
    costScale: 1,
    capScale: 1,
  },
  {
    id: 1,
    name: 'Local Hall',
    componentIds: ['roof', 'lighting', 'instruments', 'crowd'],
    costScale: 1.38,
    capScale: 1.18,
  },
  {
    id: 2,
    name: 'City Theatre',
    componentIds: ['roof', 'lighting', 'instruments', 'crowd', 'acoustics'],
    costScale: 1.82,
    capScale: 1.38,
  },
  {
    id: 3,
    name: 'Concert Hall',
    componentIds: ['roof', 'lighting', 'instruments', 'crowd', 'acoustics', 'marketing'],
    costScale: 2.4,
    capScale: 1.62,
  },
  {
    id: 4,
    name: 'Opera House',
    componentIds: ['roof', 'lighting', 'instruments', 'crowd', 'acoustics', 'marketing', 'backstage'],
    costScale: 3.1,
    capScale: 1.9,
  },
  {
    id: 5,
    name: 'World Stage',
    componentIds: ['roof', 'lighting', 'instruments', 'crowd', 'acoustics', 'marketing', 'backstage', 'premiere'],
    costScale: 4,
    capScale: 2.25,
  },
] as const

export const LAST_VENUE_ID = VENUES.length - 1

/** @deprecated Use getVenue(0) — kept for imports that reference V1 slice. */
export const VENUE_1 = VENUES[0]

export function getVenue(venueId: number): VenueConfig {
  return VENUES[Math.max(0, Math.min(venueId, LAST_VENUE_ID))]
}

export function getComponentMaxTier(componentId: string): number {
  const cfg = L3.COMPONENTS[componentId as ComponentId]
  if (!cfg) return L3.MAX_COMPONENT_TIER
  return cfg.visual ? L3.MAX_COMPONENT_TIER : L3.MAX_NUMBER_TIER
}

export function getCatalogueSnapshot(opusCount: number, recordsSold: number): number {
  const recordsNorm = recordsSold / PLATINUM_THRESHOLD
  return Math.max(1, L3.CATALOGUE_OPUS_W * opusCount + L3.CATALOGUE_RECORDS_W * recordsNorm)
}

/** Live catalogue for post-circuit break; frozen snapshot otherwise. */
export function getEffectiveCatalogue(
  state: Pick<GameState, 'circuitComplete' | 'catalogueSnapshot' | 'opusCount' | 'recordsSold'>,
): number {
  if (state.circuitComplete) {
    return getCatalogueSnapshot(state.opusCount, state.recordsSold)
  }
  const snap = state.catalogueSnapshot instanceof Decimal
    ? state.catalogueSnapshot.toNumber()
    : state.catalogueSnapshot
  return Math.max(1, snap ?? 1)
}

export function getVenueCapacity(
  components: Record<string, number>,
  venueId = 0,
): number {
  const venue = getVenue(venueId)
  const roofLvl = components.roof ?? 0
  const backstageLvl = components.backstage ?? 0
  const structure = 1 + roofLvl * L3.ROOF_PER + backstageLvl * L3.BACKSTAGE_CAP_PER
  return L3.CAP_BASE * venue.capScale * structure
}

export function getAcclaimRate(
  catalogue: Decimal | number,
  components: Record<string, number>,
  venueId = 0,
): number {
  const snapshot = catalogue instanceof Decimal ? catalogue.toNumber() : catalogue
  const instrumentsLvl = components.instruments ?? 0
  const crowdLvl = components.crowd ?? 0
  const marketingLvl = components.marketing ?? 0
  const premiereLvl = components.premiere ?? 0
  const cat = Math.pow(Math.max(1, snapshot), L3.CAT_EXP)
  const quality =
    (1 + instrumentsLvl * L3.INSTR_PER) *
    (1 + crowdLvl * L3.CROWD_PER) *
    (1 + marketingLvl * L3.MARKETING_PER) *
    (1 + premiereLvl * 0.1)
  const venue = getVenue(venueId)
  const raw = L3.ACCLAIM_BASE * cat * quality / Math.pow(venue.costScale, 0.35)
  return Number.isFinite(raw) && raw > 0 ? raw : 0
}

export function getFillSpeed(
  catalogue: Decimal | number,
  components: Record<string, number>,
  conducting: boolean,
  venueId = 0,
): number {
  const rate = getAcclaimRate(catalogue, components, venueId)
  const lightingLvl = components.lighting ?? 0
  const acousticLvl = components.acoustics ?? 0
  const light = 1 + lightingLvl * L3.LIGHT_FILL_PER + acousticLvl * L3.ACOUSTIC_FILL_PER
  const conduct = conducting ? L3.CONDUCT_FILL_MULT : 1
  return rate * light * conduct
}

export function getComponentCost(componentId: string, level: number, venueId = 0): number {
  const cfg = L3.COMPONENTS[componentId as ComponentId]
  if (!cfg) return Infinity
  const venue = getVenue(venueId)
  const raw = cfg.costBase * venue.costScale * Math.pow(cfg.costGrowth, level)
  return Number.isFinite(raw) ? raw : Infinity
}

export function isVenueGraduatable(
  components: Record<string, number>,
  venueId = 0,
): boolean {
  const ids = getVenue(venueId).componentIds
  if (L3.GRADUATE_MIN_TIER > 0) {
    return ids.every((id) => (components[id] ?? 0) >= L3.GRADUATE_MIN_TIER)
  }
  const total = ids.reduce((s, id) => s + (components[id] ?? 0), 0)
  return total >= L3.GRADUATE_TOTAL_LEVELS
}

export function isAutoMOUnlocked(state: Pick<GameState, 'autoMO' | 'tourCount' | 'currentVenue'>): boolean {
  if (state.autoMO) return true
  if (state.tourCount >= L3.AUTO_MO_FROM_TOUR) return true
  if (state.currentVenue >= L3.AUTO_MO_VENUE) return true
  return false
}

export function canAutoPerformMagnumOpus(state: GameState): boolean {
  if (!state.autoMO || !state.autoMOEnabled) return false
  if (!state.layer1WallReached) return false
  if (state.activeChallenge) return false
  const moCost = getMagnumOpusCost(state.opusCount)
  const moPurchased = state.tiers[moCost.tierIndex]?.purchased ?? 0
  return moPurchased >= moCost.amount
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
    | 'acclaim' | 'lifetimeAcclaim' | 'currentVenue' | 'circuitComplete' | 'opusCount' | 'recordsSold'
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

  const venueId = state.currentVenue ?? 0
  const catalogue = getEffectiveCatalogue(state)
  const cap = getVenueCapacity(state.components, venueId)

  if (!venueSoldOut) {
    const speed = getFillSpeed(catalogue, state.components, conducting, venueId)
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
