# Achievement Art Workflow (LOCKED 2026-07-01)

The reusable recipe for generating Sonance's ~100 achievement emblems. Exemplar: `public/achievements/ach_let_it_be.png`.

## Locked style
Flat **2D graphic** emblem. **Two-tone: black subject body + warm gold accents/trim/outline** (a black object with gold rim-light, NOT solid gold, NOT hand-drawn/inky, NOT 3D/photoreal). A single **bold iconic subject**, dramatic **3/4 angled view**, centered, **correct proportions**. Behind it a soft **concentric RING glow** — brightest center → fainter → faintest — on a **near-black navy** background. **No text.** 1:1 square. Reads at ~100px tile size.

**STANDING RULE — always faceless.** Any emblem depicting people/faces uses smooth **shadow silhouettes with NO facial features** (no eyes/nose/mouth) — differentiate figures by hair silhouette and pose only. Never rendered faces.

**Subject references.** For subjects with a specific real/iconic pose or composition, Vince can drop the reference image; pass it as `REF2` to `gen-emblem-styled.mjs` (IMAGE 2 = pose/arrangement/details; IMAGE 1 = style exemplar). Caveat: the model may inherit the reference's aspect/framing and drop our ring glow — follow with a `gen-emblem-edit.mjs` pass to force 1:1 square + ring glow + faceless.

## Model & tooling
**Nano Banana 1 = `gemini-2.5-flash-image`** (cheapest, ~4¢/img → ~$4 for 100).
**CRITICAL:** always run `env -u GEMINI_API_KEY node --env-file=.env art/<script>.mjs` — the shell `GEMINI_API_KEY` is a STALE exhausted key; the billing key (`…2zKQ`) lives in `.env`, and Node's `--env-file` won't override an already-set shell var, so `env -u` first.

## Curation loop — per achievement, BEFORE generating (Vince's process)
1. **Tap-confirm the subject.** Claude proposes the evocative song-pun → icon via `AskUserQuestion` (2–4 options, recommended first). Vince picks/tweaks WHAT the emblem depicts before any credits are spent.
2. **Generate in the locked style**, conditioned on the exemplar as a **style reference**: `art/gen-emblem-styled.mjs` feeds `ach_let_it_be.png` + "same flat two-tone gold/black style, same concentric ring glow, same navy bg, same 3/4 framing; subject = <confirmed subject>".
3. **Malformed subject → in-place edit.** `art/gen-letitbe-edit.mjs` is the template: feed the image + "fix ONLY <X>, keep the style/glow/bg/colors/framing." This is exactly how the Let It Be piano was fixed.
4. **Claude QAs.** Off-style or malformed → re-edit or regen before moving on.

## Batch
Pilot = the 6 impactful/reachable: `ach_real_life`, `ach_let_it_be` (done), `ach_magnum`, `ach_purple_rain`, `ach_one_more`, `ach_seven_nation`. Vince approves the 6-grid → batch the rest in groups (subject tap-confirmed), output → `public/achievements/<id>.png`. Claude grid-QAs each batch, regens off-style. L4 branch only — gated commits, never pushed to master.

## Scripts
- `art/gen-letitbe-edit.mjs` — Nano Banana **in-place image edit** (fix-only template).
- `art/gen-emblem-styled.mjs` — **style-reference generation**: `SUBJECT="..." OUT=drafts/x.png env -u GEMINI_API_KEY node --env-file=.env art/gen-emblem-styled.mjs`.
