# Build-Spec — L9 "The gods" (the Bosses)

> **Status:** implementation-ready build-spec for a FRESH session. Mechanics are LOCKED
> (`docs/LADDER-MECHANICS.md:149-161`, `docs/STORY-SPEC.md:36-48,101-106`,
> `docs/bible/04-forward-design-L4-L9.md §9`, `docs/HARDENING-PLAN.md` decision 2 + L9 revision).
> **Numbers are deliberately absent** — every magnitude below is tagged
> **`TBD — decide-at-build (sim/playtest)`**. Do NOT invent them.
>
> **Read first (this session assumes they exist):** the M9 multiplier-registry + declarative-reset
> engine (`applyReset(state, tier)`, `resetTier` table), M11 Decimal-overflow guards, and the built
> L4 Signature allocation (the `never`-tier identity record). L9 is **coupled to L4** by that record
> (`bible §9.2`). If M9/L4 are not yet built, **stop and build them first** — L9 cannot be specced
> against the imperative reset code or a missing Signature record.
>
> **Budget (LOCKED):** L9 is **the single largest build of the whole ladder.** Build **ONE god
> end-to-end first** (recommend a domain-god, e.g. Timpana), prove the FSM + warp + passive-accrual
> goal + claim-power loop, sim it, *then* template the other four + the Twins + the Maestro.

---

## 1. Overview — the axis and the story beat it embodies

**Axis (the 9th, final verb):** **Bosses — a reactive, bent-reality duel.** Every prior layer is
*solitaire optimization* (you against the math). L9 is the only layer where the math **reads you back**:
each god is a reality whose warp **changes phase in response to your dominant tier/domain.** This is
categorically unlike L3 (static single-constraint runs) and L8 (race a growing debuff) —
`HARDENING-PLAN.md` decision 2: "L9 = REACTIVE/adaptive bosses … a duel: read-and-respond."

**The story beat it IS (LOCKED principle: "the mechanic IS a story beat made playable"):**
the `the_gods` beat (`src/components/story/beats.ts:125-134`) — *"Anyone can rise once. You fell, and
rose again. Now you know our faces. Stand with us."* The pantheon, unnamed until L8, is finally
**revealed and confronted** (`STORY-SPEC.md:19,23,101-106`). The fight-as-duel makes "now you know our
faces" literal: you face each god's reality, and the **Signature mirror** (§4) makes one of them *you* —
the L4 payoff seeded at `beats.ts:82-86` ("Now you sound like… one of us. …Curious.") pays off here.
Beating the **Maestro** fulfils *"Stand with us"* — **you join the pantheon** (`LADDER-MECHANICS.md:159-160`).

**The pantheon (`STORY-SPEC.md:36-48`):**

| God | Domain | Warp theme | L4 domain it mirrors |
|---|---|---|---|
| **Timpana, the Pulse** | Percussion | all rhythm / tempo / timing | Percussion |
| **Lyra, the Voice** | Strings | all sustain / crescendo / melodic-line | Strings |
| **Clarion, the Blaze** | Brass | raw output / loudness / overpower | Brass |
| **Aeolia, the Breath** | Woodwinds | breath / tickspeed / decay | Woodwinds |
| **The Twins (Consonance & Dissonance)** | Harmony | two-phase consonance↔dissonance duality | Harmony |
| **The Maestro, the Downbeat** | Conductor — **FINAL** | commands ALL domains | (none — unlocks last) |

---

## 2. New state (fields + types + resetTier + saveMigration)

All L9 state is **`resetTier: never`** (`LADDER-MECHANICS.md:34`: "losing resets nothing; powers stack").
Add to the M9 `resetTier` table as `never` so `applyReset` skips them at every tier including the Fall.

### 2.1 New `GameState` fields (`src/store/types.ts`, after the `finalePoints`/`finaleCount` block ~`:115-117`)

