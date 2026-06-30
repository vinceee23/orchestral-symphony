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
    if (!st || st.soundwaves === undefined || !Array.isArray(st.tiers)) return null
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDecimalStorage(): PersistStorage<any> {
  return {
    getItem(name: string): StorageValue<unknown> | null {
      const raw = localStorage.getItem(name)
      if (!raw) return null
      try {
        return JSON.parse(raw, decimalReviver) as StorageValue<unknown>
      } catch {
        return null
      }
    },
    setItem(name: string, value: StorageValue<unknown>) {
      localStorage.setItem(name, JSON.stringify(value, decimalReplacer))
    },
    removeItem(name: string) {
      localStorage.removeItem(name)
    },
  }
}
