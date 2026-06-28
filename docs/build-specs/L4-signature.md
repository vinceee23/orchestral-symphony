# L4 — Signature — IMPLEMENTATION-READY BUILD-SPEC

> **For a fresh session.** This is the **PRIORITY first build** of the upper ladder and the **public-demo
> threshold (L1–L4)** — L1–L3 alone read as "AD reskinned"; **L4 is the differentiator**
> (`HARDENING-PLAN.md:144-145`). Build it to ship-quality.
>
> **Read first (design):** `docs/LADDER-MECHANICS.md:55-76` (locked mechanic), `docs/STORY-SPEC.md:86`
> (the `L4 Signature` beat), `docs/bible/04-forward-design-L4-L9.md:111-161` (the L4 cross-check + the
> L4↔L9 coupling), `docs/HARDENING-PLAN.md:56-60` (the LOCKED design revision: **FIXED budget**).
> **Read first (architecture):** `src/core/formulas.ts:206-244` (`getCoreProductionMultiplier`, the one
> funnel), `src/core/tick.ts:54-104` (where the funnel is composed), `src/store/gameStore.ts:60-94`
> (`resetTiersAndSW`) + `:836-908` (`performTour`/`performGrandFinale` reset shape),
> `src/store/saveMigration.ts` + `src/store/initialState.ts` (the migration + default machinery).
>
> **GAP POLICY (LOCKED, `HARDENING-PLAN.md:107`):** every undecided magnitude below is written
> **"TBD — decide-at-build (sim/playtest)"**. Do NOT invent magnitudes blind. The five domain bend-curves,
> the budget-growth schedule, and the reset-tier ⚠ decisions are tuned from `sim/` + playtest, not guessed.

---

## ⭐ LOCKED DECISIONS (2026-06-28, Vince) — do not re-open

These resolve the design forks in §9's TBD list. **Magnitudes remain sim-tuned; these are the structural locks.**

| # | Decision | Locked choice | Resolves |
|---|---|---|---|
| L1 | **M9 scope** | Build the **full declarative `applyReset(state, tier)` engine** + multiplier registry now (not a 5th imperative reset). L4 is the cheapest moment. | §9.10, §3.5 note |
| L2 | **L4 ascension reset depth** | **Resets ALL L3 progress:** `opusCount`, `lifetimeAcclaim`, `acclaim`, the venue ladder (`currentVenue`/`components`/`keepAutobuyers`/`autoMO`/`autoCollect`/`autoGraduate`/`tourCount`), and `completedChallenges` (unless `keepChallenges`). The four `signature*` fields + `challengeBestTimes` + `seenStoryBeats` + `lifetimeEncoreCount` survive. | §3.5 table, §9.7 |
| L3 | **Respec timing** | **Only at each ascension** (the "choose your voice" moment). Fully reversible run-to-run, no wrong-choice trap, no mid-run min-maxing. | §3.5(a), §9.8 |
| L4 | **Harmony breadth rule** | Harmony's synergy scales with **allocation evenness** — you must genuinely spread the budget to make it pay (real generalist archetype vs the zero-sum specialists). The anti-mono-dominance keystone. | §3.2 Harmony row, §9.2 |
| L5 | **L4 unlock trigger** | The **L3 circuit break** (`circuitComplete`, graduating the World Stage) flips `signatureUnlocked`. The `performSignature` gate threshold itself stays sim-tuned. | §3.6, §9.5 |
| L6 | **Domain→lever kit** | Confirmed as specced: Percussion→tempo, Strings→crescendo ceiling, Brass→flat `domain`-channel ×, Woodwinds→cost reduction, Harmony→evenness synergy. | §3.2 |

**Workflow locks (carry into the build):**
- **Branch policy:** `master` = the public L3 trial (auto-deploys). **All L4 work — M11, M9, L4 — lands on `feat/layer4` and is NEVER merged to `master`** until Vince says so. Gate on the branch; commit to the branch only, when asked.
- **Build model:** Claude refines/locks the spec → delegates the M11→M9→L4 *build* to **Codex** (`codex exec -s workspace-write`, separate quota) → **Claude runs the gate** (`tsc -b` + full `vitest` + `vite build`, real exit) before any commit. Cursor stays off.
- **Still-sim-tuned (do NOT invent):** all domain bend magnitudes/curves, Harmony's evenness curve, `getSignatureEfficiency` shape + cap, `SIGNATURE_BUDGET` (default 1.0), the `performSignature` gate threshold, the mono-vs-blend balance target, era re-map index.