```ts
// === Prestige Layer 9: The gods (boss-rush — resetTier: never on ALL fields below) ===

/** God ids the player has defeated (claimed-power record). never-reset; powers stack. */
godsDefeated: string[]          // e.g. ['timpana','lyra',...]; 'maestro' only possible once 5 present

/** The fight currently entered, or null when in the pantheon hub. Transient-but-persisted
 *  (so an in-progress fight survives reload, like activeChallenge). */
activeGodFight: ActiveGodFight | null

/** Per-god furthest phase reached (for UI "how close" + Maestro-recap). never-reset. */
godPhaseRecord: Record<string, number>   // godId -> max phaseIndex ever reached

/** L9-SCOPED Signature re-allocation (free between fights; does NOT touch the L4 identity record).
 *  null = use the L4 record as-is. See §4 (no soft-lock guarantee). */
l9SignatureOverride: SignatureAllocation | null

/** True once the pantheon hub is unlocked (all 3 L8 comebacks cleared). Gates L9 entirely. */
godsUnlocked: boolean
```

New supporting types (`src/store/types.ts`):

```ts
export interface ActiveGodFight {
  godId: string
  phaseIndex: number          // current FSM phase (0-based)
  progress: number            // 0..1 toward the current phase's goal (analytic, idle-accruable)
  startTime: number           // ms epoch — for idle catch-up + "fight duration" telemetry
  phaseEnteredAt: number      // ms epoch the current phase began (for reactive re-reads)
}

/** Mirror of the L4 allocation shape (import from the L4 module — do NOT redefine).
 *  Zero-sum pie over the 5 domains; see L4 build-spec. */
export type SignatureAllocation = Record<DomainId, number>   // sums to 1.0
export type DomainId = 'percussion' | 'strings' | 'brass' | 'woodwinds' | 'harmony'
```

### 2.2 resetTier assignments (M9 table)

| Field | resetTier | Rationale |
|---|---|---|
| `godsDefeated` | **never** | claimed-power record; `LADDER-MECHANICS.md:34` |
| `godPhaseRecord` | **never** | progress record; survives retries + Fall |
| `godsUnlocked` | **never** | earned at L8 capstone; never relocks |
| `l9SignatureOverride` | **never** (or `signature`) | scoped to L9; cleared only on hardReset. **TBD — decide-at-build** whether it clears on entering the hub vs persists |
| `activeGodFight` | **never** but **cleared on defeat/abandon** | not a reset-tier wipe; cleared by the win/abandon action like `activeChallenge` |

⚠ **A loss resets NOTHING** — there is no "L9 reset event" in the matrix. `applyReset` is never called
for L9. Losing a fight simply clears `activeGodFight` (or rewinds `phaseIndex`) and returns to the hub.

### 2.3 saveMigration step (`src/store/saveMigration.ts`)

1. **Bump `SAVE_SCHEMA_VERSION`** (`src/store/saveSchema.ts`) by 1; add the new version to `MIGRATIONS`
   (`saveMigration.ts:151`) as a pure `(state)=>void` that no-ops on the new fields (defaults below cover
   absent saves). Pattern: the existing `MIGRATIONS[1]` identity migration (`saveMigration.ts:152-154`).
2. **`createInitialState()`** (`src/store/initialState.ts`): seed
   `godsDefeated: []`, `activeGodFight: null`, `godPhaseRecord: {}`, `l9SignatureOverride: null`,
   `godsUnlocked: false`.
3. The generic `applyUndefinedDefaults` loop (`saveMigration.ts:132-139`) backfills these on old saves
   for free **once they're in `createInitialState`** — no manual entry needed UNLESS a field is a Decimal
   (none here are) or has a falsy-but-valid default. None of the L9 fields are Decimal, so
   **no `TOP_LEVEL_DECIMAL_KEYS` entry is required** (`saveMigration.ts:23-31`). Empty-array/`{}` fields
   that must not be clobbered when present should also be listed in `FALSY_DEFAULT_KEYS`
   (`saveMigration.ts:36-47`) — add `godsDefeated`, `godPhaseRecord` there.
