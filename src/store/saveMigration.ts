import Decimal from 'break_infinity.js'
import type { GameState, PreChallengeSnapshot, TierState } from './types'
import { STARTING_SOUNDWAVES, DEFAULT_SETTINGS, DEFAULT_HOTKEYS } from '../core/constants'
import { createInitialState } from './initialState'
import { SAVE_SCHEMA_VERSION } from './saveSchema'
import {
  hasPreStoryProgress,
  seedSeenStoryBeatsFromProgress,
} from '../components/story/beats'

export { SAVE_SCHEMA_VERSION } from './saveSchema'

type DecimalReviveMode = 'nullish' | 'falsy'

interface TopLevelDecimalKey {
  key: keyof GameState
  defaultValue: number | string | Decimal
  /** `falsy` matches legacy peakSoundwaves (`value || 0`); default is nullish coalescing. */
  mode?: DecimalReviveMode
}

/** Top-level GameState fields stored as Decimal (verify against createInitialState). */
export const TOP_LEVEL_DECIMAL_KEYS: readonly TopLevelDecimalKey[] = [
  { key: 'soundwaves', defaultValue: STARTING_SOUNDWAVES },
  { key: 'peakSoundwaves', defaultValue: 0, mode: 'falsy' },
  { key: 'producedThisRun', defaultValue: 0 },
  { key: 'acclaim', defaultValue: 0 },
  { key: 'lifetimeAcclaim', defaultValue: 0 },
  { key: 'venueBuffer', defaultValue: 0 },
  { key: 'catalogueSnapshot', defaultValue: 1 },
] as const

const TOP_LEVEL_DECIMAL_KEY_SET = new Set(TOP_LEVEL_DECIMAL_KEYS.map((d) => d.key))

/** Falsy-guard defaults (legacy `if (!state.x)` checks). */
const FALSY_DEFAULT_KEYS: (keyof GameState)[] = [
  'achievements',
  'completedChallenges',
  'challengeBestTimes',
  'autobuyers',
  'encoreUpgrades',
  'opusUpgrades',
  'components',
  'seenStoryBeats',
  'buyAmount',
  'currentRunStartTime',
]

/** Legacy `typeof !== 'number' || !isFinite` guards. */
const FINITE_NUMBER_KEYS: (keyof GameState)[] = [
  'lifetimeEncoreCount',
  'applausePoints',
]

/** Fields handled outside the generic undefined loop. */
const SKIP_DEFAULT_KEYS = new Set<keyof GameState>([
  ...TOP_LEVEL_DECIMAL_KEY_SET,
  ...FALSY_DEFAULT_KEYS,
  ...FINITE_NUMBER_KEYS,
  'tiers',
  'tempo',
  'totalTimePlayed',
  'lastSaveTimestamp',
  'version',
  'saveSchemaVersion',
])

export type PersistedSave = Partial<GameState> & Pick<GameState, 'soundwaves' | 'tiers' | 'tempo'>

function reviveDecimalValue(
  value: unknown,
  defaultValue: number | string | Decimal,
  mode: DecimalReviveMode = 'nullish',
): Decimal {
  if (value instanceof Decimal) return value
  const defaultResolved = defaultValue instanceof Decimal ? defaultValue : new Decimal(defaultValue)
  const fallback = mode === 'falsy'
    ? (value || defaultResolved)
    : (value ?? defaultResolved)
  return fallback instanceof Decimal ? fallback : new Decimal(fallback as number | string)
}

function reviveTierDecimals(tiers: TierState[] | undefined): void {
  if (!tiers) return
  for (const tier of tiers) {
    tier.quantity = reviveDecimalValue(tier.quantity, 0)
    tier.multiplier = reviveDecimalValue(tier.multiplier, 1)
  }
}

function revivePreChallengeDecimals(pre: PreChallengeSnapshot | null | undefined): void {
  if (!pre) return
  pre.soundwaves = reviveDecimalValue(pre.soundwaves, 0)
  reviveTierDecimals(pre.tiers)
}

