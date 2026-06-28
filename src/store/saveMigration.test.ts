import { describe, it, expect } from 'vitest'
import Decimal from 'break_infinity.js'
import { TIER_CONFIGS } from '../core/constants'
import { createInitialState } from './initialState'
import {
  TOP_LEVEL_DECIMAL_KEYS,
  migratePersistedSave,
  remigratePersistedSave,
  reviveDecimals,
  SAVE_SCHEMA_VERSION,
  type PersistedSave,
} from './saveMigration'

function serializeSave(state: unknown): string {
  return JSON.stringify(state, (_key, value) => {
    if (value instanceof Decimal) {
      return { __decimal: value.toString() }
    }
    return value
  })
}

function parseSave(raw: string): unknown {
  return JSON.parse(raw, (_key, value) => {
    if (
      value &&
      typeof value === 'object' &&
      value !== null &&
      '__decimal' in value
    ) {
      return new Decimal((value as { __decimal: string }).__decimal)
    }
    return value
  })
}

function minimalLegacySave(overrides: Record<string, unknown> = {}): PersistedSave {
  return {
    soundwaves: 42,
    tiers: TIER_CONFIGS.map((config) => ({
      id: config.id,
      name: config.name,
      quantity: config.id === 1 ? 3 : 0,
      purchased: config.id === 1 ? 3 : 0,
      multiplier: config.id === 1 ? 1.5 : 1,
      unlocked: config.id === 1,
    })),
    tempo: { level: 0, tickInterval: 1000, baseBPM: 60 },
    lastSaveTimestamp: Date.now(),
    totalTimePlayed: 0,
    version: '0.5.0',
    ...overrides,
  } as unknown as PersistedSave
}

describe('saveMigration', () => {
  it('revives all Decimal fields after JSON round-trip (incl. tiers + pre-challenge)', () => {
    const fresh = createInitialState()
    fresh.preChallengeState = {
      soundwaves: new Decimal(99),
      tiers: fresh.tiers.map((t) => ({
        ...t,
        quantity: new Decimal(7),
        multiplier: new Decimal(2),
      })),
      tempo: fresh.tempo,
    }
    fresh.tiers[0].quantity = new Decimal(11)
    fresh.tiers[0].multiplier = new Decimal(3)

    const parsed = parseSave(serializeSave(fresh)) as PersistedSave
    reviveDecimals(parsed)

    for (const { key } of TOP_LEVEL_DECIMAL_KEYS) {
      expect(parsed[key], key).toBeInstanceOf(Decimal)
    }
    expect(parsed.tiers[0].quantity).toBeInstanceOf(Decimal)
    expect(parsed.tiers[0].multiplier).toBeInstanceOf(Decimal)
    expect(parsed.tiers[0].quantity.toNumber()).toBe(11)
    expect(parsed.preChallengeState!.soundwaves).toBeInstanceOf(Decimal)
    expect(parsed.preChallengeState!.tiers[0].quantity).toBeInstanceOf(Decimal)
  })

  it('defaults missing newer fields on a sparse legacy save', () => {
    const legacy = minimalLegacySave()
    migratePersistedSave(legacy)

    const defaults = createInitialState()
    expect(legacy.acclaim).toBeInstanceOf(Decimal)
    expect(legacy.acclaim!.eq(0)).toBe(true)
    expect(legacy.catalogueSnapshot!.eq(1)).toBe(true)
    expect(legacy.keepChallenges).toBe(defaults.keepChallenges)
    expect(legacy.worldTourUnlocked).toBe(defaults.worldTourUnlocked)
    expect(legacy.applausePoints).toBe(0)
    expect(legacy.lifetimeEncoreCount).toBe(0)
    expect(legacy.signatureAllocation).toEqual(defaults.signatureAllocation)
    expect(legacy.signatureCount).toBe(0)
    expect(legacy.peakDomainAlignment).toEqual(defaults.peakDomainAlignment)
    expect(legacy.signatureUnlocked).toBe(false)
    expect(legacy.seenStoryBeats).toEqual([])
    expect(legacy.saveSchemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(legacy.soundwaves).toBeInstanceOf(Decimal)
    expect(legacy.soundwaves!.eq(42)).toBe(true)
    expect(legacy.tiers[0].quantity).toBeInstanceOf(Decimal)
  })

  it('runs the migration chain without error and is idempotent', () => {
    const legacy = minimalLegacySave({ saveSchemaVersion: undefined })
    expect(() => migratePersistedSave(legacy)).not.toThrow()
    expect(legacy.saveSchemaVersion).toBe(SAVE_SCHEMA_VERSION)

    const snapshotAcclaim = legacy.acclaim!.toString()
    const snapshotWorldTour = legacy.worldTourUnlocked
    remigratePersistedSave(legacy)
    expect(legacy.saveSchemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(legacy.acclaim!.toString()).toBe(snapshotAcclaim)
    expect(legacy.worldTourUnlocked).toBe(snapshotWorldTour)
  })

  it('coerces non-finite applause / lifetimeEncoreCount like the legacy guards', () => {
    const legacy = minimalLegacySave({
      applausePoints: NaN,
      lifetimeEncoreCount: Infinity,
    })
    migratePersistedSave(legacy)
    expect(legacy.applausePoints).toBe(0)
    expect(legacy.lifetimeEncoreCount).toBe(0)
  })

  it('uses falsy coalescing for peakSoundwaves (legacy || 0)', () => {
    const legacy = minimalLegacySave({ peakSoundwaves: 0 as unknown as Decimal })
    migratePersistedSave(legacy)
    expect(legacy.peakSoundwaves!.eq(0)).toBe(true)
  })
})
