# HANDOFF — Orchestral Symphony (resume point, 2026-06-26)

**Read this FIRST on resume.** Context was cleared at 99%. Everything below is committed/pushed unless noted.

## Where we are RIGHT NOW
- **`master`** = the deployed playtest build: pacing-v2 balance (wall ~3h, Platinum ~22h, steady drip) + the **Venue-1 World Tour slice**. Testable: `https://vinceee23.github.io/orchestral-symphony/?l3` (or `?fresh&l3` clean). `?fresh` works in prod.
- **`feat/layer3`** (pushed, HEAD `c5c2929`) = the **FULL Layer 3**, built overnight, NOT yet merged/deployed:
  - Heterogeneous venue components (multi-level **multiplier** OR single-level **unlock**; graduate = all maxed). V1 Old House = Lighting(3 fill-speed) / Roof(3 capacity) / Instruments(1-unlock = auto-collect).
  - Automation unlocks up the ladder: **auto-collect(V1) · Keep-Autobuyers · Auto-MO · Auto-graduate**; auto-tour stays L4.
  - Venue ladder 2–7 + circuit break, **challenges-at-L3** (re-gated off finaleCount → reachable), **era-3 app theming**.
  - Game logic **verified-good**: tsc clean · 45/45 unit · `sim/l3-pacing` reaches Platinum (~25h) · `sim/achievement-pacing` pass.

## ⭐ ACTIVE PLAN (2026-06-26) — L2 idle rework, supersedes "just merge L3"
Full spec: **`docs/L2-AUTOMATION-SPEC.md`** (LOCKED, ~97%). Decision: don't speed records; make L1/L2 **idle** AD-style instead of an active 13h slog.
- **Root cause found:** all autobuyers (tier_1–7, tempo, `encore`=auto-encore, auto-MO) already exist but are **gated behind L3 challenges** → L1/L2 forced-manual = the slog.
- **Fix:** new **Applause Points** currency unlocks autobuyers in L1/L2. Option-1 timing: tier autobuyers from Encore 4–5; auto-encore post first MO (weak→MO-upgraded); auto-MO AP-purchased at opusCount≥3. Auto-MO moves L3→L2; L3 headline = auto-tour (`performTour()` exists). Challenges repurposed → AP + automation-power. Platinum stays ~22h wall-clock but now mostly idle.
- **Only genuinely new code:** Applause Points currency, the AP→unlock purchase path, and **auto-encore execution** (the `encore` autobuyer key was never wired; trigger it in the gameStore tick-driver beside the `autoMO` trigger at gameStore.ts:204). Everything else = re-gating + tuning.
- **Sequence:** (1) ship **P2** (soften Encore 6–8 costs) now; (2) build L2 rework; (3) **resim** (sims must drive autobuyers off SIM time, not Date.now()); (4) reconcile L3, re-pace the 2 held sims on the new idler baseline; (5) merge → deploy.

### Autonomous-run progress (2026-06-26, Vince away)
- **P2 SKIPPED** (data-driven): baseline sim shows W1 spike already gone — human L1 worst-gap 15.4 min, 0% runs >20 min; perfect player's per-encore times *decrease* (2.9→0.3 min). Pacing-v2 already fixed it. Confirmed, not assumed.
- **DONE + committed (`fb97744`, pushed to vinceee23):** Applause Points currency (earned/Encore, persists, migrated) · auto-encore execution (wires the dead `encore` autobuyer in the tick-driver; weak→MO-upgraded; net-loss-guarded) · AP-unlock action + UI for auto-encore (opusCount≥1) & auto-MO (opusCount≥3) · per-encore cadence reporting in era+human sims. Gate: tsc clean, 45/45 unit.
- **KEY CODE FINDING:** tier autobuyers already unlock via the OP tree (`automator-unlock-N`), NOT only L3 challenges. So the real slog cause = auto-encore + auto-MO being L3-gated. Took the lazy-correct default: AP unlocks the *prestige* automations; tier autobuyers stay on the OP path (no OP-economy surgery).
- **⏸ FLAGGED for Vince (deferred — touch tuned OP/L3 economy, didn't guess):**
  1. Tier-autobuyer **AP-early-unlock** in the first L1 climb (your "buy at Encore 4-5") — optional; OP tree already gives tiers post-MO1. Want it anyway?
  2. **Challenges repurpose** → AP + automation-power (D1). Minimal version = flat AP payout per challenge; richer "automation-power" rewards = new subsystem, deferred.
  3. **autoMO venue-component removal** from L3 (worldTour.ts) — auto-MO now also unlocks via L2 AP; the L3 component is redundant. Removal touches built L3 + tests.
- **NEW BUG (baseline):** Sound of Silence (`ach_perk_patron`) unreachable across 18 human seeds — investigating (task #6).
- **Remaining:** resim+tune AP costs/auto-encore interval to §10 acceptance; re-pace held sims; then the flagged items per Vince.

## OLD BLOCKER (now folded into the plan above) — why L3 isn't deployed yet
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
Per `docs/L2-AUTOMATION-SPEC.md` §13: **build & ship P2** (soften `getEncoreCost` Encore 6–8 amounts in `src/core/constants.ts`; re-sim cadence). Then start the L2 automation rework. Living-venue art (drafts in `drafts/l3-venues/` — 6 ladder + 3 `oh-state` progression; rest archived) + filler-achievement cleanup remain pending, after mechanics deploy.
