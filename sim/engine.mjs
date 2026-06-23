// Parameterized economy engine for Orchestral Symphony balance work.
// Mirrors src/core/{constants,formulas,tick}.ts. Keep in sync if those change.
// Pure math, no UI. Used by balance.mjs (diagnostic) and tune.mjs (solver).

import Decimal from 'break_infinity.js'
const D = (x) => new Decimal(x)

// ---- base constants (mirror constants.ts) ----
export const TIERS = [
  { name: 'Notes',      base: D(10),   growth: 1e2 },
  { name: 'Motifs',     base: D(200),  growth: 3e2 },
  { name: 'Phrases',    base: D(5e3),  growth: 1e3 },
  { name: 'Melodies',   base: D(2e5),  growth: 3e3 },
  { name: 'Harmonies',  base: D(5e7),  growth: 1e4 },
  { name: 'Movements',  base: D(1e12), growth: 3e4 },
  { name: 'Symphonies', base: D(1e18), growth: 1e5 },
]
const MI = 10                 // milestone interval
const MMULT = 2
const TS_BONUS = 0.01
const TEMPO_BASE_COST = D(1000)
const TEMPO_GROWTH = 3.5
const TEMPO_SPEED = 0.10
const TEMPO_MIN_INT = 50
const TEMPO_BASE_INT = 1000
const START_SW = D(10)

// Escalating Encore gate (mirror getEncoreCost): {tierIdx, amount}
export function encoreGate(count) {
  if (count === 0) return { tierIdx: 4, amount: 30 } // Harmonies
  if (count === 1) return { tierIdx: 5, amount: 30 } // Movements
  if (count === 2) return { tierIdx: 6, amount: 30 } // Symphonies
  if (count === 3) return { tierIdx: 6, amount: 50 }
  if (count === 4) return { tierIdx: 6, amount: 70 }
  return { tierIdx: 6, amount: 70 + (count - 4) * 30 }
}

// ---- default tunable params ----
// Defaults reflect the SHIPPED Layer 1 config (mirrors src/core/constants.ts).
export const DEFAULTS = {
  costScale: 1,      // x all tier base costs
  growthExp: 1,      // per-bracket growth raised to this power (>1 = steeper walls)
  prodScale: 0.1,    // x all production (PRODUCTION_SCALE)
  milestoneCap: Infinity, // prod milestone uncapped — keeps the buy-10 chase alive (DESIGN.md)
  epThreshold: 1e15, // EP = floor((peak/epThreshold)^epRoot)
  epRoot: 0.03,
  epRewardMode: 'add', // 'add' = (1 + epRewardPer*EP) [stable], 'mult' = 2^EP [explodes]
  epRewardPer: 1,      // additive production bonus per EP (e.g. 1 = +100%/point)
}

// production multiplier granted by accumulated EP
export function encoreMultFromEP(totalEP, P) {
  if (P.epRewardMode === 'mult') return Decimal.pow(2, Math.min(totalEP.toNumber(), 1e6))
  return new Decimal(1).plus(new Decimal(P.epRewardPer).times(totalEP))
}

const bracket = (p) => Math.floor(p / MI)
const tierCost = (i, p, P) =>
  TIERS[i].base.times(P.costScale).times(Decimal.pow(Math.pow(TIERS[i].growth, P.growthExp), bracket(p)))
const milestoneMult = (p, cap) => Decimal.pow(MMULT, Math.min(bracket(p), cap))
const tempoCost = (lvl) => TEMPO_BASE_COST.times(Decimal.pow(TEMPO_GROWTH, lvl))
// INTENDED tempo = real production multiplier (current code doesn't apply this; flagged for rework)
const tempoProdMult = (lvl) => {
  const iv = Math.max(TEMPO_MIN_INT, Math.floor(TEMPO_BASE_INT / (1 + lvl * TEMPO_SPEED)))
  return TEMPO_BASE_INT / iv
}
const totalMilestones = (s) => s.purchased.reduce((a, p) => a + bracket(p), 0)

export function freshRun(maxTierIdx) {
  return {
    sw: D(START_SW),
    qty: TIERS.map(() => D(0)),
    purchased: TIERS.map(() => 0),
    tempoLevel: 0,
    maxTierIdx,
    unlocked: TIERS.map((_, i) => i === 0),
  }
}

