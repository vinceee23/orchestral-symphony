# M9 — Multiplier Registry + Declarative `applyReset` — BUILD SPEC (for Codex)

> **Status:** implementation-ready. **LOCKED 2026-06-28 (Vince).** This is the L4 hard prerequisite
> (with M11, done). Build on branch `feat/layer4`. **Codex builds (workspace-write); Claude writes this
> spec + runs the gate** (`tsc -b` + full `vitest` incl. sims + `vite build`, real exit codes).
>
> **THE PRIME DIRECTIVE: byte-identical behavior.** This refactors the *shipped, sim-balanced* economy and
> the 4 reset functions. The output must be **provably unchanged**. Characterization tests (Part C) are
> written and passing BEFORE the refactor, and must still pass after. A green `tsc` with a changed sim
> result is a FAIL. If you cannot make a piece byte-identical, STOP and report it rather than guess.

---

## 0. Locked decisions this spec implements

1. **Registry WRAPS the funnel — do NOT explode it.** The existing 12-factor `getCoreProductionMultiplier`
   stays exactly as-is and becomes ONE channel (`core`). New layers add their own capped channels
   (`domain` for L4, later `mastery`/`permanence`/`recognition`/`pantheon`). We are NOT moving the 12
   factors into individual registry entries (no benefit, high risk).
2. **Full declarative `applyReset(state, tier)`** driven by ONE reset-matrix table, and **migrate all 4
   existing resets** (`performEncore`/`performMagnumOpus`/`performTour`/`performGrandFinale`) onto it.
3. **Characterization tests first** (Part C), proving identical reset output before + after.

---

## PART A — Multiplier registry (`src/core/multiplierRegistry.ts`, NEW)

### A.1 Types + compose
```ts
import Decimal from 'break_infinity.js'

export type MultChannel =
  | 'core'        // the existing getCoreProductionMultiplier funnel (1 entry)
  | 'domain'      // L4 Signature (separate, capped) — added by L4, default 1 here
  // forward-declared, no consumers yet: 'mastery' | 'permanence' | 'recognition' | 'pantheon'

export interface MultEntry {
  source: string            // e.g. 'core', 'signature:brass'
  value: Decimal            // the multiplier this entry contributes
  channel: MultChannel
}

/** Per-channel hard caps (none today; L4 sets the domain cap at build). Absent = uncapped. */
export const CHANNEL_CAPS: Partial<Record<MultChannel, number>> = {
  // domain: TBD-at-L4-build
}

/** Reduce entries → product of per-channel products, applying any per-channel cap. */
export function composeMultiplier(entries: MultEntry[]): Decimal { /* see A.2 */ }
```

### A.2 Semantics (MUST preserve today's math)
- Today: `globalMult = achievementGlobal.times(getCoreProductionMultiplier({...}))` (`tick.ts:98`), then
  per-tier `× tierAchMult`, then `÷ productionDivisor` (challenge). **Leave the achievementGlobal,
  tierAchMult, and productionDivisor handling exactly where they are** — they are NOT registry channels.
- The registry replaces ONLY the `getCoreProductionMultiplier(...)` call site: build entries
  `[{ source:'core', value: getCoreProductionMultiplier({...}), channel:'core' }]` (+ a `domain` entry once
  L4 exists), then `globalMult = achievementGlobal.times(composeMultiplier(entries))`.
- `composeMultiplier`: group by channel → product within a channel → apply `CHANNEL_CAPS[channel]` if set
  (`Decimal.min(product, 1+cap)` form TBD per channel) → multiply channel products together.
- **With only the `core` entry, `composeMultiplier` MUST return exactly `getCoreProductionMultiplier(...)`**
  (a single-entry product is the value itself). This is the byte-identical guarantee for today.
- Apply the **M11 guard** (`assertFiniteDecimal`, already in `tick.ts`) to the composed result.

### A.3 Wire it in (no behavior change today)
- `tick.ts`: replace the inline `getCoreProductionMultiplier(...)` with the registry build+compose. Net
  output identical (domain entry = 1 until L4).
- **UI parity:** the three surfaces that mirror the funnel (`Header.tsx`, `OrchestraStage.tsx`,
  `SoundwaveDisplay.tsx`) must use the SAME registry path so they can't drift. Best: a shared
  `getProductionMultiplier(state)` helper that both the tick and the UI call (it builds the entries +
  composes + multiplies achievementGlobal). Refactor all four call sites onto it.
