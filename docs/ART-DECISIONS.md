# Art decisions (L0–L3) — for Vince

> Art is the **last** priority and **your** call (taste + Gemini credits). I did NOT generate or wire
> any art autonomously. This is the decision sheet: what exists, what's missing, the options, my
> recommendation, and what's prepped to execute the moment you say yes. Conserve credits per the tiered
> model (memory: `gemini-model-tiers`).

## Current art inventory (everything real)
- **Tier emblems** — ✅ complete: all 7 in `public/emblems/*.jpg` (gold-on-midnight, chroma-keyed at runtime). The one fully-polished art slice.
- **Stage backdrop** — ⚠ ONE image (`public/backdrops/hall-master.jpg`); the 7 "eras" are a zoom/desaturate/blur/tint *illusion* over it.
- **Achievements** — ⚠ **1 of 100** (`ach_real_life.jpg`); the other 99 render as raw OS emoji.
- **World Tour venues** — ⚠ **placeholder** dashed-box in-game, BUT **6 finished illustrations already exist** in `drafts/l3-venues/` (never wired).
- **Logo / orb / favicon.png** — ✅ polished.
- **Dead/stale:** `public/favicon.svg` (pre-rename purple bolt, off-brand, unreferenced) + `art/tiers/tier1_notes.jpg` (abandoned approach).

---

## D1 — World Tour venue art  ⭐ cheapest visible win  ✅ DONE 2026-07-01
> **Resolved:** wired all 6 drafts as-is → `public/venues/{0..5}.jpg`, rendered in WorldTourPage (BASE_URL-prefixed) replacing the dashed box; venue hero starts dim and **blooms/saturates as you max its components** (`venueFill`). Gated + committed.

6 illustrations exist and map 1:1 to the venues (verified against `VENUES` in `worldTour.ts`):
| draft file | venue |
|---|---|
| `ladder-1-old-house.jpg` | 0 The Old House |
| `ladder-2-local-hall.jpg` | 1 Local Hall |
| `ladder-3-city-theatre.jpg` | 2 City Theatre |
| `ladder-4-concert-hall.jpg` | 3 Concert Hall |
| `ladder-5-opera-house.jpg` | 4 Opera House |
| `ladder-6-world-stage.jpg` | 5 World Stage |
(there are also 3 Old-House progressive-state drafts: `oh-state-1-lit/2-instruments/3-grand` — could show the venue *upgrading* as components are bought.)

**Options:** (a) **wire the 6 drafts as-is** now — replaces the dashed placeholder, reversible, zero credits; (b) regenerate polished finals first, then wire; (c) wire now + regenerate later.
**My rec:** **(a) now.** It's the single biggest visible improvement and fully reversible. **Decision I need:** are the 6 drafts good enough to ship? (I can't judge their quality — you can.)
**Prepped to execute on yes:** copy `drafts/l3-venues/ladder-*.jpg` → `public/venues/{0..5}.jpg`, render in `WorldTourPage` (BASE_URL-prefixed) replacing the dashed box, brighten as the venue sells out. ~20 min + gate.

---

