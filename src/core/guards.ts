import Decimal from 'break_infinity.js'

/**
 * M11 Decimal-overflow guard (HARDENING-PLAN M11).
 *
 * Throws in dev/test builds if a Decimal has gone NON-FINITE — i.e. its mantissa or exponent
 * is NaN/±Infinity (break_infinity's own docs warn those "cause bad things to happen"). A
 * legitimately huge value like `1e500` is FINITE here (mantissa ~1, exponent 500), so this only
 * fires on genuine corruption (0/0, log of ≤0, an unguarded overflow), never on big-but-valid
 * numbers. No-op (and tree-shaken) in production builds.
 *
 * Reused by the upper-ladder math the hardening plan flags as overflow-prone: L7 harmonic/
 * sequence math, L6 `top + Σghosts`, L9 goal-checks, and the L4 domain-channel term.
 */
export function assertFiniteDecimal(d: Decimal, label: string): void {
  // import.meta.env.DEV is true in `vite` dev and under vitest; false (and dead-code-eliminated)
  // in `vite build`. The sims run with it true, so a non-finite multiplier fails the gate.
  if (!import.meta.env.DEV) return
  if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent)) {
    throw new Error(
      `[M11 overflow guard] non-finite Decimal at ${label}: mantissa=${d.mantissa} exponent=${d.exponent}`,
    )
  }
}
