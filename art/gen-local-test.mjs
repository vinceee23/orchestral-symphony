// LOCAL style test: text2img + img2img(from Gemini exemplar) via ComfyUI, saved to drafts/ for judging.
// Run: node art/gen-local-test.mjs
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
const COMFY = 'http://127.0.0.1:8188'
const CKPT = 'DreamShaper_8_pruned.safetensors'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const STYLE = 'flat 2D graphic emblem, two-tone: a black subject body with warm gold accents, trim and outlines, single bold iconic subject centered, deep near-black navy background with a soft concentric ring glow behind it, clean vector-like, elegant, 1:1'
const NEG = 'photorealistic, 3d render, photograph, rainbow colors, busy cluttered background, blurry, low quality, text, letters, watermark, extra objects, frame, border'

// copy exemplar into ComfyUI input dir for img2img LoadImage
copyFileSync('public/achievements/ach_let_it_be.png', 'C:/Users/macar/ComfyUI-Zluda/input/sonance_exemplar.png')
mkdirSync('drafts', { recursive: true })

const t2i = (pos, seed) => ({
  '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
  '5': { class_type: 'EmptyLatentImage', inputs: { width: 768, height: 768, batch_size: 1 } },
  '6': { class_type: 'CLIPTextEncode', inputs: { text: pos, clip: ['4', 1] } },
  '7': { class_type: 'CLIPTextEncode', inputs: { text: NEG, clip: ['4', 1] } },
  '3': { class_type: 'KSampler', inputs: { seed, steps: 30, cfg: 7, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
  '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
  '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'localtest', images: ['8', 0] } },
})
const i2i = (pos, seed, denoise) => ({
  '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
  '10': { class_type: 'LoadImage', inputs: { image: 'sonance_exemplar.png' } },
  '11': { class_type: 'VAEEncode', inputs: { pixels: ['10', 0], vae: ['4', 2] } },
  '6': { class_type: 'CLIPTextEncode', inputs: { text: pos, clip: ['4', 1] } },
  '7': { class_type: 'CLIPTextEncode', inputs: { text: NEG, clip: ['4', 1] } },
  '3': { class_type: 'KSampler', inputs: { seed, steps: 30, cfg: 7, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['11', 0] } },
  '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
  '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'localtest', images: ['8', 0] } },
})

async function run(graph, out) {
  const res = await fetch(`${COMFY}/prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: graph }) })
  if (!res.ok) throw new Error(`/prompt ${res.status}: ${await res.text()}`)
  const { prompt_id } = await res.json()
  let node
  for (let t = 0; t < 2400; t++) {
    await sleep(500)
    const h = await (await fetch(`${COMFY}/history/${prompt_id}`)).json()
    node = h?.[prompt_id]?.outputs?.['9']?.images?.[0]
    if (node) break
  }
  if (!node) throw new Error('timed out')
  const p = new URLSearchParams({ filename: node.filename, subfolder: node.subfolder || '', type: node.type || 'output' })
  writeFileSync(out, Buffer.from(await (await fetch(`${COMFY}/view?${p}`)).arrayBuffer()))
  console.log('OK ->', out)
}

console.log('text2img piano...')
await run(t2i(`a single grand piano, lid raised, ${STYLE}`, 777901), 'drafts/local-t2i-piano.png')
console.log('img2img (from exemplar) -> violin...')
await run(i2i(`a single ornate violin, ${STYLE}`, 777902, 0.6), 'drafts/local-i2i-violin.png')
