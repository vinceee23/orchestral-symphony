import Decimal from 'break_infinity.js'

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

export function formatNumber(value: Decimal | number, precision: number = 1): string {
  const dec = value instanceof Decimal ? value : new Decimal(value)

  if (dec.lte(0)) return '0'

  if (dec.lt(1000)) {
    const num = dec.toNumber()
    if (num < 10) return num.toFixed(precision)
    return Math.floor(num).toString()
  }

  // Use suffixes up to 1e36
  if (dec.lt(1e36)) {
    const exp = Math.floor(dec.log10())
    const suffixIndex = Math.floor(exp / 3)
    if (suffixIndex < SUFFIXES.length) {
      const divisor = Decimal.pow(10, suffixIndex * 3)
      const scaled = dec.div(divisor).toNumber()
      return scaled.toFixed(precision) + SUFFIXES[suffixIndex]
    }
  }

  // Scientific notation for very large numbers
  const exp = Math.floor(dec.log10())
  const mantissa = dec.div(Decimal.pow(10, exp)).toNumber()
  return `${mantissa.toFixed(2)}e${exp}`
}

export function formatCost(value: Decimal): string {
  return formatNumber(value, 2)
}

export function formatRate(value: Decimal): string {
  return formatNumber(value, 1) + '/s'
}
