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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const SPACING_MS = 60000  // patient: preview image models have a tight RPM + cooldown that rapid retries re-trigger
const MAX_RETRY = 2       // gentle, few retries — hammering only extends the penalty

async function genOne(text) {
  const body = { contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['IMAGE'] } }
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.status === 429) {
      const wait = 90000 // flat, generous — let the cooldown fully clear
      if (attempt === MAX_RETRY) throw new Error('429 after all retries (rate-limit contention — rerun later or use a key not shared with another active project)')
      console.error(`  429 (rate limit), backing off ${wait / 1000}s [retry ${attempt + 1}/${MAX_RETRY}]`)
      await sleep(wait)
      continue
    }
    const json = await res.json()
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(json).slice(0, 180)}`)
    const img = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
    if (!img) throw new Error(`no image: ${JSON.stringify(json).slice(0, 180)}`)
    return img.inlineData
  }
}

let ok = 0
for (const [id, name, subj] of TIERS) {
  if (id > 1) await sleep(SPACING_MS)
  try {
    const data = await genOne(`${STYLE} The emblem depicts: ${subj}.`)
    const ext = data.mimeType?.includes('png') ? 'png' : 'jpg'
    const file = `art/tiers/tier${id}_${name.toLowerCase()}.${ext}`
    writeFileSync(file, Buffer.from(data.data, 'base64'))
    console.log(`OK  tier ${id} ${name} -> ${file}`)
    ok++
  } catch (e) {
    console.error(`FAIL tier ${id} ${name}: ${e.message}`)
  }
}
console.log(`done: ${ok}/${TIERS.length} generated`)
