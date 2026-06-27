# L6 — Canon: "The Palimpsest" — IMPLEMENTATION-READY BUILD-SPEC

> **Status:** spec for a fresh future session to BUILD. Mechanic LOCKED; magnitudes are
> **TBD — decide-at-build (sim/playtest)** per the gap policy. Cites `file:line` against branch
> `feat/layer3`. Read first: `docs/LADDER-MECHANICS.md` §L6 (`:101-116`), `docs/bible/04-forward-design-L4-L9.md`
> §5, `docs/bible/02-economy-formulas-resets.md` (the funnel + reset matrix + the B2 snapshot hazard),
> `docs/HARDENING-PLAN.md` (B2/B3/B4/M9/M11).
>
> **Dependency reality check (READ THIS):** the M9 multiplier-registry + declarative `applyReset` engine and
> the M11 Decimal-overflow guard are **specced but NOT yet built** in code (grep confirms: no
> `multiplierRegistry`/`applyReset`/`resetTier` modules exist; production is still the single imperative
> funnel `getCoreProductionMultiplier` at `formulas.ts:206`, resets are still imperative `set({...})` patches
> in `gameStore.ts`). **L4 is built before L6 and is sequenced to land M9/M11 first** (HARDENING-PLAN worklist
> §2-3). This spec is written **assuming M9/M11 exist by L6 build-time** and tells you exactly what to do in
> BOTH worlds (registry present → use it; registry still absent → the fallback hook). Do not invent the
> registry here; consume it.

---

## 1. Overview — the axis + the story beat it embodies

**Axis (LOCKED):** *Permanence — accrete-by-overwrite into permanent sediment.* L6 is **the first truly
permanent layer**: the one structure that survives **every** deeper reset, the Fall (L8) included
(`LADDER-MECHANICS.md:31`, matrix row `Palimpsest {top, ghosts[]} → resetTier: never`).

**The mechanic IS the story beat (LOCKED principle #1).** The `canon` beat (`beats.ts:96-104`,
`STORY-SPEC.md:88`) reads:

> *They will play your work long after you are dust. / Mortals call that immortality. / We call it a beginning.*

You literally **write your work into an eternal manuscript** that no reset can erase. A *palimpsest* is a
manuscript repeatedly overwritten where the old text still bleeds through — exactly the mechanic: a new
**Work** is written on top, the old top **sinks** into a fainter-but-undying **ghost**. "Mortals call that
immortality" = the permanent passive bonus; "we call it a beginning" = the L7/L8/L9 foreshadow (the canon is
the reservoir L7 discharges — `LADDER-MECHANICS.md:112`).

**The one decision (the soul of the layer, `LADDER-MECHANICS.md:109-111`):** ride a strong **top** Work for
its full live bonus *now*, or **canonize** (sink it) — locking a smaller-but-eternal fraction and freeing the
top slot for a bigger future peak. **Order matters** (depth sets decay). Plus the minor's 2nd lever
(`HARDENING-PLAN.md:88-92`): **choose what a Work snapshots** (see §3.6). Pure-idle payout — the stack pays
passively forever and only grows.

