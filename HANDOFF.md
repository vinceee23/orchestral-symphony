# HANDOFF — Sonance (updated 2026-06-29)

> **READ FIRST for a fresh session:** this block + then `docs/bible/` (method→architecture→economy→world)
> and `docs/build-specs/` (L4–L9). The 9-layer ladder + full context live there. This file is the
> "where we left off + what I changed + what needs your call" snapshot.

## ⭐ THIS SESSION (2026-06-29, latest) — Genre audit WALKED + build pass started

Walked the Gemini genre-audit report (`docs/GENRE-AUDIT-REPORT.md`, converted from the root `.docx`)
one-by-one with Vince: C1–C21, I1–I6, Parts B & C. All decisions recorded in **`docs/MECHANICS-BACKLOG.md`
§D**. Headlines:
- **New north-star (memory `sonance-not-ad-reskin`):** Sonance must feel like Sonance, NOT "AD Music Edition" —
  differentiation must live in the **core-loop math**, not the theme. Identity spine (2 core levers, after
  the **Tempo dial was CUT 2026-07-01 as Conducting v2 / redundant**): **Signature-as-spine +
  Harmony/Resonance** (Harmony **touches the live L0–L3 loop** — big, trial-affecting; spec before building).
- **Sonance scored well:** ~14 of 21 criticisms already handled at/above genre norms (distinct verbs, free
  respec, prestige preview, Roadies automation, additive achievements, progressive disclosure, sim pacing gate).