// active player: buy cheapest affordable, in bracket-sized chunks
function playerBuy(s, P) {
  for (let guard = 0; guard < 200000; guard++) {
    let best = null
    for (let i = 0; i < TIERS.length; i++) {
      if (!s.unlocked[i]) continue
      const c = tierCost(i, s.purchased[i], P)
      if (!best || c.lt(best.cost)) best = { type: 'tier', i, cost: c }
    }
    const tc = tempoCost(s.tempoLevel)
    if (!best || tc.lt(best.cost)) best = { type: 'tempo', cost: tc }
    if (s.sw.lt(best.cost)) break

    if (best.type === 'tempo') { s.sw = s.sw.minus(best.cost); s.tempoLevel++; continue }
    const i = best.i
    const toBoundary = MI - (s.purchased[i] % MI)
    const affordable = s.sw.div(best.cost).floor().toNumber()
    const n = Math.max(1, Math.min(toBoundary, affordable))
    s.sw = s.sw.minus(best.cost.times(n))
    s.purchased[i] += n
    s.qty[i] = s.qty[i].plus(n)
    if (i + 1 <= s.maxTierIdx && !s.unlocked[i + 1] && s.purchased[i] >= 1) s.unlocked[i + 1] = true
  }
}

// produce for dt seconds (snapshot integration; tempo as real multiplier)
function produce(s, dt, P, encoreMult) {
  const tMult = tempoProdMult(s.tempoLevel) * (1 + totalMilestones(s) * TS_BONUS) * P.prodScale
  const global = encoreMult.times(tMult)
  const snap = s.qty.map((q) => q)
  for (let i = 0; i < TIERS.length; i++) {
    if (snap[i].eq(0)) continue
    const perSec = snap[i].times(milestoneMult(s.purchased[i], P.milestoneCap)).times(global)
    const made = perSec.times(dt)
    if (i === 0) s.sw = s.sw.plus(made)
    else s.qty[i - 1] = s.qty[i - 1].plus(made)
  }
}

// simulate one run until gate met (purchased[gateTier] >= gateAmount) or time cap
export function simRun({ maxTierIdx, gate, encoreMult = D(1), P, dt = 1, capHours = 24 }) {
  const s = freshRun(maxTierIdx)
  let t = 0
  const maxT = capHours * 3600
  const oom = []
  let nextOom = 1, peak = D(0)
  while (t < maxT) {
    playerBuy(s, P)
    produce(s, dt, P, encoreMult)
    t += dt
    if (s.sw.gt(peak)) peak = s.sw
    const l10 = peak.log10()
    if (l10 >= nextOom) { oom.push([t, Math.floor(l10)]); nextOom = Math.floor(l10) + 1 }
    if (s.purchased[gate.tierIdx] >= gate.amount) return { reached: true, t, peak, s, oom }
  }
  return { reached: false, t: maxT, peak, s, oom }
}

// EP gained from a run's peak
export const epGain = (peak, P) => peak.div(P.epThreshold).pow(P.epRoot).floor()

// simulate N consecutive Encores (policy: Encore as soon as gate met)
export function simMultiEncore({ P, n = 6, dt = 1, capHours = 12 }) {
  let totalEP = D(0), count = 0
  const cycles = []
  for (let k = 0; k < n; k++) {
    const maxTierIdx = count === 0 ? 4 : 6
    const gate = encoreGate(count)
    const encoreMult = encoreMultFromEP(totalEP, P)
    const r = simRun({ maxTierIdx, gate, encoreMult, P, dt, capHours })
    if (!r.reached) { cycles.push({ k, reached: false, t: r.t, peak: r.peak }); break }
    const gain = epGain(r.peak, P)
    totalEP = totalEP.plus(gain)
    count++
    cycles.push({ k, reached: true, t: r.t, peak: r.peak, gain, totalEP })
  }
  return { cycles, totalEP, count }
}

// wall metric: slowest order-of-magnitude vs median (>~2.5 = a real stall exists)
export function wallRatio(oom) {
  if (oom.length < 3) return 0
  const gaps = []
  for (let i = 1; i < oom.length; i++) gaps.push(oom[i][0] - oom[i - 1][0])
  const sorted = [...gaps].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] || 1
  return Math.max(...gaps) / median
}
