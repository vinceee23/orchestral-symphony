// Headless balance simulator for Orchestral Symphony.
// Mirrors src/core/{constants,formulas,tick}.ts. Keep in sync if those change.
// Purpose: compute where the balance actually sits (time-to-first-Encore, walls,
// production curve, EP gain candidates) instead of guessing. Pure math, no UI.
//
// Run:  node sim/balance.mjs
//
// ponytail: re-implements the core formulas rather than importing the TS graph
// (extensionless ESM imports + the achievements/challenges deps aren't worth the
// toolchain fight for a sim). The formulas below are short; the self-check at the
// bottom asserts they match known values from constants.ts.

import Decimal from 'break_infinity.js'

const D = (x) => new Decimal(x)

// ---- constants (mirror constants.ts) ----
const TIERS = [
  { name: 'Notes',      base: D(10),   growth: 1e2 },
  { name: 'Motifs',     base: D(200),  growth: 3e2 },
  { name: 'Phrases',    base: D(5e3),  growth: 1e3 },
  { name: 'Melodies',   base: D(2e5),  growth: 3e3 },
  { name: 'Harmonies',  base: D(5e7),  growth: 1e4 },
  { name: 'Movements',  base: D(1e12), growth: 3e4 }, // needs >=1 Encore to unlock
  { name: 'Symphonies', base: D(1e18), growth: 1e5 }, // needs >=1 Encore to unlock
]
const MILESTONE_INTERVAL = 10
const MILESTONE_MULT = 2
const MILESTONE_PROD_CAP = 4        // current code caps prod milestone at x16
const MILESTONE_TS_BONUS = 0.01     // +1% tempo per milestone row
const TEMPO_BASE_COST = D(1000)
const TEMPO_COST_GROWTH = 3.5
const TEMPO_SPEED_FACTOR = 0.10
const TEMPO_MIN_INTERVAL = 50
const TEMPO_BASE_INTERVAL = 1000
const START_SW = D(10)
const ENCORE_TIER = 4               // Harmonies (index 4)
const ENCORE_AMOUNT = 30            // getEncoreCost(0)

// ---- formulas (mirror formulas.ts) ----
const bracket = (p) => Math.floor(p / MILESTONE_INTERVAL)
const tierCost = (i, purchased) => TIERS[i].base.times(Decimal.pow(TIERS[i].growth, bracket(purchased)))
const milestoneMult = (purchased, cap) =>
  Decimal.pow(MILESTONE_MULT, Math.min(bracket(purchased), cap))
const tempoCost = (level) => TEMPO_BASE_COST.times(Decimal.pow(TEMPO_COST_GROWTH, level))
// INTENDED tempo effect: a real production multiplier (= the speed-up ratio the
// tickInterval *should* represent). Current code does NOT apply this — flagged for rework.
const tempoProdMult = (level) => {
  const interval = Math.max(TEMPO_MIN_INTERVAL, Math.floor(TEMPO_BASE_INTERVAL / (1 + level * TEMPO_SPEED_FACTOR)))
  return TEMPO_BASE_INTERVAL / interval
}

// ---- a fresh run state (first run: only tiers 0..4 reachable, encore=0) ----
function freshRun(maxTierIdx) {
  return {
    sw: D(START_SW),
    qty: TIERS.map(() => D(0)),
    purchased: TIERS.map(() => 0),
    tempoLevel: 0,
    maxTierIdx,            // highest tier index that can unlock this run
    unlocked: TIERS.map((_, i) => i === 0),
  }
}

const totalMilestones = (s) => s.purchased.reduce((a, p) => a + bracket(p), 0)

// ---- active player: buy cheapest affordable thing, in bracket-sized chunks ----
function playerBuy(s, cap) {
  for (let guard = 0; guard < 100000; guard++) {
    // cheapest candidate among unlocked tiers + tempo
    let best = null
    for (let i = 0; i < TIERS.length; i++) {
      if (!s.unlocked[i]) continue
      const c = tierCost(i, s.purchased[i])
      if (!best || c.lt(best.cost)) best = { type: 'tier', i, cost: c }
    }
    const tc = tempoCost(s.tempoLevel)
    if (!best || tc.lt(best.cost)) best = { type: 'tempo', cost: tc }

    if (s.sw.lt(best.cost)) break

    if (best.type === 'tempo') {
      s.sw = s.sw.minus(best.cost)
      s.tempoLevel++
      continue
    }
    // buy as many of this tier as possible within the current bracket (constant cost)
    const i = best.i
    const toBoundary = MILESTONE_INTERVAL - (s.purchased[i] % MILESTONE_INTERVAL)
    const affordable = s.sw.div(best.cost).floor().toNumber()
    const n = Math.max(1, Math.min(toBoundary, affordable))
    s.sw = s.sw.minus(best.cost.times(n))
    s.purchased[i] += n
    s.qty[i] = s.qty[i].plus(n)
    // unlock next tier (tier i+1) once this tier has >=1 purchased and it's within reach
    if (i + 1 <= s.maxTierIdx && !s.unlocked[i + 1] && s.purchased[i] >= 1) {
      s.unlocked[i + 1] = true
    }
  }
}