---

## 0. PREREQUISITE — M9 multiplier-registry must exist first (HARD dependency)

`LADDER-MECHANICS.md` and `HARDENING-PLAN.md:46-50` assume an **M9 multiplier registry + declarative
resets**. **As of this spec it is NOT in code** (grep: `channel`/`appliesToProduction`/`resetTier` appear
only in docs and `sim/*`, never in `src/`). The live production stack is still the single imperative funnel
`getCoreProductionMultiplier` (`formulas.ts:206`) with every prestige hand-writing its own reset object
(`gameStore.ts` `performEncore`/`performMagnumOpus`/`performTour`/`performGrandFinale`).

**Locked principle #3 forbids a new global-× pile-on.** Signature MUST flow through a **separate registry
channel**, not a 13th raw `.times()` on the funnel. Therefore **L4 build = build (or stub) M9 first**, then
make Signature its first real consumer. Minimum viable registry the L4 build introduces:

```ts
// src/core/multiplierRegistry.ts  (NEW)
export type MultChannel = 'global' | 'domain' | 'cost' | 'tempo' | 'crescendo'
export interface MultEntry {
  source: string            // e.g. 'signature:brass'
  value: Decimal | number   // the multiplier this entry contributes
  channel: MultChannel      // which bucket; domain = the NEW L4 channel
  appliesToProduction: boolean
}
// reduce entries → per-channel product; the tick multiplies the channel products in.
```

Signature contributes its entries on the **`domain` channel** (NEW), kept structurally distinct from
`global`. If the broader M9 refactor is deferred, the L4 build still creates `multiplierRegistry.ts` with
*only* the `domain` channel wired, and routes the Signature effect through it — so later layers inherit a
real registry rather than another funnel hack. **Acceptance gate: there is no new argument added to
`getCoreProductionMultiplier` for Signature** (see §3.4 for exactly how the domain channel folds into the
tick without touching the funnel signature beyond an optional `signatureMult` param — chosen form is
TBD-at-build between "registry product passed in" vs "new optional param", but it MUST be a separate term).

---

## 1. Overview — the axis + the story beat it embodies

**Axis: Identity.** L1 produced, L2 built an economy, L3 conquered space/automation. L4 you stop being a
*performer* and become an *artist with a voice* (`LADDER-MECHANICS.md:56`). The new verb is **aligning your
Signature across five instrument domains via a FIXED, zero-sum budget** — a permanent breadth-vs-depth
allocation choice that bends your whole build, respec-able between runs.

