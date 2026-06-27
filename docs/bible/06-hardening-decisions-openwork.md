# 06 — Hardening, the Decisions Log & Open Work

> **Purpose.** This is the *pre-build firewall*. Before any Layer-4+ code is written, a two-headed
> red-team (a 7-lens ultracode pass + an independent Codex pass) audited the design and the live code.
> They corroborated: **the front half is sound, the back third is not yet.** This file is the durable
> record of (a) the verdict, (b) the blockers and their agreed fixes with *current status*, (c) the
> decisions that are now LOCKED, (d) the one thing that *looked* like a bug but was verified safe, and
> (e) the exact "what's next" sequence so a fresh session can pick up mid-stream without re-litigating.
>
> **Source docs:** `docs/HARDENING-PLAN.md` (the locked plan), `docs/RECONCILE-PLAN.md` (the L3
> scope-creep undo), `docs/LADDER-MECHANICS.md` (now holds the authoritative 9-layer reset matrix),
> `docs/LAYER3-SPEC.md` (superseded layer-count framing). Session commits `e857de4 → ccb07f2`.
>
> **Accuracy note.** Every load-bearing claim below was re-checked against the live code on
> `feat/layer3` while writing this file. Where the plan's stated *status* and the code reality
> diverge, this file flags it explicitly (see B5 and the capstone — both are **further along / less
> done than a casual reading of the plan implies**). Trust the code citations over prose.

---

## 1. The red-team verdict

