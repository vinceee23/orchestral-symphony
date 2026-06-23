import Decimal from 'break_infinity.js'
import { formatNumber } from '../../core/format'

interface FormattedNumberProps {
  value: Decimal | number
  precision?: number
  className?: string
}

export function FormattedNumber({ value, precision = 1, className = '' }: FormattedNumberProps) {
  return <span className={className}>{formatNumber(value, precision)}</span>
}
