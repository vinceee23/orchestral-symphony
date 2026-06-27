# L5 — Virtuoso build-spec: "Perfect Take"

> **Status:** implementation-ready. Build target for a FRESH session. **Depends on L4 Signature shipping
> first** (L5 is the 5th rung; the ladder is built sequential — `LADDER-MECHANICS.md:3-5`). Numbers marked
> **TBD — decide-at-build (sim/playtest)** are deliberately unset; resolve them from the L5 sim, do NOT
> invent magnitudes blind (`HARDENING-PLAN.md:107`).
>
> **Authoritative design sources** this spec implements:
> `LADDER-MECHANICS.md:80-99` (the locked L5 mechanic) · `HARDENING-PLAN.md:17-20` + `:60` (decision D4 —
> the LOCKED idle fix) · `STORY-SPEC.md:87` + `beats.ts:88-95` (the `virtuoso` beat) ·
> `docs/bible/04-forward-design-L4-L9.md:163-205` (the cross-checked design reference) ·
> `docs/bible/02-economy-formulas-resets.md` (the funnel + the reset matrix).

---

## 1. Overview — the axis + the story beat it embodies

**Axis (genuinely new — never a reskin):** **Mastery = scoring the shape of a curve (evenness over time).**
L5 is the first layer that *inverts* L1–L4's brute-maximize instinct: it does not reward a bigger number, it
rewards a *steady* one. (`LADDER-MECHANICS.md:99`: "L5 rewards control/consistency, inverting L1–L4's
brute-maximize.")

**The mechanic IS the story beat made playable** (the LOCKED principle). The `virtuoso` beat
(`beats.ts:88-95`, `STORY-SPEC.md:87`) is:

> There is nothing left for the living to teach you.
> *(We were never the living.)*

"Nothing left to *teach*" = the player has exhausted *acquisition* (buy more, bank more). The only thing left
to prove is **control** — the take with no wrong notes. Perfect Take makes that fantasy the verb: you hold a
performance *in tempo* and bank the **integral of a consistency curve**. A long even take (a master's control)
out-scores a short spiky one (a beginner's flash). **Headline reward = your count of completed Takes** — a
clean, legible "how many flawless performances have you delivered" number, exactly the virtuoso fantasy.

> **MINOR to fold in (do NOT skip):** `HARDENING-PLAN.md:88` + `:240` — the beat's 2nd line
> *"(We were never the living.)"* **reveals the gods too early**. Pull it back to a *fingerprint* (a line
> that hints at many-as-one without naming them). This is a `beats.ts` copy-only edit; make it as part of the
> L5 build. Suggested fingerprint (TBD — Vince signs off the copy): keep line 1, replace line 2 with
> something that *breathes/keeps-time* without saying "we" (e.g. a line that lands as the watcher, not the
> reveal). The reveal stays at L8 (`STORY-SPEC.md:23`).

### What L5 must NOT be (distinctness guards — `LADDER-MECHANICS.md:92-95`)

- **NOT L3's self-handicap challenges.** L5 scores a *self-generated output signal* (your own production
  rate); it adds **no constraint plumbing** (no `ChallengeModifiers`, no toggles). Breaking tempo never gates
  or wipes — it only *caps* (§4.4).
- **NOT L4's budget allocation.** No pie, no zero-sum allocation.
- **Opposite temporality to L6 Canon.** L5's in-take meter is **transient / re-earnable**; L6's Palimpsest is
  permanent. The only L5 thing that persists is the Mastery *rank* (§3, a count + a derived floor), not the
  live curve.
- *Rejected runner-up (do not build):* **Rubato** (a time↔power tempo dial) — heaviest build, flirts with
  L3's manipulate-lower-layers axis (`LADDER-MECHANICS.md:95`).

---

## 2. New state (fields + types + resetTier + saveMigration)

All L5 state is **scalar Zustand state** (`LADDER-MECHANICS.md:96`) — no Decimal needed for the meter math
(the meter is a bounded 0..1-ish quantity; see §4). The *banked reward* may touch the production funnel, so
that one value follows the funnel's Decimal rules where it crosses into production (§4.6).

Add to `GameState` in `src/store/types.ts` (alongside the existing L1–L3 fields, ~`types.ts:115` block):

```ts
// === Prestige Layer 5: Virtuoso — "Perfect Take" ===
// Mastery axis: bank the integral of an in-tempo consistency curve. See docs/build-specs/L5-virtuoso.md.

/** True once L5 is unlocked (the gate flag, mirrors worldTourUnlocked). */
virtuosoUnlocked: boolean

/** A Take is in progress (the live performance window is open). */
takeActive: boolean
/** Live Virtuosity meter, 0..1 — the HEIGHT of the consistency band right now (NOT the integral). */
virtuosityMeter: number
/** Accumulated integral (area under virtuosityMeter over time) for the CURRENT take, in meter·seconds. */
currentTakeArea: number
/** Wall-clock ms the current take has been running (for area-rate + UI). */
currentTakeElapsedMs: number
/** Timestamp the current take started (for offline analytic accrual — see §4.5). */
takeStartTimestamp: number
/** EWMA of recent production rate (log10 SW/sec), the "is output growing smoothly" signal (§4.2). */
tempoBaselineLog: number

/** HEADLINE REWARD: lifetime count of completed Takes. Drives Mastery rank. resetTier: never. */
completedTakeCount: number
/** Permanent Mastery rank (derived from completedTakeCount; cached for UI/floor). resetTier: never. */
masteryRank: number
/** Best single-take area ever banked (skill record, for UI + an achievement). resetTier: never. */
bestTakeArea: number
```

> **Naming-collision note for the builder:** the codebase already uses "tempo" for the L1 BPM upgrade
> (`tempo.level`). L5's "in-tempo" is a *different* concept (consistency of output rate). Prefix L5 fields
> with `take*` / `virtuosity*` / `mastery*` (as above) and never reuse the bare `tempo` identifier, to avoid
> confusion with the L1 tempo system in `formulas.ts:97-123`.

### resetTier per the RESET MATRIX (`LADDER-MECHANICS.md:30`, bible `02:...` §6, `04:99,192`)

| Field | resetTier (deepest wipe) | Rationale |
|---|---|---|
| `virtuosoUnlocked` | **never** | unlock flag, like a layer-reached marker |
| `completedTakeCount` | **never** (LOCKED-likely per `LADDER-MECHANICS.md:30`) | the permanent Mastery floor; "Mastery rank → likely never" |
| `masteryRank` | **never** | derived from `completedTakeCount`; permanent floor |
| `bestTakeArea` | **never** | skill record (same class as `challengeBestTimes`, matrix row "never") |
| `takeActive`, `virtuosityMeter`, `currentTakeArea`, `currentTakeElapsedMs`, `takeStartTimestamp`, `tempoBaselineLog` | **run** (Encore+) | the live in-take state is transient/re-earnable (`04:190`); a deep reset ends any open take and zeroes the live meter |

**Decision to confirm at build (TBD — sim/playtest):** whether `completedTakeCount`/`masteryRank` is truly
`never` or `Virtuoso`-tier (resets when you ascend *past* L5). `LADDER-MECHANICS.md:30` marks it
**"TBD at L5 build; likely never."** **Default to `never`** (it is the layer's permanent floor and the
fantasy is "mastery you never lose"), and verify the floor it grants doesn't create a B3 runaway (§4.6). The
live meter is always run-tier.

### M9 declarative-reset registration

If M9 (`applyReset(state, tier)` + the `resetTier` table) is built before L5 — it is sequenced *before* L4 in
the hardening worklist (`HARDENING-PLAN.md:139-146`, `06-...:139-146`) — then **register each field above in
the M9 `resetTier` table** and let `applyReset` handle it; do NOT hand-zero in `performEncore`/etc.

If M9 is **still** the imperative pattern at L5 build time (it is `⛔ pending` as of `06-...:145`), then:
- The run-tier L5 fields must be zeroed in **`resetTiersAndSW`** (`gameStore.ts:60-94`) — that helper is
  shared by all four prestige actions, so adding the live-take fields there gives them run-tier reset for
  free (matches `tempoPurchasesThisRun`, also reset there).
- The `never`-tier fields are zeroed **nowhere** (persist by omission — bible `02-...` §6 "persists by
  omission").

### saveMigration step (`src/store/saveMigration.ts`)

The B5 refactor is the home for this (`saveMigration.ts:151-155`, `06-...:88-114`). All L5 fields are plain
`number`/`boolean` with simple defaults, so:

1. **Bump `SAVE_SCHEMA_VERSION`** in `src/store/saveSchema.ts` to the next integer (e.g. 2).
2. **Add the migration** in `MIGRATIONS` (`saveMigration.ts:151`):
   ```ts
   2: (state) => {
     // L5 Virtuoso fields — additive, all default to off/zero.
     state.virtuosoUnlocked ??= false
     state.takeActive ??= false
     state.virtuosityMeter ??= 0
     state.currentTakeArea ??= 0
     state.currentTakeElapsedMs ??= 0
     state.takeStartTimestamp ??= 0
     state.tempoBaselineLog ??= 0
     state.completedTakeCount ??= 0
     state.masteryRank ??= 0
     state.bestTakeArea ??= 0
   },
   ```
   (Or rely on `applyUndefinedDefaults` (`saveMigration.ts:132-139`) since these are added to
   `createInitialState` — but an explicit migration step is the B5-blessed pattern and is the right home if
   any field ever needs a non-default backfill. **No field is a Decimal**, so `TOP_LEVEL_DECIMAL_KEYS`
   (`saveMigration.ts:23-31`) is untouched.)
3. **Add all fields to `createInitialState()`** (`src/store/initialState.ts:6-78`) with the defaults above.

---

## 3. Mastery rank — the permanent floor (the headline reward)

`completedTakeCount` is the headline number (D4 — "tie the headline Mastery reward to completed-Take count"
`HARDENING-PLAN.md:19`, `:63-65`). `masteryRank` is a **monotone function of it**, and the rank grants the
**permanent idle floor** + a **slowly-widening skill ceiling** (`LADDER-MECHANICS.md:88-89`).

```
masteryRank(takes)  = floor( log? / root? of completedTakeCount )   // sublinear — TBD form
idleFloor(rank)     = clamp( FLOOR_BASE + rank * FLOOR_PER_RANK , 0 , FLOOR_MAX )   // meter floor, 0..1
ceilingWidth(rank)  = BAND_WIDTH_BASE + rank * BAND_WIDTH_PER_RANK   // how forgiving the active band is
```

- **`idleFloor`** is the minimum the live `virtuosityMeter` decays to (§4.3). It guarantees a real AFK
  baseline so idlers always bank *some* area.
- **`ceilingWidth`** slowly widens the **active** target band as you rank up — `LADDER-MECHANICS.md:88`
  "slowly widens the skill ceiling": mastery makes holding tempo progressively *easier*, the master's
  forgiveness. (This is the *active* band width; it is distinct from the idle auto-widening of §4.3.)

**TBD — decide-at-build (sim/playtest):** the exact form of `masteryRank(takes)` (must be **sublinear** —
log or root — to honor B3, see §4.6) and the constants `FLOOR_BASE`, `FLOOR_PER_RANK`, `FLOOR_MAX`,
`BAND_WIDTH_BASE`, `BAND_WIDTH_PER_RANK`. These come from the L5 sim's idle-vs-active ratio assertion (§5).

---

## 4. The mechanic in detail

### 4.1 The Take loop (high level)

1. **Start a Take** (player action, or auto once unlocked — see §4.7). Sets `takeActive = true`,
   `currentTakeArea = 0`, `currentTakeElapsedMs = 0`, `takeStartTimestamp = Date.now()`, seeds
   `tempoBaselineLog` from current production.
2. **Each tick** (`calculateTick`, `tick.ts:29`), while `takeActive`: update the meter HEIGHT toward the
   in-tempo target, integrate it into `currentTakeArea` (§4.2–4.4).
3. **End-of-take** (player action, or an auto-cycle): bank — `completedTakeCount += 1`,
   `bestTakeArea = max(bestTakeArea, currentTakeArea)`, recompute `masteryRank`, then reset the live fields.
   The *area* may also award a transient run-scoped production kicker (§4.6). `takeActive = false`.

The integral is the scored quantity (`LADDER-MECHANICS.md:87`): **a long, even performance beats a short
spiky one.** Banking on **count** (not area) for the *headline* keeps it idle-accruable; area only *shaves
time per Take* and feeds the optional transient kicker — never raw permanent power (D4 `:65`).

### 4.2 "In tempo" = **grow-smoothly** (the LOCKED tuning lean)

`LADDER-MECHANICS.md:97-99` + `HARDENING-PLAN.md` D4: the SOUL is control/consistency; the chosen definition
is **grow-smoothly** (more natural for an idle game where output rises over a run) — **spikes and stalls are
the sin, not growth.** So "in tempo" does **not** mean "hold a flat rate"; it means "your output is growing at
a *steady, smooth* rate."

Concretely, per tick compute the instantaneous production-rate signal and compare it to a smoothed baseline:

```
rateLog        = log10( max(1, soundwavesProducedThisTick / dtSec) )   // this tick's SW/sec, log-space
// EWMA baseline of the smooth growth trend:
tempoBaselineLog ← (1 - SMOOTH_ALPHA) * tempoBaselineLog + SMOOTH_ALPHA * rateLog
deviation      = | rateLog - tempoBaselineLog |        // how far this tick departs from the smooth trend
```

- Work in **log10 space** so the band is *multiplicative* (output naturally grows orders of magnitude over a
  run — a linear band would be unusable). Growing smoothly = `rateLog` rising at a near-constant slope keeps
  `deviation` small. A **spike** (sudden big buy / crescendo burst) or a **stall** (going dark/idle so
  `rateLog` collapses) both push `deviation` up and out of the band.
- `SMOOTH_ALPHA` (EWMA weight) and the band half-width are **TBD — decide-at-build (sim/playtest)**.

> Use SW *produced this tick* — already computed in the tick as `producedThisRun` delta (`tick.ts:48-49,149,
> 180`). Capture `producedThisTick = newSoundwaves(produced delta)` inside `calculateTick` and pass it to the
> L5 update; do not recompute production.

### 4.3 The band: HEIGHT decays to a floor + idle auto-widening (the LOCKED idle fix — D4)

This is the single most important correctness requirement (`HARDENING-PLAN.md:17-20`, `06-...:60-67`). Two
mechanisms, both required:

**(a) HEIGHT decays to the floor (NOT just width widening) — the active:idle cap.**
The live `virtuosityMeter` (the band HEIGHT, 0..1) moves toward a target each tick:

```
inBand   = deviation <= bandHalfWidth(state)      // are we growing smoothly right now?
target   = inBand ? 1 : idleFloor(masteryRank)    // in-tempo → climb to 1; out → sag to the floor
// move toward target, but never below the permanent floor:
virtuosityMeter ← approach(virtuosityMeter, target, RISE_RATE if rising else DECAY_RATE, dtSec)
virtuosityMeter  = max(virtuosityMeter, idleFloor(masteryRank))
```

The crucial fix vs the original design: **when you break tempo the meter HEIGHT decays toward the floor**, so
AFK accrues only the *baseline* rate — it does **not** keep banking near-full area just because the band got
wide. (`HARDENING-PLAN.md:18`: "the idle band's HEIGHT/multiplier decays to the floor (not just width
widens) — AFK accrues only baseline rate.")

**(b) Idle auto-widening — the band gets *wider* (more forgiving) the longer you've been away**, so an idler
*sits in-tempo at the low floor* (slow-but-safe trickle) rather than constantly dropping out
(`LADDER-MECHANICS.md:90`, `04-...:182-183`). This is the "timestamp-driven band-widening function" — the one
subtle build piece (`LADDER-MECHANICS.md:96`):

```
awayMs        = now - lastInteractionTimestamp     // wall-clock since last foreground input
bandHalfWidth = BAND_BASE * ceilingWidth(rank) + BAND_AFK_GAIN * log10(1 + awayMs/AFK_REF_MS)
```

Net effect of (a)+(b): an idler's band is **wide** (rarely drops out) but their meter HEIGHT target while
"in-band-but-idle" is **the floor** (because a stalled `rateLog` makes `deviation` small *only* if the
baseline also collapsed — and the floor caps the meter low regardless). Active play rides a **tight** band at
HEIGHT → 1 for far more area. **This is what enforces the active:idle ≈ 1.5–2× cap** — assert it in the sim
(§5).

> **Implementation note:** `bandHalfWidth`'s AFK term must be driven by a **timestamp**, not a per-tick
> counter, so offline catch-up (one coarse tick after a long absence) widens correctly without iterating.
> Track `lastInteractionTimestamp` (update it on any manual buy/conduct/click; the store already has input
> entry points). The 24h offline clamp (`MAX_OFFLINE_MS`, `constants.ts`) bounds `awayMs`.

### 4.4 Breaking tempo CAPS, never resets (`LADDER-MECHANICS.md:84-85`)

Breaking tempo (out-of-band) **never** resets `currentTakeArea` and **never** ends the take. It only:
- caps the live meter HEIGHT (it sags toward the floor, §4.3a), which caps the *rate of area accrual*; and
- the floor guarantees accrual never hits zero (`LADDER-MECHANICS.md:90-91`: "never zero, never a gate, no
  clicking required").

There is **no punitive wipe** and **no click requirement** — this is core to idle-friendliness. Re-stabilize
(grow smoothly again) and the meter climbs back toward 1.

### 4.5 Offline Take accrual = **analytic floor-only** (NOT chunked iteration — D4)

`HARDENING-PLAN.md:20` + `:66`: "Offline Take = accrue floor only — analytic, not 86k chunked iterations."

When the game loads after an absence with `takeActive === true`, do **not** replay 24h in 1s chunks. Instead,
**analytically**: while away, the player was by definition not growing-smoothly through active play, so the
meter sat at the **idle floor**. The area gained offline is the closed form:

```
offlineMs   = min(now - takeStartTimestamp-relative, MAX_OFFLINE_MS)   // bounded
floorHeight = idleFloor(masteryRank)
offlineArea = floorHeight * (offlineMs / 1000)        // floor-height × seconds away (meter·seconds)
currentTakeArea  += offlineArea
currentTakeElapsedMs += offlineMs
```

This is the analytic, O(1) accrual. (If a take *completes* offline on an auto-cycle, see §4.7 — that too is
analytic: floor-only area per auto-completed take, count incremented analytically.) The offline-replay path
lives in the store's load/rehydrate (where `calculateTick` is currently called for offline catch-up); add the
L5 analytic branch there, parallel to how worldTour offline accrual is bounded by `MAX_OFFLINE_MS`.

### 4.6 Production effect — which M9 channel it uses (B3: NO new global-× pile-on)

**LOCKED constraint (B3 — `HARDENING-PLAN.md:33-36`, `06-...:86`):** L5 must **NOT** add another raw global
production multiplier. Production is already one funnel (`getCoreProductionMultiplier`, `formulas.ts:206`;
achievements ~×3.57, Acclaim ≤×49, challenges ×5.6–11.2). New permanence must use a **separate channel / hard
cap / scoped effect** via the M9 multiplier-registry's `channel` tag.

L5 contributes via the M9 registry as a **distinct, capped channel** — `{ source: 'virtuoso-mastery',
channel: 'mastery', value, appliesToProduction: true }` — NOT folded into the existing funnel chain:

- **The permanent reward is a FLOOR/structural effect, not raw ×.** `masteryRank`'s payoff should be a
  **capped, sublinear** multiplier on its **own channel** (so it can be displayed and reasoned about
  separately and hard-capped), e.g. `masteryMult = 1 + min(MASTERY_MULT_CAP, MASTERY_PER * rank)` with `rank`
  already sublinear in take-count. **It must have an explicit `*_CAP`** (mirroring Acclaim's `MULT_CAP = 48`,
  the only existing hard cap — `02-...` §7).
- **The per-Take area kicker (optional, transient) is run-tier**, decays with the run, and is also capped. It
  is the "active play earns more *this run*" amplifier, NOT permanent power (keeps D4's "band-tightness only
  shaves time" honest).
- **Decimal/M11:** if any L5 value crosses into the production funnel it must respect M11 (the `calculateTick`
  non-finite guard, `HARDENING-PLAN.md:53`, `06-...:146`). Keep `masteryMult` a bounded small `Decimal`
  (≤ its cap) so it can never poison the funnel.

> If M9's registry array is not yet built at L5 time, add `masteryMult` as **one new `.times()` factor in
> `getCoreProductionMultiplier`** (`formulas.ts:232-243`) **with its own constant + hard cap**, and a clear
> comment that it is L5's *scoped, capped* channel pending M9 — but the strong preference is to build it
> through the registry so B3 is structurally enforced, not editorial.

### 4.7 Auto-Take (idle-FIRST — works AFK; active amplifies ≈1.4–1.75×)

L5 must be **idle-first** (the project north-star — `HARDENING-PLAN.md:102-103`). Once unlocked, Takes
**auto-start and auto-complete on a cycle** so an AFK player banks `completedTakeCount` hands-free at the
floor rate (mirrors how L1 auto-encore / L3 auto-tour automate the layer below — `04-...:155-160`). Active
play (riding a tight band → meter near 1) banks more *area per take* and completes the smooth-growth window
faster, so it amplifies but is never *required*. The auto-cycle cadence and the auto-vs-manual area ratio are
**TBD — decide-at-build (sim/playtest)**, tuned to the active:idle ≤ 2× cap (§5).

### 4.8 Where it hooks into existing code

| Hook | File:line | What to add |
|---|---|---|
| Tick meter update + integrate | `src/core/tick.ts:29` (`calculateTick`), return patch `:317-330` | After production is computed (so `producedThisTick` is known), call a new `advanceTake(state, producedThisTick, dtSec, now)` (new `src/core/virtuoso.ts`), merge its patch into the return |
| Pure L5 math | new `src/core/virtuoso.ts` | `advanceTake`, `idleFloor`, `bandHalfWidth`, `masteryRank`, `masteryMult`, `bankTake`, `accrueOfflineTake` — all pure fns, sim-importable (mirrors `crescendo.ts`, `worldTour.ts`) |
| Production channel | `src/core/formulas.ts:206-244` **or** the M9 registry | add the capped `mastery` channel (§4.6) |
| Start/end actions | `src/store/gameStore.ts` (new actions `startTake`, `endTake`; add to `GameActions` in `types.ts:144-173`) | manual control + the auto-cycle in the tick driver (`gameStore.ts:~208` alongside `canAutoPerformMagnumOpus`) |
| Unlock | `gameStore.ts` (new `unlockVirtuoso` or via L4 ascension) + gate const | mirror `worldTourUnlocked` / `canUnlockWorldTour` (`worldTour.ts:404-413`) |
| Run-tier reset | `gameStore.ts:60-94` `resetTiersAndSW` (imperative path) **or** M9 `applyReset` | zero the live-take fields |
| Offline accrual | store load/rehydrate offline-catch-up path | the §4.5 analytic branch |
| Era theme / liveliness (optional) | `src/core/eraTheme.ts`, `formulas.ts:190-198` `getLiveliness` | L5 has an era slot (`STORY-SPEC.md:57` "near-blaze"); wiring liveliness is optional polish, not required for the mechanic |

---

## 5. Sim / validation plan (what the sim MUST assert)

New file `sim/virtuoso-pacing.test.ts`, modeled on `sim/era-pacing.test.ts` (drives REAL `calculateTick` +
real `src/core/virtuoso.ts` fns through a headless loop; `DT_FINE_MS`/`DT_COARSE_MS` pattern,
`era-pacing.test.ts:58-61`). It MUST assert:

1. **The LOCKED active:idle ratio window (D4 — `HARDENING-PLAN.md:20`, `:67`).** Run **24h pure AFK** vs **24h
   active** (active = held in a tight band / smooth growth). Assert
   `bankedArea_active / bankedArea_idle ∈ [1.5, 2.0]` (and the analogous ratio on `completedTakeCount` if
   auto-cycle is count-based). **This is the headline invariant — the whole D4 fix exists to make it true.**
2. **AFK never zero, never gated.** Over 24h AFK, `completedTakeCount` strictly increases and
   `currentTakeArea`/banked area is `> 0` at all times (floor guarantees a trickle —
   `LADDER-MECHANICS.md:90-91`). No path requires a click.
3. **Offline = analytic (no iteration blow-up).** Banking 24h of offline take via the §4.5 closed form yields
   the **same** area (within ε) as the floor-rate × time, and runs in O(1) (assert it doesn't iterate ~86k
   steps — e.g. call the analytic fn directly and compare to a reference floor·seconds).
4. **Breaking tempo caps, never resets.** A scripted spike/stall mid-take **reduces the area-accrual rate**
   (meter sags) but `currentTakeArea` is **monotone non-decreasing** and the take stays `active`
   (`LADDER-MECHANICS.md:84-85`).
5. **A long even take out-scores a short spiky one** of equal *peak* (the core "integral of consistency"
   claim — `LADDER-MECHANICS.md:87`): simulate both, assert even-take area > spiky-take area.
6. **B3 cap holds.** `masteryMult` stays `≤ 1 + MASTERY_MULT_CAP` for arbitrarily large `completedTakeCount`,
   and is finite (M11). Assert the funnel total with L5 active stays bounded.
7. **Mastery floor monotonicity.** `idleFloor(rank)` is non-decreasing in `completedTakeCount` and clamped at
   `FLOOR_MAX`.

Use the sim to **resolve every TBD** (`SMOOTH_ALPHA`, band widths, `RISE/DECAY_RATE`, all floor/cap
constants, the `masteryRank` form, auto-cycle cadence) so the ratio in (1) lands in window — exactly as the
L3 tuning lives in the frozen `L3` const ported from its sim (`worldTour.ts:27-46`, `02-...` §4).

---

## 6. UI surface

Render the **corridor / band UI** (the hardening plan explicitly calls for it — `HARDENING-PLAN.md:61`
"render the corridor UI"; `06-...` D4). A new `VirtuosoPanel` component (sibling of the World Tour panel):

- **The corridor:** a horizontal band showing the target tempo corridor (its half-width = `bandHalfWidth`,
  visibly *wider* when idle) with a moving marker = current `deviation`. In-band = glowing/gold; out-of-band =
  dimmed. This *teaches* the verb visually (grow smoothly = stay centered).
- **The meter:** `virtuosityMeter` (0..1) as a vertical fill; the **floor** drawn as a permanent baseline
  line (so the player sees "I never drop below this").
- **Live area:** `currentTakeArea` accumulating + a "this take so far" readout; an **area-rate** indicator.
- **Headline:** **`completedTakeCount`** prominently (the reward number) + **Mastery rank** + the current
  `masteryMult` (its own labeled channel, per B3 — show it *separately* from the global multiplier so the
  player sees it is a distinct, capped bonus; addresses the `HARDENING-PLAN.md:88` "challenge-reward opacity /
  concrete readouts" minor).
- **Controls:** Start/End Take buttons (manual), an Auto-Take toggle (defaults on once unlocked, idle-first).
- **Mechanic card** (`HARDENING-PLAN.md:90`, `:240`): a one-time teaching card explaining the new verb
  ("Hold your performance *in tempo* — grow smoothly. Bank the area under the curve. A long, even take beats a
  short, spiky one."). Narrator stays pure; the card teaches the mechanic.
- **Accessibility (`HARDENING-PLAN.md:92`, `:248`):** no hold-only path. Auto-Take + the floor mean an idler
  with zero input still progresses; manual is an *amplifier*, never a requirement.

---

## 7. Acceptance criteria

- [ ] L5 unlocks via L4 ascension (or a clear gate mirroring `canUnlockWorldTour`), gated by a
      `virtuosoUnlocked` flag; pre-unlock, none of the L5 UI/logic is reachable.
- [ ] A Take can be started/ended manually **and** auto-cycles when Auto-Take is on (idle-first).
- [ ] The live `virtuosityMeter` rises toward 1 while production grows-smoothly (in-band) and sags toward the
      permanent floor when it spikes/stalls — **height decays to floor, never below** (D4).
- [ ] Breaking tempo **caps** accrual but never resets `currentTakeArea` and never ends the take (no wipe, no
      click required).
- [ ] Ending a take banks `completedTakeCount += 1`, updates `bestTakeArea`, recomputes `masteryRank`, and
      resets the live fields; the area feeds (at most) a capped, transient run-tier kicker.
- [ ] `masteryRank` raises a **permanent idle floor** and **slowly widens the active band**; the floor + rank
      are `resetTier: never` (persist through every reset incl. the Fall — confirm at build, default never).
- [ ] L5's production contribution is a **separate, hard-capped `mastery` channel** (M9 registry preferred),
      **never** a new raw global × (B3); it is finite (M11).
- [ ] Offline take accrual is **analytic floor-only** (O(1), no 86k-iteration replay) and bounded by
      `MAX_OFFLINE_MS`.
- [ ] `sim/virtuoso-pacing.test.ts` passes, asserting active:idle ∈ [1.5, 2.0], AFK-never-zero,
      analytic-offline-equivalence, caps-not-resets, even>spiky, and the B3 cap.
- [ ] All L5 fields added to `createInitialState`, `types.ts`, and the saveMigration chain
      (`SAVE_SCHEMA_VERSION` bumped; old saves load clean — smoke-test an L1–L3 save).
- [ ] The `virtuoso` beat's early-reveal line is pulled back to a fingerprint (`beats.ts:88-95`, Vince signs
      off the copy).
- [ ] Corridor UI + mechanic card + accessible (no hold-only) controls shipped.
- [ ] `tsc -b` + full vitest suite + build all green (the standing GATE before commit).

---

## 8. Dependencies (what must exist first)

| Dependency | Status | Why L5 needs it |
|---|---|---|
| **L4 Signature shipped** | ⛔ not built (`04-...:29`) | L5 is the next rung; build-sequential rule. L5 unlocks via L4 ascension. |
| **B5 save-migration** (version chain) | 🟡 written, gate+commit pending (`06-...:88-114`) | L5 adds fields via the `MIGRATIONS` chain + `SAVE_SCHEMA_VERSION` bump. Must be committed first. |
| **M9 multiplier-registry + `applyReset`** | ⛔ pending (`06-...:145`) | **Strongly preferred** before L5 so the `mastery` channel (B3) and `resetTier` are structural, not hand-wired. If absent, fall back to the imperative path (§2, §4.6) but flag the debt. |
| **M11 Decimal/non-finite guard in `calculateTick`** | ⛔ pending (`06-...:146`) | L5's `masteryMult` crosses into the funnel; the guard ensures it can't poison production. |
| **The L5 sim** (`sim/virtuoso-pacing.test.ts`) | new (this build) | Resolves every TBD magnitude; enforces the D4 active:idle ratio. No magnitudes ship un-simmed. |
| `crescendo.ts` / `worldTour.ts` patterns | built | Reference for the pure-fn + tick-patch + offline-bounded shape `virtuoso.ts` should follow. |

---

## 9. Open gaps (TBD — decide-at-build, sim/playtest)

1. **"In-tempo" band tuning:** `SMOOTH_ALPHA` (EWMA weight), active `bandHalfWidth` base, `RISE_RATE`,
   `DECAY_RATE`. (Soul is locked = grow-smoothly; only the numbers are open — `LADDER-MECHANICS.md:97-99`.)
2. **Idle auto-widening curve:** `BAND_AFK_GAIN`, `AFK_REF_MS` — must make idlers sit in-band at the floor
   while keeping active:idle ≤ 2×.
3. **Mastery floor/ceiling constants:** `FLOOR_BASE`, `FLOOR_PER_RANK`, `FLOOR_MAX`, `BAND_WIDTH_BASE`,
   `BAND_WIDTH_PER_RANK`, and the **sublinear `masteryRank(takes)` form** (log vs root).
4. **B3 channel magnitudes:** `MASTERY_PER`, `MASTERY_MULT_CAP` (the hard cap — REQUIRED), and the transient
   per-take area kicker's magnitude + decay.
5. **Auto-Take cadence** + the manual-vs-auto area ratio (tuned to the active-amplify ≈ 1.4–1.75× / cap 2×).
6. **`resetTier` of `completedTakeCount`/`masteryRank`:** `never` (default, recommended) vs `Virtuoso`-tier —
   confirm at build (`LADDER-MECHANICS.md:30` "likely never"); verify the permanent floor doesn't breach B3.
7. **Unlock gate:** the exact L4→L5 ascension condition (mirror `canUnlockWorldTour`'s gate shape).
8. **`virtuoso` beat fingerprint copy** — the replacement for "(We were never the living.)" (Vince signs off).

---

*Summary: L5 Virtuoso = "Perfect Take" — start a Take, hold production growing-smoothly (in-tempo) to climb a
Virtuosity meter whose HEIGHT decays to a permanent Mastery floor when you spike/stall; bank the integral of
the curve, headline reward = completed-Take count, all idle-first (auto-cycle + analytic offline floor-accrual,
active:idle hard-capped ≈1.5–2×). Its production payoff is a separate hard-capped `mastery` channel (B3), never
a new global ×; the live take is run-tier, the Mastery rank/floor is `never`-tier permanent.*
