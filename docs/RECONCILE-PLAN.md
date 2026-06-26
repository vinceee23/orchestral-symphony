# L3 Reconciliation Plan — undo the fresh-session scope-creep

**Status:** LOCKED 2026-06-27. Decisions made by Vince after the ultracode audit of the
20-commit "Break phase" fresh session (commits `4df66fc..8db9545` on `feat/layer3`).
This doc is the authoritative spec for the reconciliation. Execute top-to-bottom, gate
each task green (tsc + unit + sims), commit before the next. Do NOT re-introduce any of
the CUT systems. When unsure of exact placement, consult `docs/LAYER3-SPEC.md` and report
WIRING NEEDED — do not guess and diverge.

## Context

A context-light fresh session built a whole "Break phase" on top of our locked L3 design.
The audit found the work is high-quality and green, but it **scope-crept beyond the locked
spec**. Some of it is good and stays; four pieces drift from the locked design and get
reverted. The KEEPS below are confirmed spec-aligned — do not touch them.

## KEEP (spec-aligned — already correct, do NOT revert)

- **Challenge re-gating** — challenges moved from unreachable `finaleCount` to real L3
  thresholds (`opusCount`/`encoreCount`/`peakSoundwaves`). This FIXES LAYER3-SPEC §2.8. Keep.
- **Multi-fire autobuyers** (`tick.ts`) — fires = floor(dt/interval); transparent at live
  frame-dt (×1), only matters in sim/lag. Technical fix, not a design change. Keep.
- **Auto-prestige gate-tier self-sufficiency** (`gameStore.ts` ~200-220) — auto-buys the
  gate tier during auto-encore/auto-MO so prestige automation doesn't stall. Keep.
- **Auto-encore tick-driver** (`gameStore.ts` ~223-244) — wall-gate (`!layer1WallReached`),
  net-loss guard (`peakSoundwaves` vs `ENCORE_EP_THRESHOLD`), enabled-check, interval
  throttle. Correct L1 automation. Keep.
- **`AUTO_CONDUCT_FRACTION` 0.5→0.7** — matches approved Break-phase decision. Keep.
- **Applause Points plumbing** — AP currency + the encore autobuyer unlock. Keep the AP
  system; only the auto-MO SKU (task 2) and auto-tour SKU (task 1) change.
- **Sim improvements** — goal-directed buying (vs greedy-cheapest), adaptive coarse-dt
  (10s post-MO), offline 60s chunking, AFK modeling. Keep — but strip the modeling of the
  CUT systems (Fame, reset-perks, auto-tour-in-L3) in each task below.

## TASK 1 — Auto-Tour: revert out of L3, gate behind future L4

