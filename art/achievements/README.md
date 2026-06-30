# Achievement art — local generation kit (AMD RX 6700 XT)

Generate achievement art **on your own GPU, no cloud credits**, straight into `public/achievements/<id>.png`.
The game loads `<id>.png` → `<id>.jpg` → a styled glyph badge, so any image you drop in just appears (and
overrides the legacy `.jpg`). This kit is a **pilot of 6** to judge whether AMD local gen is worth it.

## Pilot set (`prompts.json`)
`ach_real_life` (override the existing image to A/B it) · `ach_let_it_be` · `ach_magnum` · `ach_purple_rain` ·
`ach_one_more` · `ach_seven_nation`. Style matches the existing `ach_real_life.jpg`: **cinematic, theatrical,
dark-with-gold, 1:1**, themed to each song-pun name. The `style` + `negative` strings are shared across all
items — that's what keeps the set consistent. Only edit `subject` per item.

## 1. Get ComfyUI running on the 6700 XT (Windows)
RDNA2 + 12 GB handles SDXL fine. Best perf on AMD/Windows is **ComfyUI + ZLUDA** (a CUDA shim):
1. Install **ComfyUI** (portable build) — https://github.com/comfyanonymous/ComfyUI
2. Install **ZLUDA for ComfyUI** — the maintained fork/patcher: search "ComfyUI-Zluda" (lshqqytiger's
   `ComfyUI-Zluda` is the common one). Follow its README: install the AMD **HIP SDK**, run its patch script,
   launch via its `comfyui-zluda` start script. First run compiles kernels (slow once, then cached).
   - *Easier but slower alternative:* DirectML (`--directml`) or the **Amuse** app. *Fastest/most stable:*
     dual-boot Linux + ROCm. Any of these expose the same ComfyUI API this script uses.
3. Drop an **SDXL checkpoint** into `ComfyUI/models/checkpoints/`. Good cinematic-photoreal picks:
   **Juggernaut XL**, **RealVisXL**, or base `sd_xl_base_1.0`. Note the exact filename.
4. Launch ComfyUI; confirm it serves at `http://127.0.0.1:8188`.

## 2. Generate
From the repo root (Node 18+, no deps needed):
```bash
# all 6:
CKPT="juggernautXL_v9.safetensors" node art/gen-achievements-comfy.mjs
# or just a couple:
CKPT="juggernautXL_v9.safetensors" node art/gen-achievements-comfy.mjs ach_magnum ach_real_life
```
(Windows PowerShell: `$env:CKPT="juggernautXL_v9.safetensors"; node art/gen-achievements-comfy.mjs`)

Set `CKPT` to your actual checkpoint filename. Override the server with `COMFY_URL` if not on the default port.
Images land in `public/achievements/`. Reload the Achievements tab — done.

## 3. Judge it
Compare your new `ach_real_life.png` against the existing `ach_real_life.jpg` (rename the jpg to peek at both).
If the AMD output holds up: bump the pilot to the rest (edit `prompts.json` `items`, rerun). If not, we keep
the glyph fallback and revisit. Tips for consistency/quality: keep `style`+`negative` fixed, keep `seed_base`
fixed (reproducible), nudge `cfg`/`steps` in `prompts.json` `settings`, and regenerate single ids by passing them.

> ponytail: no image deps in the repo — the script just calls the ComfyUI HTTP API and writes the PNG bytes.
> Output PNGs are gitignored by default? No — `public/` is shipped, so commit the ones you want in the trial.
