// L2 MO-progression sim WITH the wall-remaster + Opus-Mastery OP allocation.
// Question: re-price "Opus Mastery" (op-gain-flat) so a focused player climbs +1 -> ~+4 OP/MO
// by Platinum, WITHOUT pre-empting the Platinum catalog switch and WITHOUT pushing Platinum late.
//
// Model (mirrors src/core/{records,opusUpgrades}.ts + the wall-remaster we're about to ship):
//  - Every MO now re-requires the full 8-encore wall (climbWall via the real escalating encoreGate).
//  - Pre-Platinum OP gain = 1 + masteryLevel ; post-Platinum = floor((1 + opusCount*K)*crescBonus) + masteryLevel.
//  - Player spends OP greedily CHEAPEST-FIRST across {next opPower node, next Mastery level} — i.e. a
//    cost-efficient player who DOES invest in Mastery when it's the cheapest gain. opPower speeds climbs;
//    Mastery raises the headline OP gain. This competition is the whole balance question.
import { DEFAULTS, encoreGate, encoreMultFromEP, epGain, simRun } from './engine.mjs'
import Decimal from 'break_infinity.js'

const P = DEFAULTS
const CRESC = 3
const CATALOG_K = 0.5
const PLATINUM = 1_000_000
const TEMPO_OP_MULT = 1.5            // each opPower node x1.5 production
const OP_POWER_CAP = Math.pow(TEMPO_OP_MULT, 14)
const recPerSec = (opusCount) => 1 * opusCount * CRESC   // album model (BASE=1), sustained crescendo

// climb the full 8-encore wall from scratch with a fixed opPower multiplier. returns {t, reached}
function climbWall(opPower, capHours = 4) {
  let totalEP = new Decimal(0), t = 0
  for (let count = 0; count < 8; count++) {
    const maxTierIdx = count === 0 ? 4 : 6
    const mult = encoreMultFromEP(totalEP, P).times(opPower)
    const r = simRun({ maxTierIdx, gate: encoreGate(count), encoreMult: mult, P, dt: 1, capHours })
    t += r.t
    if (!r.reached) return { t, reached: false, count }
    totalEP = totalEP.plus(epGain(r.peak, P))
  }
  return { t, reached: true }
}

function run(m, label) {
  let opusCount = 0, opSpendable = 0, opPower = new Decimal(1), masteryLevel = 0
  let records = 0, t = 0, nodeCost = 3
  let platinumAt = null, masteryAtPlat = null, gainAtPlat = null
  const marks = []
  const masteryCost = (lvl) => lvl < m.maxLevel ? Math.ceil(m.baseCost * Math.pow(m.growth, lvl)) : Infinity
  for (let mo = 0; mo < 60 && opusCount < 30; mo++) {
    const w = climbWall(opPower.toNumber())
    if (!w.reached) { console.log(`  STALL: only ${w.count}/8 encores within cap at MO#${opusCount + 1}`); break }
    t += w.t
    records += recPerSec(opusCount) * w.t
    const platinum = records >= PLATINUM
    if (platinumAt === null && platinum) { platinumAt = { mo: opusCount, hours: t / 3600 }; masteryAtPlat = masteryLevel; gainAtPlat = 1 + masteryLevel }
    // OP gain
    let opGain
    if (platinum) {
      const crescBonus = 1 + (CRESC - 1) * 0.25
      opGain = Math.max(1, Math.floor((1 + opusCount * CATALOG_K) * crescBonus)) + masteryLevel
    } else opGain = 1 + masteryLevel
    opSpendable += opGain
    opusCount++
    marks.push({ mo: opusCount, hours: +(t / 3600).toFixed(2), gain: opGain, mastery: masteryLevel, opPower: +opPower.toNumber().toPrecision(3), rec: Math.floor(records) })
    // spend greedily cheapest-first between opPower node and the next Mastery level
    for (let guard = 0; guard < 1000; guard++) {
      const mc = masteryCost(masteryLevel)
      const oc = opPower.toNumber() < OP_POWER_CAP ? nodeCost : Infinity
      const cheapest = Math.min(mc, oc)
      if (!isFinite(cheapest) || opSpendable < cheapest) break
      if (mc <= oc) { opSpendable -= mc; masteryLevel++ }
      else { opSpendable -= nodeCost; opPower = opPower.times(TEMPO_OP_MULT); nodeCost = Math.ceil(nodeCost * 1.7) }
    }
  }
  console.log(`\n=== ${label} (base ${m.baseCost}, growth ${m.growth}, max ${m.maxLevel}) ===`)
  for (const x of marks.filter((_, i) => i < 8 || i % 3 === 0)) console.log(`  MO#${x.mo}: ${x.hours}h  +${x.gain}OP  mastery=L${x.mastery}  opPower=${x.opPower}  rec=${x.rec.toExponential(2)}`)
  console.log(`  >>> PLATINUM at ${platinumAt ? `MO#${platinumAt.mo}, ${platinumAt.hours.toFixed(1)}h  |  Mastery=L${masteryAtPlat} (gain +${gainAtPlat})` : 'NEVER (<30 MO)'}`)
  console.log(`  reached MO#${opusCount} in ${(t / 3600).toFixed(1)}h`)
}

console.log('Goal: by Platinum, Mastery ~L3 (gain +4), Platinum still mid-L2 (~MO#8-12), no stall.\n')
run({ baseCost: 2, growth: 1.8, maxLevel: 5 }, 'CURRENT (shipped)')
run({ baseCost: 2, growth: 1.4, maxLevel: 8 }, 'PROPOSAL A: flatter+more levels')
run({ baseCost: 1, growth: 1.35, maxLevel: 10 }, 'PROPOSAL B: cheaper start')
run({ baseCost: 2, growth: 1.25, maxLevel: 10 }, 'PROPOSAL C: very flat')
