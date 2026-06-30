import { describe, expect, it } from 'vitest'
import Decimal from 'break_infinity.js'
import { migratePersistedSave, SAVE_SCHEMA_VERSION, type PersistedSave } from './saveMigration'
import { DEFAULT_SETTINGS } from '../core/constants'

/** Regression: a saved settings object must SURVIVE load (the "settings reset on refresh" report). */
describe('settings persistence', () => {
  const baseSave = (): PersistedSave => ({
    soundwaves: new Decimal(100),
    tiers: [],
    tempo: { level: 0, tickInterval: 1000, baseBPM: 60 },
    saveSchemaVersion: 3,
  })

  it('keeps a non-default settings object across migrate', () => {
    const save = { ...baseSave(), settings: { ...DEFAULT_SETTINGS, notation: 'scientific', masterMuted: true, fpsCap: 30 } } as PersistedSave
    migratePersistedSave(save)
    expect(save.settings?.notation).toBe('scientific')
    expect(save.settings?.masterMuted).toBe(true)
    expect(save.settings?.fpsCap).toBe(30)
  })

  it('defaults settings only when the save has none', () => {
    const save = baseSave()
    migratePersistedSave(save)
    expect(save.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('deep-backfills a partial hotkeys map (e.g. a hand-edited import missing keys)', () => {
    const save = {
      ...baseSave(),
      settings: { ...DEFAULT_SETTINGS, hotkeys: { conduct: ' ' } },
    } as unknown as PersistedSave
    migratePersistedSave(save)
    expect(save.settings?.hotkeys.conduct).toBe(' ')   // kept
    expect(save.settings?.hotkeys.maxAll).toBe('m')    // backfilled
    expect(save.settings?.hotkeys.maxTempo).toBe('t')  // backfilled
  })

  it('completes partial hotkeys at the CURRENT schema too (unconditional normalize, not just <v4)', () => {
    // A current-schema save (migrations 3/4 do NOT run) with partial hotkeys must still be completed.
    const save = {
      ...baseSave(),
      saveSchemaVersion: SAVE_SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS, hotkeys: { conduct: ' ' } },
    } as unknown as PersistedSave
    migratePersistedSave(save)
    expect(save.settings?.hotkeys.maxAll).toBe('m')
    expect(save.settings?.hotkeys.maxTempo).toBe('t')
  })
})
