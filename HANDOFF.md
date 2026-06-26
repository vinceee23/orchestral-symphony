# HANDOFF — Orchestral Symphony (resume point, 2026-06-26)

**Read this FIRST on resume.** Context was cleared at 99%. Everything below is committed/pushed unless noted.

## Where we are RIGHT NOW
- **`master`** = the deployed playtest build: pacing-v2 balance (wall ~3h, Platinum ~22h, steady drip) + the **Venue-1 World Tour slice**. Testable: `https://vinceee23.github.io/orchestral-symphony/?l3` (or `?fresh&l3` clean). `?fresh` works in prod.
- **`feat/layer3`** (pushed, HEAD `c5c2929`) = the **FULL Layer 3**, built overnight, NOT yet merged/deployed:
  - Heterogeneous venue components (multi-level **multiplier** OR single-level **unlock**; graduate = all maxed). V1 Old House = Lighting(3 fill-speed) / Roof(3 capacity) / Instruments(1-unlock = auto-collect).
  - Automation unlocks up the ladder: **auto-collect(V1) · Keep-Autobuyers · Auto-MO · Auto-graduate**; auto-tour stays L4.
  - Venue ladder 2–7 + circuit break, **challenges-at-L3** (re-gated off finaleCount → reachable), **era-3 app theming**.
  - Game logic **verified-good**: tsc clean · 45/45 unit · `sim/l3-pacing` reaches Platinum (~25h) · `sim/achievement-pacing` pass.

## THE ONE BLOCKER (needs Vince's call) — why L3 isn't deployed
Two HEAVY pacing-sim INSTRUMENTS fail: **`sim/era-pacing.test.ts` + `sim/human-pacing.test.ts`** — assertion `expect(platinum || recordsSold >= PLATINUM_THRESHOLD).toBe(true)` fails (their modeled player doesn't reach 1M records within `MAX_STEPS=250_000`).
- **NOT a game regression:** `l3-pacing` reaches Platinum; `calculateWorldTourTick` no-ops when L3 locked (worldTour.ts:391 `if(!worldTourUnlocked) return {}`); gameStore MO/records path unchanged. Cause = pacing-v2 **intentionally** slowed records (RECORDS_ALBUM_K 1→0.58, RECORDS_OPUS_EXP 1.15→1.08, Platinum ~22h) so these sims' step budget / under-conducting player no longer reaches Platinum.
- **DECISION NEEDED:** is the ~22h Platinum / records pace intended (Vince approved it earlier)? If **yes** → fix = **extend the era/human-pacing sim step budgets** (test-only, no game change) → `npm run test` green → **merge `feat/layer3` → master to deploy full L3**. If records should be faster → small balance tweak in `src/core/constants.ts`.

## Other pending (for Vince)
1. **Living-venue art** — approach LOCKED: layered web overlays (chain-edited painted states + CSS glow/crowd/zoom), per-venue, prototype the Old House first. Concept drafts in `drafts/l3-venues/` (he liked `ladder-1-old-house`; chain-edited `oh-state-1/2/3` show lit→ensemble→grand). Build AFTER mechanics deploy; needs his direction approval. (His "not quite" was really the heterogeneous-component rethink — now BUILT.)
2. **Filler-achievement cleanup** — STILL PENDING. achievements.ts has ~238 entries incl. ~100 `ach_play_*`/`ach_active_*` time-milestone FILLER (pacing-v2 added them to hit the drip bar). An unverified Cursor attempt was reverted. Redo properly (replace filler w/ real markers, keep drip, ≤+150–200% global-mult budget).
3. **Speed-of-Sound feel** + **V1-loop feel** — need Vince's playtest.

## Key locked design (full detail in `docs/LAYER3-SPEC.md`)
- Ladder: Encore → Magnum Opus → **World Tour(L3)** → Signature(L4) → Virtuoso(L5) → **Grand Finale(L6=END)**; L7 reserved.
- Automation arc: each layer automates the one below (L3 automates L1/L2; passive-currency-gen + auto-tour = L4+).
- Achievement power capped ~×2.5–3; perks = earned QoL; automation = OP-tree purchasables.
- Monetization (`docs/MONETIZATION.md`): web portals free · mobile free+ads/IAP · Steam paid no-ads.
- Design tack: aim long / AD-style (~100–200h active + idle), don't fixate on exact 800h.

## Working agreements
- **Sequential Cursor tasks, one at a time** (parallel agents caused conflicts — Vince's rule).
- Delegate heavy builds to Cursor (composer-2.5), review to Codex (gpt-5.5), Claude gates + commits.
- **Gemini key gotcha:** shell `GEMINI_API_KEY` is stale/exhausted; ALWAYS read the key from `.env`, never `os.environ`. Confirmed image models on .env key: `gemini-3-pro-image`, `gemini-2.5-flash-image`.
- Status dashboard (Artifact): https://claude.ai/code/artifact/27b2a357-5482-48ab-81ed-7c9669ce604a
- git remote pinned to vinceee23 (personal). NEVER push with the gh/work account.

## Immediate next step on resume
Ask Vince: "Confirm Platinum ~22h is intended → I extend the 2 sim budgets (test-only) + deploy full L3?" Then merge `feat/layer3` → master. Then living-venue art (his approval) + filler cleanup.