| Aspect | Verdict |
|---|---|
| **Who** | Two independent reviews — an in-house **7-lens ultracode** workflow and an external **Codex (gpt-5.5)** pass. They **corroborated** each other (not a single reviewer's opinion). |
| **Front half (L1–L3)** | **Sound.** L1 Encore + L2 Magnum Opus + L3 World Tour are built, reconciled, and green. No structural holes. |
| **Back third (L7–L9)** | **Real holes.** The permanence stack (L6 Palimpsest, L8 Recognition), the 9-layer reset matrix, and the late-layer multiplier budget all have unresolved runaway / collision / soft-lock risks. |
| **Timing** | Caught **before** building L4 — the cheapest possible moment. The locked decision (#1 below) is **harden first**: do the reconcile + architecture refactors before a single line of L4 code. |
| **Status of the plan itself** | `docs/HARDENING-PLAN.md` is **LOCKED 2026-06-28**. Its revisions *supersede* the matching `LADDER-MECHANICS.md` layer sections — fold them in at build time. |

The plan's own one-line summary (`HARDENING-PLAN.md:3-5`): *"L1–L3 (built) are sound; the back third
(L7–L9), the permanence stack, and the 9-layer reset matrix have real holes."*

---

## 2. The LOCKED decisions (from the red-team question batch)

These four are settled design law. They came out of the red-team's AskUserQuestion batch and are not
to be re-opened without a fresh design pass. (`HARDENING-PLAN.md:8-20`.)

### D1 — Harden first
Do the reconcile + architecture refactors **before any L4 code**. (`HARDENING-PLAN.md:9`.)

### D2 — Constraint-trio = THREE distinct modalities (kills the "three solitaire layers" smell)
L3, L8, and L9 must each be a *categorically different* kind of challenge, not the same
optimization puzzle reskinned. (`HARDENING-PLAN.md:10-13`.)

| Layer | Modality | Axis |
|---|---|---|
| **L3** | Static single-constraint runs (**keep as built**) | Beat a *fixed* handicap |
| **L8** | Race a **GROWING debuff** you buy down with Recognition | Outrun a *closing* debuff (time pressure, not a fixed wall) |
| **L9** | **REACTIVE / adaptive bosses** — the warp changes phase in response to your dominant tier/domain | A *duel*: read-and-respond, categorically unlike L3/L8 solitaire |

### D3 — L7 scores TIMING / ORDER, not magnitude-evenness
L7 (the decrescendo) scores ***when* you silence each voice (temporal/sequence)**, NOT *how much*
each voice contributes. Two payoffs: (1) escapes L4's allocation-math collision (no shared
magnitude-blend), and (2) kills harmonic-mean sandbagging (there is no magnitude blend left to game).
(`HARDENING-PLAN.md:14-16`.)

### D4 — L5 idle fix: decay the band HEIGHT, cap the ratio, reward Take-count
(`HARDENING-PLAN.md:17-20`.) AFK must accrue *only baseline rate*:
- The idle band's **height/multiplier decays to the floor** (not just the width widening).
- Cap active : idle ≈ **1.5–2×**.
- Tie the headline Mastery reward to **completed-Take count** (idle-accruable); band-tightness only
  *shaves time*, never adds raw power.
- Offline Take = accrue floor only — **analytic, not 86k chunked iterations**.
- **Sim invariant:** sim 24h-AFK vs active and assert the ratio sits in the window.

### Fixed-Signature-budget (L4) — the fifth standing decision
L4's allocation pie stays **FIXED** (`HARDENING-PLAN.md:56-59`). Growth, if any, buys
efficiency/slots with hard diminishing returns — *never more raw pie* (or "Harmony + everything"
becomes objectively correct). The **Signature allocation persists as the identity record** (it drives
the L9 mirror) even across the L8 fall; only the *live production effect* resets with the layer.

---

## 3. The 5 blockers — fixes & CURRENT STATUS

Status legend: ✅ done & committed · 🟡 in progress (written, not gated/committed) · 📄 locked-in-doc
(decision fixed, code not yet touched) · ⛔ pending (not started).

| # | Blocker | Agreed fix | Status |
|---|---|---|---|
| **B1** | **Reconcile to 9 layers everywhere.** `LAYER3-SPEC` §1/§3.5/§6.5 was still the dead **6-layer** ladder ("Grand Finale = L6 = end"). | Add a supersession banner; re-tag `finalePoints`/`performGrandFinale` as **L7, one-time** (never repeatable); build **ONE authoritative 9-layer reset matrix**, every field tagged with its deepest-wipe tier. | ✅ **DONE** — commits `22e3959`, `ccb07f2`. Banner at `LAYER3-SPEC.md:7-17`; matrix at `LADDER-MECHANICS.md` (the "⭐ RESET MATRIX" block). |
| **B2** | **Permanence runaway** — L6 Palimpsest + L8 Recognition could compound without bound. | **Locked forms** (see §5): Recognition = additive & capped `1 + r·comebacks` (cap 3), does **not** feed L9. Palimpsest top-snapshot = **SUBLINEAR** in peak (log/root, like `getEncoreGain`'s `^0.03`), **excludes the Canon bonus** (no self-feed), explicit `MULT_CAP` on `(top + Σghosts)`, bounded max-depth. **L8 sim invariant:** `comeback_time[1] > [2] > [3]` AND each ≥ ~30–60s floor. | 📄 **Locked-in-doc** — forms fixed in `HARDENING-PLAN.md:30-32`; reflected as `never`-tier rows in the reset matrix. No L6/L8 code exists yet, so nothing to gate. Enforce when those layers are built. |
| **B3** | **Permanent-multiplier budget (Codex blocker)** — production is ONE multiplicative funnel (achievements ~×3.57, Acclaim ≤×49, challenges ×5.6–11.2 *already*). L4/L5/L6/L8 must not *all* become global-prod ×. | Give later layers **separate channels / hard caps / scoped effects** (Recognition buys speed/time; Palimpsest pays structurally-different unlock-slots/floors — *not* another global ×). | 📄 **Locked-in-doc** — `HARDENING-PLAN.md:33-36`. Architecturally enforced later by **M9** (the multiplier registry's `channel` tag). |
| **B4** | **`MILESTONE_PROD_CAP = Infinity` contradicted its docstring** ("capped at 4"). The uncapped exponential is what makes B2 *reachable*. | **Decide + align.** Decision: keep it **UNCAPPED by design** (the "buy-10 chase", bounded in practice by exponential tier-cost growth — balanced for L1–L3). Fix the *docstring* to match, and flag that any layer snapshotting production must take this term **sublinearly**. | ✅ **DONE** — `22e3959`. Code: `constants.ts:102` (`= Infinity`, comment "uncapped"), docstring corrected at `formulas.ts:50-54` (now warns L6 must snapshot sublinearly). `getMilestoneMultiplier` at `formulas.ts:55-59`. |
| **B5** | **Save-migration refactor** — the hand-maintained `undefined`-check list + the 45-field offline-replay literal were a silent-desync / load-crash risk for every future Decimal field. | Replace with a numeric **`version` + ordered `migrations[]`** of pure `(old)=>new` fns + a **table-driven `reviveDecimals(state, DECIMAL_KEYS)`**. | 🟡 **IN PROGRESS — written but UNCOMMITTED.** The refactor exists in the working tree but is **not yet committed or gated** (see §3.1). |

### 3.1 — B5 reality check (important for the next session)

The HARDENING-PLAN sequences B5 in step 3, implying "not started." **The code is actually well past
that.** As of the working tree on `feat/layer3`:

- **Untracked (new) files:** `src/store/saveMigration.ts`, `src/store/saveMigration.test.ts`,
  `src/store/saveSchema.ts`, `src/store/initialState.ts`.
- **Modified:** `src/store/gameStore.ts`, `src/store/types.ts`.
- `git log -- src/store/saveMigration.ts` → **empty** (never committed).

The new `saveMigration.ts` already implements the entire agreed design:
- Numeric version chain — `runMigrationChain` walks `saveSchemaVersion ?? 0` up to `SAVE_SCHEMA_VERSION`,
  applying `MIGRATIONS[version]?.(state)` per step (`saveMigration.ts:150-163`). v1 is an identity
  baseline; future fields slot in as v2, v3, …
- Table-driven Decimal revival — `TOP_LEVEL_DECIMAL_KEYS` table (`saveMigration.ts:23-31`) drives a
  generic `reviveDecimals` (`:97-107`) that also recurses into tiers + the pre-challenge snapshot.
- The legacy guard buckets are now declarative tables: `FALSY_DEFAULT_KEYS` (`:36-47`),
  `FINITE_NUMBER_KEYS` (`:50-53`), `SKIP_DEFAULT_KEYS` (`:56-66`).
- `migratePersistedSave` (`:166-175`) is the single entry: run chain → falsy defaults → finite defaults
  → undefined defaults → revive Decimals → story-beat seeding.

**➡️ Action for B5:** this is a **gate-and-commit task, not a build task.** Run `tsc -b`, the
`saveMigration.test.ts` suite, and a load-an-old-save smoke check, then commit. Confirm the old
hand-maintained `undefined` list and the 45-field offline-replay literal in `gameStore.ts` were fully
removed (the `gameStore.ts` modification should be the deletion of that legacy code).

### 3.2 — The capstone exploit + challenge sim (a sixth tracked item, alongside the blockers)

The plan lists this under "BUILT-CODE BUGS … the capstone one is LIVE on master"
(`HARDENING-PLAN.md:76-80`). It is the most urgent *correctness* item and is **still unfixed**:

> **Capstone exploit (LIVE).** `getChallengeMultipliers` sums only **completed** challenge best-times,
> and the capstone challenge `ch_unplugged` **unlocks on peak-Soundwaves (`1e72`)**, *not* on all-12
> cleared. So a player who skips challenges contributes **0 time** to the speed metric → gaming the
> speed-scaled capstone for a free large multiplier.

**Verified live in code:**
- `src/core/challenges.ts:116-122` — the capstone branch loops `for (const id of completed)
  totalTime += challengeBestTimes[id] ?? 0` — **only the completed set**, uncleared count as nothing.
- `src/core/challenges.ts:374` — `ch_unplugged` has `unlockThreshold: { peakSoundwaves: '1e72' }`
  and `reward: { capstone: true }` (`:372`). Unlock is peak-SW gated (`isChallengeUnlocked`,
  `:138-144`), **not** all-cleared.

**Agreed fix (pending):** gate the capstone on **all 12 clears**, OR count uncleared challenges as
**floor-time penalties** so skipping hurts the metric. AND: build the **still-LOCKED `§2.8` challenge
sim** before shipping magnitudes; fold the 4 flat clears into ONE additive bucket + the capstone as a
separate capped factor. Status: ⛔ **pending** (the reward *system* was built — commits `342a32d`,
`71eafd1`, `7be4f24` — but the exploit gate and the sim are not done).

### 3.3 — Architecture refactors (M9 + M11) — both PENDING

Cheap now, expensive later. Do before L7. (`HARDENING-PLAN.md:45-53`.)

| # | Refactor | What | Status |
|---|---|---|---|
| **M9** | **Multiplier registry + declarative resets** | Each layer contributes `{source, value, channel, appliesToProduction}` to an array the tick reduces + the UI reads (challenges/bosses filter by `source` tag instead of callers hand-zeroing fields). Tag every field with a `resetTier` in ONE table (= the §3.5 matrix as source of truth); every prestige action becomes `applyReset(state, tier)`. Fixes `performGrandFinale` drifting out of sync. | ⛔ **Pending.** The *table* now exists (the reset matrix, B1 done), but `applyReset` and the registry array are not built. Currently each prestige fn (`performMagnumOpus`, `performTour`, `performGrandFinale`) hand-zeroes its own fields. |
| **M11** | **Decimal-overflow guards** | Anything that can exceed ~1e300 (L7 harmonic/sequence math, L6 `top + Σghosts`, L9 goal-checks) must be **Decimal end-to-end**. Add a dev-build NaN/Infinity guard in `calculateTick` that **THROWS** on a non-finite multiplier. | ⛔ **Pending.** No guard in `tick.ts` yet. |

---

## 4. VERIFIED — NOT a bug (the `performTour` / `lifetimeEncorePoints` misread)

This is the cautionary tale of the session: **a reviewer flagged a bug; verification against full code
context proved it was correct-by-design. No code changed.** (`HARDENING-PLAN.md:81-85`, commit
`ccb07f2`.)

**The flag (Codex):** "`performTour` resets `lifetimeEncorePoints` — a permanent-looking field is
being wiped on a tour."

**The verification (correct, do not re-touch):**
- `lifetimeEncorePoints` is **not** a permanent floor despite the "lifetime" name — it **IS** the Encore
  production multiplier. `getEncoreMultiplier(p.lifetimeEncorePoints)` at `formulas.ts:163`/`:232`;
  consumed in `PrestigePage.tsx:61` and `Header.tsx:51`.
- It is **MO-tier** — it resets on *every* Magnum Opus by design (`gameStore.ts:717`, in the block
  commented *"Magnum Opus fully resets the Encore layer (production mult comes from
  lifetimeEncorePoints)"* at `:700`). It is also reset on the post-Platinum MO path (`:845`) and on
  Grand Finale (`:894`).
- Therefore resetting it on a **tour** (which is at least MO-deep) is **consistent and intentional**.
- The real persistent counter is the *separate* field **`lifetimeEncoreCount`** (`types.ts:67`,
  incremented at `gameStore.ts:651`), which **does** persist across tours (by omission,
  `gameStore.ts:859`).

**Root cause of the false alarm:** the old `LAYER3-SPEC §3.5` reset matrix had a wrong row ("L3 keeps
`lifetimeEncorePoints`"). That doc row was the error — **not** the code. The fix was to **correct the
matrix**, not the code. The authoritative matrix row now reads (`LADDER-MECHANICS.md`):

> `lifetimeEncorePoints` → resetTier **MagnumOpus** — "NOT permanent despite the name … it IS the
> Encore production mult (`getEncoreMultiplier`) and resets every MO (gameStore:789) … Codex's
> 'performTour wipes it' flag was a MISREAD (verified). `lifetimeEncoreCount` is the persistent counter."

**Lesson logged:** a reviewer without full code context can misread an intentional reset as a bug —
**verify against the code before blind-fixing.** (The *other* Codex finding, the capstone exploit
§3.2, was verified **real** by the same pass — verification cuts both ways.)

---

## 5. Permanence forms locked in-doc (B2 detail)

The deep-permanent fields are what L8/L9 stand on, so their forms are pinned even before the layers
exist. From `HARDENING-PLAN.md:30-32` + the reset-matrix `never`-tier rows:

| Mechanic | Layer | Locked form | Why |
|---|---|---|---|
| **Recognition** | L8 | **Additive, capped:** `1 + r·comebacks`, capped at **3**. Does **NOT** feed L9. It is "the gods' attention" — persists across comebacks and the Fall. | Additive+capped can't runaway-compound; not feeding L9 prevents the back-door into the boss layer. |
| **Palimpsest** {top, ghosts[]} | L6 | Top-snapshot is **SUBLINEAR** in peak (log/root, like `getEncoreGain`'s `^0.03`); snapshot **EXCLUDES the Canon bonus** (no self-feed loop); explicit **`MULT_CAP`** on `(top + Σghosts)`; **bounded max-effective-depth**. resetTier = **never** (survives the Fall). | Sublinear + cap + no self-feed = the three independent brakes on B2 runaway. |
| **Signature allocation** | L4 | resetTier = **never** (identity record). Live production effect resets with the layer. | Drives the L9 mirror without carrying raw power. |
| **`challengeBestTimes`** | — | **never** — the capstone recomputes from survivors after the Fall. | Skill record. |
| **`seenStoryBeats`** | — | **never** — only `?fresh` wipes. | Story-seen flags. |

**L8 sim invariant (LOCKED):** `comeback_time[1] > [2] > [3]` (each comeback faster than the last) AND
each stays above a **~30–60s floor** — never instant, never a wall. Enforce when L8 is simmed.

---

## 6. WHAT'S NEXT — the sequence

Per `HARDENING-PLAN.md:94-100`, annotated with the *actual* current state so a fresh session knows
where the cursor really is:

```
1. B1 reconcile (docs + code + the ONE 9-layer reset matrix) + B4 milestone-cap contract
     → ✅ DONE (commits 22e3959, ccb07f2)
2. B2 lock Recognition/Palimpsest forms + the L8 sim invariant; B3 permanent-power budget/channels
     → 📄 LOCKED IN DOC (no code to write until L6/L8 exist)
3. B5 save-migration refactor + M9 multiplier-registry/declarative-resets + M11 Decimal guards
     → B5 🟡 WRITTEN, NOT COMMITTED (gate + commit it) · M9 ⛔ pending · M11 ⛔ pending
4. Fix the 2 built-code bugs + build the §2.8 challenge sim
     → performTour ✅ VERIFIED-not-a-bug (no change) · capstone exploit ⛔ STILL LIVE (fix it) · challenge sim ⛔ pending
5. THEN build L4 (re-pitched fixed-budget) → L5 → L6 → re-spec L9 as a boss-FSM, ONE god first
     → ⛔ blocked on steps 3–4
```

### Concrete next actions, in order

1. **Gate + commit B5** (§3.1). It's the only "in-flight" item — finish it first so the working tree
   is clean. Run `tsc -b`, `saveMigration.test.ts`, and a load-old-save smoke check; verify the legacy
   `undefined`-list and 45-field offline literal are gone from `gameStore.ts`.
2. **Fix the capstone exploit** (§3.2) — it is *live on master*, the highest-priority correctness item.
   Gate the capstone on all-12-cleared OR floor-penalize uncleared, at `challenges.ts:116-122` /
   `:374`.
3. **Build the §2.8 challenge sim** before shipping any magnitudes; fold 4 flat clears into one
   additive bucket + capstone as a separate capped factor.
4. **M9 + M11** (architecture refactors) — do before L7. M9 turns the now-authoritative reset matrix
   into a real `applyReset(state, tier)` + multiplier registry; M11 adds the dev-build non-finite
   throw to `calculateTick`.
5. **Only then build L4** (fixed-budget Signature), then L5, L6, and re-spec L9 as a boss-FSM module
   — budget L9 as the single largest build and **build ONE god end-to-end first**
   (`HARDENING-PLAN.md:68-73`).

### Don't-forget guardrails (fold in during the above)
- The **minors list** (`HARDENING-PLAN.md:87-92`): L5 "(We were never the living)" reveal pulled back
  to a fingerprint; fake-credits leak (narrator goes silent at the Finale); L6 second lever + show the
  eternal delta on the button; per-layer **mechanic cards**; challenge-reward opacity (concrete
  readouts); L3 onboarding gate; accessibility (toggle-conduct, no hold-only paths).
- The **design revisions** (`HARDENING-PLAN.md:55-73`) **supersede** the matching `LADDER-MECHANICS.md`
  layer sections — read them at build time for L4 (fixed pie), L5 (height-decay idle), L7
  (timing/decrescendo, previewed-staged commits, live-channels-only drain), L8 (explicit previewed
  Fall, framed as a postgame campaign), L9 (reactive boss-FSM, every goal passive-accruable, no
  soft-lock signature-mirror, free L9-scoped re-allocation between fights).

---

## 7. Quick reference — every claim's code anchor

| Claim | Anchor |
|---|---|
| `MILESTONE_PROD_CAP = Infinity`, "uncapped by design" | `src/core/constants.ts:102` |
| `getMilestoneMultiplier` + corrected docstring (B4) | `src/core/formulas.ts:50-59` |
| `lifetimeEncorePoints` = Encore prod mult, MO-tier | `src/core/formulas.ts:163`, `:232`; reset at `gameStore.ts:717`, `:845`, `:894` |
| `lifetimeEncoreCount` = the real persistent counter | `src/store/types.ts:67`; `gameStore.ts:651`; persists across tour `gameStore.ts:859` |
| Capstone exploit — sums only completed times | `src/core/challenges.ts:116-122` |
| Capstone `ch_unplugged` unlocks on peak-SW not all-cleared | `src/core/challenges.ts:372-374`; gate fn `:138-144` |
| `getChallengeMultipliers` aggregate | `src/core/challenges.ts:94-127` |
| B5 new save-migration (uncommitted) | `src/store/saveMigration.ts` (whole file); chain `:150-163`; entry `:166-175` |
| 9-layer reset matrix (B1, authoritative) | `docs/LADDER-MECHANICS.md` "⭐ RESET MATRIX" |
| LAYER3-SPEC supersession banner | `docs/LAYER3-SPEC.md:7-17` |
| Hardening plan (all decisions/blockers) | `docs/HARDENING-PLAN.md` |
| Reconcile plan (L3 scope-creep undo) | `docs/RECONCILE-PLAN.md` |
| Session commits | `e857de4` (plan), `22e3959` (B1+B4), `ccb07f2` (matrix correction) |
