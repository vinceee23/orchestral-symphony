// Generate the middle 5 Art Deco emblems straight into public/emblems/ (served by Vite).
// Patient single-shot per image (preview models rate-limit bursts hard). Run:
//   node --env-file=.env art/gen-emblems-rest.mjs
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'

const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = 'gemini-3-pro-image-preview'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const STYLE =
  'A gilded Art Deco emblem for a music idle game, centered icon, part of a MATCHING SET (same gold-on-black ' +
  'language as a lone-eighth-note emblem and a grand orchestra crest). Polished gold filigree and symmetric ' +
  'geometric sunburst rays on a deep matte-black background, warm luminous glow, ornate 1920s theatre style, ' +
  'crisp clean silhouette, premium, highly detailed, no text, no letters, 1:1.'

// Ordered by escalating grandeur (tier 2 -> tier 6).
const EMBLEMS = [
  ['motifs', 'Centerpiece: a small cluster of two or three connected musical notes — a short motif. Slightly more elaborate than a lone note.'],
  ['phrases', 'Centerpiece: a flowing ribbon/garland of musical notes forming a phrase, sweeping and graceful, more ornate than a motif.'],
  ['melodies', 'Centerpiece: an ornate treble clef with a graceful melodic flourish of notes, mid-grandeur, richer Deco detail.'],
  ['harmonies', 'Centerpiece: stacked musical staves with a layered chord, radiating harmony — fuller, more symmetric Deco geometry.'],
  ['movements', "Centerpiece: a conductor's baton crossed with a swelling orchestral wave, grand and commanding — near the grandest of the set."],
]

mkdirSync('public/emblems', { recursive: true })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`

async function genOne(text) {
  const body = { contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['IMAGE'] } }
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.status === 429) {
      if (attempt === 2) throw new Error('429')
      await sleep(120000); continue // one-shot-ish: long cool-down, few retries
    }
    const json = await res.json()
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const img = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
    if (!img) throw new Error('no image')
    return img.inlineData
  }
}

let ok = 0
for (let i = 0; i < EMBLEMS.length; i++) {
  const [name, subj] = EMBLEMS[i]
  if (existsSync(`public/emblems/${name}.jpg`)) { console.log(`skip ${name} (exists)`); ok++; continue }
  if (i > 0) await sleep(90000) // wide spacing between images
  try {
    const data = await genOne(`${STYLE} ${subj}`)
    writeFileSync(`public/emblems/${name}.jpg`, Buffer.from(data.data, 'base64'))
    console.log(`OK  ${name}`)
    ok++
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`)
  }
}
console.log(`done: ${ok}/${EMBLEMS.length}`)