- **Ready-to-build pass (§D1) — ✅ BUILT (uncommitted) on `feat/layer4`:** Settings panel v1
  (`docs/SETTINGS-SPEC.md`, save schema v2→v3), Production Breakdown panel (C10, drift-guarded), Conducting
  → tap-to-burst (C4, `CONDUCT_BURST_MS`), `ch_unplugged` ordering gate (the reported "exploit" was a
  verified FALSE POSITIVE — reward already gated on all-12; added the ordering gate as polish). **Gate FULLY
  GREEN: tsc clean · 78 src tests · vite build · 7/7 sim files (21 pass/1 skip, real exit 0).** Not yet
  committed (awaiting Vince's go).
  - ⚠️ The ordering gate broke `sim/challenge-pacing.test.ts` (its beatability instrument unlocks each
    challenge via `isChallengeUnlocked`; the capstone now needs the 11 others cleared, which a raw-SW climb
    doesn't do). Fixed: the 11-cleared gate is *sequencing*, orthogonal to SW-pacing, so the sim bypasses it
    via a probe (capture loop + `startChallenge`) WITHOUT granting the others' reward buffs — capstone stays
    tested in isolation, pacing unchanged. (Caught only by reading the REAL vitest exit — the bg wrapper
    reported "exit 0" while vitest exited 1; `gate-read-real-exit`.)
- **Roadmap doctrine:** 9-layer → *gate behind proof* (don't pre-commit to 9 full resets); monetization →
  *free demo L0–L3 → premium L4+* (matches branch split); early community feedback → deferred to launch-prep.
- Bigger identity/depth items (Signature-as-spine, Harmony/Resonance, Time Banking, rule-inversion
  challenges, milestone auto-completion) → §D2, each needs a spec before build.

## ⭐ THIS SESSION (2026-06-29) — Playtest pass: Warm-Up retired · achievements culled · sim honesty

Live-playtest iteration on `feat/layer4` (nothing deployed; master untouched — Vince: keep iterating, deploy
later). All items below gated green + committed.

- **Warm-Up RETIRED** (`bba0415`) — redundant with Conduct/Crescendo (both reward active presence; post-MO
  they showed at once). `isWarmUpUnlocked → false` at the source: bar auto-hides (WarmUpBar returns null when
  inactive), zero production effect, no wasted ticks. Plumbing kept for save-compat + easy revert. The
  separate head-start perk (`perk-warmup`) is unaffected. **⚠ This SUPERSEDES the Warm-Up feature described in
  the 2026-06-28 block below — that section is now historical.**
- **Achievements CULLED 376 → 100** (`fb18542`) — ~285 were number/time padding (132 generated "play N min",
  ~40 "Nth Set" ladders, 36 "Own N Symphonies", 37 "Sell N records", 15 "N Zeros", MO-ramp/grind drip),
  auto-generated only to satisfy the pacing sim's "reward every ≤20 min" rule. Cut all (nearly all no-bonus →
  balance-neutral; deleted IDs are save-safe). Kept the meaningful spine + all **10 load-bearing perk
  achievements** (`perks.ts`) + `ach_vivaldi` (`challenges.test`); ADDED 13 depth achievements (Purist, Flash
  Encore, Prodigy, Autopilot, Blitz Platinum, Maestro, Polymath, The Long Game, Encore of Encores,
  Renaissance, The Sonance, Big Bang, Grand Tour). REBALANCED: folded deleted filler's production into beefier
  kept milestones (achievement-mult @ Platinum ×2.86 → ×2.59, still in band; pacing curve unchanged — wall
  95.7m, MO 151.6m, Platinum 16.4h). ROOT CAUSE FIXED: retired human-pacing's gap assertions (now
  report-only) + flipped the brittle stranding denylist to a robust must-unlock allow-list; relaxed
  globalAtPlat lower 2.4→2.25. **Design rule: no filler achievements — meaningful only (memory:
  `achievements-no-filler`).**
- **Trial playtest fixes** (`f3a0371`) — first Encore now banks **≥1 EP** (was 0 below the 1e15 threshold —
  "first encore gave nothing"); story-beat cold-open **fade-in** (no instant black-pop); Encore goal shows the
  **tier name** ("0/12 Harmonies"). Stale `layer1.test` assertion updated to the EP-min-1 contract.
- **Sim honesty fix** (`57863b8`) — conducting unlocks **only post-MO** (UI gates the button + Spacebar on
  `opusCount > 0`; the core tick never gated it, so the lock was UI-only). The achievement-/era-/challenge-
  pacing instruments were conducting pre-MO (`layer1WallReached || ...`), over-crediting the wall→MO climb.
  Gated all three to `opusCount > 0` (human-/l3-pacing were already correct).
- **Fast first-MO investigated → NOT a bug.** A fresh-save 30-min first MO (vs the model's 151 min) is driven
  by **buying efficiency, not conducting** (conducting is post-MO). Optimal ≈7.6 min, casual ≈151 min, a
  focused player ≈30 min — squarely between. **Vince's call: 30 min is fine (reward active play); no nerf.**
- **Branding reviewed + signed off (#5 closed)** — Sonance rename is 100% complete (title / `package.json` /
  save-key `sonance-v1` / Header); logo v1 + intro (3 cold-open quotes → orb-O bloom → game) confirmed via
  fresh 2× screenshots (`drafts/review-*.png`).

### Follow-up session (2026-06-29, later) — backlog builds + the red resolved
All gated green (tsc · vitest 20/20, 95 pass/1 skip · build) and committed on `feat/layer4`:
- **✅ RESOLVED the red sim** — trimmed `PERCUSSION_TEMPO_BONUS_MAX` 0.08→0.07 (`3f7aaa6`); idle:active back
  under the 1.25 guard, dominance band intact (l4-signature 9/9). The "ONE RED SIM" flag below is now CLEARED.
- **B2 prestige-preview** (`fe07403`) — gain/resets/keeps block in the dialog + reset subline under each
  prestige button (perk-aware). Trial-safe.
- **B1 challenge readouts** (`108dfea`) — live cumulative "Active challenge bonuses" readout (per-challenge
  labels were already exact). Trial-safe.
- **B4** (`841b9ee`) — was already built (onboarding JIT cards); removed the dead Warm-Up hint.
- **A1 emergent L4 identity** (`083f427`) — `getSignatureIdentity` → "Your sound · The Pulse-Driven/Lyric/
  Radiant/Windborne/Harmonist" (Composer when spread), shown in the Signature header. Seeds the L9 mirror.
- **Docs reconciled** (`6f38217`) — stale specs (WARMUP-SPEC, ACHIEVEMENTS-V2, etc.) banner-annotated so a
  fresh session can't follow reversed instructions.

### Open / awaiting Vince (next session)
- **✅ DONE — Genre audit walked** (2026-06-29 latest session, see top block). Report at
  `docs/GENRE-AUDIT-REPORT.md`; all decisions in `docs/MECHANICS-BACKLOG.md` §D. **▶ NEXT UP — the §D1
  ready-to-build pass** (Settings v1 / Production Breakdown / Conducting tap-burst / capstone fix), then spec
  the §D2 identity-spine items.
- **~~⚠ ONE RED SIM~~ ✅ RESOLVED above (percussion trim).** _(historical:_ `sim/l4-signature.test.ts > "no
  domain main worsens the idle:active balance vs baseline (P0 #3)"` — **percussion = 1.2609 vs the 1.25 guard**
  (0.9% over; deterministic, percussion-only, other 8 tests pass). **Root cause:** retiring Warm-Up (this
  session). `buildStrength` climbs at `opusCount=5`/tier-3-owned, so at the last-green L4 commit (`20dde8c`)
  its *active* climb included Warm-Up — a common active-side term that compressed the idle:active quotient
  across builds. Removing Warm-Up removed that compression, so `percussion→tempo`'s intrinsic active-skew now
  reads 26%. **The new number is more honest**, not a bug; whether 26% is acceptable is a balance call (and
  this harness is already documented as synthetic / deferred-to-playtest, line ~42). **Options for you:**
  (a) accept + widen the guard 1.25→~1.30 (matches the DOMINANCE_BAND elsewhere), (b) trim percussion's
  domain magnitude in `src/core/signature.ts`, or (c) leave until the L4 playtest tuning pass. I did NOT
  touch it then; it was resolved later (`3f7aaa6`).)_ **Everything L0-L3 / trial is GREEN.**
- **#6 — L4 magnitude tuning + feel/UI review** — still the main L4 to-do (see the 2026-06-28 block).
  Progress: percussion guard fixed (`3f7aaa6`) + A1 identity seeded (`083f427`); the rest of the L4
  feel/magnitude pass remains for a playtest.
- **Deploy — DEFERRED** ("keep iterating"). When ready: port the **trial-safe (L0-L3) work** to `master`
  — that's everything EXCEPT the L4 commits (M9/M11, Signature structure/tuning `47a47b2`/`5a9aa2c`,
  percussion `3f7aaa6`, A1 `083f427`). Trial-safe set: rename `8dedeba` · logo+offline `89a96ad` · trial
  fixes `f3a0371` · warm-up retire `bba0415` · achievements `fb18542` · sim-only `57863b8` · docs `6f38217`
  · B2 `fe07403` · B1 `108dfea` · B4 `841b9ee`. (The L4 commits are no-op at zero-allocation so they're
  *harmless* on master, but keep them off per the branch policy.) **⚠ deploying master wipes trial saves.**
- Tooling note: `puppeteer-core` was used for the screenshots then reverted from `package.json` (kept locally
  in `node_modules` only) to keep the tree clean — re-`npm i -D puppeteer-core` if a standing shot script is
  wanted.

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
- **L4 FIRST-PASS TUNING DONE** — gated green + committed (`5a9aa2c`, done on Claude as Codex ran out of
  credits): a real **balance oracle** in `sim/l4-signature.test.ts` (deterministic mini-climb w/ autobuyers,
  scored as SW-exponents gained — captures all 5 bends) proves the **"diverse but viable"** target is MET by
  the placeholder magnitudes (every build live, max spread ~1.18 ≤ the 1.30 band, Brass ~10% ahead, none
  dead/dominant) — so NO magnitude churn was needed. `CHANNEL_CAPS.domain = 1.0` safety ceiling set (P0 #1).
  Idle:active assertion DEFERRED to playtest (synthetic harness can't measure the locked window; documented).
- **L4 REMAINING (needs Vince — task #6):** the **feel** review (is the allocation choice satisfying?) +
  the **Signature UI** review (sims prove not-degenerate, not fun); finer magnitude/feel tuning + the
  deferred idle:active check are a playtest pass (cheap once Codex credits refill). Plus the ranked
  **mechanics backlog** (`docs/MECHANICS-BACKLOG.md`) of enrichment/polish/cohesion ideas to graduate.
- **⚠ External CLI delegation is DOWN** (Codex out of credits + Cursor maxed, 2026-06-28) — Claude is the
  sole builder until refill. Prefer waiting for a refill for large/iterative builds.

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
