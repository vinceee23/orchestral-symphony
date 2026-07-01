// Prove 3 SIGNATURE flavors of the Let It Be emblem on Nano Banana 1, to pick our house style.
// Run: env -u GEMINI_API_KEY node --env-file=.env art/gen-letitbe-variants.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = process.env.IMG_MODEL || 'gemini-2.5-flash-image'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Locked concretes (from Vince's tweaks): strong CENTERED radial aura, deep neutral near-black bg,
// rich warm amber-gold, FLATTER iconic, hand-painted (no gloss/3D/photo), accurate subject, no text, 1:1.
const BASE =
  'A flat 2D HAND-PAINTED gouache emblem for a premium music game. Single bold ICONIC subject, ' +
  'simplified confident shapes, correct accurate proportions, centered. Rich warm saturated amber-gold ' +
  'on a deep neutral near-black background (almost pure black, not navy). A STRONG, clearly CENTERED ' +
  'radial golden aura glow blooms directly behind the subject. Matte painterly finish, illustrated NOT ' +
  'rendered: no glossy metal, no shiny reflections, no 3D, no photo. Clean negative space, reads clearly ' +
  'at small icon size. 1:1 square. Absolutely NO text, letters, or numbers.'
const SUBJECT =
  'Subject: a single accurate concert grand piano, lid raised with prop stick, calm and serene.'

// Three signature flavors — differ only in the HOUSE-STYLE character.
const FLAVORS = [
  ['a', 'House style: refined minimal luxury crest — smooth elegant gouache, restrained detail, premium and timeless, subtle painted texture.'],
  ['b', 'House style: warm painterly storybook illustration — visible confident brushstrokes, romantic hand-painted feel, soft glow, a touch mythic and characterful.'],
  ['c', 'House style: bold graphic emblem — strong simplified poster/woodcut shapes, high contrast gold on black, striking and iconic, minimal interior detail.'],
]

mkdirSync('drafts', { recursive: true })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`

async function genOne(text) {
  const body = { contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['IMAGE'] } }
  for (let attempt = 0; attempt <= 4; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.status === 429) { if (attempt === 4) throw new Error('429 after retries'); console.error(`  429 backoff 60s [${attempt + 1}/4]`); await sleep(60000); continue }
    const json = await res.json()
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(json).slice(0, 200)}`)
    const img = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
    if (!img) throw new Error('no image')
    return img.inlineData
  }
}

let ok = 0
for (const [tag, flavor] of FLAVORS) {
  if (ok > 0) await sleep(6000)
  try {
    const data = await genOne(`${BASE} ${flavor} ${SUBJECT}`)
    const file = `drafts/letitbe-v2-${tag}.png`
    writeFileSync(file, Buffer.from(data.data, 'base64'))
    console.log(`OK ${tag} -> ${file}`); ok++
  } catch (e) { console.error(`FAIL ${tag}: ${e.message}`) }
}
console.log(`done: ${ok}/${FLAVORS.length}`)
