# Warm-Up — early active-play production bonus (L0–L3 active verb)

**Status:** LOCKED 2026-06-28 (Vince). The early active *decision* the appeal review asked for:
idle-FIRST, not twitchy, bounded, foreshadows L5 Virtuoso's "reward steady play." Build via Codex,
sim + gate by Claude.

## Locked design decisions (Vince)
- **Trigger = active presence:** recent engagement (bought a tier / conducted in the last ~12 s) fills the
  bar; going idle decays it to a floor. NOT a no-spike/penalty mechanic, NOT a timing/rhythm input.
- **Strength = ~1.5× peak** active-vs-idle (the bonus channel's cap). Auto-trim toward 1.3× if the *total*
  active:idle production ratio exceeds ~2× (idle must stay clearly viable).
- **Unlocks a few tiers in, pre-Encore:** once the 3rd tier (Phrases, `tiers[2]`) is owned.

## Mechanic
- New state (persisted, default via `createInitialState`):
  - `warmUpLevel: number` — 0..1 bar fill. `0` ⇒ no bonus (idle floor), `1` ⇒ peak.
  - `activityGraceMs: number` — counts DOWN; reset to `WARMUP_ACTIVITY_WINDOW_MS` on any player action.
- **SIM-FRIENDLY / DETERMINISTIC — do NOT use `Date.now()` in the warm-up logic.** Drive everything off
  `deltaMs` (already passed to `calculateTick`) + the `conducting` flag + `activityGraceMs`. This is mandatory
  so the headless sims can drive it.
- Per tick (`calculateTick(state, deltaMs, conducting)`):
  - `activeNow = conducting || state.activityGraceMs > 0`
  - decrement: `activityGraceMs = max(0, activityGraceMs - deltaMs)`
  - if `activeNow`: `warmUpLevel → min(1, warmUpLevel + WARMUP_FILL_PER_SEC * dtSec)`
  - else: `warmUpLevel → max(0, warmUpLevel - WARMUP_DECAY_PER_SEC * dtSec)`
  - Gate: if NOT `isWarmUpUnlocked(state)`, force `warmUpLevel = 0` (no effect, bar hidden).
- Store actions that reset `activityGraceMs = WARMUP_ACTIVITY_WINDOW_MS`: `buyTier`, `buyMaxTier`/max-all,
  `buyTempo`, `performEncore`, `performMagnumOpus`, and conduct start. (Conducting also counts via the flag.)
- **Bonus channel:** `warmUpMult = 1 + warmUpLevel * (WARMUP_PEAK_MULT - 1)`.
  Pass it as a new optional param (`warmUpMult = 1`) into `getCoreProductionMultiplier(p)` and apply
  `.times(warmUpMult)` at the END of the chain (`src/core/formulas.ts:~243`, after `challengeGlobalProdMult`,
  before return). Separate bounded channel — never folded into the prestige/tempo chains.
- **Offline / AFK:** offline replay runs `calculateTick` with `conducting=false` and no actions ⇒
  `activityGraceMs` counts down ⇒ `warmUpLevel` decays to 0 ⇒ offline uses 1.0× (idle-first). No special case.

## Constants (`src/core/constants.ts`, tunable — Claude finalizes via sim)
- `WARMUP_PEAK_MULT = 1.5`
- `WARMUP_ACTIVITY_WINDOW_MS = 12_000`
- `WARMUP_FILL_PER_SEC = 0.05`  (≈20 s of presence to peak)
- `WARMUP_DECAY_PER_SEC = 0.034` (≈30 s idle to floor — forgiving, brief AFK barely dips)

## Integration points (from the code map)
| Point | File:line | Action |
|---|---|---|
| Production mult | `src/core/formulas.ts:~243` | add `warmUpMult?: number` param (default 1); `.times(warmUpMult)` before return |
| Tick | `src/core/tick.ts:~29,89` | compute `warmUpLevel`/`activityGraceMs` from `deltaMs`+`conducting`; pass `warmUpMult` into the production-mult call |
| State | `src/store/types.ts` | add `warmUpLevel`, `activityGraceMs` |
| Init | `src/store/initialState.ts` | `warmUpLevel: 0, activityGraceMs: 0` |
| Actions | `src/store/gameStore.ts` | reset `activityGraceMs` on the actions listed above |
| Unlock | new `src/core/warmup.ts` | `isWarmUpUnlocked(s) => s.tiers[2]?.purchased >= 1` + `advanceWarmUp(...)` helper + `warmUpMultiplier(level)` |
| UI | new `src/components/compose/WarmUpBar.tsx` near `ConductorPodium.tsx` | amber bar, fill + current `×N.NN`, label "Warm-Up", pulses when active, only render when unlocked |

## Verification (Claude)
- **Existing sims must still pass** — `warmUpMult` defaults to 1, so any caller that doesn't pass it is a
  no-op. Confirm era/human/l3/challenge/achievement pacing all stay green.
- **New `sim/warmup-pacing.test.ts`:** model (a) active play (warm bar held near peak) vs (b) idle (floor).
  Assert: warm-up's own channel contribution ≤ `WARMUP_PEAK_MULT` (≤1.5×); **TOTAL active:idle SW/s ≤ ~2.0×**
  (idle-first). If exceeded, trim `WARMUP_PEAK_MULT` toward 1.3 until it holds, and re-check human-pacing's
  Platinum band (active should get faster but stay a multi-hour goal).
- **Gate:** `tsc -b` + full `vitest run` + `vite build`, real exits read via `${PIPESTATUS[0]}`.