4. **`partialize`** (`gameStore.ts:924-936`): the new fields persist automatically (it's a deny-list of
   actions, not an allow-list of data) — just ensure the new **actions** (`enterGodFight`, etc., §5.4)
   are added to the destructured exclusion list so they aren't serialized.

---

## 3. The mechanic in detail — the boss-FSM module

> **LOCKED architecture (`HARDENING-PLAN.md` L9 revision):** L9 is **its own module** with a `Boss`
> interface — **NOT** the flat L3 `ChallengeModifiers` struct. It **reuses `ChallengeModifiers` ONLY as
> the warp OUTPUT type** (so the tick already knows how to apply it — see §3.4). New file:
> **`src/core/gods.ts`** (+ per-god configs). Sim-only constants live in `sim/god-pacing.test.ts` first,
> then port to `src/core/constants.ts` (the established pattern — `l3-pacing.test.ts:1-7`, `L3` const block
> `constants.ts:27-40`).

### 3.1 The `Boss` interface (LOCKED shape)

```ts
import type { ChallengeModifiers } from './challenges'
import type { SignatureAllocation, GameState } from '../store/types'

/** A fight context the FSM reads to decide warps + progress (read-only snapshot of the run). */
export interface FightContext {
  /** Dominant domain THIS instant — read from current production composition, NOT the L4 record.
   *  This is what makes the boss REACTIVE (it responds to how you're CURRENTLY playing). */
  dominantDomain: DomainId
  /** The player's L4 identity record (drives the mirror = which fight is hardest). never-reset. */
  signatureRecord: SignatureAllocation
  /** Live production rate, peak this fight, tempo, crescendo, etc. — whatever phases gate on. */
  productionPerSec: Decimal
  peakThisFight: Decimal
  // … extend per-god as phases need (all read-only, all Decimal where unbounded — M11).
}

export interface BossPhaseResult {
  /** 0..1 progress toward THIS phase's goal after the tick (monotone within a phase; analytic). */
  progress: number
  /** True when this phase's goal is met → advance phaseIndex. */
  phaseAdvance: boolean
}

export interface Boss {
  id: string
  name: string                 // revealed name (Timpana, Lyra, …) — first shown here + at L8/L9 only
  domain: DomainId
  phaseCount: number

  /** REACTIVE warp: given the fight context + current phase, return the ChallengeModifiers that
   *  bend reality. The warp CHANGES with dominantDomain (the duel) and with phaseIndex (escalation).
   *  Reuses ChallengeModifiers as the OUTPUT type so calculateTick applies it unchanged (§3.4). */
  applyWarp(ctx: FightContext, phaseIndex: number): ChallengeModifiers

  /** Pure progress function for a tick. NEVER demands timed input — progress accrues from PASSIVE
   *  production under the warp (accessibility lock, HARDENING-PLAN L9 revision + LADDER §151-154). */
  tick(ctx: FightContext, phaseIndex: number, progress: number, deltaMs: number): BossPhaseResult

  /** Win condition: all phases advanced. */
  isDefeated(phaseIndex: number): boolean   // phaseIndex >= phaseCount
}
```

**Why an FSM, not a struct:** L3's `getActiveChallengeModifiers` returns a *static* `ChallengeModifiers`
for the whole run (`challenges.ts:184-231`). A god must (a) re-emit a *different* warp when your
`dominantDomain` shifts (reactive duel) and (b) escalate across phases. That's a state machine
(`phaseIndex` + `progress`), so it gets its own module — but it **emits the same `ChallengeModifiers`
shape** the tick already consumes, so no new tick plumbing for the warp itself.

### 3.2 The reactive duel — how the warp "changes phase in response to your dominant tier/domain"

Each phase has a **counter-stance**: the warp leans AGAINST whatever you're currently leaning ON.
Example (Timpana, the Pulse — rhythm/tempo god):

- **Phase 0 (opening):** mild global `tickspeedDivisor` warp (`ChallengeModifiers.tickspeedDivisor`,
  `challenges.ts:155`). Goal: accrue X soundwaves-equivalent under it.
