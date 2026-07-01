// One-off: prove the Let It Be achievement emblem on Nano Banana 1 (cheapest).
// Run: node --env-file=.env art/gen-letitbe-nano.mjs   (MUST use --env-file: shell key is stale)
import { mkdirSync, writeFileSync } from 'node:fs'

const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = process.env.IMG_MODEL || 'gemini-2.5-flash-image' // Nano Banana 1, cheapest

const STYLE =
  'A flat 2D HAND-PAINTED illustrated emblem with soft visible brushwork and a matte gouache/poster ' +
  'finish, a single ACCURATE instantly-recognizable subject in confident simple shapes with correct ' +
  'proportions, warm hand-painted gold and amber on a deep midnight-blue near-black background with a ' +
  'soft radial aura glow behind it, painterly and illustrated NOT rendered (no glossy metal, no 3D, no ' +
  'photo), elegant and minimal like a hand-painted luxury crest, reads clearly at small size, 1:1 square, NO text.'
const SUBJECT =
  'Subject: a single accurate concert grand piano, lid raised with prop stick, calm and serene, centered.'

mkdirSync('drafts', { recursive: true })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
const body = { contents: [{ parts: [{ text: `${STYLE} ${SUBJECT}` }] }], generationConfig: { responseModalities: ['IMAGE'] } }

const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const json = await res.json()
if (!res.ok) { console.error(`HTTP ${res.status}`, JSON.stringify(json).slice(0, 300)); process.exit(1) }
const img = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
if (!img) { console.error('no image', JSON.stringify(json).slice(0, 300)); process.exit(1) }
const ext = img.inlineData.mimeType?.includes('png') ? 'png' : 'jpg'
const file = `drafts/letitbe-nano-proof.${ext}`
writeFileSync(file, Buffer.from(img.inlineData.data, 'base64'))
console.log(`OK ${MODEL} -> ${file}`)
