# L8 Redemption — "the Gauntlet" — IMPLEMENTATION-READY BUILD-SPEC

> **Status:** build-spec for a FRESH session. Mechanic **LOCKED**; magnitudes deliberately **TBD — decide-at-build (sim/playtest)**.
> **Read first (design):** `docs/LADDER-MECHANICS.md:136-147` (L8 locked mechanic), `docs/STORY-SPEC.md:94-100` (the fall + "Come"), `docs/bible/04-forward-design-L4-L9.md:290-323` (L8 design cross-checked vs code), `docs/HARDENING-PLAN.md` (B2 Recognition form, the LOCKED L8 sim invariant; decision 2 = "growing debuff you buy down").
> **Read first (architecture):** `src/core/tick.ts`, `src/core/formulas.ts:206` (`getCoreProductionMultiplier`), `src/core/challenges.ts` (the constraint ENGINE L8 reuses), `src/store/gameStore.ts` (the `perform*` reset fns + `performGrandFinale:880`), `src/store/initialState.ts`, `src/store/saveMigration.ts` + `saveSchema.ts`, `sim/l3-pacing.test.ts` (harness pattern).

---

## 0. Hard dependencies — what MUST exist before L8 is built

L8 is **the second-to-last layer** and leans on scaffolding that **does not exist yet** as of `feat/layer3`. Do **not** start L8 until these are real:

| Dependency | Why L8 needs it | Current state (verified) |
|---|---|---|
| **L7 Grand Finale = the real one-time commit-drain event** | The Fall is defined as "Finale-reset-like." A comeback's *terminal goal* is "re-reach the Grand Finale." If L7 is still the placeholder repeatable `finalePoints` prestige, there is no "reach the Finale" event to gate a comeback on. | ⚠️ **NOT built.** The shipping `performGrandFinale` (`gameStore.ts:880-908`) is the **old L6=END repeatable infinity-prestige** (`finalePoints += 1`, `getFinaleMultiplier = 10^fp` at `formulas.ts:180`). See `04-forward-design-L4-L9.md:326-381`. |
| **L6 Canon / the Palimpsest** `{top, ghosts[]}` | The single permanent the Fall *preserves* and the thing that makes re-climbs progressively faster alongside Recognition. L8's "permanence stays" clause is literally the Palimpsest. | ⚠️ **NOT built.** No Canon layer in code; only a `canon` story beat. |
| **M9 multiplier-registry + declarative `applyReset(state, tier)`** | The Fall is a `tier: 'fall'` reset that keeps every `never`-tagged field. Recognition contributes a *separate channel* to the registry (NOT a raw global ×). Today resets are hand-written per-prestige and there is **no registry**. | ⚠️ **NOT built.** `grep` for `applyReset`/`resetTier`/`registry` finds only `resetTiersAndSW` (`gameStore.ts:60`) and a comment in `beats.ts:78`. The HARDENING worklist scoped M9 to "the L4 session"; **confirm it landed** before L8 — if not, build it as part of L4/L5, not here. |
| **L4 Signature allocation as a `never` identity record** | Not consumed by L8 directly, but the Fall must keep it (it drives the L9 mirror). L8's `applyReset('fall')` must list it under "keep." | ⚠️ Not built (L4 unbuilt). |
| **The constraint ENGINE** (`ChallengeModifiers` + `getActiveChallengeModifiers`) | L8's comeback-conditions are authored debuffs expressed as challenge modifiers. This **does** exist and is reused. | ✅ **Built** (`src/core/challenges.ts:154-231`, applied in `tick.ts:36-191`). |

> **Build-order note (`LADDER-MECHANICS.md:3-5`, LOCKED):** spec-all → build-sequential. L8 is built **after** L4→L5→L6→L7 are each playable+balanced. This spec assumes that order; every "depends on" above will be real by then **except** you must still verify M9 actually shipped.

---

## 1. Overview — the axis + the story beat it embodies

