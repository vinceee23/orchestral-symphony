// Generic Nano Banana IMAGE EDIT: transform SRC per PROMPT, write OUT. The "fix in place" tool.
// Usage: SRC=drafts/x.png OUT=drafts/x2.png PROMPT="..." env -u GEMINI_API_KEY node --env-file=.env art/gen-emblem-edit.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const KEY = process.env.GEMINI_API_KEY
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1) }
const MODEL = process.env.IMG_MODEL || 'gemini-2.5-flash-image'
const SRC = process.env.SRC, OUT = process.env.OUT || 'drafts/edited.png', PROMPT = process.env.PROMPT
if (!SRC || !PROMPT) { console.error('SRC and PROMPT env required'); process.exit(1) }
const mime = SRC.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
const img = readFileSync(SRC).toString('base64')

mkdirSync('drafts', { recursive: true })
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
const body = {
  contents: [{ parts: [ { inlineData: { mimeType: mime, data: img } }, { text: PROMPT } ] }],
  generationConfig: { responseModalities: ['IMAGE'] },
}
const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const json = await res.json()
if (!res.ok) { console.error(`HTTP ${res.status}`, JSON.stringify(json).slice(0, 300)); process.exit(1) }
const out = (json?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)
if (!out) { console.error('no image', JSON.stringify(json).slice(0, 300)); process.exit(1) }
writeFileSync(OUT, Buffer.from(out.inlineData.data, 'base64'))
console.log('OK ->', OUT)
