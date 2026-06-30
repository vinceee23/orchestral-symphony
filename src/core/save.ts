import Decimal from 'break_infinity.js'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

/** localStorage key for the persisted save (shared with the zustand persist config). */
export const SAVE_KEY = 'sonance-v1'

/** Export the raw persisted save as a portable Base64 string (Settings → Save). */
export function exportSaveString(): string {
  const raw = localStorage.getItem(SAVE_KEY) ?? ''
  const bytes = new TextEncoder().encode(raw)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** Decode a Base64 save string to its persisted `state` object (no write). null if it isn't a Sonance save. */
export function parseSaveString(b64: string): Record<string, unknown> | null {
  try {
    const bin = atob(b64.trim())
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { state?: Record<string, unknown> }
    const st = parsed?.state
    // Require the core shape. `tempo` is in saveMigration's SKIP_DEFAULT_KEYS (not backfilled), so a
    // tempo-less import would crash on `state.tempo.level` after reload — reject it here.
    if (!st || st.soundwaves === undefined || !Array.isArray(st.tiers)
        || typeof st.tempo !== 'object' || st.tempo === null) return null
    return st
  } catch {
    return null
  }
}

/**
 * Validate + write an imported Base64 save string to localStorage. Returns false (no write) if the string
 * isn't a decodable Sonance save. Caller reloads the page so zustand rehydrates + migrates it.
 */
export function importSaveString(b64: string): boolean {
  if (!parseSaveString(b64)) return false
  const bin = atob(b64.trim())
  const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  localStorage.setItem(SAVE_KEY, json)
  return true
}

function decimalReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Decimal) {
    return { __decimal: value.toString() }
  }
  return value
}

function decimalReviver(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    value !== null &&
    '__decimal' in value
  ) {
    return new Decimal((value as { __decimal: string }).__decimal)
  }
  return value
}

/** Set true once if a write has failed, so the UI can warn the player progress isn't saving. */
export let saveWriteFailed = false

// Persistence is debounced: zustand's persist calls setItem on EVERY setState (~60/s during the game
// loop), each a full JSON.stringify + localStorage write. We coalesce that to ~1 write/sec (trailing)
// and flush on tab hide/close so the last second isn't lost. In non-browser envs (tests) we write
// synchronously so behavior + the test localStorage shim are unchanged.
let pendingName: string | null = null
let pendingValue: StorageValue<unknown> | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
let unloadHooked = false

function writeNow(name: string, value: StorageValue<unknown>) {
  try {
    localStorage.setItem(name, JSON.stringify(value, decimalReplacer))
    saveWriteFailed = false
  } catch (e) {
    // Quota exceeded / private mode / SecurityError: don't throw on every frame. Keep running
    // in-memory and flag it so the player can be told (and can still export their save).
    saveWriteFailed = true
    // eslint-disable-next-line no-console
    console.error('[save] localStorage write failed; progress is not being persisted.', e)
  }
}

function flushSave() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
  if (pendingName === null) return
  const name = pendingName
  const value = pendingValue as StorageValue<unknown>
  pendingName = null
  pendingValue = null
  writeNow(name, value)
}

function hookUnloadFlush() {
  if (unloadHooked || typeof window === 'undefined') return
  unloadHooked = true
  window.addEventListener('pagehide', flushSave)
  window.addEventListener('beforeunload', flushSave)
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave() })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDecimalStorage(): PersistStorage<any> {
  return {
    getItem(name: string): StorageValue<unknown> | null {
      const raw = localStorage.getItem(name)
      if (!raw) return null
      try {
        return JSON.parse(raw, decimalReviver) as StorageValue<unknown>
      } catch {
        // A corrupt/truncated save would boot a FRESH game and the next autosave would clobber the
        // bad bytes forever. Stash them to a sidecar key first so they're recoverable (manual repair
        // or future migration) instead of silently lost.
        try {
          localStorage.setItem(`${name}-corrupt`, raw)
          // eslint-disable-next-line no-console
          console.warn(`[save] couldn't parse "${name}"; backed up to "${name}-corrupt" and starting fresh.`)
        } catch { /* sidecar best-effort */ }
        return null
      }
    },
    setItem(name: string, value: StorageValue<unknown>) {
      // Tests / SSR: no window → write synchronously (unchanged behavior, keeps the test shim valid).
      if (typeof window === 'undefined') { writeNow(name, value); return }
      pendingName = name
      pendingValue = value
      hookUnloadFlush()
      if (flushTimer === null) flushTimer = setTimeout(flushSave, 1000)
    },
    removeItem(name: string) {
      try {
        localStorage.removeItem(name)
      } catch { /* noop */ }
    },
  }
}
