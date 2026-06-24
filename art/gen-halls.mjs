// Generates the 3 reachable era HALL BACKDROPS via Gemini. Run:
//   node --env-file=.env art/gen-halls.mjs
// Outputs to public/halls/. These sit BEHIND the orchestra pods, so the stage center stays dark/empty.
// Per Vince: hero model for Magnum Opus, mid for the two early halls. Spaced calls (no burst-retry).

import { mkdirSync, writeFileSync } from 'node:fs'

const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing (run with --env-file=.env)'); process.exit(1) }

const STYLE =
  'Cinematic concert-hall interior backdrop for an elegant orchestral idle game, viewed from the audience ' +
  'toward an EMPTY stage. The stage CENTER and lower-center must be DARK and empty (no performers, no ' +
  'instruments, no chairs in the middle) — performers are added separately. Tiered orchestra risers behind, ' +
  'atmospheric haze and deep volumetric depth, painterly, ultra-detailed, no text, no people in the center. ' +
  'Wide 16:9 cinematic composition, dark moody background that frames an empty central pool of light.'

// [id, model, scene]
const HALLS = [
  ['0-intimate', 'gemini-3.1-flash-image',
    'An INTIMATE, dim little recital room at the very beginning. One soft warm-gold spotlight from above onto ' +
    'an empty floor. Only a couple of bare risers. Lonely, quiet, hushed. Muted gold over near-black; minimal grandeur.'],
  ['1-encore', 'gemini-3.1-flash-image',
    'A WARM mid-sized concert hall. Golden light, a few tiers of risers, the first faint rows of a silhouetted ' +
    'audience appearing at the front edge, gentle proscenium architecture. Rich gold and amber over deep shadow; growing grandeur.'],
  ['2-magnum-opus', 'gemini-3-pro-image',
    'A GRAND, opulent concert hall at full splendor. Soaring architecture with tall organ pipes and an ornate ' +
    'proscenium arch, full sweeping tiers of risers, a large silhouetted audience filling the house, hanging ' +
    'chandeliers, majestic VIOLET and gold lighting with volumetric god-rays. Breathtaking scale and majesty.'],
]

mkdirSync('public/halls', { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const SPACING_MS = 30000
const MAX_RETRY = 20          // persistent: keep trying (user confirmed credits remain; 429 is pure throttle)
const BACKOFF_MS = 120000     // patient 2-min cool-off so retries don't re-trigger the cooldown

async function genOne(model, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`
  const body = { contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['IMAGE'] } }
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.status === 429) {
      if (attempt === MAX_RETRY) throw new Error('429 after all retries (rate-limit; rerun later)')
      console.error(`  429, backing off ${BACKOFF_MS / 1000}s [retry ${attempt + 1}/${MAX_RETRY}]`)
      await sleep(BACKOFF_MS); continue
    }
    const json = await res.json()
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(json).slice(0, 180)}`)
    const img = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
    if (!img) throw new Error(`no image: ${JSON.stringify(json).slice(0, 180)}`)
    return img.inlineData
  }
}

let ok = 0
for (let i = 0; i < HALLS.length; i++) {
  const [id, model, scene] = HALLS[i]
  if (i > 0) await sleep(SPACING_MS)
  try {
    console.log(`gen hall ${id} (${model})...`)
    const data = await genOne(model, `${STYLE} The hall: ${scene}`)
    const ext = data.mimeType?.includes('png') ? 'png' : 'jpg'
    const file = `public/halls/hall-${id}.${ext}`
    writeFileSync(file, Buffer.from(data.data, 'base64'))
    console.log(`OK  ${id} -> ${file}`)
    ok++
  } catch (e) {
    console.error(`FAIL ${id}: ${e.message}`)
  }
}
console.log(`done: ${ok}/${HALLS.length} generated`)