- **Reactive re-read:** each tick `tick()` reads `ctx.dominantDomain`. If you lean **Percussion** (her
  own domain — the natural counter), she *tightens* the rhythm warp (raise `tickspeedDivisor`); if you
  lean **Strings/sustain**, she shifts to a `swDecayPercent` warp instead (punish the slow build). The
  warp **answers your stance** — but EVERY stance has a viable line (see §4 no-soft-lock).
- **Phase advance:** when `progress >= 1`, `phaseAdvance: true`, `phaseIndex++`, and `applyWarp` emits the
  next, harder counter-stance. `phaseEnteredAt` resets (for any "she re-reads on phase entry" logic).

**Magnitudes of every divisor/decay/goal: `TBD — decide-at-build (sim/playtest)`.** Tune so each fight is
**passive-completable** (§3.3) and the mirror fight is *longest* (§4), in the sim before porting.

### 3.3 Passive-accrual goals (accessibility — LOCKED)

> **Every god goal MUST be reachable by passive accrual** (`LADDER-MECHANICS.md:151-154`,
> `HARDENING-PLAN.md` L9 revision: "warp changes the MATH, never demands timed input"). No god may gate on
> a timing window, an APM threshold, or a click-rate. The warp makes the *math* harder (slower accrual,
> decay, a tier locked) — you still win by **idling under it long enough / building the right stance.**

- `tick()` derives `progress` from production accrued under the warp this tick — **analytic**, the same
  way offline ticks accrue (so a 24h-AFK player completes a fight, just slower). Idle-FIRST (the standing
  principle): AFK works; active amplifies ≈1.4–1.75× by letting you *re-stance* faster, never by demanding
  input.
- **Goal forms (pick per god, all passive): `TBD — decide-at-build`** — e.g. "accrue N SW under the warp",
  "hold dominantDomain = X for cumulative T of passive ticks", "reach peak P this fight". NEVER "click
  within the beat window".

### 3.4 Integration into the tick (`src/core/tick.ts`)

The fight warp rides the **existing** challenge-modifier path — minimal new tick code:

1. At the top of `calculateTick` (`tick.ts:33-36`), after computing the L3 `mods`, branch: **if
   `state.activeGodFight` is set**, build `FightContext`, call `boss.applyWarp(ctx, phaseIndex)`, and use
   **that** `ChallengeModifiers` as `mods` (god fights and L3 challenges are mutually exclusive — you can't
   start a challenge mid-fight; enforce in `enterGodFight`/`startChallenge`). The whole tick body
   (`tick.ts:107-191`: `productionDivisor`, `tickspeedDivisor`, `swDecayPercent`, `singleTierId`,
   `maxTiers`, etc.) then applies the warp **unchanged** — that's the payoff of reusing the struct.
