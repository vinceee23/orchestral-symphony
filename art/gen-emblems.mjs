// Generate the gilded Art Deco section emblems. Run: node --env-file=.env art/gen-emblems.mjs
// Patient (preview image models are RPM/cooldown limited): wide spacing + gentle backoff.
import { mkdirSync, writeFileSync } from 'node:fs'

const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = process.env.IMG_MODEL || 'gemini-3-pro-image-preview' // hero/Pro for the centerpiece art
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const STYLE =
  'A gilded Art Deco emblem for a music game, centered icon. Polished gold filigree and symmetric ' +
  'geometric sunburst rays on a deep matte-black background, warm luminous glow, ornate 1920s theatre ' +
  'style, crisp clean silhouette, premium, highly detailed, no text, no letters, 1:1.'

// First + last of the set, to show the escalating-grandeur range.
const EMBLEMS = [
  ['notes', 'Centerpiece: a single elegant eighth note. The SIMPLEST, most minimal emblem of the set — a lone gold note framed by a slim sunburst and a fine thin geometric ring.'],
  ['symphonies', 'Centerpiece: a majestic full-orchestra crest crowned with radiating organ pipes and sweeping sound rays — the GRANDEST, most ornate emblem of the set, dense layered gilded Deco geometry, regal.'],
]

mkdirSync('art/emblems', { recursive: true })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`

async function genOne(text) {
  const body = { contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['IMAGE'] } }
  for (let attempt = 0; attempt <= 4; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.status === 429) {
      if (attempt === 4) throw new Error('429 after retries')
      console.error(`  429, backing off 90s [${attempt + 1}/4]`)
      await sleep(90000); continue
    }
    const json = await res.json()
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(json).slice(0, 160)}`)
    const img = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
    if (!img) throw new Error('no image')
    return img.inlineData
  }
}

let ok = 0
for (const [name, subj] of EMBLEMS) {
  if (ok > 0 || name !== EMBLEMS[0][0]) await sleep(35000) // space the first->second
  try {
    const data = await genOne(`${STYLE} ${subj}`)
    const ext = data.mimeType?.includes('png') ? 'png' : 'jpg'
    const file = `art/emblems/${name}.${ext}`
    writeFileSync(file, Buffer.from(data.data, 'base64'))
    console.log(`OK  ${name} -> ${file}`)
    ok++
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`)
  }
}
console.log(`done: ${ok}/${EMBLEMS.length}`)
