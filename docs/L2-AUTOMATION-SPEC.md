# L2-AUTOMATION-SPEC — Idle-in-L2 rework (pre-L4 scope)

_Status: LOCKED (~97% confidence, pre-L4). All design forks resolved with Vince. Ready to build, starting with P2._
_Companion to `docs/LAYER3-SPEC.md`. Supersedes the automation-gating described there for L1/L2._

---

## 0. The problem (why this exists)

Pacing-v2 sims (`drafts/PACING-AUDIT.md`) found two churn cliffs:
- **W1** — the L1 wall's final encore is a ~1.58 h single grind at hour 2–3 (first-session tourist quits here).
- **W2** — pre-Platinum L2 is a **~13 h flat slog**: the same 8-encore wall re-climbed manually ~10× with nothing changing.

Vince's goal: AD-style long-haul where **the longer you play, the more idle the game becomes via automation** — long *wall-clock*, not long *attention*. The 13 h slog is active waiting, which is exactly what loses players.

## 1. Root cause (the key discovery)

**The full automation set already exists** as autobuyer keys: `tier_1`…`tier_7`, `tempo`, `encore` (auto-encore), `mo_auto`, `finale_auto`, `all_auto`. They are **all gated behind L3 challenges** (`src/core/challenges.ts` → `unlocksAutobuyer`, gated by `isChallengeUnlocked` which requires `worldTourUnlocked`). So **L1/L2 are forced-manual because nothing can automate until L3.** That gate *is* the slog.

So this is **not** "build automation." It is **re-route the unlock path** from "L3 challenges" → "Applause Points in L1/L2," on Vince's Option-1 timing, plus build the one piece that was never wired (auto-encore execution).

## 2. What exists vs. what's new (the real delta)

| Piece | Status today | Work |
|---|---|---|
| 7 tier autobuyers | **Wired** — tick.ts:187–241 (buy loop, speed/bulk from opus upgrades when `opusCount>0`) | Re-gate unlock to AP |
| `tempo` autobuyer | **Wired** — tick.ts:243–265 | Re-gate unlock to AP (optional) |
| Auto-MO | **Wired** — `autoMO` flag → `isAutoMOReady` (worldTour.ts:355) → `performMagnumOpus()` (gameStore.ts:204) | Re-gate flag to L2/AP; remove L3 venue-component gating |
| `mo_auto` autobuyer key | **Vestigial** — nothing consumes it | Delete / fold into the `autoMO` flag |
| Speed/bulk upgrades (MO) | **Wired** — `automator-speed`, `automator-bulk` in opusUpgrades.ts | Keep as the "upgradeable using MO" path |
| **Auto-encore** | **NOT wired** — `encore` key unlocks a flag nothing reads; `performEncore` only called from UI | **BUILD: auto-trigger execution** (the one new mechanic) |
| **Applause Points** | Does not exist | **BUILD: currency + source + sink + UI + save migration** |

**Net new code: (1) Applause Points currency, (2) the AP→unlock purchase path, (3) auto-encore execution.** Everything else is re-gating + tuning. `Fame` is post-Platinum only (records→prod multiplier) — no collision with AP.

## 3. Locked design decisions (from Q&A)

