# HANDOFF — Sonance (updated 2026-06-28, overnight autonomous session)

> **READ FIRST for a fresh session:** this block + then `docs/bible/` (method→architecture→economy→world)
> and `docs/build-specs/` (L4–L9). The 9-layer ladder + full context live there. This file is the
> "where we left off + what I changed + what needs your call" snapshot.

## ⭐ THIS SESSION (2026-06-28) — Renamed to SONANCE + L4 prerequisites started

**The game is now SONANCE** (was "Orchestral Symphony"). Title = "Sonance"; the in-world phenomenon (the
resonance that answers when you reach into the silence — the gods) is **"the Sonance"** in the lore.

- **Full rename** across code + config + docs: `package.json` (name/appId/productName), `index.html`
  (title + SVG favicon), `electron/main.cjs`, `Header.tsx`, and the **localStorage save key →
  `sonance-v1`** (`gameStore.ts`) which **orphans old saves by design** (`freshStart.ts` clears both old
  + new keys). Docs display name swept "Orchestral Symphony" → "Sonance". **Repo name KEPT** as
  `orchestral-symphony` for now, so the Pages URL (`vinceee23.github.io/orchestral-symphony/`) still works.
- **Logo = hand-built CSS** `src/components/shared/SonanceLogo.tsx` (NOT an AI raster — deliberately, to
  match the game's art): the wordmark in **Hanken Grotesk** (`--font-body`) + the game gold `#d4a843`, the
  O is an orb with **one** restrained glow. Used in the header + the intro. **Subtle reactive glow** swells
  with crescendo / while conducting (Header passes `glow={resonance}`). Favicon = `public/sonance-icon.svg`
  (game-palette orb). AI logo explorations are in `./drafts/` (gitignored) — exploration only.
- **Intro flow:** the 3 cold-open quotes → the SONANCE logo **zooms in + blooms (~2s)** → fades into the
  game (`StoryBeat.tsx` `logo` phase; respects `prefers-reduced-motion`). First intro line reworded to
  "Before the first note, there was silence."
- **L4 prereqs (on branch `feat/layer4`):** **M11** Decimal-overflow guard **DONE** (`src/core/guards.ts`,
  wired in `calculateTick`). **M9 DONE** — gated green + committed (`7553dfe`): `multiplierRegistry.ts`
  wraps the funnel as the `core` channel (funnel internals unchanged) + new capped channels per layer;
  `resets.ts` `applyReset(state, tier)` migrated all 4 `perform*` onto the reset matrix; 12 characterization
  snapshots + ALL pacing sims byte-identical (19 files, 85 pass/1 skip). Both built by Codex, gated by Claude.
- **L4 Signature STRUCTURE DONE** — gated green + committed (`47a47b2`): `signature*` state (resetTier
  never) + save schema v2, `src/core/signature.ts` (identity at zero alloc = the no-op invariant; Harmony =
  allocation-evenness; bounded capped-log efficiency), folds via the M9 `domain` channel + tempo/crescendo/
  cost hooks (no funnel widening), `performSignature` via `applyReset('signature')`, circuit-break unlock
  (flips `signatureUnlocked`, turns on auto-tour), Signature UI page, era theming, `signature` beat wired.
  Gate: 20 files, 91 pass/1 skip/2 todo — untouched pacing sims pass (no-op invariant intact). Built by
  Codex, gated by Claude. **ALL magnitudes are `// TBD-tune` placeholders.**
- **L4 REMAINING (needs Vince + sims — task #6):** the magnitude-tuning pass per the **P0 list in
  `docs/MECHANICS-BACKLOG.md`** (set `CHANNEL_CAPS.domain`; Harmony-vs-mono band; Percussion tempo-cap
  diminish; Woodwinds combined cost floor; efficiency early-commit; post-Signature re-climb; auto-tour×
  Acclaim) + a visual review of the Signature panel. Plus a ranked **mechanics backlog** (`docs/MECHANICS-
  BACKLOG.md`) of L4-enrichment / L0–L3-polish / cohesion ideas to graduate deliberately.

### Locked decisions this session (don't re-open)
- **Both balance calls CONFIRMED keep-as-is** (no code change): L3 late re-climbs stay **floored** (not
  near-instant); **Warm-Up stays OFF during challenges**.
- **L4 design forks LOCKED** — see the ⭐ LOCKED DECISIONS block in `docs/build-specs/L4-signature.md`:
  build the **full declarative `applyReset` engine**; L4 ascension **resets all L3 progress**; respec
  **only at ascension**; **Harmony rewards allocation-evenness**; L4 **unlocks at the L3 circuit break**.
- **M9 plan:** a real **multiplier registry** where the existing 12-factor funnel rides in as ONE `core`
  channel (internals untouched, still sim-balanced) and each new layer adds its own capped channel
  (`domain` for L4, etc.) — NOT exploding the funnel. Plus `applyReset(state, tier)` from the reset matrix,
  **migrating all 4 existing resets** onto it, gated **byte-identical via characterization tests written
  first**. **Delegated to Codex** (workspace-write, separate quota); **Claude writes the spec + runs the gate.**
- **Branch/deploy policy:** `master` = the **public L3 trial** (auto-deploys). **ALL L4 work stays on
  `feat/layer4`, never merged to master** until Vince says so. L4 access = **gate-later** (ship L4 on master
  behind a client-side unlock — like the `?l3` flag — only once polished; caveat: a static SPA can't do real
  auth, the gate only stops casual players).

### Pending / awaiting Vince
- Rename is gating; once green, **screenshot the intro + header for review → then push master (deploys the
  renamed trial + wipes existing saves)** on Vince's go. Deploy NOT done yet.

---

## ⭐ WHERE WE LEFT OFF (prior session — historical)
**L0–L3 is hardened, sim-balanced, and deployed.** This overnight session added the early **Warm-Up**
active verb, **first-run onboarding**, and **two new story beats**, then re-paced two sims for the new
balance. Branch `feat/layer3`. **L4+ remains reserved for fresh sessions** (per Vince).

**FINAL STATUS (filled after the final gate): see "Final status" at the bottom.**

## ⚠️ TWO AUTONOMOUS BALANCE CALLS I MADE — please sanity-check
Vince authorized autonomous re-pacing ("sim it, rebalance and repace if necessary"). Two calls worth your eye:

1. **L3 late re-climbs are now FLOORED, not near-instant.** Warm-Up speeds production enough that the auto-MO
   re-climb for late tours becomes gated by `getAutoMOReclimbDelayMs` (the Task C anti-collapse floor) rather
   than by production — so tour-12 re-climb settles at ~11 min instead of collapsing toward ~0. The old
   l3-pacing assertion wanted `tour12 < 4 min ("near-instant")`, which directly contradicts Task C's design
   (that floor exists *to prevent* the near-instant collapse). I re-paced the assertion to: "snowball keeps
   shrinking tour1→8→12 but is floored/bounded (≤20 min), not near-instant." **DESIGN QUESTION FOR YOU:** do
   you want late re-climbs *floored* (current — fast but still a beat, more engaging) or genuinely
   *near-instant* (the old bar — pure snowball payoff)? If the latter, lower `L3.AUTO_MO_*` floor/ease in
   `src/core/worldTour.ts` instead. (sim/l3-pacing.test.ts ~line 1419.)

2. **Warm-Up does NOT apply during challenges.** Challenges are a separately-tuned constrained test (§2.8);
   letting the +1.5× active bonus apply made `ch_leaky` trivially fast (53 s < the 1-min floor). I gated
   Warm-Up off while `activeChallenge` is set (`src/core/tick.ts`), reverting all challenges to their tuned
   §2.8 behavior (no per-challenge re-tuning). Clean + maintainable, but confirm you agree challenges should
   be Warm-Up-free. (Note: `ch_leaky` sits at the low end of the band at ~75 s — passes the hard 1-min floor;
   optional future tune to push it into the 2–7 min soft band, but careful: its 2%/tick decay means raising
   the target too far makes it unbeatable.)

## What shipped this session (newest first)
- **Warm-Up** (`docs/WARMUP-SPEC.md`): early active-play production bonus. Active presence (buy/conduct in the
  last ~12 s) fills a bar → up to ×1.5 production; decays to a 1.0× floor when idle (idle-first preserved —
  offline/AFK never gets the bonus). Unlocks once the 3rd tier (Phrases) is owned, pre-Encore. Deterministic
  (driven by tick deltas + conducting + an activityGrace countdown — no wall-clock), so it's sim-testable.
  Files: `src/core/warmup.ts`, `constants.ts`, `tick.ts`, `formulas.ts` (bounded `.times(warmUpMult)` channel
  at the end of the chain), `gameStore.ts` (actions reset the grace timer), `types.ts`/`initialState.ts`,
  `components/compose/WarmUpBar.tsx`. Sim: `sim/warmup-pacing.test.ts` (unit guards; progression validated by
  the existing pacing sims, which conduct post-wall so they include the bonus).
- **First-run onboarding** (`docs/ONBOARDING-SPEC.md`): light, dismissible mechanical hints (first-buy
  highlight + JIT explainers for conduct/warm-up/encore/MO/tour/challenges). One at a time, never re-shown,
  seeded-skipped for existing saves. Files under `src/components/onboarding/` + `seenHints` state.
- **Two new story beats**: `first_wall` (the L1 ceiling) + `first_records` (your work reaching strangers),
  plus god-fingerprint lines on the Encore/Magnum-Opus beats. `src/components/story/beats.ts`.

## Earlier this session (already merged + deployed to master before tonight)
L3 reconcile (4 reverts) · B1 (9-layer reset matrix + milestone contract) · B5 (save-migration refactor) ·
challenge §2.8 (capstone exploit closed, AP payouts, difficulty leveled) · mid-L2 reward-drip + L3 re-climb
smoothing · cold-open intro + story beats. Deployed at `vinceee23.github.io/orchestral-symphony/`
(auto-deploy on push to master via `.github/workflows/deploy.yml`).

## Open / deferred (NOT this session)
- **M9 (multiplier-registry) + M11 (Decimal guards)** → L4's first prereq (documented in
  `docs/build-specs/README` + `docs/HARDENING-PLAN`). Do them fresh, before L4 mechanics.
- **L4–L9**: implementation-ready specs in `docs/build-specs/`. Reserved for fresh sessions.
- Fine pacing/feel tuning → post-playtest (per Vince).

## How to work here (the method)
`docs/bible/00-how-to-work-here.md`. TL;DR: gate everything before commit (tsc + full `vitest run` + build,
**read the real `${PIPESTATUS[0]}` exit** — a trailing `echo` once masked a red gate); tight-spec delegation
to Codex (Cursor is OFF/maxed); verify-don't-blind-fix; lock plans first; tap-batch decisions. Remote pinned
to `vinceee23` (personal); `gh` CLI is the WORK account — never cross them.

## Final status (2026-06-28, end of overnight session)
- **Gate GREEN:** full suite **17/17 files (70 pass, 1 skip)** + `tsc -b` + `vite build` all clean.
- **Merged `feat/layer3` → `master` and deployed** to `vinceee23.github.io/orchestral-symphony/`
  (auto-deploy on push; verified serving the new build). All commits pushed.
- **Your review queue (nothing blocking — just confirm):** the two balance calls flagged at the top
  (L3 floored re-climbs; Warm-Up off during challenges). Both are sim-green and documented; flip either in
  minutes if you disagree.
- **Next:** L4 (start with M9/M11 per `docs/build-specs/README`) — fresh session, reads the bible first.
