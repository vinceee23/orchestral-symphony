# Build-Specs — L4–L9 (Sonance)

> **Status:** the six per-layer build-specs (`L4-signature.md` … `L9-the-gods.md`) are
> **implementation-ready**, written for a *fresh* future session to build from with minimal re-design.
> They are grounded in the locked design (`docs/LADDER-MECHANICS.md`, `docs/STORY-SPEC.md`,
> `docs/bible/*`) and the locked decisions in `docs/HARDENING-PLAN.md` (**LOCKED 2026-06-28**), and cited
> against live code on `feat/layer3`. Every undecided magnitude is marked **`TBD — decide-at-build
> (sim/playtest)`** per the gap policy — do **not** invent numbers blind.
>
> This README is the **map**: the build order, the cross-layer dependency graph, the locked principles
> every spec must honor, and how a fresh session should actually use these docs.

---

## 0. The big load-bearing fact: the M9 / M11 prerequisites are NOT in code yet

Every one of the six specs independently re-discovered the same thing: **the M9 multiplier-registry and the
M11 Decimal-overflow guards exist only in the docs (`HARDENING-PLAN.md:48-53`, bible §2.2), not in `src/`.**
A grep for `channel` / `resetTier` / `appliesToProduction` / `applyReset` / `multiplierRegistry` hits only
`docs/` and `sim/`, never `src/`. Production is still **one imperative multiplicative funnel**
(`getCoreProductionMultiplier` at `src/core/formulas.ts:206`) and every prestige still hand-zeroes fields in
the `perform*` actions in `src/store/gameStore.ts`.

**Consequence (hard gate): build M9 + M11 FIRST, before any L4 layer code.** Per the locked sequence
(`HARDENING-PLAN.md:147-153` and the §94 worklist), M9 + M11 were scoped to land in the L0–L3 hardening
session that precedes L4. A fresh session opening this folder **must verify they are actually present** (grep
`src/` for a registry module + `applyReset`); if absent, **stop and build the minimal registry + the guard
first** — the L4 spec is explicitly gated on it, and L5–L9 all consume separate registry channels.

Why it matters: principle (3) below (no new global-× pile-on) is **only enforceable** through the registry's
per-channel caps. Without M9, each new layer would be tempted to widen the single funnel — exactly the B3
runaway the hardening plan forbids.

---

## 1. Build order (STRICTLY sequential)

The locked build rule (`LADDER-MECHANICS.md:4-5`, `HARDENING-PLAN.md:152`): **spec all → build sequential;
each layer fully playable AND sim-balanced before the next is started.** No parallel layer builds.

```
  [ PREREQ ]  M9 multiplier-registry + declarative applyReset(state, tier)   ← must exist first
  [ PREREQ ]  M11 Decimal-overflow guards (NaN/Infinity THROW in calculateTick)
  [ PREREQ ]  B5 save-migration refactor (version + ordered migrations[])     ← done per HP:134
      │
      ▼
  L4  Signature   ★ PRIORITY — the differentiator + the public-demo floor (demo = L1–L4, not L1–L3)
      │           builds the first registry channel (`domain`); identity record drives the L9 mirror
      ▼
  L5  Virtuoso    `mastery` channel (hard-capped); idle height-decay fix
      ▼
  L6  Canon       `permanence` channel (floors/slots, sublinear snapshot); the eternal reservoir
      ▼
  L7  Grand Finale  ONE-TIME event; `finale` channel; drains LIVE channels, Palimpsest untouched
      ▼
  L8  Redemption  `recognition` channel (additive, capped, does NOT feed L9); the Gauntlet ×3
      ▼
  L9  The gods    `pantheon` channel; boss-FSM module; the single largest build — build ONE god first
```

**Why this order is forced (not a preference):**

- **L4 first** because it is the *differentiator* — `HARDENING-PLAN.md:144-145` records both outside
  reviewers' verdict that L1–L3 alone reads as "AD reskinned," and the locked call that the **public demo is
  L1–L4**. L4 is the priority first build and the demo threshold.
- **L4 also builds the first registry channel end-to-end**, proving the M9 pattern that L5–L9 reuse. Do it
  cleanly here or every later layer inherits the mess.
- **L6 before L7** — L6's Palimpsest is the *reservoir* L7's Final Performance discharges
  (`LADDER-MECHANICS.md:112`).
- **L7 before L8** — the L7 one-time Finale + its "ember" is what leads into the L8 fall; L8's deep reset is
  defined relative to the Finale reset (`LADDER-MECHANICS.md:128, 137`).
- **L8 before L9** — clearing the Gauntlet ×3 is what *earns* the L9 audience
  (`LADDER-MECHANICS.md:147-148`), and L8's Recognition explicitly **must not** feed L9 (B2).
- **L9 last and largest** — `HARDENING-PLAN.md:68-71`: spec it as its own boss-FSM module, budget it as the
  single largest build, and **build ONE god end-to-end first** before the rest.

