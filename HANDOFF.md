# HANDOFF — Orchestral Symphony (for the next Claude session)

> This session hit 100% context. Everything important is in git + `DESIGN.md` +
> the dashboard + memory; this file is the fast on-ramp. **Read this first, then
> `DESIGN.md` (esp. §11), then `git log --oneline -15`.** Last commit: `9ee6c8a`.
>
> **SESSION 2 (2026-06-24/25) shipped 12 commits — see §7 at the bottom for the full rundown.**
> TL;DR: global Space-conduct + header crescendo; MO re-masters the wall + Opus Mastery reprice;
> an app-wide spacing root-cause fix (unlayered `*{}` reset was killing every Tailwind m-*/p-*
> utility) + viewport tab-centering; Conduct UI declumped; a 10-perk functional-reward system;
> Platinum is now a mystery until reached; achievements re-paced (73 total, dead zones filled,
> fragile checks fixed); Sight-Reading reworked into a sim-tuned head-start + new "Rehearsal" upgrade.

---

## 0. How Vince wants you to work (carry this over — it's the whole point)

1. **Ask LOTS of questions before building.** Vince explicitly values a "super
   solid plan" over speed. On any substantive request: restate → enhance →
   **confirm with questions** → only then act. Don't drift into silent
   implementing. (He noticed last session that I stopped asking — don't repeat.)
2. **Delegate heavy/large coding off the Claude meter** (see `delegate-cli` skill
   + `~/.claude/CLAUDE.md`): **Cursor/composer-2.5 = builder** (pipe prompt via
   STDIN: `cat p.txt | "$CURSOR" -p --trust --force --model composer-2.5 --output-format text`),
   **Codex/gpt-5.5 = reviewer**. **Claude orchestrates + runs the compile/test
   GATE + commits.** Always gate external code before commit, even "just tooling."
   Codex stdout capture has failed twice in this harness — hand-verify instead.
3. **Balance is pure math.** Validate pacing changes with the headless sims in
   `sim/*.mjs` before committing, not by feel.
4. **Verify layout by MEASURING, not eyeballing.** Screenshot loop:
   `chrome --headless=new --force-device-scale-factor=1 --window-size=1920,1080
   --screenshot=out.png --dump-dom http://localhost:5173/?tab=compose`.
   **`--force-device-scale-factor=1` is mandatory** (headless defaults to 2 →
   half CSS width → false overflow). To measure an element, write its
   `getBoundingClientRect()` to `document.title` and grep `<title>` in the DOM dump.
   Eyeballing screenshots caused a multi-hour centering wild-goose-chase — don't.
5. **Never wipe the save.** `localhost:5173/?fresh` wipes on every load (testing
   only); `/?dev` keeps the save + enables DevPanel (speed 1/10/100/1000×, grant
   SW/OP/records). `/?tab=compose` jumps a tab for screenshots.
6. **Commit trailers** (every commit):
   ```
   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   Claude-Session: <the session url>
   ```
7. **Git remote pinned to `vinceee23`** (personal). **Never commit `.env`**
   (holds `GEMINI_API_KEY`). Flag the $ cost before any bulk Gemini image gen.

---

## 1. What HAS been built (current state @ f46d663)

- **Layer 1 (Compose)** — fully playable: tiers (bracket pricing + milestones),
  Tempo (continuous/uncapped BPM, +6/level, +0.1× prod/level), Encore prestige
  (EP from peak SW, sim-tuned reveal pacing), Crescendo (hold Space / Conduct
  button → production swell).
- **Layer 2 (Magnum Opus)** — core functional: Opus tab + OP upgrades,
  autobuyers, Records → **Go Platinum at 1,000,000 records → Fame multiplier**.
  Mystery-reveal `RecordsMeter` (hidden <600k, cryptic counter, "Gone Platinum"
  payoff). Living Hall backdrop (`StageHall`, procedural per-era, hybrid optional art).
- **UI/UX overhaul** — Hanken Grotesk body font, shared `Button`/`Icon`,
  spacious tab chrome. (Vince rated the *first* pass "20%" — see §3, still
  wants stronger direction; the design-system commit `36658b8` was the response.)
- **Achievements** — 58 total (this commit). Re-paced, hybrid naming, +9 L2
  achievements, locked=greyed+condition-visible, 3 easter eggs stay "???",
  reward budget preserved (globalPercent 4.65→4.59).
- **Stage centering** — SOLVED (`44e551d`): risers platform was rendering ~570px
  left (translateX(-50%)+perspective combined); split into outer-2D / inner-3D.
- **Tempo "stuck BPM"** — SOLVED (`70d6916`): removed floor() + hard cap.
- **MO-era / baton relock after spending OP** — SOLVED (`f46d663`): gate on
  `opusCount` (lifetime), not `opusPoints` (spendable).
- **Conduct Space-hold cancelled by mouse-leave** — SOLVED (`f46d663`).

## 2. What is BUILDING right now

- **Nothing in-flight.** Cursor's achievements task finished and is committed.
  The Vite dev server may still be running (since ~2:42 PM session-start). No
  uncommitted work — tree is clean at `f46d663`.

## 3. Recent feedback from Vince (most recent first — honor these)

- **MO OP gain stays FLAT +1** (he reconsidered the scaling idea): scaling it
  pre-Platinum would defeat the **Platinum break** (Platinum is what switches OP
  gain to the scaling/catalog formula). The **`op-gain-flat` Opus upgrade ("opus
  mastery")** is how you raise the flat gain meanwhile. **Do NOT auto-scale OP per MO.**
- **MO should re-master the wall**: every Magnum Opus (not just the first)
  requires re-reaching the 8-Encore wall. He wants even +1 OP to feel *earned*.
- **Nyan Cat theme + cosmetic shop** (NEW idea, food-for-thought): the Nyan
  easter-egg achievement (999 of a tier) should unlock a **Nyan Cat theme**.
  Broader: an in-game **cosmetic shop** — earn coins per X minutes, spend coins
  *or* real money on themes. Wants it **wired as placeholders** (not full). See §4.
- **Achievements**: hybrid voice (real song titles where the pun lands + original
  orchestral wit), songs/wit NOT restricted per layer; locked=greyed+visible;
  keep total reward budget ~same. (All done.)
- **Perk-achievements** wanted (functional rewards): see §4 #2.
- **QoL**: hold Space + still see Crescendo while switching tabs (global conduct);
  persistent header crescendo readout.
- **Tabs/buttons** still read as "mostly to the right, no spacing" — he suspects
  the **sidebar offset** (content centers in the play-area = right of screen
  center). He floated "anchor tab content to the same x as Melodies." See §4 #4.
- Monetization (research synthesized → memory): **free on web → premium on Steam,
  no MTX, never paywall autobuyers.** The cosmetic shop must respect this
  (cosmetics only, earnable with coins; "real money" = optional, cosmetic-only).

## 4. What to BUILD next (the queue, in priority order)

1. **MO re-masters the wall + keep flat +1 OP.** Each Magnum Opus re-requires the
   8-Encore wall. OP gain stays `1 + opGainFlat` pre-Platinum, catalog-scaled
   post-Platinum. Then **re-sim L2 pacing** (`sim/l2progression.mjs`, `l2check.mjs`).
2. **4 perk-achievements** (new functional-reward "perk" system):
   (a) skip the encore-wall requirement for MO, (b) keep encore upgrades through
   MO, (c) start each run with bonus tiers/SW, (d) faster automators / cheaper
   first buys. These are *unlockable perks*, distinct from the global% rewards.
3. **Cosmetic shop + Nyan theme (placeholders)** — Vince's new idea. Wire the
   skeleton only: a theme registry (default + Nyan), a `coins` currency (+N per X
   min), a Shop tab/panel to buy themes with coins or (stub) real money. Nyan
   theme unlocks via the Nyan achievement OR purchase. **Confirm scope with Vince
   before building** — he said "food for thought," placeholders, cosmetic-only,
   never paywall gameplay. (I deferred building it this session to preserve
   context for the handoff — it's spec'd here for you to wire cleanly.)
4. **Tab content screen-centering.** Content currently centers within the
   sidebar-offset play-area (reads as right-shifted). Decide: center on the true
   screen, or anchor to Melodies' x (as the stage platform now is). MEASURE with
   the screenshot loop before/after.
5. **Global Space-conduct + header crescendo readout** (QoL). Space holds conduct
   across tab switches (when `opusCount>0`); a persistent header shows live crescendo.
6. **Backdrop art** (blocked): Gemini key was in hard 429 cooldown; HF ZeroGPU
   anon quota exhausted (needs `HF_TOKEN`). `StageHall` degrades gracefully
   without art (procedural hall shows). Revisit when a key/quota is available.

## 5. Key files

- `src/core/formulas.ts` — global production multiplier (single source of truth),
  tempo, encore/finale/fame formulas. `getCoreProductionMultiplier` is THE mult.
- `src/core/achievements.ts` — 58 achievements + `getAchievement*` reward fns.
- `src/core/{records,crescendo,opusUpgrades,encoreUpgrades}.ts` — L2 systems.
- `src/components/compose/{ComposePage,StageHall,RecordsMeter,OrchestraStage,ConductorPodium}.tsx`.
- `src/store/gameStore.ts` + `types.ts` — Zustand state (check fields here).
- `sim/*.mjs` — headless balance sims (mirror the formulas; run before tuning).
- `DESIGN.md` §11 — Living Hall + per-layer stage-growth vision (each prestige
  layer adds a performer section). `docs/achievements-overhaul.md` — the plan.
- `src/dev/DevPanel.tsx` — dev-only (`import.meta.env.DEV && ?dev`).

## 6. Gotchas (learned the hard way)

- `mx-auto w-fit` LEFT-aligns a scaled block; use `flex justify-center` + `shrink-0`.
- A CSS `transform` on an ancestor breaks `position:fixed` descendants (keep
  dialogs outside transform wrappers).
- flexbox `min-width:auto` lets a `flex-1 main` overflow — add `min-w-0`.
- Combining `translateX(-50%)` with `perspective()/rotateX()` in ONE transform
  breaks horizontal centering (split into outer-2D + inner-3D divs).
- **Tailwind v4 cascade layers > specificity.** An UNLAYERED rule (e.g. a raw
  `*{margin:0;padding:0}` reset) silently overrides EVERY `@layer utilities`
  class — it was zeroing all `m-*/p-*/mx-auto/space-y-*` app-wide (the real cause
  of the "mx-auto left-aligns" gotcha above). Keep custom resets inside `@layer base`.
- `npx tsc -b && npx vitest run` is the gate. Both must be clean before commit.

---

## 7. SESSION 2 rundown (2026-06-24/25) — 12 commits, `9c04ba9`→`9ee6c8a`

**How we worked:** heavy delegation paid off — Cursor (composer-2.5) authored the
declarative bulk (perk registries, achievement defs, re-pacing), Codex (gpt-5.5)
reviewed diffs + brainstormed the achievement-pacing, Claude wrote specs, wired the
sensitive game-logic, ran the sim/test gate, and committed. Vince's working style
(see `memory/planning-style.md`): lock a comprehensive plan via Q&A to ~98% confidence
BEFORE building; don't pivot mid-build.

**Shipped:**
1. `8b0ee8e` Global Space-conduct (lifted the listener to AppShell so it survives tab
   switches) + subtle header crescendo `♪ ×N` pill. Conduct held-sources (Space/pointer)
   split in uiStore so neither cancels the other.
2. `49ffb58` **MO re-masters the wall**: every Magnum Opus resets `layer1WallReached`
   (re-climb 8 Encores). **Opus Mastery** repriced (growth 1.8→1.4, max 5→8) so the +1
   OP headline actually climbs to ~+5 by Platinum — fixes pre-Platinum staleness WITHOUT
   pre-empting the Platinum catalog switch. Validated by `sim/l2mastery.mjs` (NEW).
3. `7d6f483` **App-wide spacing root cause** (see new gotcha above) + viewport tab-centering
   (`pr-16 md:pr-52` on non-compose `<main>` makes mx-auto content center on the true screen).
4. `1ea60fe` Conduct UI declumped into one bottom-anchored podium column (slim readout →
   button → podium, gap-spaced; swell-meter rises toward the button per §11).
5. `523fe25` + `3acaa4f` **Perk system (10 functional perks)** — `src/core/perks.ts`
   (`PERKS` registry + `hasPerk` + effect constants). Each perk is granted by an achievement
   (always-on once earned), wired across gameStore/tick/records. Perks: skip-wall,
   keep-encore-upgrades, warmup, fast-automators, tempo-headstart, crescendo-headstart,
   encore-discount, bulk-unlock, second-wind, platinum-press. **Distinct head-start axes**
   (tiers/SW/tempo/crescendo) kept separate by design.
6. `7e9c652` **Platinum is a mystery** — Opus-tab stat reframed to "??? · N/1,000,000"
   pre-reveal; `ach_going_platinum`/`ach_perk_muscle_memory` hidden until earned. Post-reveal
   copy (Fame/Certified/Gone Platinum) unchanged.
7. `a51b05c` **Achievement re-pace** (Codex-brainstormed): was ~37/67 unlocked before first MO.
   Re-gated 9 front-loaders later, fixed fragile checks (nyan exact-999→`gte`, smooth_criminal,
   sandstorm desc, crescendo achs gated on `opusCount>0`), added 6 dead-zone achs (MO-gate/
   Platinum/L3). **73 achievements total.**
8. `9ee6c8a` **Encore-shop rework** — Sight-Reading is now a 1-time UNLOCK of a Soundwave
   head-start `(prior peak)^exp` (base 0.5 + 0.04×3 head-start achievements), **applied only
   on Encore**. Sim-tuned: the escalating gate sits above each prior peak, so even a near-1.0
   exponent barely shifts wall-time — 0.5 skips the tedious re-climb without trivializing.
   New "Rehearsal" upgrade (−5% tier costs/level, max −25%).

**Follow-ups / flags for next session:**
- **"Mass Production" perk is weak** — manual bulk-buy (1/10/Max) was already ungated, so it only
  lifts the *autobuyer* bulk cap. Consider a stronger effect.
- **Re-gated achievements can "un-earn"** on an existing save (harder conditions flip them back to
  locked). Fine in dev; note if it confuses playtest.
- **opusCount-gated perks** (skip-wall, warmup) activate one prestige cycle AFTER their achievement
  unlocks (the ~300ms achievement-check tick lags the opusCount increment). Documented in
  `performMagnumOpus`. Accepted as a minor boundary delay.
- **Cosmetic shop + Nyan theme** (old queue #3) and **backdrop art** (#6, blocked on API quota) are
  still untouched.
- New balance sims: `sim/l2mastery.mjs` (MO progression + Opus Mastery), `sim/engine.mjs` gained an
  optional `startSW` for head-start modelling. Re-run before any further pacing tweaks.