// ---- production for dt seconds (snapshot integration, no within-tick artifact) ----
function produce(s, dt, cap, encoreMult) {
  const tMult = tempoProdMult(s.tempoLevel) * (1 + totalMilestones(s) * MILESTONE_TS_BONUS)
  const global = encoreMult.times(tMult)
  const snap = s.qty.map((q) => q)               // start-of-step quantities
  for (let i = 0; i < TIERS.length; i++) {
    if (snap[i].eq(0)) continue
    const perSec = snap[i].times(milestoneMult(s.purchased[i], cap)).times(global)
    const made = perSec.times(dt)
    if (i === 0) s.sw = s.sw.plus(made)
    else s.qty[i - 1] = s.qty[i - 1].plus(made)
  }
}

// ---- simulate one run until Encore-eligible or time cap ----
function simRun(s, cap, encoreMult, dt, capHours) {
  let t = 0
  const maxT = capHours * 3600
  const oomLog = []        // [secondsElapsed, log10(peakSW)] samples per order of magnitude
  let nextOom = 1
  let peak = D(0)
  while (t < maxT) {
    playerBuy(s, cap)
    produce(s, dt, cap, encoreMult)
    t += dt
    if (s.sw.gt(peak)) peak = s.sw
    const l10 = peak.log10()
    if (l10 >= nextOom) { oomLog.push([t, Math.floor(l10)]); nextOom = Math.floor(l10) + 1 }
    if (s.purchased[ENCORE_TIER] >= ENCORE_AMOUNT) {
      return { reached: true, t, peak, s, oomLog }
    }
  }
  return { reached: false, t: maxT, peak, s, oomLog }
}

const fmtT = (sec) => {
  if (sec < 60) return `${sec.toFixed(0)}s`
  if (sec < 3600) return `${(sec / 60).toFixed(1)}m`
  return `${(sec / 3600).toFixed(2)}h`
}

function report(label, cap) {
  console.log(`\n=== ${label} (milestone prod cap = ${cap === Infinity ? 'UNCAPPED' : cap}) ===`)
  const s = freshRun(ENCORE_TIER)            // first run: tiers 0..4 only
  const r = simRun(s, cap, D(1), 1, 24)
  if (!r.reached) {
    console.log(`  WALL: did not reach first Encore (30 Harmonies) within 24h. Peak SW = 1e${r.peak.log10().toFixed(1)}`)
  } else {
    console.log(`  Time to first Encore: ${fmtT(r.t)}   (target 20-40m)`)
  }
  console.log(`  Peak Soundwaves: 1e${r.peak.log10().toFixed(2)}`)
  console.log(`  Tiers purchased: ${r.s.purchased.map((p, i) => `${TIERS[i].name.slice(0,3)}=${p}`).join('  ')}`)
  console.log(`  Tempo level: ${r.s.tempoLevel}  (prod x${tempoProdMult(r.s.tempoLevel).toFixed(1)})`)

  // wall profile: minutes to gain each order of magnitude of peak SW
  if (r.oomLog.length > 1) {
    const gaps = []
    for (let k = 1; k < r.oomLog.length; k++) {
      gaps.push(`1e${r.oomLog[k][1]}:+${fmtT(r.oomLog[k][0] - r.oomLog[k-1][0])}`)
    }
    console.log(`  Time per order-of-magnitude: ${gaps.join('  ')}`)
  }

  // EP gain candidates at first Encore
  if (r.reached) {
    const cands = [1e6, 1e8, 1e10].map((th) => {
      const ep = r.peak.div(th).sqrt().floor()
      return `thr=1e${Math.log10(th)}: EP=${ep.toString()}`
    })
    console.log(`  EP = floor(sqrt(peak/thr)):  ${cands.join('   |   ')}`)
  }
}

// ---- self-check (ponytail: one runnable check) ----
function selfCheck() {
  console.assert(tierCost(0, 0).eq(10), 'Notes unit 0 cost = 10')
  console.assert(tierCost(0, 10).eq(D(10).times(1e2)), 'Notes cost x100 after 10 bought')
  console.assert(milestoneMult(40, 4).eq(16), 'capped milestone = x16 at 40 bought')
  console.assert(milestoneMult(40, Infinity).eq(16), 'uncapped = x16 at 40 (4 brackets)')
  console.assert(milestoneMult(100, Infinity).eq(1024) && milestoneMult(100, 4).eq(16), 'uncap diverges past cap')
  console.assert(Math.abs(tempoProdMult(10) - 2) < 1e-9, 'tempo lvl10 ~= x2 prod')
  console.log('self-check: OK')
}

selfCheck()
report('CURRENT constants', MILESTONE_PROD_CAP)
report('CURRENT constants', Infinity)