**The mechanic IS the story beat (locked principle #1).** The five domains are *secretly the gods' domains*.
The `signature` beat (`STORY-SPEC.md:86`, `src/components/story/beats.ts:79-87`) lands on the first L4
reset:

> Now you sound like no one else. / Now you sound like… *one of us*. / …Curious.

Allocating into a domain = unknowingly embodying a god. This is the **L9 Signature-mirror seed**
(`bible/04:409-415`): the domain you most embody becomes your *hardest* L9 fight ("you've been channeling me
all along"). That is **why the allocation record is `resetTier: never`** — it must survive every reset down
to L9. The domain→god map is fixed:

| Domain | Bends the build toward | L9 god (revealed only at L8/L9) |
|---|---|---|
| **Percussion** | tempo / rhythm — fast ticks, timing | Timpana, the Pulse |
| **Strings** | sustain / crescendo — slow build, huge peaks | Lyra, the Voice |
| **Brass** | raw output — brute production, fewer tricks | Clarion, the Blaze |
| **Woodwinds** | agility / efficiency — cheap, nimble, decay-management | Aeolia, the Breath |
| **Harmony** | synergy — rewards balancing multiple tiers/mechanics | the Twins of Harmony |

(`LADDER-MECHANICS.md:62-67`, `bible/04:121-127`, `STORY-SPEC.md:40-47`.)

**Idle-FIRST (locked principle #2):** allocation is a between-runs decision; in-run it is a passive standing
bonus. No domain may require timed input or APM to pay out (a Percussion main still pays its tempo bend
fully AFK). Active play amplifies via the *existing* conduct/crescendo handles only, keeping the global
active:idle ratio in the locked **≈1.4–1.75×** window (`HARDENING-PLAN.md:131-133`); domains do NOT widen it.

---

## 2. New state (fields + types + resetTier + migration)

Add to `GameState` in `src/store/types.ts` (place near the L3 block; mirror its JSDoc style):

```ts
// === Layer 4: Signature (identity) ===
export type SignatureDomain = 'percussion' | 'strings' | 'brass' | 'woodwinds' | 'harmony'

/** The IDENTITY RECORD — resetTier: never. Drives the L9 Signature-mirror. Fractions sum to ≤ 1
 *  (the rest of the fixed budget is "unspent"). Persists across the Fall (L8). */
signatureAllocation: Record<SignatureDomain, number>   // each 0..1, Σ ≤ 1

/** Lifetime count of L4 ascensions — drives budget growth + era theming. resetTier: never. */
signatureCount: number

/** Highest single-domain fraction ever committed, per domain — the L9-mirror "most embodied"
 *  lookup. resetTier: never. Numbers only (cheap, no Decimal). */
peakDomainAlignment: Record<SignatureDomain, number>

/** L4 unlock flag (persisted; replaces the build-time const L4_UNLOCKED for per-save gating). */
signatureUnlocked: boolean
```

**`createInitialState()`** (`src/store/initialState.ts`) defaults — add:

```ts
signatureAllocation: { percussion: 0, strings: 0, brass: 0, woodwinds: 0, harmony: 0 },
signatureCount: 0,
peakDomainAlignment: { percussion: 0, strings: 0, brass: 0, woodwinds: 0, harmony: 0 },
signatureUnlocked: false,
```

**resetTier (per the RESET MATRIX, `LADDER-MECHANICS.md:16-34` + `bible/04:89-103`):**

| Field | resetTier | Rationale / matrix row |
|---|---|---|
| `signatureAllocation` | **never** (identity record) | `LADDER-MECHANICS.md:29` — drives L9 mirror; *live production effect* resets with the layer, the *record* never does |
| `signatureCount` | **never** | lifetime counter (like `lifetimeEncoreCount`) |
| `peakDomainAlignment` | **never** | the mirror lookup; must survive the Fall |
| `signatureUnlocked` | **never** | once L4 is reached it stays reached |

None of the four are wiped by ANY prestige patch (they persist by omission — see the reset-semantics note
`bible/02:300`). The "**live production effect resets with the layer**" is automatic: the bend reads the
*current* `signatureAllocation`, and a Signature ascension (§3.5) re-zeroes the active climb (tiers/SW) like
any deep reset, so the bend simply re-applies from scratch on the new climb. The *allocation numbers* never
clear.

**saveMigration step (`src/store/saveMigration.ts`):** these are **plain numbers / a `Record<string,number>`
of numbers — NO Decimal fields** (deliberate: keep L4 out of `TOP_LEVEL_DECIMAL_KEYS` so it can't desync).
Therefore:
- Bump `SAVE_SCHEMA_VERSION` in `src/store/saveSchema.ts` (e.g. `1 → 2`).
- Add a migration entry under that version in `MIGRATIONS` (`saveMigration.ts:151`):
  ```ts
  2: (state) => {
    state.signatureAllocation ??= { percussion:0, strings:0, brass:0, woodwinds:0, harmony:0 }
    state.signatureCount ??= 0
    state.peakDomainAlignment ??= { percussion:0, strings:0, brass:0, woodwinds:0, harmony:0 }
    state.signatureUnlocked ??= false
  },
  ```
  (`applyUndefinedDefaults` would also backfill from `createInitialState`, but an explicit migration is the
  locked pattern from B5 — `HARDENING-PLAN.md:42`.) **Do NOT add any L4 field to `TOP_LEVEL_DECIMAL_KEYS`**
  unless a TBD bend introduces a Decimal accumulator; if one does, add it there + to `reviveDecimals`.

**`partialize`** (`gameStore.ts:924`): the four fields persist automatically (they're on `GameState`); just
confirm none are stripped in the destructure at `:925-929`.

---

## 3. The mechanic in detail

### 3.1 The FIXED Signature budget (LOCKED — supersedes the "budget grows" line)

⚠ **Design was revised. `LADDER-MECHANICS.md:68-72` says the budget GROWS; `HARDENING-PLAN.md:56-58`
OVERRIDES that:** the allocation pie is **FIXED** — *"don't let 'budget grows' become free late stacking →
Harmony+all becomes objectively correct. Growth, if any, unlocks efficiency/slots with hard diminishing
returns, not more raw pie."* **Honor the HARDENING-PLAN.** The pie is a constant `SIGNATURE_BUDGET = 1.0`
(100%). Any per-ascension growth is expressed as **efficiency on the spent fraction with hard DR**, never as
more total budget (see §3.3).

- `signatureAllocation` fractions sum to **≤ 1**. Mono = `{brass:1}`; a blend = `{brass:0.6, percussion:0.4}`.
- **Zero-sum by construction:** putting more in one domain *requires* taking it out of another. Blending is a
  real specialist-vs-generalist trade — never free stacking (`LADDER-MECHANICS.md:69-71`).

### 3.2 Domain bend formulas → the `domain` registry channel (NOT the funnel)

Each domain maps its allocated fraction `f` to effects on **existing levers**, contributed as registry
entries on the **`domain` channel** (§0). The *magnitudes are TBD-at-build* — only the **lever each domain
pulls is locked** (from `LADDER-MECHANICS.md:62-67`). Implement in a new `src/core/signature.ts`:

```ts
// src/core/signature.ts  (NEW)
// Returns the per-channel contributions for the registry given an allocation + the
// budget-efficiency factor e (§3.3). EVERY return value is a no-op at f=0.
export function getSignatureEffects(
  alloc: Record<SignatureDomain, number>,
  efficiency: number,          // §3.3, starts 1.0
): { /* domain-channel prod mult */ prodMult: Decimal,
     /* additive into existing tempo speedFactor */ tempoBonus: number,
     /* additive crescendo ceiling, like challenge crescendoBonus */ crescendoBonus: number,
     /* multiplier onto tier COSTS, ≤1 = cheaper */ costMult: number,
     /* synergy term (Harmony), reads breadth of the build */ harmonyMult: Decimal } { ... }
```

Locked lever per domain (curve shape + magnitude **TBD — decide-at-build (sim/playtest)**):

| Domain | Pulls this EXISTING lever | Hook point | Idle-safe? |
|---|---|---|---|
| **Percussion** | `tempoBonus` → folds into `getTempoSpeedFactor` exactly like `achievementTempoBonus` (`formulas.ts:98-99`) | passed alongside `totalTempoBonus` in `tick.ts:62` | yes — tempo is passive |
| **Strings** | `crescendoBonus` (raises the crescendo ceiling, same slot as the challenge "Solo" reward, `formulas.ts:225`) | `getCoreProductionMultiplier` already accepts `crescendoBonus`; add the Signature term to the value passed at `tick.ts:103` | yes — `auto-conduct` floors crescendo AFK (`crescendo.ts`, AFK floor 0.7) |
| **Brass** | flat `prodMult` on the **domain channel** (brute output) | registry `domain` product → multiplied in the tick after the funnel (§3.4) | yes — pure passive × |
| **Woodwinds** | `costMult ≤ 1` (cheaper tiers/components) — folds into `effectiveCostMult` (`tick.ts:113`) | multiply into `totalCostMult` | yes — affects buy cost, autobuyers benefit AFK |
| **Harmony** | `harmonyMult` = synergy: scales with **breadth** (e.g. number of unlocked tiers, or count of domains allocated ≥ threshold, or evenness of the allocation) | domain channel; reads `state.tiers`/`alloc` | yes — structural, no input |

**Harmony is the anti-degenerate keystone:** it must reward *balance/breadth* so the dominant strategy is not
"100% Brass". Its exact reading (tiers-owned vs allocation-evenness vs both) is **TBD — decide-at-build
(sim/playtest)**; the locked intent is "rewards balancing multiple tiers/mechanics"
(`LADDER-MECHANICS.md:67`). Sim must prove no single mono dominates all others across the climb (§5).

**No-op invariant (LOCKED):** with `signatureAllocation` all-zero (pre-first-allocation, or a fresh climb
before respec is applied), `getSignatureEffects` returns identity (prodMult 1, bonuses 0, costMult 1) — L1–L3
behaviour is byte-identical to today. Sim must assert this (§5).

### 3.3 Budget-efficiency growth (the ONLY thing that grows — hard DR)

Per `HARDENING-PLAN.md:57`, progress unlocks **efficiency with hard diminishing returns**, not more pie.
Model: `efficiency = f(signatureCount)` with a hard asymptote (e.g. a capped-log/root form like
`getAcclaimMultiplier`'s capped-log, `worldTour.ts:388-402`, the established cap idiom). `efficiency`
multiplies the *strength of whatever you allocated* — so a veteran's 60/40 is sharper than a rookie's 60/40,
but the **pie is still 100%** and breadth-vs-depth stays a real trade. **Shape + cap = TBD — decide-at-build
(sim/playtest)**; constraint: it must NOT make "spread thin across all 5" strictly dominant (that's the
failure `HARDENING-PLAN.md:56` warns about), and it must respect the permanent-power budget (B3,
`HARDENING-PLAN.md:34-37`) by living on the scoped `domain` channel, not the global funnel.

### 3.4 How it folds into the tick WITHOUT a funnel pile-on

In `src/core/tick.ts`, after `globalMult` is computed from `getCoreProductionMultiplier` (`tick.ts:89-104`):

1. Compute `const sig = getSignatureEffects(state.signatureAllocation, getSignatureEfficiency(state.signatureCount))`.
2. **Percussion → tempo:** add `sig.tempoBonus` into `totalTempoBonus` (`tick.ts:62`) BEFORE it's passed to
   the funnel (tempo is funnel factor #8; this is the one bend that *rides an existing funnel input* rather
   than a new term — acceptable because it's the literal tempo lever, capped by `TEMPO_MIN_INTERVAL`).
3. **Strings → crescendo:** add `sig.crescendoBonus` to the `crescendoBonus` value passed at `tick.ts:103`.
4. **Woodwinds → cost:** multiply `sig.costMult` into `effectiveCostMult`/`totalCostMult` (`tick.ts:113-121`).
5. **Brass + Harmony → domain channel:** `globalMult = globalMult.times(sig.prodMult).times(sig.harmonyMult)`
   — this is the **separate `domain` channel** term (registry product). It is the ONLY new multiplicative
   term and it is explicitly NOT inside `getCoreProductionMultiplier` (keeps the funnel signature clean;
   satisfies locked principle #3 + B3).
6. Apply the **same `sig` terms identically in every UI rate display** that mirrors the funnel
   (`Header.tsx`, `OrchestraStage.tsx`, `SoundwaveDisplay.tsx` — listed `bible/02:70-71`) so the displayed
   rate can't drift. **Best practice: expose one `getSignatureProductionMultiplier(state)` helper** that the
   tick and all three UI surfaces call, mirroring how `getCoreProductionMultiplier` is shared.

**noPrestige challenges:** when `mods.noPrestige` is true, zero the Signature contribution too (it's a
prestige-tier bonus) — pass all-zero alloc into `getSignatureEffects`, consistent with `tick.ts:67,85-91`.

**M11 guard:** the new `domain`-channel product must be Decimal and pass the dev-build NaN/Infinity throw in
`calculateTick` (`HARDENING-PLAN.md:52-54`). Harmony/Brass at high `signatureCount` must not overflow 1e300.

### 3.5 Respec + the L4 ascension (the reset action)

Two distinct operations:

**(a) Respec (between runs, free, the core build-craft loop, `LADDER-MECHANICS.md:73-74`):** a
`setSignatureAllocation(alloc)` action validates `Σ ≤ 1` and each `∈ [0,1]`, then writes
`signatureAllocation` + updates `peakDomainAlignment[d] = max(prev, alloc[d])` per domain. **Gating: only
between runs** (not mid-climb) — TBD-at-build whether "between runs" means "only at the L4 ascension prompt"
or "any time SW/tiers are at the run floor". No "wrong choice" trap: respec is always reversible
(`LADDER-MECHANICS.md:74`).

**(b) `performSignature()` — the new deep prestige (the L4 reset layer).** Model it on `performTour`
(`gameStore.ts:836-877`) — it sits one tier DEEPER than Tour in the matrix
(`Tour → Signature(L4) → …`, `LADDER-MECHANICS.md:13`). It must:
- **Gate:** `signatureUnlocked` (or the unlock condition that flips it — see §3.6) AND a progress threshold
  **TBD — decide-at-build (sim/playtest)** (analogous to the World-Tour gate `canUnlockWorldTour`,
  `worldTour.ts:404-413`). Guard `activeChallenge`/`noPrestige` like `performGrandFinale:885-891`.
- **Reset everything Tour resets, PLUS the L4-tier ⚠ rows** (these are the matrix decisions to confirm at
  this build, `LADDER-MECHANICS.md:21-26`, `bible/04:150-152`):

  | Field | Today (kept across Tour) | L4 decision (⚠ — confirm in sim/playtest) |
  |---|---|---|
  | `opusCount` | kept (`performTour:856`) | **resetTier L4** → likely `→0` at Signature (matrix row `:21`) — TBD confirm |
  | `lifetimeAcclaim` | kept snowball | **resetTier L4** → likely reset at Signature (matrix row `:24`) — TBD |
  | `acclaim` (spendable) | kept | reset with the layer — TBD |
  | venue ladder (`currentVenue`, `components`, `keepAutobuyers`, `autoMO`, `autoCollect`, `autoGraduate`, `tourCount`) | kept | **resetTier L4** (matrix row `:25`) → reset at Signature — TBD |
  | `completedChallenges` | kept | **reset at L4 unless `keepChallenges`** (matrix row `:26`, already typed `types.ts:48-49`) |
  | `challengeBestTimes`, `seenStoryBeats` | never | **keep** (never) |

- **Keep (never):** the four new `signature*` fields, `challengeBestTimes`, `seenStoryBeats`,
  `lifetimeEncoreCount`, achievements, and the L4 identity record itself.
- **Increment** `signatureCount += 1`.
- **Apply** the chosen/affirmed respec (the ascension is the natural respec point).
- Fire the `signature` story beat on the **first** `performSignature` (it's already registered,
  `beats.ts:79-87`; trigger via the first-reset path that L1–L3 beats use — `STORY-SPEC.md:71-73`).

> **STRONGLY prefer building the declarative `applyReset(state, tier)` engine here** rather than hand-writing
> a 5th imperative reset object. The design explicitly wants it (`LADDER-MECHANICS.md:39`: *"this table is
> the source of truth; `applyReset` reads it"*; M9, `HARDENING-PLAN.md:46-50`). L4 is where a 4th reset
> function would otherwise be copy-pasted — the cheapest moment to introduce the table-driven reset. If
> `applyReset` is built, `performSignature` = `applyReset(state, 'signature')` + `signatureCount++` + respec.

### 3.6 Unlock condition + the inherited auto-tour reward

- **Flip `signatureUnlocked`** when the L4 unlock condition is met (threshold **TBD — decide-at-build**;
  natural anchor: some milestone past the World-Tour endgame, e.g. N completed tours or a catalogue/peak
  threshold). On unlock, **flip the build-time `L4_UNLOCKED` story** to the per-save `signatureUnlocked`:
  - `src/core/constants.ts:4` `L4_UNLOCKED = false` currently dead-gates **auto-tour**
    (`worldTour.ts:368 canAutoPerformTour`, `gameStore.ts:394 unlockWithApplause('autoTour')`,
    `breakPerks.test.ts:50`). L4 design says **"each layer automates the one below"** — so **auto-tour is an
    L4 reward** (`bible/04:154-160`, `RECONCILE-PLAN`/`HANDOFF` context). The auto-tour code is written and
    dead; L4 turns it on.
  - Replace the `L4_UNLOCKED` const checks with reads of `state.signatureUnlocked` so the gate is per-save,
    not a global compile flag. Update the three call sites + `breakPerks.test.ts:50` (it currently asserts
    `false`; make it assert against the unlocked flag).

---

## 4. UI surface

- **A "Signature" panel / new era surface** (era ~7 visual state per the 9-layer re-map,
  `HARDENING-PLAN.md:29-31`). It needs:
  - **The allocation editor:** 5 domain sliders/steppers over the fixed budget, showing the **live remaining
    budget** and the **zero-sum trade** (raising one visibly drains the pool). Show each domain's current
    *effect readout* (e.g. "+X% tempo", "−Y% cost") so the bend is legible — challenge-reward opacity was a
    flagged anti-pattern (`HARDENING-PLAN.md:88,138`). Concrete readouts, not raw fractions.
  - **A mechanic card** teaching the new verb (per `HARDENING-PLAN.md:88` "per-layer mechanic cards to teach
    each new verb"). Narrator stays pure — the card explains, the beat emotes.
  - **The ascension button** (`performSignature`) with a **preview of what resets** (the venue
    ladder/acclaim/opusCount wipe is significant — show it, like the L7/L8 "previewed commit" principle
    `HARDENING-PLAN.md:60,67`). Never a surprise wipe.
  - **The domain→god identity is NOT revealed here** (names reveal only at L8/L9, `STORY-SPEC.md:19,23`).
    The panel uses the *instrument-domain* framing only; the "one of us" beat does the foreshadow.
- **Gold/black arc:** the `signature` beat is `goldLevel: 0.75` (`beats.ts:81`) — richer gold, pre-peak.
- **Era theming:** extend `src/core/eraTheme.ts` (currently era 6 keys on `finalePoints`/`finaleCount`,
  `bible/04:345-346`) to give Signature its own era state keyed on `signatureCount`. ⚠ Do not collide with
  the placeholder finale era — see §6.

---

## 5. Sim / validation plan (what a sim must assert)

Add `sim/l4-signature.test.ts`, modeled on `sim/era-pacing.test.ts` (drives REAL `calculateTick` +
real store actions — `era-pacing.test.ts:13`). It MUST assert:

1. **No-op identity:** with all-zero `signatureAllocation`, a full L1→L3 climb produces **byte-identical**
   SW/tiers/timing to a baseline run without the L4 code path. (Guards locked principle: L1–L3 unchanged.)
2. **Zero-sum is real:** moving budget from domain A to B strictly trades A's effect for B's — total
   "power" is bounded; no allocation exceeds the mono-cap of any single domain's full-budget effect plus the
   efficiency factor. Assert `Σ alloc ≤ 1` is enforced by `setSignatureAllocation`.
3. **No mono dominates:** across a representative climb, **no single mono build is strictly best in all
   regimes** — Harmony/breadth must be competitive (else the layer is a fake choice). Specifically: the
   spread of "time-to-next-threshold" across the 5 monos + a balanced blend stays within a target band
   (band = TBD-at-build). This is the layer's reason to exist; it's the headline sim gate.
4. **Idle-FIRST preserved:** 24h-AFK vs active for each domain main keeps the global active:idle ratio in
   **≈1.4–1.75×** (`HARDENING-PLAN.md:131-133`); **no domain pushes it past the cap** (esp. Percussion via
   tempo, which is the riskiest — assert it respects the `TEMPO_MIN_INTERVAL` ×20 ceiling).
5. **Budget growth is bounded:** `getSignatureEfficiency(signatureCount)` asymptotes (never runs away);
   assert it's finite and below its cap at extreme `signatureCount`, and that it does NOT make "thin spread
   across all 5" strictly dominant (the `HARDENING-PLAN.md:56` failure mode).
6. **Reset matrix correctness:** after `performSignature`, assert the L4-tier rows are wiped per the
   confirmed decisions (§3.5) and the four `never` rows + `challengeBestTimes`/`seenStoryBeats` survive.
   Assert `signatureCount` incremented and `peakDomainAlignment` captured the max.
7. **M11 / overflow:** Brass + Harmony at max efficiency + a deep climb do not produce a non-finite
   multiplier (the dev-guard throw must not fire).
8. **L4↔L9 record:** `peakDomainAlignment` correctly identifies the most-embodied domain across a sequence
   of respecs (this is the L9-mirror input; `bible/04:409-415`).

---

## 6. Known divergence / collision to handle

- **The shipping `performGrandFinale` is a PLACEHOLDER** for the *old* "L6=END infinity prestige", NOT the
  designed L7 (`bible/04:326-381`). It still increments `finalePoints`/`finaleCount` and drives era-6
  theming + 4 achievements. **L4 must not break it.** Two clean integration rules:
  1. L4's reset (`performSignature`) sits between Tour and the (placeholder) Finale in depth. Decide whether
     a Signature ascension touches `finalePoints` — per the matrix, finale is one-time/`never` and deeper
     than L4, so **Signature should NOT reset `finalePoints`** (it's "above" L4). Keep it omitted.
  2. Give Signature its **own era state** in `eraTheme.ts` keyed on `signatureCount`; don't reuse the
     finale-era keys. The 9-layer era re-map is a known open item (`HARDENING-PLAN.md:29-31`).
- **`opusCount`/`lifetimeAcclaim`/venue-ladder reset-at-L4 are ⚠ matrix decisions, not facts**
  (`LADDER-MECHANICS.md:36`, `bible/04:447-449`). Confirm each against `gameStore` and DECIDE in sim/playtest
  at this build — do not assume. Today all three are kept across Tour (`performTour:856-873`); L4 is the
  first layer with the authority to reset them.

---

## 7. Acceptance criteria

- [ ] M9 `domain` channel exists (or a minimal `multiplierRegistry.ts`); Signature flows through it.
- [ ] **No new argument widens `getCoreProductionMultiplier`'s funnel role** — Signature is a separate term
      (locked principle #3, B3).
- [ ] Fixed budget (`Σ alloc ≤ 1`); zero-sum trade visible in UI; respec free + reversible between runs.
- [ ] Budget growth = efficiency-with-hard-DR only, never more pie (`HARDENING-PLAN.md:56-57`).
- [ ] All 5 domain levers wired to their **locked** existing handles (§3.2); each is a no-op at f=0.
- [ ] `performSignature` resets the confirmed L4-tier rows; the four `signature*` + best-times + seen-beats
      survive; `signatureCount++`; `peakDomainAlignment` updated; first-reset fires the `signature` beat.
- [ ] Auto-tour (the inherited L4 reward) turns on via per-save `signatureUnlocked`; `L4_UNLOCKED` const
      checks migrated; `breakPerks.test.ts` updated.
- [ ] saveMigration: `SAVE_SCHEMA_VERSION` bumped + migration entry; `initialState` defaults added; no L4
      field wrongly added to `TOP_LEVEL_DECIMAL_KEYS`.
- [ ] UI: allocation editor with concrete effect readouts + a mechanic card + an ascension preview-of-wipe.
- [ ] `sim/l4-signature.test.ts` passes all §5 assertions; full `tsc` + suite + build green.
- [ ] Idle-first ratio stays ≈1.4–1.75×; no mono build strictly dominates; no overflow.

---

## 8. Dependencies (what must exist first)

- **M9 multiplier registry / declarative resets** — NOT in code yet (§0). L4 builds the minimum (`domain`
  channel) or the full engine. **Hard prerequisite.**
- **M11 Decimal-overflow guard** in `calculateTick` (`HARDENING-PLAN.md:52-54`) — needed for the new
  domain-channel Decimal term. Build/confirm before wiring Brass/Harmony.
- **B5 save-migration refactor** — DONE (`HARDENING-PLAN.md:134`); L4 just adds a version + entry.
- L1–L3 built + sim-tuned — DONE.
- The `signature` story beat — already registered (`beats.ts:79-87`).
- The dead auto-tour code — already written, gated on `L4_UNLOCKED` (`worldTour.ts:368`).

---

## 9. Open gaps (TBD — decide-at-build, sim/playtest)

1. **All 5 domain bend magnitudes + curve shapes** (the levers are locked, the numbers are not).
2. **Harmony's "breadth" reading** — tiers-owned vs allocation-evenness vs both. (Must defeat mono-dominance.)
3. **`getSignatureEfficiency` shape + hard cap** (capped-log idiom; must not make thin-spread dominant).
4. **`SIGNATURE_BUDGET`** confirmed at `1.0`? (or a different fixed constant — but FIXED, not growing).
5. **L4 unlock threshold** (what flips `signatureUnlocked`).
6. **`performSignature` gate threshold** (analogous to `canUnlockWorldTour`).
7. **The ⚠ matrix reset decisions:** does L4 reset `opusCount`, `lifetimeAcclaim`/`acclaim`, the venue
   ladder, `completedChallenges` (unless `keepChallenges`)? Confirm each against `gameStore` + sim.
8. **Respec gating** — only-at-ascension vs any-time-at-run-floor.
9. **Era re-map** — Signature's era index/visual in the 9-layer theming (`HARDENING-PLAN.md:29-31`).
10. **Build the declarative `applyReset` engine now (preferred) vs a 5th imperative reset?** (Design wants
    the engine; L4 is the cheapest moment.)

---

*Citations are `path:line` against branch `feat/layer3`. Authoritative mechanic: `LADDER-MECHANICS.md:55-76`
as REVISED by `HARDENING-PLAN.md:56-60` (fixed budget). Funnel/reset facts: `bible/02`. Cross-layer coupling
+ code reality: `bible/04`.*