Each layer is **sim-gated** before the next starts: typecheck (`tsc -b`) ✓ **and** the full `vitest` suite
incl. the long pacing sims ✓ (the sims are the balance gate, not decoration — see
`docs/bible/00-how-to-work-here.md` §5). A green typecheck with a red sim is **not** a passing gate.

---

## 2. Cross-layer dependency map

What must exist before each layer can be built, and what each layer hands forward.

| Layer | Hard prerequisites (must exist first) | Produces / hands forward | Registry channel (M9) |
|---|---|---|---|
| **M9 / M11 / B5** | — (the hardening session) | the registry, `applyReset`, overflow guards, versioned migrations | (the registry itself) |
| **L4 Signature** | M9 registry, M11 guards, B5 migrations | the **Signature allocation** identity record (`resetTier: never`) → drives the **L9 mirror**; first `domain` channel | `domain` (separate, not the funnel) |
| **L5 Virtuoso** | L4 built; M9 registry | permanent **Mastery rank** (idle-accruable floor) | `mastery` (hard-capped) |
| **L6 Canon** | L5 built; M9 registry; M11 (for `top + Σghosts` overflow) | the **Palimpsest** `{top, ghosts[]}` eternal score (`resetTier: never`) → the **L7 reservoir** | `permanence` (floors/slots, never a global ×) |
| **L7 Grand Finale** | L4+L5+L6 built; M9; M11 (harmonic/sequence math) | the **one-time Finale event** + the "ember" → the **L8 fall** entry; `grandFinalePerformed` flag | `finale` (separate, capped; the old `10^fp` funnel mult is PULLED) |
| **L8 Redemption** | real one-time L7 (NOT the old repeatable placeholder); L6 Palimpsest; M9; the constraint **engine** (`tick.ts:107-191`, `risingCosts` at `tick.ts:116-120`) | **Recognition** (`resetTier: never`, additive, capped at ~3); clearing ×3 earns the L9 audience | `recognition` (additive, capped, **does NOT feed L9**) |
| **L9 The gods** | L8 cleared-×3 path; **L4 Signature record** (the mirror); M9; M11 (goal-checks); a boss-FSM module | **claimed god-powers** (stack, `resetTier: never`); beat the Maestro → join the pantheon (the ending) | `pantheon` |

**The load-bearing cross-layer couplings (do not break):**

1. **L4 → L9 (the Signature mirror).** L4's allocation persists as a `never`-tier identity record even
   across the Fall (`LADDER-MECHANICS.md:29, 58-59`); L9 reads it to make the domain you most embodied your
   *hardest* fight (`:155-156`). "Hardest" = **longest, never requires the opposite build** (no soft-lock);
   L9 grants a free in-fight Signature re-stance (`HARDENING-PLAN.md:72-73`).
2. **L6 → L7 (reservoir → discharge).** The Palimpsest is what the Finale pours out. L7 drains **live
   per-cycle channels only**; the **eternal Palimpsest is untouched** (`HARDENING-PLAN.md:62-64`).
3. **L7 → L8 (the fall).** The fall is a deep reset *relative to the Finale reset*, but **everything tagged
   `never` survives** (Palimpsest, Recognition, Signature-identity, best-times, seen-beats) — see the reset
   matrix at `LADDER-MECHANICS.md:10-39`.
4. **The reset matrix is the single source of truth** for every field's `resetTier`
   (`LADDER-MECHANICS.md:16-34`). `applyReset(state, tier)` reads it. Every new field a spec adds is tagged
   there + gets a save-migration step.

---

## 3. The four LOCKED principles (every spec honors these — re-check before you build)

These are non-negotiable. They come from `HARDENING-PLAN.md` and the bible, and each spec was written to
satisfy all four.

1. **Mechanic = story beat made playable.** Every layer's new *verb* IS its `docs/STORY-SPEC.md` beat made
   interactive — not a number bolted onto a cutscene (`HARDENING-PLAN.md:142-143`). L4 = finding your voice;
   L5 = the take with no wrong notes; L6 = immortalizing the manuscript; L7 = the final performance; L8 = the
   comeback; L9 = facing the gods. Each spec ties its mechanic to its named beat in `src/.../beats.ts` and
   keeps the narrator pure (teach the verb via a mechanic card, not narrator exposition).

2. **Idle-FIRST.** Works fully AFK; **active amplifies ≈1.4–1.75×**, never demands APM
   (`HARDENING-PLAN.md:104-106, 132`). No hold-only paths; every god goal is reachable by **passive
   accrual** — the warp changes the *math*, never demands timed input (`:71`). L5 specifically: AFK accrues
   only the baseline floor (height-decay-to-floor), capping active:idle at ≈1.5–2× (`:17-20`). Offline =
   analytic floor-accrual, never 86k chunked iterations.

