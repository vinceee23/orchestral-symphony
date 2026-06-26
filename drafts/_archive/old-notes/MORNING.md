# Good morning — Layer 1 is done 🎼

Overnight summary (2026-06-24). **Layer 1 (Encore) is mechanically complete, sim-balanced,
and tested.** The only thing intentionally missing is **art** (blocked on Gemini billing — see below).

## What works now
- **Core loop:** 7 tiers + tempo, with **uncapped buy-10 doubling** (every 10th purchase keeps doubling — the chase stays alive).
- **Tempo is now a real production multiplier** (it was a dead mechanic before — the tick interval cancelled out). Same fix applied to Opus/milestone-tickspeed.
- **Encore prestige (Layer 1):**
  - Reward is **additive**: production ×(1 + total Applause). (The original ×2-per-point design *explodes* — the sim proved it; there's a regression test guarding this.)
  - EP gain = `floor((runPeak / 1e15)^0.03)` — small exponent keeps it bounded; healthy ×2–2.8 growth per Encore.
  - `lifetimeEncorePoints` drives the multiplier (never drops); `encorePoints` is a separate **spendable** pool.
  - **Encore shop:** Perfect Pitch (×prod), Sight-Reading (head-start Notes), Overture (+Applause/Encore).
- **Cliffhanger:** after **8 Encores** the Layer-1 wall fires, a narrative banner reveals, and **Magnum Opus unlocks**. Layers 2–6 are locked until then (shown as a progress-tracked teaser).
- First Encore ≈ 30–36 min (optimal play); whole layer to the wall ≈ 2–2.5h.

## Verification (all green)
- `npm run build` — clean (50 modules).
- `npm test` — 5/5 pass (headless tests drive the **real** `calculateTick` + formulas: additive-reward guard, sublinear EP, tempo-is-real, first-Encore pacing, bounded multi-Encore).
- Dev server boots and serves (HTTP 200).
- Codex review pass done — 4 real fixes applied, 2 non-bugs skipped (documented in git).

## Try it
- `npm run dev` (browser) or `npm run electron:dev` (desktop). **Saves were wiped** (version bump for the rebalance) — you start fresh.
- Balance sim: `node sim/tune.mjs`. Tests: `npm test`.

## What's left (not tonight)
1. **Art** — pipeline is built (`art/gen-tiers.mjs`). **Correction:** the earlier 429s were NOT a billing/free-tier problem (my misdiagnosis) — the key is paid and works. They were **rate-limit contention**: the preview image models have low RPM, and this key is shared with another active project, so bursts of 7 collided. Single/spaced calls work fine. The script now spaces 20s + retries with backoff. Generated glyphs land in `art/tiers/`. Run: `IMG_MODEL=gemini-3.1-flash-image node --env-file=.env art/gen-tiers.mjs`. **Tip:** a dedicated key for this project (separate from your other one) removes the contention entirely.
2. **Subjective feel** — math fixed the pacing; tweak `PRODUCTION_SCALE` / `ENCORE_WALL_COUNT` in `src/core/constants.ts` if the session length feels off.
3. **Layers 2–6** — designed in `DESIGN.md` (§3), not built. Magnum Opus is stubbed + gated.

## Where things live
- Design + decisions: `DESIGN.md`. Balance sim: `sim/`. Tests: `src/core/layer1.test.ts`.
- Full trail: `git log` (commits `5858d2d` → `d9a8d21`).
