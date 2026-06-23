// Auto-tuning solver: searches for Layer 1 constants that hit our targets.
// Run: node sim/tune.mjs
//
// Targets:
//   T1 time to first Encore ~30m (accept 18-45m)
//   T2 a real pre-prestige wall (wallRatio >= ~2.5)
//   T3 single-digit EP at first Encore (1-8)
//   T4 healthy doubling cadence across the first Encores (runs telescope, don't explode/stall)

import { DEFAULTS, simRun, simMultiEncore, encoreGate, epGain, wallRatio } from './engine.mjs'
import Decimal from 'break_infinity.js'

const fmtT = (s) => s < 60 ? `${s.toFixed(0)}s` : s < 3600 ? `${(s/60).toFixed(1)}m` : `${(s/3600).toFixed(2)}h`
const mins = (s) => s / 60

// ---- Phase 1: sweep economy knobs for run-1 timing + wall ----
// Slow the game via production rate (down), NOT base cost (up) — inflating costs
// breaks the opening (start SW=10 can't afford a pricier first Note).
console.log('=== Phase 1: economy sweep (time to first Encore + wall) ===')
const prodScales = [1, 0.3, 0.1, 0.03, 0.01, 0.003, 0.001, 3e-4, 1e-4, 3e-5]
const growthExps = [1, 1.1, 1.25]
const econ = []
for (const prodScale of prodScales) {
  for (const growthExp of growthExps) {
    const P = { ...DEFAULTS, prodScale, growthExp }
    const r = simRun({ maxTierIdx: 4, gate: encoreGate(0), P, dt: 1, capHours: 4 })
    if (!r.reached) continue
    econ.push({ prodScale, growthExp, tMin: mins(r.t), wall: wallRatio(r.oom), peakL10: r.peak.log10() })
  }
}
// candidates in the target window, ranked by wall strength then closeness to 30m
const inWindow = econ.filter((e) => e.tMin >= 18 && e.tMin <= 45)
inWindow.sort((a, b) => (b.wall - a.wall) || (Math.abs(a.tMin - 30) - Math.abs(b.tMin - 30)))
console.log('  prodScale  growthExp   time     wallRatio   peak')
for (const e of econ) {
  const mark = (e.tMin >= 18 && e.tMin <= 45) ? ' <-' : ''
  console.log(`  ${String(e.prodScale).padStart(7)}  ${e.growthExp.toFixed(2).padStart(8)}   ${fmtT(e.tMin*60).padStart(6)}   ${e.wall.toFixed(2).padStart(7)}     1e${e.peakL10.toFixed(1)}${mark}`)
}

if (inWindow.length === 0) { console.log('\n  No config hit 18-45m. Widen the grid.'); process.exit(0) }
const bestEcon = inWindow[0]
console.log(`\n  -> chosen economy: prodScale=${bestEcon.prodScale}, growthExp=${bestEcon.growthExp} (${bestEcon.tMin.toFixed(1)}m, wall ${bestEcon.wall.toFixed(2)})`)

// ---- Phase 2: sweep small EP exponents for a STABLE cadence (additive reward) ----
console.log('\n=== Phase 2: EP exponent sweep (additive reward, 12 Encores) ===')
const base = { ...DEFAULTS, prodScale: bestEcon.prodScale, growthExp: bestEcon.growthExp, epThreshold: 1e15 }
const roots = [0.33, 0.2, 0.15, 0.1, 0.07, 0.05, 0.03]
console.log('  root    enc#1    enc#12 totalEP    last-run-time    verdict')
let best = null
for (const epRoot of roots) {
  const P = { ...base, epRoot }
  const mc = simMultiEncore({ P, n: 12, dt: 1, capHours: 12 })
  const reached = mc.cycles.filter((c) => c.reached)
  const ep1 = reached[0]?.gain?.toString() ?? '-'
  const total = mc.totalEP
  const last = reached[reached.length - 1]
  const lastT = last ? fmtT(last.t) : 'stall'
  // stable = didn't blow past ~1e6 total EP over 12 encores, and last run still takes > 2s
  const totalN = total.toNumber()
  const exploded = !isFinite(totalN) || totalN > 1e7
  const trivial = last && last.t <= 2
  const verdict = exploded ? 'EXPLODES' : trivial ? 'trivial(instant)' : 'stable'
  console.log(`  ${epRoot.toFixed(2).padStart(4)}    ${String(ep1).padStart(5)}    ${total.toExponential(2).padStart(9)}    ${lastT.padStart(8)}       ${verdict}`)
  if (verdict === 'stable' && (!best || Math.abs(epRoot - 0.1) < Math.abs(best.epRoot - 0.1))) best = { epRoot }
}

// ---- Phase 3: detailed cadence for the chosen exponent ----
const chosenRoot = best ? best.epRoot : 0.1
console.log(`\n=== Phase 3: cadence detail @ root=${chosenRoot} ===`)
const P = { ...base, epRoot: chosenRoot }
const mc = simMultiEncore({ P, n: 12, dt: 1, capHours: 12 })
console.log('  Encore#   gate            time      EPgain      totalEP   prodMult(1+EP)')
let prevTotal = null
for (const c of mc.cycles) {
  const g = encoreGate(c.k)
  if (!c.reached) { console.log(`  ${c.k+1}        ${g.amount}@tier${g.tierIdx+1}     STALLED (>12h) <- Layer-1 wall`); break }
  const ratio = prevTotal ? ` (x${(c.totalEP.toNumber()/prevTotal).toFixed(2)})` : ''
  console.log(`  ${String(c.k+1).padStart(2)}        ${String(g.amount).padStart(3)}@tier${g.tierIdx+1}     ${fmtT(c.t).padStart(6)}    ${c.gain.toExponential(2).padStart(8)}    ${c.totalEP.toExponential(2)}${ratio}`)
  prevTotal = c.totalEP.toNumber()
}
console.log(`\n  Recommended Layer-1 params:\n    ${JSON.stringify(P)}`)
