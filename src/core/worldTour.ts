import Decimal from 'break_infinity.js'
import { PLATINUM_THRESHOLD } from './constants'
import { getMagnumOpusCost } from './constants'
import type { GameState } from '../store/types'

export type ComponentTarget =
  | 'fillSpeed'
  | 'capacity'
  | 'acclaimRate'
  | 'autoCollect'
  | 'keepAutobuyers'
  | 'autoMO'
  | 'autoGraduate'

export interface ComponentDef {
  label: string
  role: 'multiplier' | 'unlock'
  maxLevel: number
  costBase: number
  costGrowth: number
  visual: boolean
  target: ComponentTarget
  /** Per-level boost for multiplier components. */
  perLevel?: number
}

/** Tuned L3 constants — ported from sim/l3-pacing.test.ts (single source of truth). */
export const L3 = {
  ACCLAIM_BASE: 0.163,
  CAT_EXP: 0.62,
  CAP_BASE: 88,
  CONDUCT_FILL_MULT: 1.75,
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
  LEGACY_RECORDS_FRACTION: 0.12,
  COMPONENTS: {
    lighting: {
      label: 'Lighting',
      role: 'multiplier',
      maxLevel: 3,
      costBase: 185,
      costGrowth: 2.28,
      visual: true,
      target: 'fillSpeed',
      perLevel: 0.24,
    },
    roof: {
      label: 'Roof',
      role: 'multiplier',
      maxLevel: 3,
      costBase: 215,
      costGrowth: 2.34,
      visual: true,
      target: 'capacity',
      perLevel: 0.48,
    },
    instruments: {
      label: 'Instruments',
      role: 'unlock',
      maxLevel: 1,
      costBase: 235,
      costGrowth: 2.4,
      visual: true,
      target: 'autoCollect',
    },
    crowd: {
      label: 'Crowd',
      role: 'multiplier',
      maxLevel: 3,
      costBase: 275,
      costGrowth: 2.38,
      visual: true,
      target: 'acclaimRate',
      perLevel: 0.18,
    },
    keepAutobuyers: {
      label: 'Keep Autobuyers',
      role: 'unlock',
      maxLevel: 1,
      costBase: 165,
      costGrowth: 1,
      visual: false,
      target: 'keepAutobuyers',
    },
    acoustics: {
      label: 'Acoustics',
      role: 'multiplier',
      maxLevel: 3,
      costBase: 310,
      costGrowth: 2.18,
      visual: false,
      target: 'fillSpeed',
      perLevel: 0.14,
    },
    autoMO: {
      label: 'Auto-MO',
      role: 'unlock',
      maxLevel: 1,
      costBase: 420,
      costGrowth: 1,
      visual: false,
      target: 'autoMO',
    },
    marketing: {
      label: 'Marketing',
      role: 'multiplier',
      maxLevel: 4,
      costBase: 295,
      costGrowth: 2.22,
      visual: false,
      target: 'acclaimRate',
      perLevel: 0.15,
    },
    backstage: {
      label: 'Backstage',
      role: 'multiplier',
      maxLevel: 3,
      costBase: 330,
      costGrowth: 2.26,
      visual: false,
      target: 'capacity',
      perLevel: 0.22,
    },
    premiere: {
      label: 'Premiere',
      role: 'multiplier',
      maxLevel: 3,
      costBase: 395,
      costGrowth: 2.48,
      visual: false,
      target: 'acclaimRate',
      perLevel: 0.1,
    },
    autoGraduate: {
      label: 'Auto-Graduate',
      role: 'unlock',
      maxLevel: 1,
      costBase: 520,
      costGrowth: 1,
      visual: false,
      target: 'autoGraduate',
    },
  } satisfies Record<string, ComponentDef>,
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
    componentIds: ['lighting', 'roof', 'instruments'],
    costScale: 1,
    capScale: 1,
  },
  {
    id: 1,
    name: 'Local Hall',
    componentIds: ['lighting', 'roof', 'crowd', 'keepAutobuyers'],
    costScale: 1.38,
    capScale: 1.18,
  },
  {
    id: 2,
    name: 'City Theatre',
    componentIds: ['lighting', 'roof', 'crowd', 'acoustics', 'autoMO'],
    costScale: 1.82,
    capScale: 1.38,
  },
  {
    id: 3,
    name: 'Concert Hall',
    componentIds: ['lighting', 'roof', 'crowd', 'acoustics', 'marketing'],
    costScale: 2.4,
    capScale: 1.62,
  },
  {
    id: 4,
    name: 'Opera House',
    componentIds: ['lighting', 'roof', 'crowd', 'acoustics', 'marketing', 'backstage'],
    costScale: 3.1,
    capScale: 1.9,
  },
  {
    id: 5,
    name: 'World Stage',
    componentIds: ['lighting', 'roof', 'crowd', 'acoustics', 'marketing', 'backstage', 'premiere', 'autoGraduate'],
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

export function getComponentDef(componentId: string): ComponentDef | undefined {
  return L3.COMPONENTS[componentId as ComponentId]
}

export function getComponentMaxTier(componentId: string): number {
  return getComponentDef(componentId)?.maxLevel ?? 1
}

export function isComponentMaxed(componentId: string, level: number): boolean {
  return level >= getComponentMaxTier(componentId)
}

function multiplierBoost(components: Record<string, number>, target: ComponentTarget): number {
  let boost = 1
  for (const [id, lvl] of Object.entries(components)) {
    if (lvl <= 0) continue
    const cfg = getComponentDef(id)
    if (!cfg || cfg.role !== 'multiplier' || cfg.target !== target || !cfg.perLevel) continue
    boost *= 1 + lvl * cfg.perLevel
  }
  return boost
}

/** Flags set when an unlock component is purchased. */
export function getUnlockFlagsFromComponent(
  componentId: string,
): Partial<Pick<GameState, 'autoCollect' | 'keepAutobuyers' | 'autoMO' | 'autoMOEnabled' | 'autoGraduate'>> {
  const cfg = getComponentDef(componentId)
  if (!cfg || cfg.role !== 'unlock') return {}
  switch (cfg.target) {
    case 'autoCollect':
      return { autoCollect: true }
    case 'keepAutobuyers':
      return { keepAutobuyers: true }
    case 'autoMO':
      return { autoMO: true, autoMOEnabled: true }
    case 'autoGraduate':
      return { autoGraduate: true }
    default:
      return {}
  }
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
  const structure = multiplierBoost(components, 'capacity')
  return L3.CAP_BASE * venue.capScale * structure
}

export function getAcclaimRate(
  catalogue: Decimal | number,
  components: Record<string, number>,
  venueId = 0,
): number {
  const snapshot = catalogue instanceof Decimal ? catalogue.toNumber() : catalogue
  const cat = Math.pow(Math.max(1, snapshot), L3.CAT_EXP)
  const quality = multiplierBoost(components, 'acclaimRate')
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
  const light = multiplierBoost(components, 'fillSpeed')
  const conduct = conducting ? L3.CONDUCT_FILL_MULT : 1
  return rate * light * conduct
}

export function getComponentCost(componentId: string, level: number, venueId = 0): number {
  const cfg = getComponentDef(componentId)
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
  return ids.every((id) => isComponentMaxed(id, components[id] ?? 0))
}

/** Build state patch for graduating the current venue (manual or auto). */
export function buildVenueGraduationPatch(
  state: Pick<GameState, 'currentVenue' | 'autoMO' | 'autoMOEnabled' | 'circuitComplete'>,
): Partial<GameState> | null {
  if (state.circuitComplete) return null

  const base: Partial<GameState> = {
    components: {},
    venueBuffer: new Decimal(0),
    venueSoldOut: false,
    autoMOEnabled: state.autoMOEnabled ?? true,
  }

  if (state.currentVenue >= LAST_VENUE_ID) {
    return { ...base, circuitComplete: true }
  }

  return { ...base, currentVenue: state.currentVenue + 1 }
}

export function isAutoMOUnlocked(state: Pick<GameState, 'autoMO'>): boolean {
  return !!state.autoMO
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

/** Venue buffer fill; auto-banks on cap when autoCollect is owned. */
export function calculateWorldTourTick(
  state: Pick<
    GameState,
    'worldTourUnlocked' | 'catalogueSnapshot' | 'components' | 'venueBuffer' | 'venueSoldOut'
    | 'acclaim' | 'lifetimeAcclaim' | 'currentVenue' | 'circuitComplete' | 'opusCount' | 'recordsSold'
    | 'autoCollect'
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
      if (state.autoCollect) {
        acclaim = acclaim.plus(venueBuffer)
        lifetimeAcclaim = lifetimeAcclaim.plus(venueBuffer)
        venueBuffer = new Decimal(0)
      }
      venueSoldOut = true
    }
  }

  return { venueBuffer, acclaim, lifetimeAcclaim, venueSoldOut }
}
