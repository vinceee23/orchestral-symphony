// L2 math sanity check — mirrors src/core/{constants,crescendo,records}.ts (v0 values).
// Parametric over a plausible swPerSec/peakSW regime; verifies the L2 formulas are monotonic,
// bounded (no runaway to Infinity, no permanent 0), and that Platinum lands "mid-L2", not run-1 or never.
// Run: node sim/l2check.mjs
import Decimal from 'break_infinity.js'
const D = (x) => new Decimal(x)

// ---- v0 constants (mirror constants.ts) ----
const OPUS_PLAT_THRESHOLD = D('1e30')
const OPUS_PLAT_ROOT = 0.05
const OPUS_CRESCENDO_BONUS_PER = 0.25
const CRESCENDO_BASE_MAX = 3, CRESCENDO_MAX_CEILING = 6
const CRESCENDO_BUILD_SEC = 12, CRESCENDO_DECAY_SEC = 25
const AUTO_CONDUCT_FRACTION = 0.5
const RECORDS_PROD_K = 5
const PLATINUM_THRESHOLD = 1_000_000
const FAME_PER = 0.1

// ---- formulas (mirror records.ts / crescendo.ts at base levels) ----
const recordsPerSec = (swPerSec, crescendoMult) => RECORDS_PROD_K * Math.log10(swPerSec.plus(10).toNumber()) * crescendoMult
const opusGainPost = (peakSW, peakCrescendoMult) => {
  if (peakSW.lte(OPUS_PLAT_THRESHOLD)) return 0
  const ratio = peakSW.div(OPUS_PLAT_THRESHOLD).pow(OPUS_PLAT_ROOT)
  const bonus = 1 + (peakCrescendoMult - 1) * OPUS_CRESCENDO_BONUS_PER
  const n = Math.floor(ratio.times(bonus).toNumber())
  return isFinite(n) ? n : Infinity // Infinity flagged as a FAIL below
}
const fameMult = (records) => records < PLATINUM_THRESHOLD ? 1 : 1 + Math.log10(records / PLATINUM_THRESHOLD) * FAME_PER
const crescMult = (lvl01, ceiling = CRESCENDO_BASE_MAX) => 1 + Math.max(0, Math.min(1, lvl01)) * (ceiling - 1)
const advance = (lvl, conducting, dt, build = CRESCENDO_BUILD_SEC, decay = CRESCENDO_DECAY_SEC, auto = false) => {
  if (conducting) return Math.min(1, lvl + dt / build)
  let n = lvl - dt / decay
  return auto ? Math.max(AUTO_CONDUCT_FRACTION, n) : Math.max(0, n)
}

const fmtSec = (s) => s === Infinity ? 'never' : s < 90 ? `${s.toFixed(0)}s` : s < 5400 ? `${(s / 60).toFixed(1)}min` : `${(s / 3600).toFixed(1)}h`
let fails = 0
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails++ }

console.log('=== Records / Platinum pacing (sustained crescendo) ===')
// swPerSec regime: ~1e10 (early L2) up to ~1e36 (deep L2). Time to sell 1,000,000 records.
const regime = ['1e10', '1e15', '1e20', '1e28', '1e36'].map(D)
for (const sw of regime) {
  const rActive = recordsPerSec(sw, crescMult(1))          // x3 ceiling held
  const rIdle = recordsPerSec(sw, crescMult(1, AUTO_CONDUCT_FRACTION * 2 + 1) * 0 + (1 + 0.5 * 2)) // ~auto-conduct x2
  const rAuto = recordsPerSec(sw, 1 + AUTO_CONDUCT_FRACTION * (CRESCENDO_BASE_MAX - 1)) // auto-conduct half of x3
  const rBase = recordsPerSec(sw, 1)                        // no crescendo
  console.log(`  swPerSec 1e${sw.log10().toFixed(0).padStart(2)}: active(x3) ${fmtSec(PLATINUM_THRESHOLD / rActive)} · auto ${fmtSec(PLATINUM_THRESHOLD / rAuto)} · no-cresc ${fmtSec(PLATINUM_THRESHOLD / rBase)}`)
}
// Mid-L2 target: with a healthy mid-layer swPerSec (~1e20) and active conducting, Platinum in ~10min-3h.
{
  const t = PLATINUM_THRESHOLD / recordsPerSec(D('1e20'), crescMult(1))
  check('Platinum reachable mid-L2 (active, swPerSec 1e20 in 5min-4h)', t > 300 && t < 14400, fmtSec(t))
}
{
  const t = PLATINUM_THRESHOLD / recordsPerSec(D('1e20'), 1) // no crescendo at all
  check('No-crescendo still progresses (not "never")', t < 86400, fmtSec(t) + ' baseline')
}