/** Revive every Decimal field after JSON parse (top-level, tiers, pre-challenge snapshot). */
export function reviveDecimals(state: PersistedSave): void {
  for (const { key, defaultValue, mode } of TOP_LEVEL_DECIMAL_KEYS) {
    ;(state as Record<keyof GameState, unknown>)[key] = reviveDecimalValue(
      state[key],
      defaultValue,
      mode,
    )
  }
  reviveTierDecimals(state.tiers)
  revivePreChallengeDecimals(state.preChallengeState)
}

function applyFalsyDefaults(state: PersistedSave, defaults: GameState): void {
  for (const key of FALSY_DEFAULT_KEYS) {
    const current = state[key]
    if (!current) {
      if (key === 'currentRunStartTime') {
        state.currentRunStartTime = Date.now()
      } else {
        ;(state as Record<keyof GameState, unknown>)[key] = defaults[key]
      }
    }
  }
}

function applyFiniteNumberDefaults(state: PersistedSave, defaults: GameState): void {
  for (const key of FINITE_NUMBER_KEYS) {
    const value = state[key] as number | undefined
    if (typeof value !== 'number' || !isFinite(value)) {
      ;(state as Record<keyof GameState, unknown>)[key] = defaults[key]
    }
  }
}

function applyUndefinedDefaults(state: PersistedSave, defaults: GameState): void {
  for (const key of Object.keys(defaults) as (keyof GameState)[]) {
    if (SKIP_DEFAULT_KEYS.has(key)) continue
    if (state[key] === undefined) {
      ;(state as Record<keyof GameState, unknown>)[key] = defaults[key]
    }
  }
}

function applyStoryBeatSeeding(state: PersistedSave): void {
  if (state.seenStoryBeats && state.seenStoryBeats.length === 0 && hasPreStoryProgress(state as GameState)) {
    state.seenStoryBeats = seedSeenStoryBeatsFromProgress(state as GameState)
  }
}

/**
 * Ordered pure migrations keyed by target schema version.
 * Version 1 is an identity baseline — defaults + decimal revival cover pre-schema saves.
 */
export const MIGRATIONS: Record<number, (state: PersistedSave) => void> = {
  1: () => {
    /* identity - fields introduced after v1 go here as v2, v3, ... */
  },
  2: (state) => {
    state.signatureAllocation ??= { percussion: 0, strings: 0, brass: 0, woodwinds: 0, harmony: 0 }
    state.signatureCount ??= 0
    state.peakDomainAlignment ??= { percussion: 0, strings: 0, brass: 0, woodwinds: 0, harmony: 0 }
    state.signatureUnlocked ??= false
  },
  3: (state) => {
    // Player settings. Merge so old saves get defaults AND any future sub-key fills in.
    state.settings = { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) }
  },
  4: (state) => {
    // Rebindable hotkeys added to settings — re-merge so v3 saves backfill `settings.hotkeys`, and
    // DEEP-merge hotkeys so a partial/edited IMPORTED save can't leave an individual action key missing
    // (which would silently disable that hotkey).
    const s = { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) }
    s.hotkeys = { ...DEFAULT_HOTKEYS, ...(s.hotkeys ?? {}) }
    state.settings = s
  },
}

function runMigrationChain(state: PersistedSave): void {
  let version = state.saveSchemaVersion ?? 0
  while (version < SAVE_SCHEMA_VERSION) {
    version += 1
    MIGRATIONS[version]?.(state)
  }
  state.saveSchemaVersion = SAVE_SCHEMA_VERSION
}

/** Defaults, migrations, and Decimal revival for a parsed save (no offline replay). */
export function migratePersistedSave(state: PersistedSave): void {
  runMigrationChain(state)

  const defaults = createInitialState()
  applyFalsyDefaults(state, defaults)
  applyFiniteNumberDefaults(state, defaults)
  applyUndefinedDefaults(state, defaults)
  reviveDecimals(state)
  applyStoryBeatSeeding(state)
}

/** Idempotent re-run of the migration pipeline (for tests and safe reload). */
export function remigratePersistedSave(state: PersistedSave): void {
  migratePersistedSave(state)
}