2. After production is computed, call `boss.tick(ctx, phaseIndex, progress, deltaMs)` and fold the result
   into a `godFightUpdate` patch (new `phaseIndex`/`progress`, mirroring how `worldTourUpdates` is folded
   at `tick.ts:315,329`). On `isDefeated`, set a flag the store action reads to fire the claim (§5.4) —
   **do not mutate `godsDefeated` inside the pure tick;** return intent, let the action commit (keeps the
   tick pure, matches the codebase's action/tick split).
3. **M11 guard:** all goal math that can exceed ~1e300 stays **Decimal end-to-end**; the dev-build
   NaN/Infinity throw in `calculateTick` (M11) covers the warp output. The Maestro's all-domain warp is the
   highest-magnitude case — verify it can't poison the multiplier.

### 3.5 Claimed god-powers — the separate channel (NO global-× pile-on)

> **LOCKED (principle 3 + `HARDENING-PLAN.md` B3):** new permanence must NOT add another raw global
> production ×. The funnel is already loaded (achievements ~×3.57, Acclaim ≤×49, challenges ×5.6–11.2).
> God-powers go through the **M9 multiplier-registry on a SEPARATE channel with its own cap.**

- Each defeated god contributes a `{ source: 'god:<id>', value, channel: 'pantheon', appliesToProduction }`
  entry to the M9 registry. The `pantheon` channel has its **own hard cap** (`PANTHEON_CHANNEL_CAP`,
  `TBD — decide-at-build`) — five domain-powers + the Maestro's cannot compound into a runaway.
- **Strongly prefer structurally-different rewards over flat ×** (`HARDENING-PLAN.md` B3: "separate
  channels / hard caps / scoped effects"). Candidate power shapes (`TBD — decide-at-build` which per god):
  a permanent **floor** on the god's domain stat; a **slot/efficiency unlock** (à la L6 structural payout);
  a **scoped** ×only-while-that-domain-dominant. The Maestro's power = the **capstone / pantheon-join
  badge**, not a sixth multiplier — its value is narrative completion (§6). Whatever the shape, it is
  registered on `channel: 'pantheon'` and **never** feeds back into a god's own goal-check (no self-feed,
  per the B2 anti-runaway discipline).

---

## 4. The Signature mirror + no-soft-lock (the L4 payoff — LOCKED)

`LADDER-MECHANICS.md:155-156`, `bible §9.2`, `HARDENING-PLAN.md` L9 revision.

- **The mirror:** the god whose domain == the player's **most-embodied L4 domain** (read from the
  `never`-tier `signatureRecord`, NOT the live effect) is the player's **HARDEST** fight — "you face
  yourself / your patron." This is the single hardest cross-layer dependency in the ladder: **L4 and L9 are
  coupled by the Signature record**, which is *why* it's `resetTier: never` (`bible §2.3`, `:9.2`).
- **"Hardest" means LONGEST, NEVER requires the opposite build (LOCKED — no soft-lock):**
  `HARDENING-PLAN.md` L9 revision. The mirror fight has more phases / higher goals (`TBD — decide-at-build`
  by how much), but it must **never** be unwinnable with the player's own dominant stance. A
  Percussion-main facing Timpana wins by *out-pulsing* her (longer), not by being forced to become a
  Strings build.
- **Free L9-scoped Signature re-allocation between fights (LOCKED):** `l9SignatureOverride`
  (§2.1) lets the player re-stance *for a fight* without touching the L4 identity record (so the mirror
  target never moves). This is the anti-soft-lock safety valve: even if a fight rewards a different stance,
  the player can adopt it freely, and the mirror stays anchored to who they *are*. **TBD — decide-at-build:**
  whether re-alloc is fully free or has an in-fight cooldown (lean fully free — accessibility).

---

## 5. UI surface

New page/panel (sibling of the World Tour panel; the era-9 visual state per `HARDENING-PLAN.md` B1
"document eras 7/8/9 as L7/L8/L9 visual states"). The cold-open motif inverts to L9: **deepest black, gold
a cold brilliant point** (`STORY-SPEC.md:34,60,68`).

### 5.1 The Pantheon hub
- A constellation of **6 god-nodes** (5 domain-gods selectable in **any order**; the **Maestro locked**
  until all 5 defeated — `LADDER-MECHANICS.md:157-158`). Defeated gods show as "joined" (claimed).
- The mirror god is visually marked (your own face / patron) — the hardest, the personal one.
- Free **Signature re-stance** control (writes `l9SignatureOverride`) available between fights.

### 5.2 The fight view (a god's bent reality)
- **A reactive warp readout** (a "mechanic card" per `HARDENING-PLAN.md` minors — teach the new verb):
  shows the *current* warp (which `ChallengeModifiers` are active) and **how it's answering your stance**
  ("she tightened the rhythm because you leaned Percussion"). This legibility is what makes the duel
  readable rather than opaque.
- **Phase tracker** (`phaseIndex` / `phaseCount`) + the live `progress` bar toward the current phase.
- A **dominant-domain indicator** so the player can SEE the signal the boss is reading (closes the
  reactive loop — they understand *why* the warp shifts).
- **Abandon** returns to the hub (loss resets nothing — re-enter any time).