- **Acceptance:** `getCoreProductionMultiplier`'s signature is UNCHANGED; the sims + `formulas.test` pass
  unchanged; on-screen rates match production.

---

## PART B — Declarative `applyReset(state, tier)` (`src/core/resets.ts`, NEW)

### B.1 The reset chain (ordinals)
```ts
export type ResetTier = 'encore' | 'magnumOpus' | 'tour' | 'signature' | 'virtuoso'
                      | 'canon' | 'grandFinale' | 'fall'
// depth ordinal: encore=1, magnumOpus=2, tour=3, signature=4, virtuoso=5, canon=6, grandFinale=7, fall=8
```
A reset at tier T clears every field whose **reset-depth ≤ depth(T)**; deeper/`never` fields persist.

### B.2 The matrix (authoritative — from `docs/bible/02-economy-formulas-resets.md` §6, code-verified)
`applyReset` reproduces EXACTLY these per-field, per-tier semantics. ⚠ the value can differ by tier (not
just "reset to default") — encode each:

| Field | Reset behavior (by tier) | Notes |
|---|---|---|
| soundwaves, tiers, tempo, producedThisRun, tempoPurchasesThisRun, currentRunStartTime | reset at **encore+** via `resetTiersAndSW(achievements, milestoneStrength)` | reuse the existing helper verbatim — perks (warmup/tempo-headstart) live there |
| peakSoundwaves | →0 at encore+ | every reset |
| crescendo | encore: KEEP (unless `perk-crescendo-headstart` seeds `CRESCENDO_HEADSTART`); MO/tour/finale: →seed (0 default, or `CRESCENDO_HEADSTART` w/ perk) | see perk handling B.4 |
| peakCrescendoMult | encore: KEEP; MO/tour: →1; finale: (currently omitted→KEEP — preserve the quirk) | |
| encorePoints | encore: `+gain`; MO/tour/finale: →0 | gain computed in `perform*`, NOT applyReset |
| lifetimeEncorePoints | encore: `+gain`; MO/tour/finale: →0 | the Encore prod mult |
| encoreUpgrades | encore: KEEP; MO/tour: →{} unless `perk-keep-encore-upgrades`; finale: →{} | |
| encoreCount | encore: `+1`; MO: →0; **tour: →3**; finale: →0 | ⚠ tour=3 (Symphonies pre-revealed) |
| lifetimeEncoreCount | encore: `+1`; else KEEP | resetTier never |
| layer1WallReached | encore: sticky-true at wall; MO: →`skipWall`(perk); tour: →true; finale: (omitted→KEEP) | ⚠ preserve finale quirk |
| applausePoints | encore: `+floor(getApplauseGain(gain))`; else KEEP | |
| opusPoints | MO: `+gain`; tour/finale: →0; encore KEEP | |
| opusUpgrades | tour: →{}; finale: (omitted→KEEP ⚠); encore/MO KEEP | |
| opusCount | MO: `+1`; tour: KEEP; finale: →0; **signature(L4): →0 (NEW)** | L4 decision below |
| postPlatinumMoCount | MO: `+1 if wasPlatinum`; else KEEP | |
| recordsSold | tour: →`floor(prev·LEGACY_RECORDS_FRACTION)`; **signature(L4): →0 (NEW)**; else KEEP | |
| platinum | tour: re-derived from carried; **signature(L4): →false (NEW)**; else KEEP | |
| acclaim, lifetimeAcclaim, venue ladder (currentVenue/components/keepAutobuyers/autoMO/autoCollect/autoGraduate/tourCount/circuitComplete) | KEEP across tour; **signature(L4): RESET (NEW)** | the locked L4 decision |
| autobuyers | MO#1: seed tier_1; tour: →{} unless Roadies; else KEEP | |
| autoMO/autoMOEnabled, autoTour/autoTourEnabled | tour: reset unless Roadies; else KEEP | |
| finalePoints/finaleCount | finale: `+1`; else KEEP | placeholder L7 |
| completedChallenges | **signature(L4): →[] unless `keepChallenges`** (`getL4ChallengeAscensionPatch`) | |
| challengeBestTimes, seenStoryBeats, seenHints, signature* (L4) | **never** | |

