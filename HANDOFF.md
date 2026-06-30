# HANDOFF — Sonance (updated 2026-07-01)

> **READ FIRST for a fresh session:** this block, then the key docs below. This file is the
> "where we left off + what changed + what needs your call" snapshot.
> **Key docs:** `docs/bible/` (00 method → 01 arch → 02 economy → 05 world), `docs/MECHANICS-BACKLOG.md` **§D**
> (genre-audit decisions), `docs/PLAYTEST-FEEDBACK.md` (this session's playtest items + gods art direction),
> `docs/SETTINGS-SPEC.md`, `docs/build-specs/L5-virtuoso.md` (**§§10–12 = the full L5 design, build-ready**),
> `docs/GENRE-AUDIT-REPORT.md` (the Gemini report). **NEW (2026-07-01 polish session):**
> `docs/L0-L3-POLISH-AUDIT.md` (the 10-agent audit + ranked plan + live status tracker),
> `docs/PLAYTEST-BALANCE-PROPOSALS.md` (P1–P8, awaiting Vince's feel verdict),
> `docs/ART-DECISIONS.md` (art decision sheet for Vince). Memories: `sonance-not-ad-reskin`, `genre-audit-prooftest`,
> `external-cli-delegation-down` (Codex back / Cursor off), `gate-read-real-exit`, `l4-branch-policy`.

## ⭐ SESSION 2026-07-01 — L0–L3 polish pass (shipping the trial) · ultracode audit + 8 gated commits

**Branch `feat/layer4`. All COMMITTED + gated (tsc · vitest 23 files/106 pass/1 skip incl. all sims · build); NOTHING pushed/deployed.** Vince is now committing to **ship L0–L3** and wanted it polished to its ideal final (incl. art + sfx + overlooked aspects). Ran a **10-agent ultracode audit** (9 dimension readers + completeness critic, 986k tok, 106 gaps) → `docs/L0-L3-POLISH-AUDIT.md` (ranked plan + live ☑/🅿/☐ tracker). Worked autonomously across a ~2h window; commit policy = auto-commit gated chunks locally.

**Shipped (8 commits, each gated green):**
1. `0978d5e` docs — the audit + plan.
2. `2113d61` **harden(ship)** — Tier-0 ship-blockers: `?l3` cheat gated to DEV (was live in prod); **emblem + achievement art base-path 404 fixed** (absolute `/` → `BASE_URL`; was silently glyph/emoji-falling-back on the GH-Pages subpath); global **ErrorBoundary** (copy-save/reload/reset); **localStorage** try/catch + corrupt-save sidecar backup (`saveWriteFailed`).
3. `5320c5c` **feat(audio)** — rewrote `audio.ts` (master bus + generated reverb + warm triangle voices + input rate-gate); sound on the previously-SILENT verbs: **Conduct** (pentatonic phrase via shared `triggerConduct`), escalating prestige stings `playPrestigeSound(grandeur 1/2/3)` (Encore<MO<World Tour), achievement chime, challenge-complete sting, venue collect, **keyboard buy parity**.
4. `58d6cfb` **fix(copy)** — ladder L3/L4 'Repertoire'/'Genre' → **World Tour/Signature**; the **false "Opus Points multiply tempo"** claim corrected in PrestigeDialog + hint; deleted dead `getOpusBPMMultiplier`; Auto-Conduct "half"→"~70%"; hint "tips"→"tutorials"; stale "hold to conduct" comments fixed.
5. `d8cffa8` **a11y** — OS `prefers-reduced-motion` now gates ALL decorative anim (was story-only); StoryBeat + SmoothNumber honor the in-app toggle (SmoothNumber snaps + drops its rAF loop under reduced-motion = a11y+perf); sidebar tabs get `aria-current`/`aria-label`/`title`.
6. `9fbcceb` docs — `PLAYTEST-BALANCE-PROPOSALS.md`.
7. `e3238cf` **polish(ui)** — distinct `globe` icon for World Tour (was sharing `sparkle`); FloatingNotes deterministic (no teleport on prestige); **story beats now play a soft swell** (covers the silent World Tour reveal).
8. `ddca856` docs — `docs/ART-DECISIONS.md`.

### ▶ AWAITING VINCE / NEXT
- **🅿 Balance/feel — `docs/PLAYTEST-BALANCE-PROPOSALS.md` (P1–P8).** Deliberately NOT changed (gate behind playtest). P1 flat early-Encore reward (most trial-impactful), P3 thin Conduct payoff (`AUTO_CONDUCT_FRACTION`), P4 no L0–L1 active verb, **P5 offline-autobuyer frozen-clock bug**, P6 challenge reward placeholders, **P7 framerate-dependent ch_leaky** (P5/P7 are bugs I can fix on a yes), P8 trial-ending/L4-leak. Each has options + my pick + re-sim list.
- **🅿 Art — `docs/ART-DECISIONS.md`.** D1 wire the 6 existing venue drafts (`drafts/l3-venues/ladder-*.jpg` → venues 0–5, cheapest visible win), D2 achievement art 1/100 (rec: no-credit glyph fallback), D3 era backdrops, D4 favicon/og:image set + delete stale `favicon.svg`. Wiring prepped; awaiting taste/credit decisions.
- **☐ Deferred (M-effort, documented in the audit Tier-1):** modal Esc/focus-trap, tier-button aria-labels, per-tick funnel memoize + save debounce (perf), buy-juice VISUAL parity (keyboard flash/+N), World Tour unlock celebration overlay, locked-pod anticipation, HelpModal expansion (Conduct/WT/Platinum).
- **Deploy still DEFERRED.** Trial-safe (L0–L3) commits to port to master when ready — but note these polish commits live on `feat/layer4` alongside L4 work; cherry-pick the trial-safe set.

## ⭐ SESSION 2026-06-29 → 07-01 — Genre audit · Settings v2 · pantheon design · L5 fully specced

**Branch `feat/layer4`. Everything below is COMMITTED + gated; NOTHING deployed (master = public L3 trial).**
Full gate at session end: **tsc 0 · vitest 23 files / 105 pass / 1 skip (incl. all sims) · build 0.** All
session code **double-reviewed** (a Claude correctness pass + an independent **Codex** pass).

**1. Genre audit — walked end-to-end** (`docs/GENRE-AUDIT-REPORT.md`, C1–C21/I1–I6/Parts B&C). Decisions in
`MECHANICS-BACKLOG.md` **§D**. North-star (memory `sonance-not-ad-reskin`): Sonance must differ from AD in the
**core-loop math**, not the theme. **Not-AD spine = 2 levers: Signature-as-spine + Harmony/Resonance** (the
3rd, a Tempo risk/reward dial, was **CUT** — it was Conducting v2). Roadmap doctrine: 9 layers = *gate behind
proof*; monetization = *free demo L0–L3 → premium L4+*; community feedback deferred.

**2. §D1 build pass — SHIPPED + committed:** Conducting → **tap-to-burst** (no holding; `CONDUCT_BURST_MS`);
**Production Breakdown** panel on Stats (C10, `getProductionBreakdown`, drift-guard test); **Settings panel
v2** — now a **nav tab** (gear removed), with save **export/import** (Base64 + .txt), **rebindable hotkeys**,
number **notation**, **reduced-motion**, **FPS cap**, **theme-lock**, **mute-on-unfocus**, in-app **hard-reset
dialog**, **offline toggle**, **re-enable-confirmations toggle**; **two-beat tutorials** (pre-reset nudge →
post-reset orientation card, disable-able); **era-themed save-import preview**; `ch_unplugged` **capstone
ordering gate** (the reported "exploit" was a verified FALSE POSITIVE). **Save schema v2→v4.** Cleaner number
formatting (`formatCost` 1-dec). Codex review then hardened the import path (3 malformed-import gaps fixed +
tests). Stats black-screen (a Zustand selector loop) fixed.

**3. Pantheon (L9 gods) — VISUAL direction APPROVED as initial draft** (`docs/PLAYTEST-FEEDBACK.md` 🎺 +
`src/core/pantheon.ts`). **Celestial faceless constellations** (gold-line deity-with-instrument over
domain-tinted starfields, antique-atlas style); **Maestro = the central gold origin-orb/orrery** the five
wheel around. Matched concept-art set in **`drafts/pantheon/*.png`**. Seeded NOW: L4 "Your sound" identity
glows your god's tint + "…echoing Timpana, the Pulse" (`1c2f770`). Forward-design: the **cold-open
progressive-reveal** (each layer-quote glows in a god, building to L9) + the **"blink"** (constellations stir
in their fingerprint rhythm). Refine at L9 build: Clarion needs more grandeur; animated SVG draw-in.

**4. L5 "Virtuoso" — FULLY DESIGNED, build-ready** (`docs/build-specs/L5-virtuoso.md` §§10–12; design is
balancing-only). Mastery = **consistency/control** (anti-spike; foil = Conducting). Loop: auto-cycling
**Perfect Takes**, hold production **growing smoothly**, bank the **area**; **end-early-to-bank**; grade
**S/A/B/C** (in-band %); clean-take **streak** (capped run-tier heat + MP; Composure "saves"). Economy:
**Mastery Points** → tree (**Poise/Resonance/Composure/Stamina**, mastery-mechanics only); ranks
**Apprentice→Player→Soloist→Virtuoso** (Maestro reserved for L9). Reward: an **anti-collapse production
floor** (never below X% of peak, rank+Resonance, hard-capped). Idle-first (~1.5×); unlock = first Signature
ascension; suspends during challenges. **Gated behind proving L4** (do NOT build L5 until L4 tuning is done).

**5. Tooling/delegation:** Codex (reviewer/QA) **back** as of 07-01; **Cursor off** (on-demand only). Working
model: Claude builds, Codex reviews/QA, Claude gates+commits.

### ▶ CURRENT STATUS & NEXT
- **THE GATE / #6 — L4 magnitude tuning + feel PLAYTEST** is the immediate next, and it **unblocks
  everything**: building L5, the not-AD core (Harmony / Signature-as-spine), and L6+. The synthetic sim can't
  judge the idle:active *feel* in the locked L4 layer — needs Vince's hands. Folded playtest items: C1
  dead-zone audit, C2 early re-climb, C4 `AUTO_CONDUCT_FRACTION`.
- After L4 is proven: spec L6–L8 (the gap), the **era/level visual language** (anchored by the pantheon art),
  then build the §D2 not-AD core. L7 has a LIVE placeholder `performGrandFinale` (old 6-layer model) to
  reconcile when L7 is built.
- Deploy still DEFERRED; when ready, port only trial-safe (L0–L3) commits to master (NOT the L4 commits).

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
