// Generates the 7 tier glyphs via Gemini (mid-tier model). Run:
//   node --env-file=.env art/gen-tiers.mjs
// Outputs JPEGs to art/tiers/. Gemini returns JPEG (no alpha) — refine/transparency later.

import { mkdirSync, writeFileSync } from 'node:fs'

const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing (run with --env-file=.env)'); process.exit(1) }
// Default to the model with free quota (low tier). Override: IMG_MODEL=gemini-3.1-flash-image (needs billing).
const MODEL = process.env.IMG_MODEL || 'gemini-2.5-flash-image'

const STYLE =
  'A single centered game icon for a music-themed idle game. Luminous golden art-deco musical emblem, ' +
  'glowing softly, on a deep midnight-blue background, ornate orchestral style, clean silhouette, ' +
  'cohesive icon set, high detail, no text.'

const TIERS = [
  [1, 'Notes', 'a single glowing eighth note'],
  [2, 'Motifs', 'a small tight cluster of three connected musical notes (a short motif)'],
  [3, 'Phrases', 'a flowing ribbon of musical notes forming a phrase'],
  [4, 'Melodies', 'an ornate treble clef with a graceful melodic flourish of notes'],
  [5, 'Harmonies', 'stacked musical staves with a layered chord, radiating harmony'],
  [6, 'Movements', "a conductor's baton crossed with a swelling orchestral wave"],
  [7, 'Symphonies', 'a grand symphonic emblem: a full orchestra crest with a radiant crown of notes'],
]

mkdirSync('art/tiers', { recursive: true })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`

for (const [id, name, subj] of TIERS) {
  const body = {
    contents: [{ parts: [{ text: `${STYLE} The emblem depicts: ${subj}.` }] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  }
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok) { console.error(`tier ${id} ${name}: HTTP ${res.status} ${JSON.stringify(json).slice(0, 200)}`); continue }
    const parts = json?.candidates?.[0]?.content?.parts ?? []
    const img = parts.find((p) => p.inlineData?.data)
    if (!img) { console.error(`tier ${id} ${name}: no image in response ${JSON.stringify(json).slice(0, 200)}`); continue }
    const ext = img.inlineData.mimeType?.includes('png') ? 'png' : 'jpg'
    const file = `art/tiers/tier${id}_${name.toLowerCase()}.${ext}`
    writeFileSync(file, Buffer.from(img.inlineData.data, 'base64'))
    console.log(`OK  tier ${id} ${name} -> ${file}`)
  } catch (e) {
    console.error(`tier ${id} ${name}: ${e.message}`)
  }
}
console.log('done')