### 5.3 The ending (Maestro defeated)
- Fire the `the_gods` beat (`beats.ts:125-134`) with the names revealed; resolve to **"you join the
  pantheon"** — a final state, the true completion (`LADDER-MECHANICS.md:159-160`). **TBD — decide-at-build**
  what the joined-pantheon end-state screen is (a quiet endgame hub vs credits-proper).

### 5.4 New store actions (`gameStore.ts`)
- `enterGodFight(godId)` — guard `godsUnlocked`, Maestro-requires-5, no `activeChallenge`; set
  `activeGodFight`.
- `abandonGodFight()` — clear `activeGodFight` (no reset).
- `setL9SignatureOverride(alloc | null)` — free re-stance.
- `claimGodPower(godId)` — fired when the tick returns `isDefeated`; push to `godsDefeated`, register the
  `pantheon`-channel power (M9, §3.5), clear `activeGodFight`, fire the beat if `godId==='maestro'`.

---

## 6. Sim / validation plan (`sim/god-pacing.test.ts` — build ONE god first)

Pattern: `sim/l3-pacing.test.ts` (parametric sim, report-only, tune constants here before porting to
`constants.ts` — `l3-pacing.test.ts:1-7`). The sim drives `calculateTick` with `activeGodFight` set.

A sim MUST assert:
1. **Passive-completable (the accessibility lock):** a **pure-idle** player (no re-stancing, AFK ticks
   only) DEFEATS every domain-god and the Maestro in finite time. Assert each fight's idle-completion time
   is finite and within a sane window (`TBD — decide-at-build`). This is the single most important invariant
   — if any god needs active input, the spec is violated.
2. **Active amplifies but does not gate (idle-FIRST):** active re-stancing completes a fight ≈**1.4–1.75×**
   faster than pure idle — never more (no APM wall), never zero benefit. Assert the ratio sits in window
   (mirrors the L5 ratio-cap discipline, `HARDENING-PLAN.md` decision 4 / sim note).
3. **Reactive warp actually fires:** when the simulated `dominantDomain` flips, `applyWarp` emits a
   *different* `ChallengeModifiers` (assert the struct changed) and `progress` accrual rate changes
   accordingly. Proves the duel is real, not a static challenge reskin.
4. **No soft-lock / mirror is longest-not-impossible:** for EACH of the 5 domain mains, assert (a) their
   mirror god is their slowest fight, AND (b) it still completes with their **own** dominant stance (never
   requires the opposite build). Run all 5 mains.
5. **No global-× runaway (B3):** assert the total production multiplier after claiming **all 6** powers
   stays under the `pantheon`-channel cap and the overall funnel does not exceed the locked ceiling. M11:
   assert no NaN/Infinity multiplier at any point (the Maestro all-domain warp is the stress case).
6. **Loss resets nothing:** abandon/lose a fight → assert `godsDefeated`, `godPhaseRecord`, Signature
   record, Palimpsest, Recognition, and all `never`-tier fields are byte-identical before/after.
7. **Any-order + Maestro-last:** assert the Maestro cannot be entered until all 5 domain-gods are in
   `godsDefeated`, and the 5 are enterable in any permutation.

---

## 7. Acceptance criteria

- [ ] `src/core/gods.ts` exports the `Boss` interface (§3.1) + a config for **ONE god, end-to-end**
      (recommend Timpana), then the remaining 4 + Twins + Maestro on the same template.
- [ ] The warp is emitted as `ChallengeModifiers` and applied by the **existing** tick path
      (`tick.ts:107-191`) — no parallel warp-application code.
- [ ] The fight is **reactive**: `applyWarp` reads `ctx.dominantDomain` and re-emits a different warp when
      the stance changes; sim assertion #3 passes.
