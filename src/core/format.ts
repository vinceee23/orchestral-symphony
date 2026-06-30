import Decimal from 'break_infinity.js'
import type { NumberNotation } from './constants'

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

// Player-chosen notation (set from settings on load + change — see settingsSync.ts). Module-level so
// formatNumber stays a pure-signature call used everywhere without threading a pref through every call site.
let notation: NumberNotation = 'suffix'
export function setNotation(n: NumberNotation): void {
  notation = n
}

function scientific(dec: Decimal): string {
  const exp = Math.floor(dec.log10())
  const mantissa = dec.div(Decimal.pow(10, exp)).toNumber()
  return `${mantissa.toFixed(2)}e${exp}`
}

function engineering(dec: Decimal): string {
  const exp3 = Math.floor(Math.floor(dec.log10()) / 3) * 3
  const mantissa = dec.div(Decimal.pow(10, exp3)).toNumber()
  return `${mantissa.toFixed(2)}e${exp3}`
}

export function formatNumber(value: Decimal | number, precision: number = 1): string {
  const dec = value instanceof Decimal ? value : new Decimal(value)

  if (dec.lte(0)) return '0'

  if (dec.lt(1000)) {
    const num = dec.toNumber()
    if (num < 10) return num.toFixed(precision)
    return Math.floor(num).toString()
  }

  if (notation === 'scientific') return scientific(dec)
  if (notation === 'engineering') return engineering(dec)

  // 'suffix' (default): alphabetic suffixes up to 1e36, then scientific fallback.
  if (dec.lt(1e36)) {
    const exp = Math.floor(dec.log10())
    const suffixIndex = Math.floor(exp / 3)
    if (suffixIndex < SUFFIXES.length) {
      const divisor = Decimal.pow(10, suffixIndex * 3)
      const scaled = dec.div(divisor).toNumber()
      return scaled.toFixed(precision) + SUFFIXES[suffixIndex]
    }
  }
  return scientific(dec)
}

export function formatCost(value: Decimal): string {
  return formatNumber(value, 1)
}

export function formatRate(value: Decimal): string {
  return formatNumber(value, 1) + '/s'
}