**Decision:** auto-touring is an L4 reward (LAYER3-SPEC §1.5: "each layer automates the one
below"). It must NOT be reachable in L3. Keep the code, hard-gate it disabled.

- Add a single `L4_UNLOCKED = false` flag (e.g. in `constants.ts`). All auto-tour paths gate
  on it.
- `worldTour.ts` — keep `canAutoPerformTour` + `L3.AUTO_TOUR_CAT_RATIO`, but make
  `canAutoPerformTour` return `false` whenever `!L4_UNLOCKED`.
- `gameStore.ts` — keep the `autoTour`/`autoTourEnabled` state + tick-driver auto-fire, but
  the fire path is dead while the flag is false. `unlockWithApplause('autoTour')` must be
  unreachable in L3.
- `constants.ts` — remove (or gate) `AP_UNLOCK.autoTour` (200 AP) so it can't be bought in L3.
- `AutobuyersPage.tsx` — remove the "Auto World Tour" unlock card (or hide behind `L4_UNLOCKED`).
- `WorldTourPage.tsx` — remove the `autoTour` toggle block (lines ~241-251).
- Sims — remove the L3 AFK-circuit auto-tour scenario / keep but gate behind `L4_UNLOCKED`
  so it doesn't assert auto-tour completes the L3 circuit.
- Gate green, commit: "L3 reconcile: gate Auto-Tour behind future L4 (out of L3)".

## TASK 2 — Auto-MO: restore as an earned L3 venue component

**Decision:** removing auto-MO from the venue tree was wrong-destination. Per LAYER3-SPEC
§2.5 auto-MO is an *earned mid-venue component* (single-level UNLOCK role), not a 75-AP
prestige buy.

- `constants.ts` — remove `AP_UNLOCK.autoMO` (75 AP).
- `worldTour.ts` — add an `autoMO` component to `L3.COMPONENTS` with `role: 'unlock'`,
  `target: 'autoMO'`, attached to the venue spec §2.5 designates (mid-ladder; if ambiguous,
  check the spec / report WIRING NEEDED). Add its id to that venue's `componentIds`.
- `gameStore.ts` — `buyComponent` for the autoMO unlock sets `autoMO = true` (instead of the
  AP unlock path). Migration: existing saves with AP-bought autoMO keep it.
- `WorldTourPage.tsx` — `componentEffectLabel` already handles unlock components; add the
  `autoMO` case label ("Auto-Magnum Opus").
- `worldTour.test.ts` — update the venue componentIds expectation for the venue that gains autoMO.
- Sims — model auto-MO as unlocked via the venue component, not AP.
- Gate green, commit: "L3 reconcile: restore Auto-MO as an earned venue component".

## TASK 3 — Fame: cut entirely

**Decision:** the Fame currency + 6-node tree is net-new, never in spec, unaudited vs the
≤150-200% global-mult budget. Remove it. Re-design deliberately later if wanted.

- DELETE `src/core/fameTree.ts`, `src/core/fameTree.test.ts`, `src/components/fame/FamePage.tsx`
  (and the `src/components/fame/` dir if empty).
- `types.ts` — remove `fameUpgrades`, `spendableFame`, `lifetimeFame` (+ any Fame fields).
- `gameStore.ts` — remove Fame state, migration, persistence, Fame minting on post-Plat MO,
  and any `getFame*` calls.
- Un-thread the optional Fame params from: `formulas.ts`, `records.ts`, `crescendo.ts`,
  `tick.ts`, `WorldTourPage.tsx` (remove `getFameVenueCostFactor` import + its use at the
  `getComponentCost` call), `opusUpgrades.ts`, `perks.ts`. They were added as optional
  params defaulting inert — drop the params.
- `Sidebar.tsx` / `AppShell.tsx` — remove the Fame nav item + route.
- Sims — remove `humanSpendFame()` + all Fame modeling.
- `breakPerks.test.ts` — remove Fame assertions.
- Gate green, commit: "L3 reconcile: cut Fame currency + tree (out of scope)".

## TASK 4 — Reset-perks: cut Encore Resonance + Opus Memory

**Decision:** these carry raw power (Encore keeps Soundwaves; MO keeps lower layers),
violating the locked "perks = QoL, not power" rule. Cut both. The near-instant re-climb is
delivered by auto-encore/auto-MO automation, not stat carry-forward.

- `achievements.ts` — remove `ach_perk_encore_resonance` (@25 lifetime Encores) and
  `ach_perk_opus_memory` (@10 post-Plat MOs).
- `perks.ts` — remove their perk effects.
- `gameStore.ts` — remove the SW-carry branch in `performEncore` and the layer-carry branch
  in `performMagnumOpus`. (Keep the normal reset behavior.)
- Sims — remove Encore-Resonance / Opus-Memory modeling.
- `breakPerks.test.ts` — remove those assertions (likely the whole file if it only covered
  Fame + these perks; otherwise prune).
- Gate green, commit: "L3 reconcile: cut Encore Resonance + Opus Memory perks (QoL-only rule)".

## Deferred sim work (re-enable in the final resim phase)

These were skipped/gated during the reconcile because Auto-MO moved from a pre-Platinum AP
unlock to a post-Platinum L3 venue component (City Theatre, V2). They are test-only, marked
`RESIM:` in code:
- `sim/human-pacing.test.ts` — `it.skip` "AFK idle: a fully-automated player…" and
  `it.skip` "early-AFK probe: going hands-free at MO3…". Both assumed pre-Platinum auto-MO.
  Re-conceive: pre-Platinum automation is auto-Encore only; auto-MO kicks in once in L3.
- `sim/l3-pacing.test.ts` — `RESIM_AUTOMO_RECLIMB=false` gates the Tour-8 / Tour-12
  near-instant re-climb asserts. The tour loop tours from V1 and never reaches V2, so auto-MO
  is unreachable. Re-model: graduate venues in the tour loop + buy autoMO at City Theatre,
  then set the flag true.
- Pre-existing budget blocker (NOT from the reconcile): `era-pacing.test.ts:~1089` (Platinum
  not reached in MAX_STEPS) and `human-pacing.test.ts:~1142` (2 mid-game achievements
  stranded). Extend sim budgets (test-only — ~22h Platinum is intended) and/or re-pace.

## AFTER all 4 tasks

- Full gate: `tsc -b`, vite build, all unit tests, `l3-pacing` sim (reaches Platinum ~22h),
  achievement-pacing. era/human-pacing sim budgets: extend if still short (test-only — the
  ~22h Platinum is intended). Re-enable all the deferred sim asserts above. Confirm NO
  Fame/auto-tour/reset-perk references remain (grep `fame`, `autoTour`, `encoreResonance`,
  `opusMemory`, `AUTO_TOUR`).
- Update `docs/LAYER3-SPEC.md` + `HANDOFF.md` to re-lock the reconciled design so the next
  session can't re-diverge.
- Resim pacing with the surviving systems modeled together.
- Then merge `feat/layer3` → `master` to deploy.

## What was Roadies / keepAutobuyers?

"Roadies" = the `keepAutobuyers` venue unlock (autobuyers survive tours). This is a KEEP —
it's the V1 early automation unlock from our spec. Auto-MO/auto-tour reset on tour unless
Roadies is owned (symmetric with auto-encore). Leave it.