- [ ] Every god is **passive-completable** (sim #1); active amplifies within ≈1.4–1.75× (sim #2).
- [ ] The **mirror** (most-embodied L4 domain) is the **longest** fight and is **winnable with the
      player's own stance** — no soft-lock (sim #4). Free L9-scoped re-stance works.
- [ ] God-powers register on the **`pantheon` M9 channel** with its own cap; the funnel stays bounded and
      finite (sim #5, M11 guard green).
- [ ] **Any order; Maestro last** (sim #7). Beating the Maestro fires the `the_gods` beat and resolves to
      **join-the-pantheon** (§5.3).
- [ ] **A loss/abandon resets nothing** (sim #6). `applyReset` is never invoked for L9.
- [ ] Save round-trips: a pre-L9 save loads with the new fields defaulted (saveMigration §2.3); schema
      version bumped; `tsc` + full vitest suite + build all green.

---

## 8. Dependencies (what must exist first)

| Dependency | Why L9 needs it | Where |
|---|---|---|
| **M9 multiplier-registry + `applyReset`/`resetTier` table** | god-powers register on a `pantheon` channel; all L9 fields tagged `never` | `HARDENING-PLAN.md` M9; not yet built (`bible §2.2`) |
| **M11 Decimal-overflow guards** | Maestro all-domain warp + goal math must not produce NaN/Infinity | `HARDENING-PLAN.md` M11 |
| **L4 Signature — the `SignatureAllocation` type + the `never`-tier identity record** | drives the mirror (which fight is hardest); the override mirrors its shape | `bible §3`, `LADDER-MECHANICS.md:55-76`, `:29` |
| **L8 Redemption — `godsUnlocked` set on clearing all 3 comebacks** | L9 hub is gated on the L8 capstone | `LADDER-MECHANICS.md:136-147` |
| **L5/L6/L7** | the ladder must be playable up to L9; per "spec all → build sequential" L9 is built LAST | `LADDER-MECHANICS.md:3-5` |
| **`ChallengeModifiers` (built)** | reused as the warp OUTPUT type | `src/core/challenges.ts:154-167` |
| **Era-9 visual state** | the pantheon hub theming (gold→cold-point) | `STORY-SPEC.md:34,60,68`; `eraTheme.ts` |

---

## 9. Open gaps (TBD — decide-at-build, sim/playtest)

1. **All magnitudes** — every warp divisor/decay, every phase goal, `phaseCount` per god, the mirror's
   longer-by factor, idle-completion windows, the active:idle ratio target, the `PANTHEON_CHANNEL_CAP`.
2. **God-power shapes** — which gods grant a floor vs a slot/efficiency unlock vs a scoped ×; the Maestro's
   non-multiplier capstone form. (Principle: prefer structurally-different over flat global ×.)
3. **Passive goal form per god** — accrue-N-SW vs hold-dominant-for-T vs reach-peak-P (all passive).
4. **The Twins' two-phase consonance↔dissonance fight** — the exact duality FSM (a within-fight forced
   stance-swap?) needs its own mini-design pass; spec it after the first solo god proves the FSM.
5. **`l9SignatureOverride` lifecycle** — fully free vs in-fight cooldown; whether it clears on hub re-entry.
6. **The join-the-pantheon end-state** — endgame hub vs credits; what (if anything) is playable after.
7. **Reactive read source** — exactly how `dominantDomain` is computed from live production composition
   (which tiers/mechanics map to which domain) — depends on L4's final domain→production wiring.
8. **Per-god goals/rewards detailed pass** — `LADDER-MECHANICS.md:161` calls this an explicit later pass;
   do it god-by-god during the build, ONE first.

---

**Summary (2 lines):** L9 "The gods" is a reactive boss-FSM (`src/core/gods.ts`, new `Boss` interface that
re-emits `ChallengeModifiers` as its warp output) — six gods whose bent reality answers your dominant
domain, every goal passive-completable, the L4-most-embodied domain your longest-but-never-soft-locked
mirror, god-powers on a capped `pantheon` M9 channel, any-order + Maestro-last → join the pantheon.
Build ONE god end-to-end first; all magnitudes are TBD-at-build via `sim/god-pacing.test.ts`; depends on
M9/M11 + the built L4 Signature `never`-tier record + L8's `godsUnlocked` gate.
