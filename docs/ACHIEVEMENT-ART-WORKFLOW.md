# Achievement Art Workflow (LOCKED 2026-07-01)

The reusable recipe for Sonance's 100 achievement emblems. Canonical exemplar: `public/achievements/ach_let_it_be.png`. Live status + the remaining list: `docs/ACHIEVEMENT-ART-PLAN.md`.

## Locked style
Flat **2D graphic** emblem. **Two-tone: black subject body + warm gold accents/trim/outline** (a black object with gold rim-light — NOT solid gold, NOT hand-drawn/inky, NOT 3D/photoreal, NOT busy). A single **bold iconic subject**, centered, **correct proportions**. Behind it a soft **concentric RING glow** (brightest center → faintest edge) on a **near-black navy** background. 1:1 square. Reads at ~100px tile size.

- **Always faceless (people).** Any HUMAN figure = smooth shadow silhouette, **no eyes/nose/mouth**; differentiate by hair silhouette + pose. *Exception:* a non-human **mascot/character** whose face is its identity (e.g. Nyan Cat) may keep a simple face — that's deliberate, not a slip.
- **Text.** No *garbled* text. **Clean, intentional text/letters ARE allowed** where they make the emblem read (e.g. `HOTEL`, `00:01`, `SOLD OUT`, `11`, side `A`).
- **Coordinate within a group.** Before generating a subject that shares a source (same artist) or concept (award discs, MO-count, opus-tree, prestige-finale, automator bots), make it visually DISTINCT from its siblings so no two clash. (This is why Bohemian Rhapsody = four-heads while "Is This the Real Life?" = a light/shadow figure.)

## Model & tooling
**Nano Banana 1 = `gemini-2.5-flash-image`** (cheapest, ~4¢/img → ~$4 for 100).
**CRITICAL run command:** `env -u GEMINI_API_KEY node --env-file=.env art/<script>.mjs`. The shell `GEMINI_API_KEY` is a STALE exhausted key; the billing key (`…2zKQ`) lives in `.env`, and Node's `--env-file` won't override an already-set shell var — so `env -u GEMINI_API_KEY` first. If you hit `429 RESOURCE_EXHAUSTED / prepayment credits depleted`, top up at ai.studio/projects → Billing.

## Curation loop — per achievement, BEFORE generating (Vince's process)
1. **Ideate (dual-perspective for non-obvious ones).** Claude proposes subjects; for anything not-obvious, also delegate ideation to **Codex** (`codex exec -s read-only`, its quota) for 4 concepts each, then Claude curates the combined list. Skip Codex for obvious icons.
2. **Tap-confirm the subject.** Claude presents the curated options via `AskUserQuestion` (2–4, recommended first). Vince picks/adjusts WHAT it depicts before any credits are spent. Include the **`SONG="<Song> - <Artist>"`** hint on song emblems so the model has cultural context.
3. **Generate in the locked style**, conditioned on the exemplar as a style reference: `art/gen-emblem-styled.mjs` (feeds `ach_let_it_be.png` as IMAGE 1 = style; your `SUBJECT`; optional `SONG`; optional `REF2` = a real pose/composition reference image).
4. **QA in a grid.** Assemble a contact sheet (PIL) and judge style-consistency + accuracy; open individuals only if one looks off.
5. **Fix in place if needed.** Malformed/off → `art/gen-emblem-edit.mjs` (feed the image + "fix ONLY <X>, keep the style/glow/bg/framing"). This is exactly how the Let It Be piano + the BR square/faceless fixes were done.
6. **Lock:** `cp drafts/pilot-<id>.png public/achievements/<id>.png`. Clean the batch's drafts.

## Batches & wiring
- Work in **batches of 4** (matches the AskUserQuestion 4-question cap). Prioritize **finishing partially-done groups** before starting new ones.
- **Wiring is automatic:** `AchievementsPage.tsx` loads `achievements/<id>.png` → `.jpg` → styled glyph fallback. A correctly-named `<id>.png` in `public/achievements/` just works; unmade ones show the glyph.
- **L4 branch only** (`feat/layer4`) — gate (`npm run build` + `npm test`, read REAL exit codes) then commit; never push to master.

## Reference images from a URL
You CAN download references via `curl -sL -A "Mozilla/5.0" "<url>" -o drafts/ref.jpg` (verified working), then pass as `REF2`. Note: with the always-faceless rule, a photo of a *person* becomes a faceless silhouette — so a face-reference only helps when the POSE/composition/hair is the point (e.g. the BR cover), not when you need face recognition; for those, prefer an evocative icon.

## Scripts
- `art/gen-emblem-styled.mjs` — **style-reference generation**. Env: `SUBJECT` (required), `OUT`, optional `SONG` ("Song - Artist" context hint), optional `REF2` (path to a real pose/composition reference → IMAGE 2).
- `art/gen-emblem-edit.mjs` — **generic in-place image edit** (the "fix only X" tool). Env: `SRC`, `OUT`, `PROMPT`.
- `art/gen-aura-glow.py` / `gen-aura-rings.py` / `gen-aura-bloom.py` — code-generated aura experiments (superseded; Nano Banana renders the glow itself now, but kept for a hybrid/local pipeline).
- `art/gen-letitbe-*.mjs`, `gen-subject-proof.mjs`, `gen-local-test.mjs` — one-off experiments/proofs (historical).
- `art/gen-achievements-comfy.mjs` — the LOCAL ComfyUI (AMD/ZLUDA) text2img path (credit-free fallback; style-match is a work in progress — see `drafts/local-match/`).
