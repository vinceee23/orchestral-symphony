// Find a config with a SNAPPY opening (fast first 10 Notes) AND ~30m to first Encore + a wall.
// Run: node sim/opening.mjs
import { DEFAULTS, simRun, encoreGate, wallRatio } from './engine.mjs'

const fmt = (s) => s == null ? '  -  ' : s < 60 ? `${s.toFixed(0)}s` : s < 3600 ? `${(s / 60).toFixed(1)}m` : `${(s / 3600).toFixed(2)}h`
const prodScales = [0.3, 0.5, 1, 2, 4]
const growthExps = [1.0, 1.3, 1.6, 2.0]

console.log('prodScale  growthExp   10-Notes   firstEncore   wall   peak     verdict')
for (const prodScale of prodScales) {
  for (const growthExp of growthExps) {
    const P = { ...DEFAULTS, prodScale, growthExp }
    const r = simRun({ maxTierIdx: 4, gate: encoreGate(0), P, dt: 1, capHours: 4 })
    const enc = r.reached ? r.t : null
    const snappy = r.notes10 != null && r.notes10 <= 45      // opening feels good
    const paced = enc != null && enc >= 18 * 60 && enc <= 45 * 60 // ~30m window
    const verdict = snappy && paced ? 'GOOD <-' : !snappy ? 'slow open' : !paced ? (enc && enc < 18 * 60 ? 'too fast' : 'too slow/wall') : ''
    console.log(
      `${String(prodScale).padStart(7)}  ${growthExp.toFixed(2).padStart(8)}   ${fmt(r.notes10).padStart(7)}   ${fmt(enc).padStart(9)}   ${wallRatio(r.oom).toFixed(2).padStart(5)}   1e${r.peak.log10().toFixed(1).padStart(4)}   ${verdict}`,
    )
  }
}
