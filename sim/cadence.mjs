// Sweep multi-Encore cadence across growthExp at prodScale=1 (snappy opening).
// Goal: smooth ramp where ~8 Encores are reachable (not a 13m->4h cliff), decent first Encore.
// Run: node sim/cadence.mjs
import { DEFAULTS, simRun, simMultiEncore, encoreGate } from './engine.mjs'

const fmt = (s) => s == null ? '-' : s < 60 ? `${s.toFixed(0)}s` : s < 3600 ? `${(s / 60).toFixed(1)}m` : `${(s / 3600).toFixed(2)}h`

for (const growthExp of [1.2, 1.3, 1.4, 1.5, 1.6]) {
  const P = { ...DEFAULTS, prodScale: 1, growthExp }
  const open = simRun({ maxTierIdx: 4, gate: encoreGate(0), P, dt: 1, capHours: 4 })
  const mc = simMultiEncore({ P, n: 8, dt: 1, capHours: 6 })
  const times = mc.cycles.map((c) => c.reached ? fmt(c.t) : 'STALL')
  const reached = mc.cycles.filter((c) => c.reached).length
  const totalSec = mc.cycles.filter((c) => c.reached).reduce((a, c) => a + c.t, 0)
  console.log(`growthExp ${growthExp.toFixed(1)} | open(10N) ${fmt(open.notes10)} | enc1 ${fmt(open.t)} | reached ${reached}/8 | total ${fmt(totalSec)}`)
  console.log(`   times: ${times.join('  ')}`)
}