**Idle-FIRST (LOCKED principle #2):** the Palimpsest pays a passive multiplier every tick with **zero** input;
it never decays, never demands APM. Active play affects it only through the *peak you reach before canonizing*
(active amplifies the snapshot ≈1.4-1.75× because you reach higher peaks faster), never through clicking the
canonize button faster. There is no live meter to babysit.

**NO new global-× pile-on (LOCKED principle #3, HARDENING-PLAN B3):** the Canon bonus does **NOT** add another
raw global multiplier to the `getCoreProductionMultiplier` funnel. It pays a **structurally different** reward
on a **separate M9 channel** — **permanent unlock-slots / floors**, not a magnitude × (see §3.4). This is the
explicit B3 mandate: "Palimpsest pays structurally-different unlock-slots/floors" (`HARDENING-PLAN.md:36-37`).

---

## 2. New state (fields + types + resetTier + saveMigration)

### 2.1 The types — add to `src/store/types.ts`

```ts
/** A single canonized achievement, snapshotted at canonize-time. The eternal unit of L6. */
export interface CanonWork {
  /** Sublinear snapshot value (the "size" of the Work). See getWorkSnapshot (§3.2). A plain number —
   *  it is post-compression (log/root), so it is small and never needs Decimal. */
  score: number
  /** What this Work captured — drives the 2nd lever (§3.6) + UI label. */
  kind: CanonWorkKind
  /** Run-stamp for UI ("Opus #N"), display only. */
  index: number
  /** Wall-clock canonize time (ms), display only ("written 3 ascensions ago"). */
  canonizedAt: number
}

export type CanonWorkKind = 'peak-multiplier' | 'peak-soundwaves' | 'catalogue' // TBD which ship — §3.6

/** The eternal manuscript. resetTier: NEVER. Survives all resets incl. the Fall. */
export interface Palimpsest {
  top: CanonWork | null      // the current top Work (full bonus); null before first canonize
  ghosts: CanonWork[]        // index 0 = depth 1 (just-sunk), deeper = older/fainter
}
```

Add to `GameState` (`src/store/types.ts`, alongside the other layer blocks):

| Field | Type | Init | resetTier (matrix) | Notes |
|---|---|---|---|---|
| `palimpsest` | `Palimpsest` | `{ top: null, ghosts: [] }` | **never** | the eternal score (`LADDER-MECHANICS.md:31`) |
| `canonCount` | `number` | `0` | **never** | lifetime canonizations; UI + achievements |
| `peakProductionMult` | `Decimal` | `new Decimal(1)` | **L6 (Canon)** | the snapshot SOURCE — peak of the *bonus-excluded* funnel this L6-run (§3.3). Reset when you canonize/ascend past L6, NOT permanent. |
| `canonUnlocked` | `boolean` | `false` | **never** | gate flag (parallels `worldTourUnlocked`) |

> **Why `peakProductionMult` is a separate tracked field, not read live:** the snapshot must capture the
> *peak you held this run* (so canonizing rewards the climb), and it must **EXCLUDE the Canon bonus** to kill
> the self-feed loop (HARDENING-PLAN B2, §3.3). It is updated in the tick from the **bonus-excluded** funnel
> value and reset to 1 at canonize (so the next Work measures a fresh peak).

### 2.2 `createInitialState` — `src/store/initialState.ts:6-78`

Add the four fields to the returned object (after the `finalePoints`/`finaleCount` block, `:62-63`):

```ts
palimpsest: { top: null, ghosts: [] },
canonCount: 0,
peakProductionMult: new Decimal(1),
canonUnlocked: false,
```

### 2.3 saveMigration — `src/store/saveMigration.ts`

This is the load-crash surface; do all four steps (the B5 refactor exists, use it):

1. **`peakProductionMult` is a Decimal** → add `{ key: 'peakProductionMult', defaultValue: 1 }` to
   `TOP_LEVEL_DECIMAL_KEYS` (`saveMigration.ts:23-31`). Without this it loads as a raw number and
   `.times()` throws. **(M11 / B5 — this is exactly the silent-desync risk B5 was built to prevent.)**
2. **`palimpsest` (nested, contains no Decimals — `score` is a plain post-compression number)** → it is an
   object, so it is covered by `applyUndefinedDefaults` (`:132-139`) via `createInitialState` defaults. **But**
   add a guard migration to repair partial/old shapes (see step 4) — `{top, ghosts}` must always be
   well-formed before the reducer reads it.
3. **`canonCount`, `canonUnlocked`** → plain number/bool; `applyUndefinedDefaults` covers them. No action
   beyond having them in `createInitialState`.
4. **Add a numbered migration** to `MIGRATIONS` (`saveMigration.ts:151-155`) bumping `SAVE_SCHEMA_VERSION`
   (`src/store/saveSchema.ts`), e.g.:
   ```ts
   // vN: L6 Canon — ensure the Palimpsest is a well-formed {top, ghosts} object.
   N: (state) => {
     const p = (state as Partial<GameState>).palimpsest
     if (!p || typeof p !== 'object' || !Array.isArray((p as Palimpsest).ghosts)) {
       ;(state as Partial<GameState>).palimpsest = { top: null, ghosts: [] }
     }
   },
   ```
5. **`partialize`** (`gameStore.ts:924-931`): `palimpsest`/`canonCount`/`peakProductionMult`/`canonUnlocked`
   are plain state (not action fns), so they persist automatically — confirm none are in the destructured
   action-strip list. Add the new `performCanonize` / `unlockCanon` action names TO that strip list so they
   are not serialized.

---

## 3. The mechanic in detail (formulas / algorithm)

All new pure logic goes in a new module **`src/core/canon.ts`** (mirrors `worldTour.ts`/`records.ts`), with a
frozen `L6` tuning const block at the top (mirror `worldTour.ts:27-46`). **Every magnitude in this section is
`TBD — decide-at-build (sim/playtest)`** unless marked LOCKED-FORM.

### 3.1 The eternal bonus = `top + Σ ghosts`, capped (the payout)

```
getCanonBonus(palimpsest): number    // returns the structural reward magnitude (see §3.4 for what it BUYS)
  let total = palimpsest.top ? palimpsest.top.score : 0
  palimpsest.ghosts.forEach((g, i) => {
    const depth = i + 1                                  // depth 1 = first ghost
    const effDepth = min(depth, CANON_MAX_DEPTH)         // bounded max-effective-depth (B2) — LOCKED that it's bounded
    total += g.score * Math.pow(CANON_DECAY, effDepth)   // base × decay^depth — fainter, NEVER zero
  })
  return min(total, CANON_BONUS_CAP)                     // explicit ceiling (B2) — LOCKED that a cap exists
```

- **`CANON_DECAY`** — `0 < decay < 1` (e.g. ~0.6). **TBD — decide-at-build (sim/playtest).** LOCKED: each
  ghost pays `base × decay^depth`, "fainter the deeper but **never zero** — it's canon, it can't fully die"
  (`LADDER-MECHANICS.md:104-106`). Because `score > 0` and `decay > 0`, the term is strictly positive.
- **`CANON_MAX_DEPTH`** — bounds the effective decay exponent so a 200-deep stack can't underflow to
  meaningless-but-summed noise and so the tail is computable. **TBD magnitude; LOCKED that it is bounded**
  (HARDENING-PLAN B2 "bounded max-effective-depth").
- **`CANON_BONUS_CAP`** — explicit `MULT_CAP`-style ceiling on `(top + Σ ghosts)` (HARDENING-PLAN B2). **TBD
  magnitude; LOCKED that it exists.** This is the hard runaway-stop.
- **Decimal note (M11):** `score` is post-compression (small), and the sum is capped, so `getCanonBonus` is a
  plain `number`. But the **field it FEEDS** (the slot/floor channel, §3.4) must be range-checked by the M11
  dev-guard in `calculateTick` (throw on non-finite). If a future tuning makes the sum exceed safe range,
  promote to Decimal end-to-end (break_infinity has `log10/pow`).

### 3.2 The snapshot — what a Work is worth (SUBLINEAR, the B2 anti-runaway core)

```
getWorkSnapshot(peakProductionMult: Decimal): number    // LOCKED-FORM: sublinear
  if (peakProductionMult.lte(1)) return 0
  // sublinear compression — like getEncoreGain's ^0.03 (formulas.ts:168-172) / capped-log Acclaim
  return CANON_SNAP_K * Math.pow(peakProductionMult.log10(), CANON_SNAP_EXP)
```

- **LOCKED (HARDENING-PLAN B2):** the top-snapshot is **SUBLINEAR in peak** (log/root, like `getEncoreGain`'s
  `^0.03` or `getAcclaimMultiplier`'s capped-log). Use `log10()` of the peak then a sub-1 power, OR a small
  root of the raw peak — **TBD which form + `CANON_SNAP_K`/`CANON_SNAP_EXP`** (sim-tune so a full L6 run adds a
  *meaningful but bounded* slice). The form above (`K · (log10 peak)^exp`) is the recommended starting point.
- **LOCKED (HARDENING-PLAN B2, CRITICAL):** the snapshot **EXCLUDES the Canon bonus** — the source field
  `peakProductionMult` is the **bonus-excluded** funnel peak (§3.3). This breaks the self-feed loop: canonizing
  cannot grow the number that the next snapshot reads. **Verify with the no-self-feed sim invariant (§5).**
- Why `log10` is safe on a Decimal that can reach ~1e308: break_infinity's `.log10()` returns a normal float
  for any in-range Decimal; the `MILESTONE_PROD_CAP = Infinity` uncapped term (`constants.ts:102`,
  HARDENING-PLAN B4) is *exactly* the runaway this `log10` tames (`02-economy…md:159-162` flags this).

### 3.3 Tracking `peakProductionMult` (the bonus-excluded source) — in the tick

In `calculateTick` (`tick.ts:89-104`), the funnel value is computed as `globalMult`. **The Canon bonus must
NOT be inside that value** (it's a separate channel, §3.4), so `globalMult` is *already* bonus-excluded — good.
Add, right after `globalMult` is finalized (and after the challenge divisor at `:107-109`):

```ts
// L6 Canon: track the peak of the BONUS-EXCLUDED funnel this run (the snapshot source).
// Excludes the Canon channel by construction (it isn't in getCoreProductionMultiplier).
if (state.canonUnlocked && globalMult.gt(state.peakProductionMult)) {
  newState.peakProductionMult = globalMult
}
```

- **Which production value to snapshot is the §3.6 lever.** Default `kind: 'peak-multiplier'` uses
  `globalMult` (the funnel). If `kind: 'peak-soundwaves'`, snapshot `peakSoundwaves` instead. **TBD which
  kinds ship.**
- **Reset semantics:** `peakProductionMult` is `resetTier: L6` — it resets to `1` on canonize (§3.5) and on
  any ascension past L6. It is NOT permanent (only the *Works derived from it* are).

### 3.4 The reward channel (M9) — structurally DIFFERENT, NOT a global ×

**LOCKED (B3):** the Canon bonus buys **unlock-slots / permanent floors**, not a magnitude multiplier. Concrete
candidate forms (pick at build, sim-tuned — **TBD which**):

- **(A) Permanent floors** — the bonus sets a *minimum* on a re-earnable quantity, so every fresh climb starts
  partway up. E.g. a permanent **starting-SW floor** (compounds with `getAchievementStartingSW`,
  `achievements.ts:2371`) or a permanent **crescendo-ceiling floor**. This is "you never start from nothing
  again" — thematically perfect for permanence.
- **(B) Unlock-slots** — the bonus, crossing thresholds, grants discrete permanent **slots** (e.g. an extra
  Signature-budget slot for L4, an extra autobuyer kept through deeper resets, an extra ghost-depth that
  decays slower). Discrete, legible, non-multiplicative.

**Wiring via the M9 registry (preferred — assumes M9 built by L6 time):** L6 contributes ONE entry:
```ts
{ source: 'canon', value: getCanonBonus(state.palimpsest), channel: 'permanence',
  appliesToProduction: false }   // NOT the production channel — a structural/floor channel
```
The consumer (starting-SW floor, slot count, etc.) reads the `'permanence'` channel from the registry; it is
**filtered OUT** of the production reduce in the tick. Challenges/bosses that "disable Canon" filter by
`source: 'canon'` instead of hand-zeroing the field (the whole point of M9, HARDENING-PLAN.md:46-50).

**Fallback if M9 is somehow still not built at L6 time:** add a dedicated reducer `getCanonFloors(palimpsest)`
in `canon.ts` and consume it *outside* `getCoreProductionMultiplier` (e.g. fold the SW-floor into
`resetTiersAndSW`'s starting-SW computation, `gameStore.ts:60-94`; fold a slot count into the L4 budget calc).
**Never** add a `.times(canonBonus)` to the funnel (`formulas.ts:232-243`) — that is the B3 violation.

### 3.5 Canonize — the action (`performCanonize` in `gameStore.ts`)

`unshift` + recompute, the "lowest-risk, pure-data" build (`04…md:239`). Add alongside the other prestige
actions (near `performGrandFinale`, `gameStore.ts:880`):

```
performCanonize():
  state = get()
  if (!state.canonUnlocked) return
  if (!canCanonize(state)) return                        // gating — §3.7, TBD form
  const work: CanonWork = {
    score: getWorkSnapshot(state.peakProductionMult),    // SUBLINEAR, bonus-excluded
    kind: state.selectedCanonKind ?? 'peak-multiplier',  // §3.6 lever (or fixed if one kind ships)
    index: state.canonCount + 1,
    canonizedAt: Date.now(),
  }
  if (work.score <= 0) return                            // nothing worth canonizing yet
  const oldTop = state.palimpsest.top
  const newGhosts = oldTop ? [oldTop, ...state.palimpsest.ghosts] : state.palimpsest.ghosts
  set({
    palimpsest: { top: work, ghosts: newGhosts },        // new Work on top; old top sinks to depth 1
    canonCount: state.canonCount + 1,
    peakProductionMult: new Decimal(1),                  // reset the snapshot source (resetTier: L6)
    // ...plus whatever L6-tier reset the design wants on canonize (TBD: does canonize itself reset the
    //    run, or only ascending PAST L6 does? Decide-at-build — see §3.8 + Open Gaps.)
  })
```

- **`unshift` semantics LOCKED:** new Work → `top`; old `top` → `ghosts[0]` (depth 1); everything already in
  `ghosts` deepens by one (its decay grows). "Canonizing puts it on top at full strength and **sinks** the old
  top a level — everything below sinks deeper, decaying more" (`LADDER-MECHANICS.md:113`).
- **Order matters (LOCKED):** because depth sets decay, the *sequence* of canonizations is permanently baked
  in — a big Work canonized early decays away under later ones; the player chooses when to "spend" a peak.

### 3.6 The 2nd lever — choose what a Work snapshots (minor, `HARDENING-PLAN.md:88`)

LOCKED that there should be a 2nd lever ("L6 add a 2nd lever (choose what a Work snapshots)"). Implement as a
`selectedCanonKind: CanonWorkKind` UI selector that picks which quantity `performCanonize` snapshots
(`peak-multiplier` vs `peak-soundwaves` vs `catalogue`). Different kinds favor different builds (a Strings/L4
sustain build peaks differently than a Brass build), giving build-craft texture. **TBD which kinds ship + how
their snapshots are normalized to a comparable `score` scale** (sim — they must be roughly commensurable so no
kind is strictly dominant). If sim shows this adds confusion without depth, **the layer is still complete with
a single fixed kind** (`peak-multiplier`) — the lever is an enhancement, not load-bearing.

### 3.7 Gating canonize (`canCanonize`)

A canonize should be **worth** doing — gate so the player doesn't canonize a trivial Work and pollute the
stack. **TBD form (decide-at-build):** candidates — (a) require `getWorkSnapshot(peak) ≥ CANON_MIN_SNAP`;
(b) require the new Work to beat the current top (`score > top.score`) so the stack is monotone-ish at the
top; (c) a soft cooldown. **LOCKED principle:** gating must never demand APM and must be idle-reachable
(idle-first). Show the projected `score` + the **eternal delta on the button** (LOCKED minor,
`HARDENING-PLAN.md:89-90`: "show the eternal delta on the button").

### 3.8 Unlock (`unlockCanon`) + where L6 sits in the reset ladder

- **Unlock:** parallels `unlockWorldTour` (`gameStore.ts`). Gate **TBD** (decide-at-build) — naturally gated
  behind L5 Virtuoso completion + some progress threshold. Sets `canonUnlocked = true`, fires the `canon`
  story beat (`setStoryBeatSeen('canon')`).
- **Reset ladder position (LOCKED):** Canon is the L6 reset event in the matrix order *Encore → MO → Tour →
  Signature(L4) → Virtuoso(L5) → **Canon(L6)** → GrandFinale(L7) → Fall(L8)* (`LADDER-MECHANICS.md:13-14`).
  Ascending past L6 resets everything tagged shallower than `never`. The **Palimpsest itself is `never`** — it
  is the thing that *survives*. **TBD (decide-at-build):** whether `performCanonize` is *itself* the L6
  ascension (does writing a Work also deep-reset L1-L5?), or whether canonizing is a free in-layer action and a
  *separate* "ascend past L6" event does the reset. The mechanic text ("ride the top now vs sink it") reads
  more like an **in-layer free action** with the reset deferred — **lean that way, confirm in sim/playtest.**

---

## 4. UI surface

A new **Canon panel** (mirror the World Tour panel's structure; see `worldTour`-driven components). Minimum:

1. **The manuscript stack** — `top` Work rendered prominently (full bonus), `ghosts[]` listed below, each
   showing its decayed contribution `score · decay^depth` and getting visually fainter with depth (a literal
   palimpsest — older text bleeding through). Show each Work's `kind` + `index` ("Opus #N").
2. **The Canonize button** — shows the **projected new Work `score`** AND **the eternal delta**: how much
   `getCanonBonus` changes if you canonize now (LOCKED minor). This makes the core decision (ride vs sink)
   legible: the button literally previews "lock +X forever, but lose your live top bonus of Y."
3. **The 2nd-lever selector** (§3.6) — pick what the next Work snapshots, if >1 kind ships.
4. **Current eternal bonus readout** — `getCanonBonus` and **what it BUYS** in concrete terms (e.g. "+N
   starting Soundwaves forever" / "+1 permanent slot"), never an opaque "×". (Echoes the LOCKED
   challenge-reward-opacity fix, `HARDENING-PLAN.md:90`: concrete readouts.)
5. **A mechanic card** teaching the new verb on first unlock (LOCKED minor, `HARDENING-PLAN.md:89`:
   "per-layer mechanic cards to teach each new verb; narrator stays pure").
6. **Era theming:** L6 is `near-peak gold` (`STORY-SPEC.md:57`). Tie into the existing era/liveliness system
   (`eraTheme.ts`, `formulas.ts:190-192`) — Canon unlock advances era theming toward peak gold.

Idle-first UI rule: the panel must be **fully informative AFK** — the passive bonus ticks with no input; the
only interactive element is the deliberate Canonize decision.

---

## 5. Sim / validation plan (what a sim MUST assert)

Add `sim/canon-pacing.test.ts` (mirror `sim/l3-pacing.test.ts` / `era-pacing.test.ts` harness — drive REAL
`calculateTick` + the real `performCanonize`, `gameStore` actions; never re-implement formulas). **LOCKED
invariants the sim must assert:**

1. **NO SELF-FEED (the B2 headline).** Canonize a Work, read the next `peakProductionMult`/snapshot source —
   it must be **unaffected** by the existing Canon bonus. Concretely: with two otherwise-identical runs, one
   with a big existing Palimpsest and one empty, the *snapshot value of an identical peak* is **equal**. (If
   they differ, the bonus is leaking into the source → fail.)
2. **SUBLINEAR snapshot.** `getWorkSnapshot(peak)` grows much slower than `peak`: assert e.g. a 10×-higher
   peak yields a <2× higher snapshot (exact ratio TBD by the chosen exponent, but **strictly sublinear**).
3. **BONUS IS CAPPED.** Drive many canonizations of huge Works; assert `getCanonBonus` asymptotes to
   `CANON_BONUS_CAP` and never exceeds it. Assert `calculateTick`'s M11 guard never throws (no non-finite).
4. **GHOSTS DECAY BUT NEVER ZERO.** After N canonizations, assert each ghost's contribution is strictly `> 0`
   and strictly monotone-decreasing with depth (up to `CANON_MAX_DEPTH`, after which it's clamped).
5. **PERMANENCE.** Simulate the full reset ladder — Encore, MO, Tour, (L4/L5 stubs), **and the Fall (L8
   deep-reset)** — and assert `palimpsest` and `canonCount` are **byte-identical before/after** every reset
   (resetTier: never). Assert `peakProductionMult` **IS** reset by the L6 ascension (resetTier: L6).
6. **IDLE-FIRST RATIO.** The Canon bonus accrues identically AFK vs active *per unit of peak reached* — assert
   a 24h-AFK run and an active run that reach the same peak produce the **same** Work `score` (no
   click-to-canonize-faster advantage). Active's only edge is reaching higher peaks faster (the ≈1.4-1.75×
   amplify is upstream in L1-L5, not in L6 itself).
7. **ORDER MATTERS.** Two canonization sequences with the same Works in different orders produce **different**
   `getCanonBonus` (the early-big-Work-decays-away property) — proves depth/decay is load-bearing.
8. **SAVE ROUND-TRIP.** `migratePersistedSave` on (a) a pre-L6 save and (b) an L6 save round-trips
   `palimpsest`/`peakProductionMult` (Decimal revived) with no crash (extend `saveMigration.test.ts`).

---

## 6. Acceptance criteria

- [ ] `palimpsest`, `canonCount`, `peakProductionMult`, `canonUnlocked` added to `GameState`,
      `createInitialState`, `partialize` strip-list, and `saveMigration` (Decimal key + guard migration +
      bumped `SAVE_SCHEMA_VERSION`). `tsc` clean.
- [ ] `src/core/canon.ts` exports `getCanonBonus`, `getWorkSnapshot`, `canCanonize`, `getCanonFloors`/registry
      contribution, and a frozen `L6` tuning const block.
- [ ] `performCanonize` + `unlockCanon` actions in `gameStore.ts`; `performCanonize` does `unshift` + snapshot
      reset; Palimpsest survives every existing reset path (verified by sim #5).
- [ ] The Canon bonus reaches the game **only** via the M9 `'permanence'` (non-production) channel / a
      floors-and-slots consumer — it is **absent** from `getCoreProductionMultiplier` (`formulas.ts:232-243`).
      Grep proof: no `.times(canon...)` in the funnel.
- [ ] Snapshot is sublinear AND bonus-excluded (sim #1, #2 green).
- [ ] `getCanonBonus` is capped + bounded-depth; M11 guard never throws (sim #3 green).
- [ ] Canon panel renders the manuscript stack, a Canonize button **showing the eternal delta**, a concrete
      "what it buys" readout, and a first-unlock mechanic card. Fully informative AFK.
- [ ] `canon` story beat fires on unlock (`beats.ts:96-104`).
- [ ] `sim/canon-pacing.test.ts` green; full suite + `tsc` + build gate pass before commit.

---

## 7. Dependencies (what must exist first)

| Dependency | Status | Why L6 needs it |
|---|---|---|
| **M9 multiplier-registry + declarative resets** | specced, NOT built (HARDENING-PLAN worklist §2) — **L4 lands it** | L6's reward must ride a *separate channel*; the `'permanence'` channel + `source:'canon'` filtering is the clean B3-compliant wiring. Fallback in §3.4 if absent. |
| **M11 Decimal-overflow guard in `calculateTick`** | specced, NOT built (worklist §3) — **L4 lands it** | guards the slot/floor channel the Canon bonus feeds against non-finite. |
| **B4 milestone-cap contract decision** | `MILESTONE_PROD_CAP = Infinity` (`constants.ts:102`) | the uncapped funnel is *why* the snapshot MUST be sublinear (§3.2). The `log10` snapshot is the agreed taming per B4 ("keep uncapped but force L6's snapshot sublinear"). |
| **L5 Virtuoso (built)** | next build before L6 (sequential, LOCKED) | L6 unlock is gated behind L5 in the ladder; L5 lands the reset-ladder slot above it. |
| **B5 save-migration refactor** | **DONE** (HARDENING-PLAN.md:134) | the `version`+`MIGRATIONS[]`+`reviveDecimals` machinery L6's migration plugs into. |
| Reset matrix `Palimpsest → never` | LOCKED (`LADDER-MECHANICS.md:31`) | the contract the permanence sim asserts. |
| `canon` story beat | EXISTS (`beats.ts:96-104`) | fired on unlock; no new copy needed. |

**Forward coupling (do not break):** the Palimpsest is **L7's reservoir** — L7's Final Performance discharges
the accreted score (`LADDER-MECHANICS.md:112`, `04…md:235`). Keep `getCanonBonus` (or the raw `top + Σghosts`)
readable by L7 without mutation. And it must **survive the Fall (L8)** — the permanence the comeback preserves.

---

## 8. Open gaps (TBD — decide-at-build, sim/playtest)

1. **`CANON_DECAY`** value (LOCKED-FORM `base × decay^depth`, `0<decay<1`).
2. **`CANON_MAX_DEPTH`**, **`CANON_BONUS_CAP`** magnitudes (LOCKED that both exist/bound).
3. **`CANON_SNAP_K` / `CANON_SNAP_EXP`** + which sublinear form (log-power vs root) for `getWorkSnapshot`
   (LOCKED that it's sublinear + bonus-excluded).
4. **What the reward channel BUYS** — floors (A) vs slots (B) vs a blend (§3.4). LOCKED: structural, never a
   global ×.
5. **`canCanonize` gating form** (§3.7) — min-snapshot vs beat-the-top vs cooldown. LOCKED: idle-reachable.
6. **The 2nd lever** — which `CanonWorkKind`s ship + their normalized scales (§3.6). Layer is complete with a
   single fixed kind if sim shows the lever adds confusion.
7. **Does `performCanonize` itself deep-reset L1-L5, or is canonize a free in-layer action with a separate
   "ascend past L6" event doing the reset?** (§3.8) — lean **free in-layer action**; confirm in playtest.
8. **L6 unlock gate** threshold (§3.8) — gated behind L5 + a progress bar; magnitude TBD.
9. **Era/liveliness tie-in** specifics for `near-peak gold` (§4).

---

*Cross-refs: `docs/LADDER-MECHANICS.md` §L6 `:101-116` + reset matrix `:10-39`; `docs/bible/04-forward-design-L4-L9.md`
§5 `:209-240`; `docs/bible/02-economy-formulas-resets.md` §1 (funnel), §3.2 (milestone runaway / B2 hazard),
§6 (reset matrix), §7 (caps); `docs/HARDENING-PLAN.md` B2/B3/B4/M9/M11 + minors `:88-92`; `docs/STORY-SPEC.md`
`:57,88,110`. Code hooks: `formulas.ts:206` (funnel — stay OUT of it), `tick.ts:89-109` (peak tracking +
M11 guard), `gameStore.ts:60-94` (resetTiersAndSW / floor consumer), `gameStore.ts:874-908` (prestige-action
neighbor), `initialState.ts:62`, `saveMigration.ts:23-31,151-155`, `beats.ts:96-104`.*
