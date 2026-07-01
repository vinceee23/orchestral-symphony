// Postbuild gate: a TRIAL build (L4_UNLOCKED = false) must not ship L4+ spoiler strings.
// Runs automatically after `npm run build` (postbuild). Exits 1 → the build fails loudly.
import { readFileSync, readdirSync } from 'node:fs'

const constants = readFileSync('src/core/constants.ts', 'utf8')
const isTrial = /export const L4_UNLOCKED = false/.test(constants)
if (!isTrial) {
  console.log('[spoiler-check] full-game build — skipped')
  process.exit(0)
}

// Sentinels from the gods' voice (beatsForward.ts) + pantheon names (pantheon.ts, tree-shaken via
// SignaturePage). If any new forward-content module is added, add a sentinel here.
const SPOILERS = [
  'Timpana',             // pantheon god name
  'one of us',           // signature beat
  'never the living',    // virtuoso beat
  'after you are dust',  // canon beat
  'applause never stopped', // redemption beat
  'Stand with us',       // the_gods beat
  'Pulse-Driven',        // signature identity epithet
]

const files = readdirSync('dist/assets').filter((f) => f.endsWith('.js'))
const leaks = []
for (const f of files) {
  const text = readFileSync(`dist/assets/${f}`, 'utf8')
  for (const s of SPOILERS) if (text.includes(s)) leaks.push(`  "${s}" -> dist/assets/${f}`)
}

if (leaks.length) {
  console.error('[spoiler-check] TRIAL BUNDLE LEAKS L4+ CONTENT:\n' + leaks.join('\n'))
  process.exit(1)
}
console.log(`[spoiler-check] trial bundle clean (${files.length} js files, ${SPOILERS.length} sentinels)`)