1. Idle begins **inside L2**; the "each layer automates the one below" rule is deliberately broken for L1/L2.
2. **Applause Points (AP)** = the automation currency. Spine across L1→L4 (AP unlocks; MO upgrades power; L4 generates AP passively — L4 out of scope here).
3. **Option-1 timing:** auto-encore early (post first MO, *weak* → MO-upgraded); auto-MO later (~MO#3–4). Tier autobuyers buyable from ~Encore 4–5; full 1–7 set + auto-encore by 8th Encore / first MO.
4. **Auto-MO moves down to L2**; **L3 = auto-tour**; passive AP/encore gen = early L4; passive MO gen = late L4 (L4 deferred).
5. Ship **P2** (soften first-hour Encore-8 spike) first; pair the rework with **P1** (cheap opPower onset) so idle-L2 keeps live decisions.
6. **Sequence:** P2 now → hold L3 → build L2 rework → resim once → deploy L3 on the new baseline.

## 4. The Applause Points economy

### 4.1 Source
AP is earned **per Encore** (active), granted in `performEncore()` (gameStore.ts:551). Proposed formula (tune in resim):

```
apGained = floor( BASE_AP * encoreGain^AP_EXP )   // encoreGain = EP earned this encore
```

Initial guess: `BASE_AP = 1`, `AP_EXP = 1.0`. Target accrual curve (from audit encore times 5.3/3.0/2.7/2.7/3.8/10.8/33/95 min):
- By **Encore 4–5**: enough AP for the **first 1–2 tier autobuyers**.
- By **Encore 8 / first MO**: enough for the **full tier_1–7 set + auto-encore**.

> AP persists across Encores and MOs (it is meta-progression, like EP/OP). It does **not** reset on Encore.

### 4.2 Sinks (so AP isn't acquisition-only → gives L4 passive-gen a purpose)
1. **Unlock** each autobuyer (one-time): `tier_1…tier_7`, `tempo`, `encore`. Escalating AP cost.
2. **Auto-encore tune levels** (ongoing): AP raises auto-encore's trigger speed / smartness (the "weak at first" curve), on top of the MO-driven speed. Continuous sink → L4 passive AP has somewhere to go.
3. **Auto-MO unlock** (one-time, AP-purchased at opusCount≥3 — LOCKED D1b).

### 4.3 Persistence of unlocks across resets
`keepAutobuyers` (gameStore.ts:773) already persists autobuyer config across MO. Once AP unlocks an autobuyer, the **unlock** persists (it's on `autobuyers[key].unlocked`, kept through prestige via existing keep logic / re-grant on load). Confirm tier autobuyer `unlocked` survives `performMagnumOpus` reset (it resets tiers but should keep autobuyer unlocks).

## 5. Unlock re-routing + the gates (Option 1)

New AP-purchase UI (extend the existing `AutobuyersPage` or a small "Applause" shop). Each purchase sets `autobuyers[key].unlocked = true`. Gating by run-state so the curve matches §4.1:

| Autobuyer | Unlock gate (earliest) | AP cost (tune) |
|---|---|---|
| `tier_1` | Encore ≥ 4 | low |
| `tier_2`…`tier_5` | Encore ≥ 5 | rising |
| `tier_6`,`tier_7`,`tempo` | Encore ≥ 8 OR opusCount ≥ 1 | rising |
| `encore` (auto-encore) | **opusCount ≥ 1** (after first manual MO) | mid |
| auto-MO (`autoMO` flag) | **opusCount ≥ 3** (≈ MO#3–4) | high — **AP-purchased** (LOCKED D1b) |

Rationale: the player does **one full manual climb** to the first MO (so the wall is experienced), then automation floods in. Auto-MO lags so L2's "when do I Opus?" decision is played by hand ~3 times before it automates.

## 6. Auto-encore (the one new mechanic)

`encore` autobuyer is unlocked but unexecuted. **`performEncore` is a store action (gameStore.ts:551) — it can't be called from the pure `calculateTick`.** Trigger it in the **gameStore tick-driver block**, right alongside the existing auto-MO trigger (gameStore.ts:204):

```
// in the post-tick driver, next to: if (canAutoPerformMagnumOpus(postGrad)) get().performMagnumOpus()
if (canAutoEncore(get())) get().performEncore()   // throttled by an auto-encore interval timer in state
```

- **`canAutoEncore`**: only when an encore would yield ≥1 EP (peak past `ENCORE_EP_THRESHOLD`) **and** the autobuyer is `unlocked && enabled` **and** the throttle interval has elapsed — never auto-prestige a net-loss, never instant.
- **Weak at first**: the throttle interval starts long; MO upgrades (a new `automator-speed`-style node) + AP tune levels shorten it. Early automated climbs are *idle but unhurried*. Store a `lastAutoEncoreAt` timestamp (mirrors autobuyer `lastTick`).
- **Toggle**: reuse the `enabled` flag (existing autobuyer UI). **Required** so players can disable it for restraint achievements (see §9 risk).
- **Reuse, no refactor**: `performEncore` already handles cost-gate, EP gain, head-start, and restraint bookkeeping — auto-encore just calls it. Same pattern proven by `autoMO`.

## 7. Auto-MO consolidation

- Keep the **`autoMO` flag** path (already wired: gameStore.ts:204, worldTour.ts:355). 
- **Re-gate** it: set `autoMO=true` from the L2 AP purchase at opusCount≥3 (§5), instead of from the L3 venue component.
- **Remove** `autoMO` from L3 venue components (worldTour.ts:103, 183, 253) and the vestigial `mo_auto` challenge mapping.
- `autoMOEnabled` toggle UI already exists (WorldTourPage.tsx:225) — move/expose it in the L2 context too.

## 8. L3 rework (because automation moved down)

L3's built automation tree was `autoCollect` (V1) · `keepAutobuyers` · `autoMO` (V3) · `autoGraduate`.
- `autoMO` → **removed from L3** (now L2, §7).
- `autoCollect`, `autoGraduate` → **stay** (L3-internal: collect tour income, graduate venues).
- `keepAutobuyers` → **stays** but is now about persisting the *L2* autobuyers across MO during L3 touring (still meaningful).

**Challenges (LOCKED D1):** the 12 L3 challenges no longer unlock the early autobuyers (AP does). They are **repurposed to grant Applause Points + permanent automation-power upgrades** (extra auto-encore/autobuyer speed, smarter triggers) — keeping the built challenge content meaningful and feeding the AP economy. `finale_auto` + `all_auto` (L4/L6 prestige automation) remain challenge rewards (out of this rework's scope). Update `ChallengeConfig` to carry the new reward shape; drop `unlocksAutobuyer` for the 10 repurposed ones + the vestigial `mo_auto` mapping.
- **`auto-tour`** becomes L3's headline automation (HANDOFF had it at L4; Vince moved it to L3). The `performTour()` action already exists (gameStore.ts:765) — auto-tour is a thin auto-trigger (`if (canAutoTour(get())) get().performTour()`) in the tick-driver, exactly like `autoMO`. Low effort, not a new mechanic. **(RESOLVED — D3 closed.)**

## 9. Risks & constraints

- **Restraint achievements** (Sound of Silence / Speed of Sound, asserted in human-pacing.test.ts) require *not* auto-prestiging within a window. Auto-encore/auto-MO must be **toggleable** (they are) and must **not** auto-fire in a way that makes these unreachable. Sims assert "zero auto-unlocks ≤1 active-min post-prestige" — verify auto-encore respects this.
- **Sim fidelity (resim — CORRECTED).** Earlier worry that autobuyers use wall-clock was **wrong**: the sims mock `Date.now()` via `vi.spyOn(Date,'now')` bound to `setClock(simMs)` (e.g. era-pacing:820), so autobuyer intervals already run on simulated time. **No `calculateTick` change needed.** The real constraint is granularity: the autobuyer block fires **at most once per `calculateTick` call**, so a coarse 30s tick buys ~60× too little vs a 500ms interval. **Resim rule: autobuyer-active (idle-L2) phases must step with fine dt (≤ the autobuyer interval), or model multiple fires per coarse tick.** Sim-side only; the live game already ticks at small real dt.
- **Save migration:** add `applausePoints` + autobuyer `unlocked` provenance to the persisted schema with safe defaults (gameStore.ts migration block ~857–889 already does field-presence guards — extend it).
- **Balance coupling:** AP unlock costs + auto-encore speed + P1 opPower onset all affect the same curve. Tune together in the resim, not piecemeal.

## 10. Resim plan & acceptance criteria

**Modify (per sim agent map):**
1. `sim/human-pacing.test.ts` (primary): add sim-time autobuyer ticking + AP accrual + early-unlock + auto-encore + early auto-MO into the loop (decision blocks ~663–715).
2. `sim/era-pacing.test.ts` (speedrun baseline): same, greedy variant (~line 876, 943).
3. `sim/l3-pacing.test.ts`: auto-MO already modeled as a flag; feed L2-unlocked autobuyers into Phase A/C.
4. `sim/achievement-pacing.test.ts`: light, update last.

**Acceptance (the 97% bar — all must hold):**
- ✅ **W2 dead:** no ≥25-min (era) / no flat manual stretch; post-first-MO L2 is idle-accumulation, active-attention per MO cycle drops sharply.
- ✅ **W1 softened** by P2: first-MO wall climax ≤ ~45 min, no 1.5 h single encore.
- ✅ **Platinum still lands at ~22 h wall-clock** (LOCKED D4) — but now mostly idle accumulation, not active grind. Records pace UNCHANGED (P3 rejected). Active-attention to Platinum should drop dramatically vs. the ~22 h active today.
- ✅ Restraint achievements still reachable; no auto-unlock within the restraint window.
- ✅ tsc clean · all unit green · all 4 sims green.

## 11. DECISIONS — all resolved

- **D1 — Challenges reconciliation.** ✅ LOCKED: repurpose to **AP + automation-power** rewards (§8). `finale_auto`/`all_auto` stay challenge rewards.
- **D1b — Auto-MO gate.** ✅ LOCKED: **AP-purchased** at opusCount≥3.
- **D2 — AP source formula.** DEFAULTED (§4.1): `floor(BASE_AP · encoreGain^AP_EXP)`, `BASE_AP=1`, `AP_EXP=1.0` — **finalized in the resim** against the §4.1 accrual targets.
- **D3 — auto-tour at L3.** ✅ RESOLVED: `performTour()` exists; auto-tour is a thin auto-trigger.
- **D4 — Platinum target.** ✅ LOCKED: **~22 h wall-clock, mostly idle**; records pace unchanged.

_Remaining ~3% = numbers that only the resim can pin (AP costs, auto-encore interval curve, P1 onset), plus the live-feel playtests (auto-encore feel, V1 loop) that can't be simmed._

## 12. File-by-file change list (pre-L4)

**New / currency:**
- `src/store/types.ts` — `applausePoints: Decimal`; auto-encore interval/tune fields.
- `src/store/gameStore.ts` — init AP; grant AP in `performEncore`; AP-purchase action(s) setting `autobuyers[key].unlocked`; re-gate `autoMO`; migration guards.
- `src/core/constants.ts` — AP source consts, unlock costs, auto-encore interval curve.

**Auto-encore execution:**
- `src/core/tick.ts` — auto-encore block (§6); extract/confirm prestige-core callable from tick.

**Re-gating / cleanup:**
- `src/core/challenges.ts` — repurpose rewards per D1; drop `mo_auto` mapping.
- `src/core/worldTour.ts` — remove `autoMO` component (103/183/253); confirm auto-tour.
- `src/core/opusUpgrades.ts` — keep automator-speed/bulk; (P1) cheapen `tempo-op-mult` onset.

**UI:**
- `src/components/autobuyers/AutobuyersPage.tsx` (or new Applause shop) — AP balance + purchase buttons + auto-encore/auto-MO toggles in L2 context.
- `src/components/challenges/ChallengesPage.tsx` — reflect new rewards.

**Sims:** §10.

## 13. Deploy sequence
1. **P2** (soften Encore 6–8 costs in `getEncoreCost`) → resim cadence → ship to master. _(cheap, independent, ships now)_
2. Build L2 automation rework (this spec) on `feat/layer3` or a fresh branch off master.
3. Resim (§10) until acceptance (§10) green.
4. Reconcile L3 (§8), re-pace the 2 held sims against the new idler baseline (their budgets may now pass naturally).
5. Merge → deploy full L3 + L2 idle on the new baseline.

---
_Delegation (per Vince's workflow): Cursor builds disjoint files sequentially, Codex reviews MUST-FIX, Claude gates (tsc + tests + sims) + commits. Personal repo (vinceee23) → external delegation OK._