console.log('\n=== OP gain post-Platinum: bounded + monotonic across the regime ===')
const peaks = ['1e31', '1e35', '1e40', '1e60', '1e120', '1e250', '1e300'].map(D)
let prev = -1, mono = true, bounded = true
for (const p of peaks) {
  const g = opusGainPost(p, CRESCENDO_BASE_MAX)
  if (!isFinite(g)) bounded = false
  if (g < prev) mono = false
  console.log(`  peakSW 1e${p.log10().toFixed(0).padStart(3)} -> +${g} OP`)
  prev = g
}
check('OP gain finite/bounded across 1e31..1e300 (no runaway to Infinity)', bounded)
check('OP gain monotonic non-decreasing in peak SW', mono)
check('OP gain is single-digit at 1e31, not a huge jump off the line', opusGainPost(D('1e31'), CRESCENDO_BASE_MAX) <= 5)
check('OP gain still grows by 1e300 (sublinear but alive, not capped flat)', opusGainPost(D('1e300'), CRESCENDO_BASE_MAX) > opusGainPost(D('1e60'), CRESCENDO_BASE_MAX))

console.log('\n=== Fame multiplier (post-Platinum permanent climb) ===')
for (const r of [1e6, 5e6, 1e7, 1e9, 1e12]) console.log(`  ${r.toExponential(0)} records -> x${fameMult(r).toFixed(3)} prod/OP`)
check('Fame = x1.0 exactly at Platinum (1M)', Math.abs(fameMult(1e6) - 1) < 1e-9)
check('Fame grows slowly (x1.6 at 1e12 records, not explosive)', fameMult(1e12) > 1 && fameMult(1e12) < 2)

console.log('\n=== Crescendo build / decay / auto-conduct ===')
let lvl = 0
for (let s = 0; s < CRESCENDO_BUILD_SEC; s++) lvl = advance(lvl, true, 1)
check('Holding for BUILD_SEC reaches ceiling (level ~1.0)', Math.abs(lvl - 1) < 1e-6, `level ${lvl.toFixed(3)} -> x${crescMult(lvl).toFixed(2)}`)
for (let s = 0; s < CRESCENDO_DECAY_SEC; s++) lvl = advance(lvl, false, 1)
check('Releasing for DECAY_SEC returns to x1 (level ~0)', lvl < 1e-6, `level ${lvl.toFixed(3)}`)
let alvl = 1
for (let s = 0; s < 100; s++) alvl = advance(alvl, false, 1, CRESCENDO_BUILD_SEC, CRESCENDO_DECAY_SEC, true)
check('Auto-conduct floors at half ceiling while AFK', Math.abs(alvl - AUTO_CONDUCT_FRACTION) < 1e-6, `level ${alvl.toFixed(3)} -> x${crescMult(alvl).toFixed(2)}`)
check('Crescendo ceiling caps at x6 after upgrades', crescMult(1, CRESCENDO_MAX_CEILING) === CRESCENDO_MAX_CEILING)

console.log(`\n${fails === 0 ? 'ALL CHECKS PASS' : fails + ' CHECK(S) FAILED'}`)
process.exit(fails === 0 ? 0 : 1)