3. **NO new global-× pile-on — use a SEPARATE M9 channel / hard cap / scoped effect.** Production is already
   one funnel (achievements ~×3.57, Acclaim ≤×49, challenges ×5.6–11.2). L4/L5/L6/L8 must **NOT** all become
   another raw global-prod × (`HARDENING-PLAN.md:34-36`, B3). Each new permanence uses a **separate registry
   channel** with its own cap, or pays a structurally-different reward (slots/floors/speed/time), **not** a
   wider funnel. Recognition is additive+capped and does NOT feed L9; the Palimpsest snapshot is **sublinear**
   and **excludes the Canon bonus** (no self-feed loop) with an explicit `MULT_CAP`-style ceiling (B2,
   `:28-32`). Do **not** widen `getCoreProductionMultiplier`.

4. **GAP POLICY = `TBD — decide-at-build (sim/playtest)`.** Where a magnitude/specific is undecided, the spec
   says exactly that — it does **not** invent the number (`HARDENING-PLAN.md:107-108`). The fresh session +
   Vince resolve magnitudes with sim/playtest data. Balance is a full sim-tuned pass per layer, with fine
   feel-tuning deferred to post-playtest sessions.

> **One inline contradiction the specs flag (don't re-introduce it):** `LADDER-MECHANICS.md:68-72` ("the
> budget GROWS") is **OVERRIDDEN** by `HARDENING-PLAN.md:56-58` — the L4 pie is **FIXED**; growth (if any) is
> **efficiency/slots with hard diminishing returns**, never more raw pie (else Harmony+all-domains becomes
> objectively correct). The L4 spec honors the hardening plan and flags the contradiction inline. The
> HARDENING-PLAN supersedes LADDER-MECHANICS wherever they disagree (`HARDENING-PLAN.md:6`).

---

## 4. How a fresh session should use these specs + the bible

**Read in this order before touching anything:**

1. **`docs/bible/00-how-to-work-here.md` FIRST — it is THE METHOD.** Lock the plan first (tap-batch the open
   decisions, no mid-build pivots) · **verify before fixing** (a flag is a hypothesis — read the cited
   `file:line` and reproduce before patching; see the `lifetimeEncorePoints` cautionary tale) · delegate
   heavy/large coding to the CLI dev-team with **exhaustive per-file specs**, **sequential agents only** ·
   **GATE every commit** (`tsc -b` ✓ + full `vitest` incl. the long sims ✓) · personal-account push only,
   only when asked.
2. **`docs/HARDENING-PLAN.md`** — the locked decisions + the B1–B5 / M9 / M11 worklist that supersede the
   matching `LADDER-MECHANICS.md` sections. **Where they disagree, this wins** (`:6`).
3. **`docs/LADDER-MECHANICS.md`** — the locked per-layer axis + the **authoritative reset matrix** (`:10-39`,
   the source of truth `applyReset` reads).
4. **`docs/STORY-SPEC.md`** + **`docs/bible/05-narrative-world.md`** — the beat each mechanic must embody.
5. **`docs/bible/02-economy-formulas-resets.md`** + **`04-forward-design-L4-L9.md`** — the economy/reset
   detail + the forward design + the RESET MATRIX context the specs lean on.
6. **The target layer's spec in this folder.** Then the architecture-fit reads its citations point to:
   `src/core/tick.ts`, `src/core/formulas.ts` (`getCoreProductionMultiplier:206`),
   `src/store/gameStore.ts` (the `perform*` reset fns + `saveMigration.ts` + `initialState.ts`), and the
   `sim/*.test.ts` harness (the balance gate).

**Then, per layer:**

- **Confirm the prerequisites in §0/§2 actually exist in code** (grep `src/` for the M9 registry + the prior
  layers). If a hard prerequisite is absent, **stop and build it first** — do not stub past it.
- **Tap-batch the spec's "Open gaps (TBD)" list** with Vince before building (the gap policy means these
  *must* be resolved with a decision or a sim, not invented mid-build).
- **Build → sim-tune → GATE → commit.** Each layer fully playable and sim-balanced before the next begins.
- **Tag every new field** in the reset matrix (`LADDER-MECHANICS.md`) and add its save-migration step
  (versioned `migrations[]` per B5). Non-Decimal fields need `createInitialState` seeding +
  `FALSY_DEFAULT_KEYS` + a schema bump; Decimal fields also need the `DECIMAL_KEYS` revive table.
- **Gate everything** — even "just tooling." The sims are slow (~100s/run) and that is expected; know the
  current green baseline so you can tell a *new* failure from a known one.

Each spec in this folder contains, in order: **Overview** (axis + the story beat it embodies) · **New state**
(fields + types + `resetTier` + the save-migration step) · **The mechanic in detail** (formulas/algorithm +
the M9 channel it uses) · **UI surface** · **Sim/validation plan** (what a sim must assert) · **Acceptance
criteria** · **Dependencies** (what must exist first) · **Open gaps** (the TBD list).

---

*Specs in this folder: `L4-signature.md` · `L5-virtuoso.md` · `L6-canon.md` · `L7-grand-finale.md` ·
`L8-redemption.md` · `L9-the-gods.md`.*
