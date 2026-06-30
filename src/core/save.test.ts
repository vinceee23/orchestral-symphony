import { beforeEach, describe, expect, it } from 'vitest'
import { SAVE_KEY, exportSaveString, importSaveString, parseSaveString } from './save'

// vitest runs in node (no localStorage) — minimal shim. atob/btoa/TextEncoder are global in node 18+.
const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  ;(globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
  } as Storage
})

// Persist shape: { state: {...}, version }. Decimals serialize as { __decimal: "..." }.
const RAW = JSON.stringify({
  state: {
    soundwaves: { __decimal: '1.5e10' },
    tiers: [{ id: 1, name: 'Notes', quantity: { __decimal: '42' }, purchased: 5, multiplier: { __decimal: '2' }, unlocked: true }],
    tempo: { level: 3, tickInterval: 1000, baseBPM: 60 },
  },
  version: 0,
})

describe('save export/import round-trip', () => {
  it('exports then re-imports BYTE-IDENTICALLY (Decimal markers survive)', () => {
    localStorage.setItem(SAVE_KEY, RAW)
    const exported = exportSaveString()
    localStorage.removeItem(SAVE_KEY) // simulate a wipe before import
    expect(importSaveString(exported)).toBe(true)
    // Identical bytes back → the persist reviver restores Decimals on the next reload.
    expect(localStorage.getItem(SAVE_KEY)).toBe(RAW)
  })

  it('parseSaveString reads the embedded state and validates shape', () => {
    localStorage.setItem(SAVE_KEY, RAW)
    const st = parseSaveString(exportSaveString())
    expect(st).not.toBeNull()
    expect(Array.isArray(st!.tiers)).toBe(true)
  })

  it('rejects garbage / non-Sonance saves WITHOUT writing', () => {
    localStorage.setItem(SAVE_KEY, RAW)
    expect(importSaveString('!!not-base64!!')).toBe(false)
    expect(importSaveString(btoa('{"state":{}}'))).toBe(false)   // missing soundwaves + tiers
    expect(importSaveString(btoa('{"nope":1}'))).toBe(false)
    // missing tempo — would crash on state.tempo.level after reload (tempo isn't backfilled)
    expect(importSaveString(btoa('{"state":{"soundwaves":{"__decimal":"1"},"tiers":[]}}'))).toBe(false)
    expect(localStorage.getItem(SAVE_KEY)).toBe(RAW)             // original untouched
  })
})
