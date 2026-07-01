// Nano Banana IMAGE EDIT: fix ONLY the malformed piano in the loved emblem, keep everything else.
// Run: env -u GEMINI_API_KEY node --env-file=.env art/gen-letitbe-edit.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = process.env.IMG_MODEL || 'gemini-2.5-flash-image'

const SRC = 'public/achievements/ach_let_it_be.png'
const img = readFileSync(SRC).toString('base64')

const PROMPT =
  'Edit this emblem. KEEP EVERYTHING EXACTLY AS-IS: the dark near-black navy background, the soft ' +
  'concentric ring glow behind the subject, the flat 2D graphic art style, the two-tone look (black ' +
  'piano body with warm gold accents/trim), the 3/4 angled lid-up composition, the colors, the framing. ' +
  'Change ONLY the piano itself so it is an ANATOMICALLY CORRECT, correctly-proportioned grand piano: ' +
  'a full-length keyboard showing many thin alternating black-and-white keys (NOT a few fat stubby keys); ' +
  'three properly shaped, correctly placed tapered grand-piano legs; a correctly hinged raised lid held ' +
  'by a proper thin prop stick; and a coherent curved grand-piano body the legs actually attach to. ' +
  'Keep the exact same flat two-tone gold-and-black style and the exact same glow and background. No text.'

mkdirSync('drafts', { recursive: true })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
const body = {
  contents: [{ parts: [ { inlineData: { mimeType: 'image/png', data: img } }, { text: PROMPT } ] }],
  generationConfig: { responseModalities: ['IMAGE'] },
}
const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const json = await res.json()
if (!res.ok) { console.error(`HTTP ${res.status}`, JSON.stringify(json).slice(0, 300)); process.exit(1) }
const out = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
if (!out) { console.error('no image', JSON.stringify(json).slice(0, 300)); process.exit(1) }
writeFileSync('drafts/letitbe-fixed.png', Buffer.from(out.inlineData.data, 'base64'))
console.log('OK -> drafts/letitbe-fixed.png')
