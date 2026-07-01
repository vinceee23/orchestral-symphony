// Generate an achievement emblem in the LOCKED style (IMAGE 1 = style exemplar ach_let_it_be.png),
// optionally following a real SUBJECT reference (IMAGE 2 = REF2) for exact pose/arrangement/details.
// Usage:
//   SUBJECT="..." OUT=drafts/x.png [REF2=/path/to/subject-ref.jpg] env -u GEMINI_API_KEY node --env-file=.env art/gen-emblem-styled.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = process.env.IMG_MODEL || 'gemini-2.5-flash-image'
const SUBJECT = process.env.SUBJECT
const OUT = process.env.OUT || 'drafts/emblem.png'
const REF2 = process.env.REF2 // optional real subject/pose reference
const SONG = process.env.SONG // optional "Song - Artist" for cultural context
if (!SUBJECT) { console.error('SUBJECT env required'); process.exit(1) }
const songLine = SONG
  ? `This achievement emblem represents the song "${SONG}" — evoke that song's well-known, iconic imagery and associations. `
  : ''

const mime = (p) => (p.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
const styleRef = readFileSync('public/achievements/ach_let_it_be.png').toString('base64')
const parts = [{ inlineData: { mimeType: 'image/png', data: styleRef } }]

let PROMPT
if (REF2) {
  parts.push({ inlineData: { mimeType: mime(REF2), data: readFileSync(REF2).toString('base64') } })
  PROMPT = songLine +
    'You are given TWO reference images. IMAGE 1 defines the ART STYLE you MUST match exactly: flat 2D ' +
    'graphic, two-tone (black subject body with warm gold accents, trim, and outlines), a soft concentric ' +
    'ring glow on a near-black navy background, centered dramatic composition, no text. IMAGE 2 defines the ' +
    'SUBJECT and its exact POSE, ARRANGEMENT, and details. Faithfully recreate the composition of IMAGE 2 — ' +
    SUBJECT + ' — but rendered ENTIRELY in the flat two-tone gold-and-black art style and ring glow of ' +
    'IMAGE 1 (do NOT copy IMAGE 2\'s photographic colors or lighting). Single centered emblem, correctly ' +
    'proportioned, reads at small size. No text, letters, or numbers. 1:1 square.'
} else {
  PROMPT = songLine +
    'Create a NEW achievement emblem in EXACTLY the style of the provided reference image: the same flat 2D ' +
    'graphic art style, the same two-tone look (a black subject body with warm gold accents, trim, and ' +
    'outlines), the same soft concentric ring glow on a near-black navy background, the same centered ' +
    'dramatic 3/4 composition. Replace the subject with ' + SUBJECT + '. A single bold iconic subject, ' +
    'ACCURATE and correctly proportioned, centered. No text, letters, or numbers. 1:1 square.'
}

mkdirSync('drafts', { recursive: true })
parts.push({ text: PROMPT })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
const body = { contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } }
const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const json = await res.json()
if (!res.ok) { console.error(`HTTP ${res.status}`, JSON.stringify(json).slice(0, 300)); process.exit(1) }
const out = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
if (!out) { console.error('no image', JSON.stringify(json).slice(0, 300)); process.exit(1) }
writeFileSync(OUT, Buffer.from(out.inlineData.data, 'base64'))
console.log('OK ->', OUT)
