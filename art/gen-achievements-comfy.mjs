// Batch-generate achievement art on a LOCAL ComfyUI (no cloud credits) and drop it straight into
// public/achievements/<id>.png. Built for AMD (RX 6700 XT) via ComfyUI+ZLUDA, but works on any
// ComfyUI. See art/achievements/README.md for setup.
//
// Usage (ComfyUI running at 127.0.0.1:8188):
//   node art/gen-achievements-comfy.mjs                 # all items in prompts.json
//   node art/gen-achievements-comfy.mjs ach_magnum ach_real_life   # only these ids
//   CKPT="juggernautXL_v9.safetensors" node art/gen-achievements-comfy.mjs
//
// Node 18+ (global fetch). No dependencies.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const OUT_DIR = join(ROOT, 'public', 'achievements')

const COMFY = process.env.COMFY_URL || 'http://127.0.0.1:8188'
// Set to a checkpoint you actually have in ComfyUI/models/checkpoints (SDXL recommended).
const CKPT = process.env.CKPT || 'sd_xl_base_1.0.safetensors'

const cfg = JSON.parse(readFileSync(join(__dir, 'achievements', 'prompts.json'), 'utf8'))
const wanted = process.argv.slice(2)
const items = wanted.length ? cfg.items.filter((i) => wanted.includes(i.id)) : cfg.items
if (!items.length) { console.error('No matching items in prompts.json'); process.exit(1) }

const S = cfg.settings
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Minimal SDXL text2img graph (ComfyUI API format).
function graph(positive, negative, seed) {
  return {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: CKPT } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: S.width, height: S.height, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: positive, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: ['4', 1] } },
    '3': { class_type: 'KSampler', inputs: {
      seed, steps: S.steps, cfg: S.cfg, sampler_name: S.sampler_name, scheduler: S.scheduler, denoise: 1,
      model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0],
    } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'sonance_ach', images: ['8', 0] } },
  }
}

async function generate(item, idx) {
  const positive = `${item.subject}, ${cfg.style}`
  const seed = S.seed_base + idx
  const res = await fetch(`${COMFY}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: graph(positive, cfg.negative, seed) }),
  })
  if (!res.ok) throw new Error(`/prompt ${res.status}: ${await res.text()}`)
  const { prompt_id } = await res.json()

  // Poll history until this prompt's outputs appear.
  let out
  for (let t = 0; t < 600; t++) { // up to ~5 min
    await sleep(500)
    const h = await (await fetch(`${COMFY}/history/${prompt_id}`)).json()
    const node = h?.[prompt_id]?.outputs?.['9']?.images?.[0]
    if (node) { out = node; break }
  }
  if (!out) throw new Error('timed out waiting for image')

  const params = new URLSearchParams({ filename: out.filename, subfolder: out.subfolder || '', type: out.type || 'output' })
  const img = Buffer.from(await (await fetch(`${COMFY}/view?${params}`)).arrayBuffer())
  const dest = join(OUT_DIR, `${item.id}.png`)
  writeFileSync(dest, img)
  return dest
}

mkdirSync(OUT_DIR, { recursive: true })
console.log(`ComfyUI: ${COMFY} · checkpoint: ${CKPT} · ${items.length} item(s)`)
for (let i = 0; i < items.length; i++) {
  const item = items[i]
  process.stdout.write(`  [${i + 1}/${items.length}] ${item.id} (${item.name}) ... `)
  try {
    const dest = await generate(item, i)
    console.log(`done -> ${dest.replace(ROOT, '.')}`)
  } catch (e) {
    console.log(`FAILED: ${e.message}`)
  }
}
console.log('All done. Reload the Achievements tab to see them (they override the glyph fallback).')
