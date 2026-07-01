# 04 — The forward design: the 9-layer ladder (L4–L9 mechanics)

> **Scope of this file.** L1–L3 are *built* and documented elsewhere in the bible. This file covers the
> **unbuilt, designed-but-not-coded** upper ladder: **L4 Signature, L5 Virtuoso, L6 Canon, L7 Grand Finale,
> L8 Redemption, L9 The gods.** It is the design reference a fresh session needs before building any of them.
>
> **Source of truth.** `docs/LADDER-MECHANICS.md` is authoritative for L4–L9 mechanics (mechanics only — *no
> tuning numbers*; those come from sims when each layer is built). `docs/STORY-SPEC.md` owns the narrative.
> This file *cross-checks both against the live code* and flags every place design and code DIVERGE.
>
> **Accuracy rule.** Everything here is either quoted from those docs or grounded in a `file:line` citation.
> Where a layer is "designed" the locked piece is the *mechanic + the axis it owns*; the *numbers are
> deliberately absent* and must not be invented.

---

## 1. The whole ladder at a glance

The arc of **axes** (each layer owns a genuinely new verb, never a reskin of a lower one) —
`LADDER-MECHANICS.md:8`:

> produce → economy → space/automation → **identity → mastery → permanence → convergence → gauntlet → bosses**

| Layer | Theme | Novel axis / mechanic | Status | Code reality |
|---|---|---|---|---|
| L1 Encore | foundation | tier production + Encore prestige | **built** | `performEncore` (`gameStore.ts`), full |
| L2 Magnum Opus | first work | parallel Records economy + Platinum + Opus tech tree | **built** | `performMagnumOpus` (`gameStore.ts:673`), full |
| L3 World Tour | the world | spatial venue ladder + touring loop + automates L1/L2 + challenges | **built** | `performTour` (`gameStore.ts:830`), full |
| **L4 Signature** | your voice | **Identity** — domain-alignment "class" + fixed Signature budget | **designed** | none (only a `signature` story beat + an `L4_UNLOCKED=false` gate flag) |
| **L5 Virtuoso** | mastery | **Mastery** — Perfect Take (bank area-under-a-consistency-curve) | **designed** | none (only a `virtuoso` story beat) |
| **L6 Canon** | immortalize | **Permanence** — The Palimpsest (accreting eternal score) | **designed** | none (only a `canon` story beat) |
| **L7 Grand Finale** | the triumph | **Convergence** — commit-drain voices, harmonic-mean, decrescendo | **designed** | ⚠️ a *different, placeholder* Grand Finale is LIVE (see §8 divergence) |
| **L8 Redemption** | the comeback | **Gauntlet** — 3 conditioned Finale re-climbs + growing Recognition | **designed** | none (only a `redemption` story beat) |
| **L9 The gods** | confrontation | **Bosses** — bent-reality fights, Signature-mirror, join the pantheon | **designed** | none (only a `the_gods` story beat) |

Source for the table: `LADDER-MECHANICS.md:41-51`. Story beats already registered as placeholders:
`src/components/story/beats.ts:78-134` (`signature`, `virtuoso`, `canon`, `grand_finale`, `redemption`,
`the_gods`).

### Build order (LOCKED)

`LADDER-MECHANICS.md:3-5`: **spec all → build sequential.** Each layer is fully *playable and balanced*
before the next is started. Mechanics are locked now; **tuning is per-layer at build time, driven by sims**
(the `sim/` suite). Do not batch-build the upper ladder.

---

## 2. The reset / persist model (the spine the upper ladder hangs on)

This is the single most important thing to internalise before touching L4+, because L8 (the Fall) and L9
(boss retries) are *defined by what survives them*.

### 2.1 The declarative model (design intent)

`LADDER-MECHANICS.md:10-14` defines the **M9 declarative-reset plan**: every state field has ONE `resetTier`
= the *deepest* prestige that wipes it; every shallower event **keeps** it. A prestige action is conceptually
`applyReset(state, tier)`. Reset events, shallow → deep:

