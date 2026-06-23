import Decimal from 'break_infinity.js'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

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