## D2 — Achievement art (1 of 100)  ◐ WORKING via local AMD gen (cuDNN-off) — 2D style + batch workflow locked
> **UPDATE 2026-07-01 (later): LOCAL GEN WORKS.** Codex disabled cuDNN in `comfy/zluda.py` (defaults off on
> AMD — SDXL still segfaults on gfx1031, SD1.5 runs fine). Server via the scratchpad `run-comfy-server.bat`.
> The "shelved" writeup below is now historical.
>
> **Art direction (Vince's calls):** flat **2D ILLUSTRATED** emblems (NOT 3D/photoreal — the game is 2D),
> **single ICONIC subject** centered (must read at ~100px tile size), **gold-on-midnight**, **NO text**.
> **Reference-guided** (img2img/ControlNet from an **EVOCATIVE** subject — the idea the song-pun evokes, NOT
> literal album covers) on a **proper illustration checkpoint** (SD1.5-base alone is too sloppy + hallucinates
> text). Style/subjects/negative live in `art/achievements/prompts.json`.
>
> **Batch workflow (LOCKED):** (1) Codex proves the pilot (Let It Be first); (2) freeze model+style+settings
> from the approved pilot so every batch is consistent by construction; (3) Codex generates in **batches of 10**
> and assembles each into **ONE labeled contact-sheet grid**; (4) **Claude QAs the grid** for style
> consistency (opens individuals only if one looks off — saves Claude vision budget); (5) **flag off-style →
> Codex regenerates just those before the next batch**; (6) **Claude curates the evocative subject per batch**
> (song-pun → icon). Repeat to ~100. Claude commits each approved batch.
>
> **2026-07-01 ZLUDA attempt (full writeup so a future session / Codex can resume):** Installed ComfyUI-Zluda
> for the RX 6700 XT (gfx1031): HIP SDK 6.2.4 + the **gfx1031 rocBLAS** community libs (littlewu build) +
> a **Defender folder exclusion** (ZLUDA is a flagged false-positive) + ZLUDA nightly. **The server boots
> fine** (detects gfx1031, Triton 3.4, loads SDXL to GPU). **But inference fails at the GPU layer:**
> SDXL → native **segfault** (`0xC0000005`, crashes the server); SD1.5 → **`cuDNN error:
> CUDNN_STATUS_EXECUTION_FAILED`** on `F.conv2d` (server survives, 0 images). `--use-split-cross-attention
> --lowvram` didn't help. Triton also can't compile (no Visual Studio / MSVC → no `stdio.h`).
> **Untried next levers (for Codex, separate quota — heavy iteration):** (1) force-disable cuDNN
> (`torch.backends.cudnn.enabled=False` / the `cfz_cudnn` toggle node) so conv uses a non-cuDNN fallback;
> (2) install VS Build Tools "Desktop C++" so Triton compiles; (3) try a different ZLUDA/HIP build or
> ROCm-on-Linux; (4) just use a cloud GPU for a one-off batch. Setup lives at `C:\Users\macar\ComfyUI-Zluda`
> (model on `E:\sonance-models`, temp on `E:\sonance-comfy-tmp`; launch via the scratchpad `run-comfy-server.bat`).
> **Recommendation:** ship the trial on the glyph fallback (looks intentional); revisit gen via Codex or cloud.

> **Resolved approach:** (1) ✅ **glyph fallback shipped** — every achievement now renders a styled gold-on-midnight badge (emoji glowing in a deco frame) instead of raw emoji; the wall reads as intentional. The loader tries `<id>.png` → `<id>.jpg` → badge, so generated art drops in and overrides. (2) 🔄 **local-gen kit ready** (`art/achievements/` + `art/gen-achievements-comfy.mjs`) — ComfyUI+ZLUDA on the RX 6700 XT, **no Gemini credits**. Pilot of 6 (ach_real_life A/B + 5 impactful/reachable) with a shared cinematic style for consistency. **Vince runs the gen on his GPU**, then we judge + scale up.

**Options:**
- **A (no credits, recommended for the trial): a designed glyph/emblem fallback** — instead of raw OS emoji (inconsistent Windows/Mac/mobile, clashes with the gold deco), render each achievement's icon as a styled gold-on-midnight badge (consistent frame, the existing emoji or an SVG centered in the deco treatment). Looks *intentional*, ships now, costs nothing.
- **B: generate ~100 bespoke emblems** via `art/gen-emblems.mjs` (Gemini) — best looking, but real credits + curation time.
- **C: generate only the L0–L3-reachable achievements** (the sims show ~43–70 unlock in a trial run) and glyph-fallback the rest. Middle ground.
**My rec:** **A for the ship**, optionally **C** later for the most-seen ones. **Decision I need:** A, B, or C — and if B/C, your credit budget + which Gemini tier.

---

## D3 — Era backdrops (1 image faked across 7 eras)
**Options:** (a) keep the zoom/recolor illusion (works, free); (b) generate distinct L0–L3 hall keyframes (intimate room → grand hall → world stage) via `art/gen-halls.mjs` and blend.
**My rec:** **(a) keep for now**, revisit after D1/D2. The illusion reads acceptably; distinct halls are a "nice to have," not a gap a player flags. **Decision:** leave it, or want distinct halls?

---

## D4 — Favicon / social-share set  ✅ DONE 2026-07-01 (og:image still open)
> **Resolved:** added meta description, theme-color, apple-touch-icon, `manifest.webmanifest`, and text-only OG/Twitter cards to `index.html`; deleted stale `public/favicon.svg` + dead `art/tiers/tier1_notes.jpg` + dead `src/core/futureChallenges.ts`. **Still open:** the og:image (1200×630 share card) — decide later.

Missing: apple-touch-icon (180²), **og:image / twitter:image** (shared trial links currently render NO preview card), `.ico`, web manifest. Plus the stale off-brand `favicon.svg` should go.
**Options:** (a) I add the `<head>` tags + delete the stale svg now, and we compose an og:image from the existing orb/logo (a 1200×630 — I can build a simple branded one in HTML→PNG, or you generate a hero); (b) defer.
**My rec:** **(a).** Shared links rendering blank is a real first-impression miss for a trial people will link. **Decision:** want me to do the head-tags + stale-svg cleanup now (safe, no taste)? The og:image *art* is the only taste part.

---

## D5 — Prestige / Opus signature art (optional)
Encore/MO/World Tour screens have no hero crest. **Rec:** low priority; revisit after D1–D2. Could reuse the gold deco emblem style (an Encore record/EP crest, a Magnum Opus seal).

---

## Repo hygiene (safe, no taste — approve in one nod)
- Delete stale `public/favicon.svg` (off-brand purple bolt, unreferenced) + `art/tiers/tier1_notes.jpg` (dead). Also dead code: `futureChallenges.ts`.

---

### Fastest path to a visibly more-finished trial
**D1 (wire venue drafts) → D2-A (glyph fallback) → D4-a (head tags + cleanup).** All low/no-credit. Give me a yes on each and I'll execute + gate.