### B.3 Shape of `applyReset`
```ts
// Returns ONLY the declarative field-wipe patch for `tier`. The perform* fn computes gains/extras
// and spreads applyReset's patch, then overlays its specifics. applyReset does NOT compute EP/OP gain.
export function applyReset(state: GameState, tier: ResetTier): Partial<GameState> { ... }
```
- It WILL call `resetTiersAndSW(state.achievements, getChallengeMilestoneStrength(state))` internally for
  the run-level fields (so perks stay centralized), then layer the tier-specific field values per B.2.
- `performSignature` (built in L4, not here) = `applyReset(state,'signature')` + `signatureCount++` + respec.

### B.4 Perks + computed values stay in `perform*`
`applyReset` handles the *matrix*. Each `perform*` keeps: the gate checks, the `noPrestige` guard, the
gain computation (`getEncoreGain`/`getOpusGain`), the Sight-Reading head-start seed, silent-run/patron
tracking, the legacy-records carry math, autobuyer seeding, and `activityGraceMs`. After refactor, each
`perform*` reads: guard → compute gains/flags → `set({ ...applyReset(state, tier), ...computedExtras })`.

---

## PART C — Characterization tests FIRST (`src/store/resets.characterization.test.ts`, NEW)

**Write + pass these BEFORE touching the reset functions.** They snapshot the CURRENT output of each
`perform*` so the refactor is provably identical.

For each of `performEncore`, `performMagnumOpus`, `performTour`, `performGrandFinale`:
- Build ≥3 representative `GameState`s via `createInitialState()` + targeted mutations: (a) a plain mid-run
  state at the gate; (b) a state with relevant perks unlocked (`perk-skip-wall`, `perk-keep-encore-upgrades`,
  `perk-crescendo-headstart`, `perk-warmup`, `perk-second-wind`); (c) edge states (platinum vs not; Roadies
  on/off for tour; encoreCount at wall).
- Use `vi.useFakeTimers()` + a fixed `Date.now()` (the resets read it for timing — pin it).
- Apply the action, snapshot the resulting state (Decimals → `.toString()`), and assert the snapshot.
- Refactor onto `applyReset`, re-run: **identical**. Any diff = the refactor changed behavior → fix the
  refactor, not the test.

Also keep the existing `sim/*.test.ts` green — they are the ultimate behavioral guard.

---

## PART D — Build order (for Codex)
1. Part A registry + wire tick/UI → gate (sims must be byte-identical). Commit.
2. Part C characterization tests (snapshot current resets) → they pass against CURRENT code. Commit.
3. Part B `applyReset` + matrix; refactor the 4 `perform*` onto it → characterization + sims still green. Commit.
4. Report to Claude for the final gate. **Do not push.**

## Acceptance criteria
- [ ] `multiplierRegistry.ts` with `core` (+ forward `domain`) channels; `composeMultiplier` byte-identical for the single `core` entry.
- [ ] `getCoreProductionMultiplier` signature UNCHANGED; tick + all 3 UI surfaces read one shared path.
- [ ] `resets.ts` `applyReset(state, tier)` reproduces the §B.2 matrix incl. every ⚠ special case + perks.
- [ ] All 4 `perform*` refactored onto `applyReset`; gains/extras still computed in each.
- [ ] Characterization tests written first + green before AND after the refactor.
- [ ] Full gate green: `tsc -b` + `vitest` (incl. the long pacing sims) + `vite build`, real exit codes.
- [ ] No `getCoreProductionMultiplier` funnel widening; M11 guard still passes.

## Open gaps (decide-at-build / confirm)
1. `domain` channel cap form — deferred to L4 (not needed for M9; leave `CHANNEL_CAPS` empty).
2. The L4-NEW reset rows (`opusCount`/`recordsSold`/`platinum`/`acclaim`/venue → reset at `signature`) are
   in the matrix but only FIRE once `performSignature` exists (L4). For M9, encode them in the table but
   note no caller hits `tier:'signature'` yet — so they're inert until L4 (zero risk to shipped resets).

*Grounded in: `gameStore.ts` (resetTiersAndSW :73, performEncore :624, performMagnumOpus :682, performTour
:853, performGrandFinale :897), `formulas.ts:206` (funnel), `bible/02` §6 (reset matrix), `bible/06`
(M9 plan), `L4-signature.md` ⭐ LOCKED DECISIONS.*
