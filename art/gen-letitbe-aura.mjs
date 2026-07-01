// C direction, more HAND-DRAWN, x 3 aura treatments. Pick the aura.
// Run: env -u GEMINI_API_KEY node --env-file=.env art/gen-letitbe-aura.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = process.env.IMG_MODEL || 'gemini-2.5-flash-image'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BASE =
  'A flat 2D HAND-DRAWN, HAND-PAINTED illustrated emblem for a premium music game. Bold iconic single ' +
  'subject with confident INKED outlines and visible brush/ink texture, clearly drawn by hand, NOT a ' +
  'glossy 3D render, NOT a photo, NOT smooth vector. Rich warm amber-gold subject, accurate proportions, ' +
  'centered, on a deep near-black background (almost pure black). Reads clearly at small icon size. ' +
  '1:1 square. Absolutely NO text, letters, or numbers. ' +
  'Subject: a single accurate concert grand piano, lid raised with prop stick, calm and serene.'

const AURAS = [
  ['rings', 'AURA: behind the piano, a halo of THREE concentric glowing golden rings, clean evenly-spaced circles radiating outward, calm and balanced.'],
  ['bloom', 'AURA: behind the piano, a single soft radial golden bloom of light, centered, glowing brightest at the subject and fading smoothly into the black.'],
  ['rays', 'AURA: behind the piano, restrained fine golden sunburst rays radiating from the center, subtle and elegant.'],
]

mkdirSync('drafts', { recursive: true })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
async function genOne(text) {
  const body = { contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['IMAGE'] } }
  for (let a = 0; a <= 4; a++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.status === 429) { if (a === 4) throw new Error('429'); console.error(`  429 backoff 60s`); await sleep(60000); continue }
    const json = await res.json()
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(json).slice(0, 200)}`)
    const img = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
    if (!img) throw new Error('no image')
    return img.inlineData
  }
}
let ok = 0
for (const [tag, aura] of AURAS) {
  if (ok > 0) await sleep(6000)
  try {
    const data = await genOne(`${BASE} ${aura}`)
    const file = `drafts/letitbe-c-${tag}.png`
    writeFileSync(file, Buffer.from(data.data, 'base64'))
    console.log(`OK ${tag} -> ${file}`); ok++
  } catch (e) { console.error(`FAIL ${tag}: ${e.message}`) }
}
console.log(`done: ${ok}/${AURAS.length}`)