**Axis (new verb): the Gauntlet — outrun a *growing, compounding* debuff using a permanent stat you grow each attempt.** This is categorically distinct from L3 (race a *static* single-constraint run) and L9 (a *reactive* boss that changes phase in response to you). L8 is a **tightening race**: a debuff that gets *worse every comeback* vs a **Recognition** stat that makes you *faster every comeback*. (`HARDENING-PLAN.md` decision 2: "L8 = race a GROWING debuff you buy down with Recognition.")

**The story beat it IS (LOCKED — `STORY-SPEC.md:94-100`, beat `redemption` at `beats.ts:114-123`):**
> Then: silence. / The records gather dust. The world forgets your name. / …But the applause never stopped. / It was never theirs. It was *ours*. / **Rise. Show us the first time was no accident. Come.**

The **mechanic IS that beat made playable** (the LOCKED first principle):
- *"The world forgets your name"* → the **Fall** wipes mortal fame (Platinum, records, acclaim, the climb) — a deep reset.
- *"The applause never stopped — it was ours"* → **Recognition** (the gods' attention) persists across the Fall. It is the one thing the gods keep watching; it does not reset.
- *"Show us the first time was no accident"* → **3 conditioned re-climbs** (rule of three: fall → comeback 1 → 2 → the triumphant 3rd that earns the gods), each under a **NEW authored, escalating comeback-condition**.
- The **gold→black pivot** (`STORY-SPEC.md:67-68`): the `redemption` beat is `goldLevel: 0.12` — the orb nearly snuffed; clearing the gauntlet fights it back to a flicker; L9 is the cold point.

**Framing (LOCKED — `HARDENING-PLAN.md` L8 revision):** the Fall must be **explicit + previewed + framed as a postgame campaign**, never a surprise punishment after fake credits. The player *accepts "Come"* — they opt in. The rug-pull narrative lands at L7's ember → L8's beat, but the *mechanical* reset is a button the player presses with full preview of what they keep/lose.

**Idle-first (LOCKED principle 2):** every comeback goal is **reachable by passive accrual**. The debuff changes the *math/pacing* of the idle climb; it never demands APM. Active conducting amplifies ≈1.4–1.75× (consistent with the rest of the game) but is never required. The 30–60s comeback floor (below) is an *idle* floor.

---

## 2. New state (fields + types + resetTier + saveMigration)

All new fields live on `GameState` (`src/store/types.ts`) and `createInitialState()` (`src/store/initialState.ts`). Add a save-migration entry (§2.3).

### 2.1 Field table

| Field | Type | Initial | resetTier (per the matrix) | Notes |
|---|---|---|---|---|
| `redemptionUnlocked` | `boolean` | `false` | **never** | True once L7 Grand Finale is completed (the Fall becomes *offerable*). Gate flag, like `worldTourUnlocked`. |
| `fallAccepted` | `boolean` | `false` | **never** | True once the player presses "Come" the first time. Distinguishes "postgame entered" from "still in mortal game." |
| `comebackIndex` | `number` (0–3) | `0` | **never** | Which comeback you are ON. `0` = pre-fall / not started; `1,2,3` = the three re-climbs; `3`-cleared = gauntlet complete → L9 audience earned. |
| `comebacksCleared` | `number` (0–3) | `0` | **never** | How many comebacks fully cleared. `=== 3` ⇒ `canEnterL9 = true`. The headline progress counter. |
| `recognition` | `number` | `0` | **never** (the gods' attention — `LADDER-MECHANICS.md:33`) | The permanent additive stat. Grows each comeback clear. Feeds the **Recognition channel** (§3.3), NOT a raw global ×. **Does NOT feed L9** (`HARDENING-PLAN.md` B2 — LOCKED). |
| `recognitionSpent` | `number` | `0` | **never** | How much Recognition has been allocated to *buying down* the active comeback's debuff (§3.4). Persists so a re-entered comeback remembers its buy-downs. **TBD — decide-at-build:** whether buy-downs reset per comeback or carry (lean: reset per comeback so each is a fresh race; carrying makes later ones trivial). |
| `comebackBestTimes` | `Record<number, number>` (comebackIndex → ms) | `{}` | **never** (a skill record, like `challengeBestTimes`) | Time to clear each comeback. Feeds the LOCKED sim invariant (`time[1] > [2] > [3]`) and any capstone. |
| `activeComebackStartTime` | `number` (epoch ms) | `0` | **never** | When the current comeback began (for the best-time + the "≥30–60s floor" assertion). `0` = not in a comeback. |

> **Why all `never`:** the entire L8 progress layer is *the postgame campaign state*. The Fall (`tier: 'fall'`) is the deepest reset and it **keeps everything tagged `never`** (`LADDER-MECHANICS.md:38`). L8's own fields are the meta-progress of the gauntlet itself — they must survive every comeback's deep reset (each comeback *is* a fall-style reset of the layers below). This mirrors how `challengeBestTimes` and `seenStoryBeats` are `never`.

### 2.2 What the Fall reset (`applyReset(state, 'fall')`) keeps vs wipes

The Fall is the deepest reset event (`LADDER-MECHANICS.md:13`). Per the matrix:

- **KEEPS (tagged `never`):** Palimpsest `{top, ghosts[]}`, Recognition + all §2.1 L8 fields, Signature allocation (identity record), `challengeBestTimes`, `seenStoryBeats`, L5 Mastery rank (likely `never`), L9 god-powers. (`LADDER-MECHANICS.md:27-34`.)
- **WIPES (like a deep prestige — everything shallower than `fall`):** soundwaves/tiers/tempo/crescendo (run), encore layer, opus layer, **mortal fame** (recordsSold→0, platinum→false, acclaim/lifetimeAcclaim→0), venue ladder + components + autobuyers, the live Signature *production effect*, the live L5 take, the L7 committed-voice state. *"The world forgets your name"* (`STORY-SPEC.md:96`) ⇒ Platinum/records/acclaim reset **each comeback** (`LADDER-MECHANICS.md:33`).

> **Implementation:** this is exactly why M9's declarative `applyReset(state, tier)` must exist. Each comeback transition calls `applyReset(state, 'fall')` which reads the `resetTier` table and wipes everything with `resetTier` shallower than `fall`, keeping `never`. **Do NOT hand-write another reset object** — extend the registry. If M9 did not ship, that is a blocker, not an L8 task (§0).

### 2.3 Save-migration step

`saveMigration.ts` uses a numeric `SAVE_SCHEMA_VERSION` + ordered `MIGRATIONS[]` (`saveMigration.ts:151-164`). To add L8 fields:

1. Bump `SAVE_SCHEMA_VERSION` in `src/store/saveSchema.ts` (currently `1` → next free integer).
2. Add a `MIGRATIONS[n]` entry that is a **no-op for the new scalar/boolean fields** — they are covered automatically by `applyUndefinedDefaults` (`saveMigration.ts:132-139`) once added to `createInitialState()`. (Old saves simply get the initial values.)
3. `recognition`, `recognitionSpent`, `comebackIndex`, `comebacksCleared` are **plain numbers** and `comebackBestTimes`/`recognition`-records are plain objects → **no Decimal revival needed** (Recognition is additive+capped and stays small; see §3.3). **Do NOT add them to `TOP_LEVEL_DECIMAL_KEYS`.** Add `comebackBestTimes` to the `FALSY_DEFAULT_KEYS` list (`saveMigration.ts:36-47`) so a missing object becomes `{}` (mirrors `challengeBestTimes`).
4. Add the L8 fields to `createInitialState()` (`initialState.ts`) with the §2.1 initials.

---

## 3. The mechanic in detail (formulas / algorithm + the M9 channel it uses)

### 3.1 The Fall (entering the gauntlet)

- **Offered** when `redemptionUnlocked` (set true on L7 Grand Finale completion). The L7 ember → the `redemption` story beat fires (`beats.ts:114`), then a **preview panel** (§4) shows exactly what the Fall keeps/wipes.
- **Accepted** via a `acceptCome()` store action (new, sibling to `performGrandFinale`):
  ```
  acceptCome():
    if (!redemptionUnlocked || fallAccepted) return   // one-time entry
    applyReset(state, 'fall')                          // M9 declarative reset (keeps `never`)
    set fallAccepted = true
    set comebackIndex = 1
    set comebacksCleared = 0
    set recognitionSpent = 0
    set activeComebackStartTime = Date.now()
    // recognition stays whatever it was (0 on first fall)
    apply comeback-condition #1 (§3.5)
  ```
- After this you are **in comeback 1**, climbing the *whole ladder again* (L1→…→L7) under condition #1, with whatever permanence (Palimpsest, Recognition) you carry.

### 3.2 Comeback loop (the gauntlet)

A comeback is **cleared** when you re-reach the **Grand Finale completion** (the real L7 one-time event — §0 dependency) **while the comeback-condition is active**. On clear:
```
onComebackClear(i):
  record comebackBestTimes[i] = Date.now() - activeComebackStartTime
  comebacksCleared = i
  recognition += recognitionGain(i)            // §3.3 — the permanent grows
  fire the per-comeback story beat (§5)
  if (i === 3):
     canEnterL9 = true                          // gauntlet complete → L9 audience
     // do NOT auto-fall; player has earned the gods
  else:
     comebackIndex = i + 1
     recognitionSpent = 0                        // (TBD — see §2.1 note)
     activeComebackStartTime = Date.now()
     applyReset(state, 'fall')                   // deep reset again, keep `never`
     apply comeback-condition #(i+1) (§3.6)
```
**Rule of three is LOCKED** (`LADDER-MECHANICS.md:141`): exactly 3 comebacks. Do not parameterize this to N without a design pass.

### 3.3 Recognition — the permanent stat (LOCKED form: additive + capped, separate channel)

Per `HARDENING-PLAN.md` B2 (**LOCKED**): **Recognition = `1 + r·comebacks`, capped at 3 comebacks. It does NOT feed L9.**

- **As a stored stat,** `recognition` accumulates a per-comeback gain. The *production effect* is the registry channel value:
  ```
  recognitionMult = 1 + RECOGNITION_PER * min(comebacksCleared, RECOGNITION_COMEBACK_CAP)
  ```
  - `RECOGNITION_COMEBACK_CAP = 3` (LOCKED — the rule of three is the cap; Recognition cannot grow past the 3rd clear).
  - `RECOGNITION_PER` = **TBD — decide-at-build (sim/playtest)**. It must satisfy the LOCKED sim invariant (§6): each comeback faster than the last, none instant, none a wall.
- **It is a SEPARATE multiplier channel (LOCKED principle 3 + B3), NOT a new raw global ×.** Register it with M9 as:
  ```
  { source: 'recognition', value: recognitionMult, channel: 'recognition', appliesToProduction: true }
  ```
  Wire it into the production funnel as a **distinct factor** alongside the existing chain in `getCoreProductionMultiplier` (`formulas.ts:232-243`) — add one `.times(p.recognitionMult ?? 1)` term, fed from the registry, the same way `acclaimMult` is threaded (`tick.ts:85-101`). It is **scoped to the gauntlet** (only nonzero when `comebacksCleared > 0`), so it never inflates the mortal game.
  > **Why a channel, not a pile-on (B3):** production is already one multiplicative funnel (achievements ×~3.57, Acclaim ≤×49, challenges ×5.6–11.2). Recognition being additive+capped (max ≈ `1 + 3·RECOGNITION_PER`) keeps the funnel bounded. Because it is capped at 3 comebacks and the gauntlet *is* exactly 3 comebacks, Recognition's total contribution is hard-bounded by construction.
- **Recognition does NOT feed L9** (LOCKED, B2). L9 stands on god-powers + the Signature mirror, not on Recognition. Do not pass `recognitionMult` into any L9 boss math.

### 3.4 Buying down the debuff with Recognition (the "buy-down")

The locked axis is **"a GROWING/COMPOUNDING debuff you buy down with Recognition"** (`HARDENING-PLAN.md` decision 2). Two roles for Recognition, distinct from L3's static rewards:

1. **Passive speed** (§3.3): Recognition makes the whole re-climb faster (the production channel).
2. **Active buy-down** (this section): within a comeback you can **spend Recognition** (`recognitionSpent`) to *soften the active condition* — e.g. reduce the debuff's growth rate or its current magnitude. This is the player-facing verb that makes Recognition feel like *agency*, not just a passive number.

```
effectiveDebuff(i, elapsedSec, recognitionSpent):
   raw = comebackCondition[i].debuffAt(elapsedSec)          // a COMPOUNDING debuff (§3.5)
   reduction = buyDownReduction(recognitionSpent)            // monotone, diminishing-returns
   return softenDebuff(raw, reduction)                       // never fully cancels (floor)
```
- The buy-down must have **hard diminishing returns** and a **floor** (you can never fully erase the condition — that would remove the race). **Magnitudes TBD — decide-at-build (sim/playtest).**
- **Decision (LOCKED principle):** Recognition spent on buy-downs does *not* reduce `recognition` (the production stat) — model `recognitionSpent` as a separate ledger so the two roles don't cannibalize. (Or, TBD: a shared pool where spending trades passive speed for debuff relief — a real decision. **Lean: separate ledgers** so the player isn't punished for engaging.)

### 3.5 The compounding debuff (distinct from L3's static challenges)

**This is the heart of the new axis and what makes L8 ≠ L3.** L3 challenges are *static* single-constraint runs (`challenges.ts:247-380`, e.g. fixed ×10 cost). L8's conditions **grow over the comeback** — they compound with elapsed time (or with progress), so a slow idler feels the squeeze tighten, and Recognition is the counter-pressure.

The constraint ENGINE already supports a **time-compounding** modifier: `risingCosts` (`challenges.ts:17`, `mods.risingCostRate`, applied in `tick.ts:116-120` as `risingCostFactor = rate^elapsedSec`). **L8 conditions are authored on top of this engine** but are *narrative, escalating, and growing*, not the optional static L3 set.

- **Express each comeback-condition as a `ChallengeModifiers`-shaped authored debuff** (reuse the type; do NOT reuse the L3 `CHALLENGES` array — these are story conditions, `LADDER-MECHANICS.md:144-145`). Put them in a new `src/core/comebacks.ts` (sibling to `challenges.ts`):
  ```
  interface ComebackCondition {
    index: 1 | 2 | 3
    name: string                 // narrative ("The world forgot you", "The critics' circle", …)
    beatId: string               // story beat fired on clear (§5)
    baseModifiers: Partial<ChallengeModifiers>   // the static part
    growth: { field: keyof ChallengeModifiers; ratePerSec: number }[]  // the COMPOUNDING part
    // applied: effectiveMods(elapsedSec, recognitionSpent) → ChallengeModifiers
  }
  ```
- The **growth** is what makes it a *closing* debuff: e.g. `productionDivisor` or `costMultiplier` rises over elapsed seconds (compounding), so the longer a comeback takes, the harder it gets — a real *race*. Recognition (passive speed + buy-down) is the counter.
- **Reuse the tick plumbing:** `tick.ts:36` already reads `getActiveChallengeModifiers`. Add a parallel `getActiveComebackModifiers(state)` that returns a `ChallengeModifiers` computed from the active `ComebackCondition` + `elapsedSec` + `recognitionSpent`, and **merge** it into the `mods` the tick uses (stack multiplicatively/additively per field). Keep comeback-mods and L3-challenge-mods independent inputs that combine — a comeback is not an L3 challenge.

**The three conditions (escalating, authored) — magnitudes TBD — decide-at-build (sim/playtest):**

| # | Narrative (draft, align w/ STORY-SPEC) | Mechanical shape (engine modifier) | Compounding part |
|---|---|---|---|
| 1 | "The world forgot you" — reduced start, you begin from less | reduced starting SW / a mild `productionDivisor` | gentle `productionDivisor` growth over time |
| 2 | "The critics' circle" — harsher gates | `costMultiplier` (inflated) + a tighter tier-gate feel | `risingCosts`-style cost growth, steeper than #1 |
| 3 | "Prove it" — the hardest, the gods watching | combined production+cost squeeze | fastest-compounding of the three |

> The mechanical *kinds* are TBD; what is LOCKED: **escalating across the three** (3 strictly harder than 2 harder than 1) and **compounding within each** (grows with elapsed time, distinct from L3's flat constraints).

### 3.6 The tightening race (the LOCKED tuning target)

The whole layer is balanced so that, **per comeback i**, two opposing forces meet:
- **Harder:** condition #(i) is escalated above #(i-1), and within the run it compounds.
- **Faster:** Recognition (grown from clearing i-1) + the carried Palimpsest both speed the re-climb; the buy-down gives active relief.

The LOCKED outcome (the sim invariant, §6): **clear-time strictly decreases across the three** (Recognition wins the race) **but each clear still takes ≥ ~30–60s** (never instant, never a wall). This is the single most important balance constraint of the layer.

### 3.7 Decimal / overflow safety (M11)

Recognition is a small additive number (≤ `1 + 3·RECOGNITION_PER`) → plain `number`, no Decimal needed. **But** the re-climb itself reaches L7 (the Palimpsest reservoir, harmonic/sequence math) which is Decimal end-to-end per M11 (`HARDENING-PLAN.md` M11). The comeback debuff math operates on the *production multiplier* (Decimal) and on *elapsed seconds* (number) — keep the `recognitionMult` and debuff factors as plain numbers fed into `Decimal.times(...)`, exactly like `acclaimMult` and `challengeGlobalProdMult` already are (`formulas.ts:242-243`). The dev-build NaN/Infinity guard in `calculateTick` (M11) must see the comeback factors as finite.

---

## 4. UI surface

- **The "Come" preview panel (Fall entry).** A dedicated, opt-in screen (NOT a surprise). Shows, before `acceptCome()`:
  - What you **keep** (Palimpsest bonus, Recognition, Signature identity, best-times, seen-beats) — render from the `never`-tagged registry rows so it can't drift.
  - What the Fall **wipes** ("the world forgets your name" — Platinum, records, acclaim, the climb).
  - The 3-comeback roadmap + condition #1's preview.
  - Framed as **postgame campaign**, gold→black motif (`goldLevel: 0.12`), the `redemption` beat copy.
- **The Gauntlet HUD (during comebacks).** Persistent panel while `fallAccepted`:
  - `Comeback i / 3` + `comebacksCleared`.
  - The **active condition** name + a *live readout of its current magnitude* (it compounds — show it tightening). Avoid the "challenge-reward opacity" minor (`HARDENING-PLAN.md` minors): concrete numbers.
  - **Recognition** value + its current production-channel × (the separate channel, labeled distinctly from global ×).
  - A **buy-down control**: spend Recognition to soften the active condition, with the diminishing-returns curve + floor visible.
  - The terminal goal: "re-reach the Grand Finale" (the L7 completion gate), with progress.
- **A "mechanic card"** teaching the new verb (per the `HARDENING-PLAN.md` minor: per-layer mechanic cards; narrator stays pure). One card: *the gauntlet = a closing race; Recognition is your counter-pressure.*
- **Era/visual:** L8 is the gold→black inversion (`STORY-SPEC.md:30-34,67-68`). The `getEra`/`eraTheme` system currently tops out at era 6 = Finale (`eraTheme.ts:8-12`, `ERA_COLORS` length 7). **L8 needs an era state** (the black-flood / fighting-flicker). Extend `getEra` + `ERA_COLORS` for L8 (and reserve L9). **TBD — decide-at-build:** exact palette; the LOCKED direction is "black floods → a fighting flicker" (`STORY-SPEC.md:59`).

---

## 5. Story beats (the mechanic IS the beat)

- The `redemption` beat (`beats.ts:114-123`, `goldLevel: 0.12`) fires at the **Fall offer/accept**. Already authored.
- **Per-comeback beats (NEW, add to `beats.ts`):** the rule-of-three wants a beat per comeback clear (`STORY-SPEC.md:71-72` lists future trigger "(d) L8 Redemption … a beat per conditioned re-climb"). Three short escalating lines toward the L9 reveal. **Copy TBD — decide-at-build** (terse gatekeeper voice; gold dimmer each step toward L9's `goldLevel: 0.05`). Register them as first-time-only, `seenStoryBeats`-flagged like all others.
- On the **3rd clear** → transition copy that earns the gods (leads into the `the_gods` beat `beats.ts:125-134`, which is L9's).
- Beats fire via the existing `setStoryBeatSeen` plumbing (`gameStore.ts:910`); gate them on `comebacksCleared` transitions.

---

## 6. Sim / validation plan (what a sim MUST assert)

Build `sim/l8-pacing.test.ts` modeled on `sim/l3-pacing.test.ts` (same harness: drive `calculateTick` over a coarse-dt player model, write a report to `sim/out/`). The player model re-climbs L1→L7 under each comeback condition, with the carried Recognition + Palimpsest.

**LOCKED invariants the sim MUST assert (`HARDENING-PLAN.md` B2 — these are not optional):**
1. **`comeback_time[1] > comeback_time[2] > comeback_time[3]`** — strictly decreasing. Recognition wins the tightening race.
2. **Each `comeback_time[i] ≥ ~30–60s`** (a real floor; the band is TBD-tunable but the *existence* of the floor is LOCKED) — **never instant**.
3. **Each `comeback_time[i]` is finite and not a wall** — bounded above (TBD ceiling, but it must complete by passive accrual within a reasonable idle window). **Never a wall.**
4. **Idle-first:** a 24h-AFK comeback completes (passive accrual reaches the Finale); active is ≈1.4–1.75× faster, never required (mirror the L5 `HARDENING-PLAN.md` decision-4 AFK-vs-active ratio assertion).
5. **Funnel bound (B3):** the Recognition channel's contribution is `≤ 1 + 3·RECOGNITION_PER` and is applied as a *separate* factor (assert it does not multiply into a runaway with achievements/Acclaim/challenges). Assert the dev NaN/Infinity guard (M11) never trips during a comeback.
6. **Permanence preserved:** after `applyReset(state, 'fall')`, every `never`-tagged field is byte-identical to before; every shallower field is wiped (a direct reset-matrix conformance test).

The sim is also where `RECOGNITION_PER`, the buy-down curve, and the three conditions' magnitudes are **tuned to satisfy 1–3** before any number lands in `constants.ts` (same workflow as L3's frozen `L3` const — `worldTour.ts:27`).

---

## 7. Acceptance criteria

- [ ] `acceptCome()` performs a `tier: 'fall'` declarative reset that **keeps every `never` field** (Palimpsest, Recognition, Signature identity, best-times, seen-beats) and **wipes mortal fame + the climb** — verified by a reset-matrix conformance test (§6.6).
- [ ] The gauntlet is **exactly 3 comebacks** (rule of three), each under a **distinct, escalating, time-compounding** condition authored in `comebacks.ts` (NOT the L3 `CHALLENGES` array).
- [ ] **Recognition** grows per clear, is **additive + capped at 3 comebacks**, applies via a **separate registry channel** (not a raw global ×), and **does NOT feed L9**.
- [ ] A **buy-down** lets the player spend Recognition to soften the active condition with diminishing returns + a floor (never fully cancels).
- [ ] The Fall is **explicit + previewed** (the "Come" panel shows keep/wipe before commit); framed as **postgame campaign**, never a surprise.
- [ ] **Sim asserts the LOCKED invariant** `time[1] > [2] > [3]` AND each `≥ ~30–60s` AND none is a wall AND 24h-AFK completes each (idle-first).
- [ ] Clearing all 3 sets `comebacksCleared === 3` / `canEnterL9`, fires the per-comeback beats, and gates the L9 audience.
- [ ] Era/visual extends to the L8 gold→black inversion; per-comeback story beats wired (first-time, skippable).
- [ ] `tsc` clean, full suite green, M11 NaN/Infinity guard never trips, save-migration round-trips old saves (new fields default sanely).

---

## 8. Dependencies (what must exist first) — summary

**Hard blockers (build L8 only after these are real — see §0):**
1. **L7 Grand Finale rebuilt as the real one-time commit-drain event** (today it's the placeholder repeatable `finalePoints` prestige — `gameStore.ts:880`, `04-forward-design-L4-L9.md:326`). A comeback's terminal goal *is* "re-reach the real Finale."
2. **L6 Canon / Palimpsest `{top, ghosts[]}`** — the permanence the Fall preserves and a co-driver of faster re-climbs.
3. **M9 multiplier-registry + declarative `applyReset(state, tier)`** — the Fall is `applyReset('fall')`; Recognition is a registry channel. **Verify it shipped** (it was scoped to the L4 session; it is NOT in `feat/layer3`).
4. **L4 Signature `never` identity record** — the Fall must keep it (drives L9).

**Reused (already built):** the constraint ENGINE (`ChallengeModifiers` + `getActiveChallengeModifiers`, `challenges.ts`; `risingCosts` time-compounding already in `tick.ts:116-120`), the story-beat system (`beats.ts`, `setStoryBeatSeen`), the save-migration scaffold (`saveMigration.ts`), the sim harness (`sim/l3-pacing.test.ts`).

**Consumed by L8:** Palimpsest (faster re-climbs), the constraint engine (conditions).
**L8 produces for L9:** the *audience* (gauntlet cleared = `canEnterL9`). **Recognition does NOT cross into L9** (LOCKED, B2).

---

## 9. Open gaps (TBD — decide-at-build (sim/playtest))

- **`RECOGNITION_PER`** (the per-comeback additive step) — must satisfy the §6 invariant; tune in the sim.
- **The three comeback-conditions' mechanical kinds + magnitudes** — the *kinds* (production/cost/start squeeze) and *compounding rates*. LOCKED only: escalating across, compounding within, distinct from L3.
- **The 30–60s comeback floor exact value** + the upper "not-a-wall" ceiling — the band within the LOCKED 30–60s floor.
- **The buy-down curve** (Recognition-spent → debuff reduction): shape, diminishing-returns rate, the floor it can't pass.
- **`recognitionSpent` semantics:** resets per comeback vs carries (§2.1 note); separate ledger vs shared pool with passive speed (§3.4). Lean: reset-per-comeback + separate ledger.
- **Per-comeback story-beat copy** (§5) and the **L8 era palette** (§4) — direction LOCKED (black-floods → fighting-flicker; toward L9's cold point), specifics TBD.
- **Whether the L7 placeholder `finalePoints` is fully retired or repurposed by L7-build** — affects how "re-reach the Finale" is detected (this is an L7 decision L8 inherits; flag it).

---

*Citations: `docs/LADDER-MECHANICS.md:10-39` (reset matrix), `:136-147` (L8). `docs/STORY-SPEC.md:9-13,30-34,59,67-68,71-72,94-100`. `docs/HARDENING-PLAN.md` (decision 2, B2 LOCKED Recognition form + sim invariant, B3 funnel budget, M9/M11). `docs/bible/04-forward-design-L4-L9.md:290-381` (L8 design + the L7 placeholder divergence). Code: `src/store/gameStore.ts:60,603,660,836,880,910`, `src/store/initialState.ts`, `src/store/saveMigration.ts:151`, `src/store/saveSchema.ts`, `src/core/tick.ts:36,85-120`, `src/core/formulas.ts:180,206,232-243`, `src/core/challenges.ts:7-19,154-231`, `src/core/eraTheme.ts:8-12`, `src/components/story/beats.ts:114-134`, `sim/l3-pacing.test.ts`.*