> **Encore → MagnumOpus → Tour(L3 start) → Signature(L4) → Virtuoso(L5) → Canon(L6) →
> GrandFinale(L7, ONE-TIME) → Fall(L8)**

(Platinum is a non-reset *milestone*; L9 wins reset nothing.)

### 2.2 ⚠️ Code reality: there is NO `applyReset`/`resetTier` engine yet

The declarative `applyReset(state, tier)` is **design only**. The live code resets *imperatively*, one
hand-written reset object per prestige:

| Prestige | Function | Citation |
|---|---|---|
| Encore | `performEncore` | `gameStore.ts:626` calls `resetTiersAndSW(...)` |
| Magnum Opus | `performMagnumOpus` | `gameStore.ts:673`, spreads `resetTiersAndSW` at `:714` |
| (auto-MO path) | inline | `gameStore.ts:842` |
| World Tour | `performTour` | `gameStore.ts:830-871` |
| Grand Finale | `performGrandFinale` | `gameStore.ts:874-902` (⚠️ placeholder — see §8) |

The shared low-level reset is **`resetTiersAndSW(achievementIds, milestoneStrength)`** at
`gameStore.ts:60-89` — it rebuilds `soundwaves`, `tiers`, `tempo`, and applies head-start perks (warmup,
tempo-headstart, crescendo-headstart). Every prestige composes its own field-keeps/wipes around that core by
hand. **Building L4+ means either (a) writing the declarative `applyReset` engine the design assumes, or
(b) continuing the imperative pattern.** The design clearly wants (a) (it calls the matrix "the source of
truth; `applyReset` reads it" — `LADDER-MECHANICS.md:39`). This is a known piece of unbuilt scaffolding.

### 2.3 The RESET MATRIX (authoritative — `LADDER-MECHANICS.md:16-34`)

Rows that matter for the upper ladder. `⚠` = needs code-verification or a per-layer build decision; do **not**
invent — confirm against `gameStore` when that layer is built (`LADDER-MECHANICS.md:36`).

| Field(s) | resetTier (deepest wipe) | Upper-ladder relevance |
|---|---|---|
| soundwaves, tiers, crescendo, producedThisRun, tempoPurchasesThisRun | **run** (Encore+) | the active climb; wiped by every reset incl. the Fall |
| opusCount (catalogue counter) | **L4** ⚠ | KEPT across tours today (`performTour:850` carries `opusCount`); reset-at-L4 to be confirmed when L4 is built |
| lifetimeAcclaim | **L4** ⚠ | prod-mult that persists across tours; reset-at-L4 = decide at L4 build |
| currentVenue, components, keepAutobuyers, autoMO (venue ladder) | **L4** ⚠ | persist across tours; reset-at-L4 confirm at L4 build |
| completedChallenges (reward mults) | **L4** unless `keepChallenges` | per LAYER3-SPEC §2.8 |
| challengeBestTimes | **never** | skill record — **survives the Fall**; the L8 capstone recomputes from survivors |
| seenStoryBeats | **never** | story-seen flags; only `?fresh` wipes |
| **Signature allocation** (L4 identity) | **never** (identity record) | drives the **L9 Signature-mirror**; the *live production effect* resets with the layer, the *record* never does |
| **Mastery rank** (L5) | TBD at L5 build | permanent floor; **likely never** |
| **Palimpsest** `{top, ghosts[]}` (L6) | **never** | the eternal score — survives ALL resets **including the Fall** |
| finalePoints / performGrandFinale (L7) | **one-time** | NOT a repeatable prestige; fires once ⚠️ (code disagrees — §8) |
| **Recognition** (L8) | **never** (the gods' attention) | persists across comebacks + the Fall; *mortal* fame (Platinum etc.) resets each comeback |
| L9 claimed god-powers | **never** (boss-rush retry) | losing resets nothing; powers stack |

**The five DEEP-permanent rows are LOCKED** and are what L8/L9 are built on
(`LADDER-MECHANICS.md:37-39`): **Palimpsest, Recognition, Signature-identity, challenge best-times,
seen-beats.** The Fall (L8) keeps everything tagged `never` and resets the rest like a deep prestige.

---

## 3. L4 — Signature ("your voice") — AXIS: **Identity**

`LADDER-MECHANICS.md:55-76`. **Fantasy:** you stop being a performer and become an artist with a *voice*.

### 3.1 Core: domain alignment (a "class")

You align your Signature to instrument **domains** — which are *secretly the gods' domains* (the explicit L9
foreshadow: you've been embodying one all along; the `signature` story beat lands "Now you sound like… *one
of us*. / …Curious." — `beats.ts:82-86`). Each domain bends the *whole* build differently:

| Domain | Bends the build toward | (Maps to the L9 god — §8 of story) |
|---|---|---|
| Percussion | tempo/rhythm — fast ticks, timing | Timpana |
| Strings | sustain/crescendo — slow build, huge peaks | Lyra |
| Brass | raw output — brute production, fewer tricks | Clarion |
| Woodwinds | agility/efficiency — cheap, nimble, decay-management | Aeolia |
| Harmony | synergy — rewards balancing multiple tiers/mechanics | the Twins of Harmony |

(`LADDER-MECHANICS.md:62-67`.)

### 3.2 The fixed Signature budget (the actual mechanic)

- **One primary, blend the rest over time — via a finite "Signature budget"** (`LADDER-MECHANICS.md:68-72`).
  Your voice has a fixed expressive capacity, allocated across domains. **Mono = 100% in one** (intense,
  pure). Blends split the pie (60/40, etc.).
- **Zero-sum.** Secondaries are reduced *because they share the budget* — blending is always a real
  **specialist-vs-generalist trade-off, never free stacking.**
- ~~**The budget GROWS with progress.**~~ ⛔ **SUPERSEDED — the budget is FIXED (1.0).** LOCKED by
  `HARDENING-PLAN.md` (D-decisions) and `build-specs/L4-signature.md` §"fixed budget"; code agrees
  (`src/core/signature.ts` `SIGNATURE_BUDGET = 1`). What grows instead is **efficiency**
  (`getSignatureEfficiency(signatureCount)`, capped ~1.75) — every allocation's effects strengthen with
  ascensions, but the pie never gets bigger. Do not build budget-growth from this paragraph.
- **Respec between runs** (`LADDER-MECHANICS.md:73-74`): re-allocate each new L4 run. High build-craft
  replayability, no "wrong-choice" trap.

### 3.3 Reset / persist

- **Signature allocation → `resetTier: never`** as an *identity record* (drives the L9 mirror) — but the
  **live production effect resets with the layer** (`LADDER-MECHANICS.md:29`, `:75-76`).
- L4 is a reset layer: ascending past L4 resets the layers below per the matrix. The L4-tier progress
  (allocation + budget growth) persists.
- ⚠️ **The `⚠`-tagged rows in §2.3 are L4 build decisions:** whether `opusCount`, `lifetimeAcclaim`,
  the venue ladder, and `completedChallenges` reset *at L4*. Confirm against `gameStore` when building.

### 3.4 Build notes

- An **`L4_UNLOCKED` gate flag already exists in design** as the home for deferred L4 rewards. Per
  `docs/RECONCILE-PLAN.md:35-52` and `HANDOFF.md:8`, **Auto-Tour was reverted out of L3 and gated behind
  `L4_UNLOCKED=false`** — it is an L4 reward (LAYER3-SPEC §1.5: "each layer automates the one below"). So L4
  inherits "automate L3 (touring)" as a baseline reward on top of the identity axis. The auto-tour code is
  written but dead until L4 flips the flag.

---

## 4. L5 — Virtuoso ("Perfect Take") — AXIS: **Mastery (scoring the shape of a curve)**

`LADDER-MECHANICS.md:80-99`. **Fantasy:** mastery = *the take with no wrong notes.* New axis = **scoring the
shape of a curve (evenness over time)** — the first layer that inverts L1–L4's brute-maximize instinct.

### 4.1 The mechanic

- Start a **Take** (a continuous performance). A live **Virtuosity meter** rises **only while production
  stays in-tempo** — actual output held inside a **target band**. Spiking too high *or* going dark/idle drops
  you out the top/bottom of the band.
- **Breaking tempo NEVER resets — it only CAPS** the current multiplier until you re-stabilise. (No punitive
  wipe; this is core to the idle-friendliness.)
- **End-of-take banks the integral of the meter over time** (total area under the curve) — so a long, *even*
  performance beats a short spiky one. **Area-under-consistency-curve is the scored quantity.**
- Banked Takes raise a **permanent Mastery rank** that lifts the meter's **idle floor** and slowly widens the
  skill ceiling.

### 4.2 Idle-safe by construction (the "height-decay" piece)

- The band **auto-widens while away** (the timestamp-driven band-widening function — the only subtle build
  piece, `LADDER-MECHANICS.md:96`), so idlers always sit in-tempo at a **low band**: a slow-but-safe trickle.
- The **permanent floor** (from Mastery rank) guarantees a real baseline. Active play rides a **tight** band
  for far more area.
- **Decay is to a non-zero floor — never zero, never a gate, no clicking required**
  (`LADDER-MECHANICS.md:90-91`). This is the "idle height-decay": the meter sags toward the floor when away
  but cannot bottom out.

### 4.3 Reset / persist

- **Banked Takes / Mastery rank → permanent floor;** `LADDER-MECHANICS.md:30` marks Mastery rank
  **TBD at L5 build, likely `never`.** The in-take live meter is transient/re-earnable.

### 4.4 Distinctness (why it is a true new axis) & open tuning

- Nothing else scores **evenness / curve-shape** (`LADDER-MECHANICS.md:92-95`). Explicitly **NOT** L3's
  self-handicap toggles (it scores a *self-generated output signal*, no constraint plumbing), **not** L4's
  budget allocation, and **opposite temporality to L6** (transient/re-earnable vs permanent).
- *Rejected runner-up:* **Rubato** (a time↔power tempo dial) — heaviest build + flirts with L3's
  manipulate-lower-layers axis.
- **Open tuning knob (build-time, `LADDER-MECHANICS.md:97-99`):** what "in tempo" means — *hold a flat steady
  rate* vs *grow smoothly* (spikes/stalls are the sin, not growth). **Leaning grow-smoothly** (more natural
  for an idle game). **The SOUL is locked: L5 rewards control/consistency.**
- Build: all scalar Zustand state; only subtlety is the band-widening timestamp function.

---

## 5. L6 — Canon ("The Palimpsest") — AXIS: **Permanence (accrete-by-overwrite)**

`LADDER-MECHANICS.md:101-116`. **Fantasy:** immortalise your legacy into one eternal manuscript. New axis =
**accrete-by-overwrite into permanent sediment.** This is **the first truly permanent layer.**

### 5.1 The mechanic

- One eternal score: **`{ top: Work, ghosts: Work[] }`** that **survives ALL deeper resets** (including the
  Fall).
- **Payout:** the **top** Work pays full bonus; each **ghost** pays `base × decay^depth` — fainter the
  deeper, but **never zero** (it's canon, it can't fully die). **Permanent bonus = `top + Σ ghosts`,
  forever** (`LADDER-MECHANICS.md:104-106`).
- A **Work** snapshots a peak you hit (e.g. peak multiplier at canonize-time).
- **Canonizing** a new Work puts it on top at full strength and **sinks** the old top a level — everything
  below sinks deeper and decays more.

### 5.2 The one decision

`LADDER-MECHANICS.md:109-111`: ride a strong top Work for full live bonus **now**, or **sink it** — locking a
smaller-but-eternal fraction and freeing the top for a bigger peak. **Order matters** (depth sets decay).
**Pure-idle payout** — the stack pays passively forever and only grows.

### 5.3 Reset / persist & composition

- **Palimpsest `{top, ghosts[]}` → `resetTier: never`** (`LADDER-MECHANICS.md:31`). Survives every reset,
  the Fall included.
- **Composes with L7:** the accreted score is the *reservoir* L7's Final Performance *discharges*
  (`LADDER-MECHANICS.md:112`).
- *Rejected runner-up:* **Movements of a Symphony** (permanence by sequencing/ordering) — bolder verb but
  needs a reorder UI + flirts with idler-unfriendly penalties.
- **Build: lowest-risk layer** — pure data; canonize = `unshift` + recompute; one-line production reducer;
  persists by *not being wiped*. Tuning (what a Work snapshots, canonize gating, decay rate) is build-time.

---

## 6. L7 — Grand Finale ("The Final Performance, decrescendo") — AXIS: **Convergence (reward EVENNESS, not magnitude)** — HYBRID

`LADDER-MECHANICS.md:118-134`. **Fantasy:** the pure triumph / the apparent end. New axis = **reward
evenness, not magnitude** — inverts the whole game's maximize-one-number instinct. **ONE-TIME**, not a
repeatable prestige.

> ⚠️ **This is the layer with the biggest design↔code gap. The currently-shipping `performGrandFinale` is a
> placeholder that implements a *completely different, older* mechanic. See §8.** The description below is
> the **locked forward design** (what L7 must become), not what runs today.

### 6.1 The mechanic (locked forward design)

- Each layer **L1–L6 is a voice on a mixing board.** You **permanently commit (silence) them one at a time.**
  Committing a voice **freezes its output and drains its hoarded stockpile** into one rising **Performance
  meter.** (This *merges* two earlier ideas: "Final Performance" commit-voices + "One Last Breath"
  drain-to-zero — `LADDER-MECHANICS.md:122-123`.)
- **Final payoff is a HARMONIC MEAN of the committed channels** — so **six balanced voices vastly outscore
  one giant + five tiny** (`LADDER-MECHANICS.md:124-125`). This is the red-team-revised scoring: the axis is
  *balance/evenness of the committed voices*, scored by harmonic mean.
- ⚠️ **RED-TEAM REVISION — score TIMING / the decrescendo SEQUENCE, NOT magnitude-evenness.** A single
  **decrescendo / tempo knob** shapes the pour (loud-short vs slow-quiet-higher); the empire goes silent
  voice by voice. The harmonic-mean-of-committed-channels is the structural backbone; the *graded skill
  expression* is **how you sequence and time the decrescendo of the pour**, not merely how even the
  magnitudes are. (`LADDER-MECHANICS.md:124-127` + the red-team note that the scored verb is the
  *decrescendo sequence/timing*, distinguishing L7's skill from a static evenness check.)
- The empire fades to **zero**, then a **Standing Ovation + fake credits** — with the "applause still faintly
  ticking" **ember** leading into the **L8 fall** (`LADDER-MECHANICS.md:126-128`).

### 6.2 The LOCKED twist: clean triumph

`LADDER-MECHANICS.md:129-131`: **ZERO adversity here** — no automation-stripping, no re-climbs (**that DNA is
L8's**). The rug-pull is *deferred to L8*; keeping the triumph clean and dropping the rug AFTER it hits harder
(`STORY-SPEC.md:62-66`). Distinct from L4: L7 is **permanent irreversible commits of frozen whole-layer
outputs**, not a live respec-able budget.

### 6.3 Reset / persist

- **`performGrandFinale` → `resetTier: one-time`** (`LADDER-MECHANICS.md:32`): it is **NOT a repeatable
  prestige; it fires once.** It draws on the L6 Palimpsest reservoir, and its commit is irreversible.
- *Runner-up folded in:* "One Last Breath" decrescendo spend-down (gave it the drain + tempo knob).
- **Build: trivial** *as forward-designed* — read existing per-layer outputs, store committed fractions,
  harmonic-mean formula, one meter + a credits/ember component (`LADDER-MECHANICS.md:133-134`). The work is
  *replacing* the placeholder (§8), not green-field.

---

## 7. L8 — Redemption ("the Gauntlet") — AXIS: **Gauntlet (conditioned re-climbs + growing Recognition)**

`LADDER-MECHANICS.md:136-147`. **Fantasy:** the fall (hiatus / a flop), then the gods' "Come" — prove the
first time was no accident. The `redemption` story beat ends: *"Rise. Show us the first time was no accident.
Come."* (`beats.ts:114-123`).

### 7.1 The mechanic

- **The fall:** accepting **"Come"** triggers a **deep reset (Finale-reset-like)** — **but permanence stays**
  (the L6 Palimpsest) and a new **Recognition** stat carries your name forward
  (`LADDER-MECHANICS.md:138-140`). Per the matrix the Fall keeps everything tagged `never` and resets the
  rest (`LADDER-MECHANICS.md:38`): challenge best-times, seen-beats, Signature-identity, Palimpsest, and
  Recognition all survive; *mortal* fame (Platinum etc.) resets each comeback (`LADDER-MECHANICS.md:33`).
- **The gauntlet:** re-climb the whole ladder to the Grand Finale **3 times** — *rule of three:* fall →
  comeback 1 → comeback 2 → **triumphant 3rd that earns the gods** — each under a **NEW authored
  comeback-condition** (`LADDER-MECHANICS.md:141-144`). Conditions are narrative industry-adversity, escalating
  (e.g. "the world forgot you" = reduced start; "critics circle" = harsher gates).
- Built on the **existing constraint ENGINE** (the L3 challenge machinery) **but DISTINCT from L3's
  side-challenges** — these are the **redemption story**, not optional content (`LADDER-MECHANICS.md:144-145`).
  **It is reactive/authored, NOT an L3 reskin.**

### 7.2 Recognition (the "recognized = faster" mechanic)

`LADDER-MECHANICS.md:146-147`: a **multiplier that GROWS each comeback and persists across the re-climbs**
(plus L6 permanence) — so each climb is **faster even as the conditions harden.** A **tightening race: faster
you vs harder conditions.** Clearing all three earns the L9 audience.

### 7.3 Reset / persist

- **Recognition → `resetTier: never`** (`LADDER-MECHANICS.md:33`) — the gods' attention; persists across
  comebacks and the Fall.
- Each comeback is a deep reset that keeps only the `never` rows; the gauntlet's job is to make those
  permanents (Recognition growth + the Palimpsest) outrun the escalating conditions.

---

## 8. ⚠️ KNOWN DIVERGENCE — the shipping "Grand Finale" is a placeholder for a DIFFERENT mechanic

This is the single most important divergence in the upper ladder. A fresh session **must not** mistake the
live code for the L7 design.

### 8.1 What the code does today

`gameStore.ts:873-902`, `performGrandFinale`:

- Comment literally labels it **"Prestige Layer 6: Grand Finale (the 'infinity' at 1.79e308, resets EP+OP)"**
  (`gameStore.ts:873`).
- It is **repeatable**: gated only on `soundwaves >= GRAND_FINALE_SW_THRESHOLD`
  (`= 1.79e308`, `src/core/constants.ts:160`) and `layer1WallReached`, with a `noPrestige`-challenge guard
  (`gameStore.ts:877-887`).
- On fire it does a deep tier/SW/EP/OP reset and increments **two counters**:
  `finalePoints: state.finalePoints + 1` and `finaleCount: state.finaleCount + 1` (`gameStore.ts:899-900`).
- `finalePoints` feeds a **flat repeatable production multiplier**: `getFinaleMultiplier(fp) =
  10^fp` (`src/core/formulas.ts:180-182`), applied in the production chain at `formulas.ts:233`.
- `finalePoints`/`finaleCount` drive **era 6 theming** and liveliness (`src/core/eraTheme.ts:12-15`,
  `formulas.ts:190-192`, `ComposePage.tsx:70-72`) and several achievements
  (`achievements.ts:731,740,749,2276`).

### 8.2 What the L7 design requires (this file, §6)

A **one-time** convergence event: commit/silence L1–L6 voices, drain their stockpiles into one Performance
meter, score the **harmonic mean of committed channels** with skill expressed via the **decrescendo
sequence/timing**, end in **fake credits + an ember** into L8. **No repeatable `finalePoints` multiplier
exists in the design.**

### 8.3 Root cause (it's a deliberate, documented placeholder, not a bug)

`HANDOFF.md:104` records the **OLD ladder model** that this code was built against:

> Ladder: Encore → Magnum Opus → **World Tour(L3)** → Signature(L4) → Virtuoso(L5) → **Grand
> Finale(L6=END)**; L7 reserved.

`STORY-SPEC.md:49` then **revised** the ladder ("supersedes the old '6-layer, Finale = end'"), inserting
**Canon as a new L6** and moving **Grand Finale to L7** (`STORY-SPEC.md:55-59`), with Redemption (L8) and the
gods (L9) added. The current `performGrandFinale` is the **leftover L6=END infinity-prestige** from before
that revision — it functions today as a high-end repeatable prestige cap, holding the slot until the real L7
is built.

### 8.4 What a builder must do at L7

1. **Decide the fate of `finalePoints`/`finaleCount`/`getFinaleMultiplier`** — these are *not* in the L7
   design. Either migrate them out or repurpose. They are load-bearing for **era-6 theme**, **liveliness**,
   and **4 achievements** (`achievements.ts:731,740,749,2276`) — none of those can silently break.
2. **Rebuild `performGrandFinale` as the one-time commit-drain-voices event** (§6), reading L1–L6 outputs +
   the L6 Palimpsest reservoir.
3. **Insert the real L6 (Canon) below it** — there is currently *no* Canon layer in code at all.
4. Wire the **fake-credits + ember → L8 fall** sequence (`STORY-SPEC.md:62-68,110-111`).

> Note the naming collision risk: code constants/fields say **"finale"/"Layer 6"**; the design says Grand
> Finale = **L7** and Canon = **L6**. Treat code identifiers named `finale*` as the *placeholder*, not the
> designed L7.

---

## 9. L9 — The gods ("the Bosses") — AXIS: **Bosses (bent-reality fights)**

`LADDER-MECHANICS.md:149-161`. **Fantasy:** confront the **pantheon** — **Lyra / Aeolia / Clarion / Timpana +
the Twins of Harmony + the Maestro.** The `the_gods` beat: *"You fell, and rose again. Now you know our faces.
Stand with us."* (`beats.ts:125-134`). Names are **revealed only at L8/L9** — none appear earlier
(`STORY-SPEC.md:19,23`).

### 9.1 The fight: a reality with bent rules

Each fight is **a reality where the rules warp toward what that god rules** (AD-Celestials lineage, escalated
L3-challenge DNA — `LADDER-MECHANICS.md:151-154`). Hit a goal **under that warp** to defeat the god and
**claim that domain's power**:

| God | Domain warp |
|---|---|
| Timpana | all rhythm / tempo |
| Lyra | all sustain |
| Clarion | raw power |
| Aeolia | breath / decay |
| the Twins of Harmony | two-phase consonance/dissonance fight |
| the Maestro | the conductor who commands **all** domains |

This is **reactive, not a static challenge** — a **boss-FSM** ("bent-reality boss-FSM"): each god is a
state-machine fight, not an L3 toggle.

### 9.2 The Signature mirror (the L4 payoff)

`LADDER-MECHANICS.md:155-156`: **the domain you most embodied in L4 is your HARDEST fight** — you face
yourself / your patron ("you've been channeling me all along"). This is *why* the L4 Signature **allocation
is a `never`-tier identity record** (§3.3): it must survive every reset down to L9 to drive the mirror. This
is the single hardest cross-layer dependency in the whole ladder — **L4 and L9 are coupled by the Signature
record.**

### 9.3 Sequencing & the ending

- Face the **5 domain-gods in ANY ORDER**; the **Maestro unlocks LAST** as the true final fight
  (`LADDER-MECHANICS.md:157-158`).
- **Ending:** beat the Maestro → **you join the pantheon**, become the newest god of music. *"Stand with us,"*
  fulfilled — the true completion (`LADDER-MECHANICS.md:159-160`).

### 9.4 Reset / persist

- **L9 claimed god-powers → `resetTier: never`** (`LADDER-MECHANICS.md:34`): it's a **boss-rush retry** —
  *losing resets nothing; powers stack.* Reactive, low-stakes-per-attempt, learn-and-retry.

### 9.5 Build state

- Mechanics framework is **locked**; **per-god goals/rewards are an explicit later pass before building L9**
  (`LADDER-MECHANICS.md:161`). Nothing is coded.

---

## 10. Cross-layer dependency map (what a builder must respect)

| Lower layer produces… | …consumed by | Why it must persist |
|---|---|---|
| **L4 Signature allocation** (record) | **L9** Signature-mirror (hardest fight = most-embodied domain) | `never`-tier identity; couples L4↔L9 (§9.2) |
| **L6 Palimpsest** (eternal score) | **L7** Final Performance = the reservoir it discharges; survives **L8** Fall | `never`-tier; the permanence the Fall preserves (§5.3, §7.1) |
| **L5 Mastery rank** | L5 idle floor | likely `never`; permanent baseline (§4.3) |
| **L8 Recognition** | each L8 comeback (faster climbs); earns **L9** audience | `never`; the "tightening race" engine (§7.2) |
| **challenge best-times** | L8 capstone recompute | `never`; "survives the Fall" (§2.3) |
| L3 **auto-tour** (built, dead) | **L4** reward (`L4_UNLOCKED`) | gated out of L3 per RECONCILE-PLAN (§3.4) |

**Golden rule for the next builder** (`LADDER-MECHANICS.md:36-39`): the `⚠` rows are *decisions*, not facts —
verify them against `gameStore` and decide *at that layer's build*. The five `never` rows are *locked* and
are exactly what L8/L9 stand on. Do not invent tuning numbers; they come from `sim/` when the layer is built.

---

## 11. Source citations index

- **Mechanics (authoritative):** `docs/LADDER-MECHANICS.md` — reset matrix `:10-39`, layer table `:41-51`,
  L4 `:55-76`, L5 `:80-99`, L6 `:101-116`, L7 `:118-134`, L8 `:136-147`, L9 `:149-161`.
- **Narrative:** `docs/STORY-SPEC.md` — revised ladder `:49-68`, beats `:86-101`, future world-building
  `:110-111`; gods/names reveal `:19,23,36`.
- **Story beats (code):** `src/components/story/beats.ts:78-134`.
- **Reset code:** `src/store/gameStore.ts` — `resetTiersAndSW` `:60-89`, `performMagnumOpus` `:673`,
  `performTour` `:830-871`, `performGrandFinale` (⚠ placeholder) `:874-902`, `partialize` `:918-931`.
- **Placeholder L7 plumbing:** `getFinaleMultiplier` `src/core/formulas.ts:180-182` (used `:233`);
  `GRAND_FINALE_SW_THRESHOLD` `src/core/constants.ts:160`; era/liveliness `src/core/eraTheme.ts:12-15`,
  `formulas.ts:190-192`; achievements `src/core/achievements.ts:731,740,749,2276`.
- **Divergence context:** `HANDOFF.md:104-105` (old 6-layer model), `docs/RECONCILE-PLAN.md:35-52` +
  `HANDOFF.md:8` (Auto-Tour → `L4_UNLOCKED`).
