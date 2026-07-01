// Clean hand-drawn subject on PURE BLACK (no aura) for compositing over the code rings.
// Run: env -u GEMINI_API_KEY node --env-file=.env art/gen-subject-proof.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = process.env.IMG_MODEL || 'gemini-2.5-flash-image'

const PROMPT =
  'A flat 2D HAND-DRAWN, HAND-PAINTED emblem icon. Single subject with confident INKED outlines and ' +
  'visible brush texture, clearly hand-drawn (NOT a glossy 3D render, NOT a photo, NOT smooth vector). ' +
  'Rich warm amber-gold, accurate proportions, centered with a GENEROUS empty margin (the subject ' +
  'occupies about 60% of the frame). PURE FLAT BLACK background, absolutely no glow, no rings, no halo, ' +
  'no light rays, no text or letters. 1:1 square. ' +
  'Subject: a single accurate concert grand piano, lid raised with prop stick, calm and serene.'

mkdirSync('drafts', { recursive: true })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
const body = { contents: [{ parts: [{ text: PROMPT }] }], generationConfig: { responseModalities: ['IMAGE'] } }
const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const json = await res.json()
if (!res.ok) { console.error(`HTTP ${res.status}`, JSON.stringify(json).slice(0, 250)); process.exit(1) }
const img = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
if (!img) { console.error('no image'); process.exit(1) }
writeFileSync('drafts/subj-piano.png', Buffer.from(img.inlineData.data, 'base64'))
console.log('OK -> drafts/subj-piano.png')
