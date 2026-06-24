// Validates the encore-reveal change keeps time-to-Magnum-Opus within ~95-99% of the original.
// Compares OLD gate (Symphonies from Encore 2) vs NEW gate (Symphonies held to Encore 3, Movements at 2).
// Reuses the shared engine. Run: node sim/encore-reveal.mjs
import { DEFAULTS, simRun, encoreMultFromEP, epGain } from './engine.mjs'
import Decimal from 'break_infinity.js'

const P = DEFAULTS
const WALL = 8 // ENCORE_WALL_COUNT — Magnum Opus unlocks here

// OLD: Symphonies (idx6) enter at Encore 2; tiers 0..6 available from Encore 1.
const oldGate = (c) =>
  c === 0 ? { tierIdx: 4, amount: 30 } :
  c === 1 ? { tierIdx: 5, amount: 30 } :
  c === 2 ? { tierIdx: 6, amount: 30 } :
  c === 3 ? { tierIdx: 6, amount: 50 } :
  c === 4 ? { tierIdx: 6, amount: 70 } :
            { tierIdx: 6, amount: 70 + (c - 4) * 30 }
const oldMaxTier = (c) => (c === 0 ? 4 : 6)

// NEW candidates: [mov2, sym3, sym4, sym5, sym6, sym7]. Symphonies held until Encore 3.
// Mirror OLD's c3-c7 Symphony grind (50,70,100,130,160); vary the Encore-2 Movements gate + last step.
const CANDIDATES = {
  I:  [70, 50, 70, 100, 128, 150],
  J:  [70, 50, 70, 100, 128, 152],
  K:  [65, 50, 70, 100, 125, 150],
  L:  [70, 50, 70, 95, 125, 150],
}
const makeNewGate = (a) => (c) =>
  c === 0 ? { tierIdx: 4, amount: 30 } :
  c === 1 ? { tierIdx: 5, amount: 30 } :
  c === 2 ? { tierIdx: 5, amount: a[0] } :
            { tierIdx: 6, amount: a[c - 2] } // c=3..7 -> a[1..5]
const newMaxTier = (c) => (c === 0 ? 4 : c < 3 ? 5 : 6) // Symphonies (idx6) only from Encore 3

function timeToWall(gateFn, maxTierFn, label) {
  let totalEP = D0(), t = 0
  const rows = []
  for (let c = 0; c < WALL; c++) {
    const r = simRun({ maxTierIdx: maxTierFn(c), gate: gateFn(c), encoreMult: encoreMultFromEP(totalEP, P), P, dt: 1, capHours: 24 })
    if (!r.reached) { console.log(`  ${label}: STALLED at Encore ${c} (gate ${JSON.stringify(gateFn(c))})`); return null }
    t += r.t
    totalEP = totalEP.plus(epGain(r.peak, P))
    rows.push({ c: c + 1, min: +(r.t / 60).toFixed(1), gate: gateFn(c) })
  }
  return { t, rows }
}
function D0() { return new Decimal(0) }

const fmt = (s) => s < 5400 ? `${(s / 60).toFixed(1)}min` : `${(s / 3600).toFixed(2)}h`
const oldR = timeToWall(oldGate, oldMaxTier, 'OLD')
console.log('=== Time to Magnum Opus (8 Encores) ===')
console.log(`OLD baseline (Symphonies @ Encore 2): ${fmt(oldR.t)}\n`)
let best = null
for (const [name, a] of Object.entries(CANDIDATES)) {
  const r = timeToWall(makeNewGate(a), newMaxTier, name)
  if (!r) continue
  const ratio = (r.t / oldR.t) * 100
  const hit = ratio >= 95 && ratio <= 99.5 ? '  <-- IN TARGET' : ''
  console.log(`${name}: ${fmt(r.t)}  = ${ratio.toFixed(1)}% of OLD${hit}  [${a.join(',')}]`)
  if (!best || Math.abs(ratio - 97) < Math.abs(best.ratio - 97)) best = { name, a, ratio, r }
}
console.log(`\nClosest to 97%: ${best.name} (${best.ratio.toFixed(1)}%) — amounts [${best.a.join(',')}]`)
console.log('Per-encore (minutes):')
for (const row of best.r.rows) console.log(`  Encore ${row.c}: ${row.min}min  (own ${row.gate.amount} of tier ${row.gate.tierIdx})`)
