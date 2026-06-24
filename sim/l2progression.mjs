// L2 MO-progression sim — COARSE model with documented abstractions. Goal: get a believable
// L2 timeline (time to first MO, to Platinum, to OP-plateau) and tune the records formula so
// Platinum is a MID-L2 progression milestone, not a fixed wall-clock timer.
//
// Abstractions (stated honestly — human playtest is the final arbiter of feel):
//  - A "cycle" = up to CYCLE_H hours of play. If the player reaches the MO gate within it -> perform MO;
//    else the run has plateaued -> they Encore (EP up) for more multiplier. Time accrues either way.
//  - opPower = persistent production multiplier from OP spent on tree nodes (each node x1.5, cost escalates).
//  - Records accrue per cycle at the chosen formula, using a representative production magnitude.
//  - Active player: crescendo sustained at x3.
import { DEFAULTS, encoreMultFromEP, epGain, simRun } from './engine.mjs'
import Decimal from 'break_infinity.js'

const P = DEFAULTS
const CYCLE_H = 1
const CRESC = 3
const PLATINUM = 1_000_000
const TEMPO_OP_MULT = 1.5
const FAME_PER = 0.1
const fame = (records) => records < PLATINUM ? 1 : 1 + Math.log10(records / PLATINUM) * FAME_PER

// records formula variants
function recordsPerSec(mode, opusCount, peak, K, BASE) {
  const logp = Math.max(0, peak.log10()) * 0.6 // representative avg magnitude during the cycle
  if (mode === 'log') return K * logp * CRESC
  if (mode === 'album') return BASE * opusCount * CRESC
  if (mode === 'blend') return (BASE * opusCount + K * logp) * CRESC
  return 0
}

function run(mode, K, BASE, gateFn, label) {
  let opusCount = 0, opSpendable = 0, opPower = new Decimal(1)
  let EP = 0, records = 0, t = 0
  let nodeCost = 3
  let platinumAt = null, plateauAt = null
  const moMarks = []
  for (let cycle = 0; cycle < 4000 && opusCount < 30; cycle++) {
    const moAmount = gateFn(opusCount)
    let mult = encoreMultFromEP(new Decimal(EP), P).times(opPower)
    if (records >= PLATINUM) mult = mult.times(fame(records))
    const r = simRun({ maxTierIdx: 6, gate: { tierIdx: 6, amount: moAmount }, encoreMult: mult, P, dt: 1, capHours: CYCLE_H })
    t += r.t
    records += recordsPerSec(mode, opusCount, r.peak, K, BASE) * r.t
    if (platinumAt === null && records >= PLATINUM) platinumAt = { mo: opusCount, hours: t / 3600 }
    if (r.reached) {
      // perform Magnum Opus
      let opGain
      if (records >= PLATINUM) {
        // FIXED: log-based (sublinear) not root-of-peak. Normalized to L2 entry (~1e70) so gain
        // stays human-readable (+1..~+120 across the layer) and the OP<->opPower feedback is gentle.
        opGain = Math.max(1, Math.floor(0.5 * (Math.max(0, r.peak.log10()) - 70) * (1 + (CRESC - 1) * 0.25)))
      } else opGain = 1
      opSpendable += opGain
      opusCount++
      moMarks.push({ mo: opusCount, hours: +(t / 3600).toFixed(2), records: Math.floor(records), opGain, opPower: +opPower.toNumber().toPrecision(3) })
      // spend OP greedily on power nodes — but the real tree has finite maxLevels; cap opPower (x1.5^8 ~ x25).
      const OP_POWER_CAP = Math.pow(TEMPO_OP_MULT, 8)
      while (opSpendable >= nodeCost && opPower.toNumber() < OP_POWER_CAP) { opSpendable -= nodeCost; opPower = opPower.times(TEMPO_OP_MULT); nodeCost = Math.ceil(nodeCost * 1.7) }
      if (plateauAt === null && opGain > 100) plateauAt = { mo: opusCount, hours: t / 3600 }
      EP = 0 // MO resets the Encore layer
    } else {
      EP += epGain(r.peak, P).toNumber() // stalled -> Encore for more multiplier
    }
  }
  console.log(`\n=== ${label} ===`)
  for (const m of moMarks.filter((_, i) => i < 6 || i % 3 === 0)) console.log(`  MO#${m.mo}: ${m.hours}h  records=${m.records.toExponential(2)}  +${m.opGain}OP  opPower=${m.opPower}`)
  console.log(`  PLATINUM at ${platinumAt ? `MO#${platinumAt.mo}, ${platinumAt.hours.toFixed(1)}h` : 'NEVER (within 30 MOs)'}`)
  console.log(`  OP-plateau (>5000/MO) at ${plateauAt ? `MO#${plateauAt.mo}, ${plateauAt.hours.toFixed(1)}h` : 'not reached'}`)
  console.log(`  reached MO#${opusCount} in ${(t / 3600).toFixed(1)}h total`)
  return { platinumAt, opusCount, hours: t / 3600 }
}

console.log('Goal: steady/decreasing era cadence; Platinum mid-L2; OP gain sane; no runaway.')
console.log('(OP gain log-based + tree power capped. Testing MO-gate escalation schemes.)\n')
run('album', 0, 1, (n) => 100, 'FIXED gate 100 Symphonies, records BASE=1')
run('album', 0, 1, (n) => 100 + 10 * n, 'GENTLE gate 100+10n, records BASE=1')
run('album', 0, 1, (n) => 100 + 80 * n, 'SHIPPED gate 100+80n (for contrast), records BASE=1')
