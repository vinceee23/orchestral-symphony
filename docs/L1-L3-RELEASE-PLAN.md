# L1→L3 PUBLIC PLAYTEST — Release Plan

_The comprehensive plan for the first public playtest (web, free). Mode: **plan → Vince approves → build**.
Companion to `docs/L2-AUTOMATION-SPEC.md` (AP/idle mechanics) and `docs/LAYER3-SPEC.md` (L3 design)._
_Status: **APPROVED (2026-06-26)** — building per the §4 order (next: idle-verify)._

> ⚠️ **RECONCILIATION (these supersede any older wording below):**
> 1. **Engaged Platinum ≈ 16–17h**, not ~22h (the old figure was a suboptimal-sim artifact). Idle is slower — pinned by the pending idle-verify. (Affects §1, §4.2, §5.)
> 2. **Idle/auto-conduct crescendo = 70% of active power (flat); active = 100%.** This replaces every "×2.5 auto-conduct cap / 83%" mention (§2, §3b, §4.2, §4.5). See §3b-numbers for the authoritative curve.
> 3. **The sim-fix is DONE** (commit a1bbda5): stall fixed, all 6 pacing bars green, 4 achievements excluded+flagged. §3's "known broken" and §4.1 are **complete**.
> 4. World Tour reset persistence is now LOCKED (§3b): AP + Fame/tree + challenge-time persist; tiers/autobuyers (incl. auto-encore/auto-MO) reset unless Roadies.

---

## 1. What we're shipping
A **free web playtest** of the full **L1 → L3** arc:
- **Arc:** L1 Encore → 8-Encore wall → Magnum Opus → Platinum → World Tour (L3) → **complete the circuit (all 6 venues graduated)** = content finale. **L4 (Signature) teased/locked** ("coming soon").
- **Length:** ~**20–30h** (active + idle; a week of casual check-ins). Platinum ~22h is most of it; L3 adds a few hours.
- **Monetization:** pure free, **Ko-fi link baked in** (non-intrusive donation): **https://ko-fi.com/vinceangelolmacaraig**. No ads/IAP.
- **Feedback / recruiting:** via existing communities (**r/incremental_games** + similar) — that's also how testers are found. No dedicated Discord/Form for the first playtest (in-game "feedback" link can point to the community thread). Revisit Discord if a community forms.
- **4 flagged achievements** (opus_seven, harmony_bot, melody_machine, ach_hello): all reachable by a real player — **verify each unlocks during Vince's end-to-end playtest** (no code change planned).
- **Onboarding:** light — brief intro + self-explanatory UI; teach-by-doing.
- **Release gate:** **Vince plays the full build end-to-end and approves** before it goes public.
- **Goal of the playtest:** validate the fun + pacing of the L1→L3 loop and the new idle automation, before investing in L4+ and living-venue art.

## 2. Locked design (decided in regroup 2026-06-26)
- **Core L2 idle = FOUNDATION (built, locked):** auto-encore + auto-MO unlock via **Applause Points (AP)**.
- **AP = earned per Encore** (applause) + challenge payouts. Sinks: auto-encore (5) → auto-MO (75) → **auto-tour** (capstone, AP-gated near circuit end). _Future L4:_ AP becomes a small multiplier to a metric.
- **Tiers stay on the OP-tree path** (no AP early-unlock). **Tempo autobuyer stays challenge-gated** (Acoustic reward — it's the strongest exponential lever, kept earned/special).
- **Auto-tour:** full-auto (auto-collect + auto-advance venues), unlocked as a **capstone near circuit end**, AP-gated.
- **Idle = tab-open only** (offline accrues production, does NOT auto-prestige — AD-normal).
- **Crescendo in idle:** the **auto-conduct** OP upgrade maintains crescendo while idle, but **capped at ×2.5**; active conducting can exceed it (toward the full ×3+ ceiling). So idle works *and* active stays more rewarding — a deliberate active-vs-idle incentive.
- **Post-circuit finale:** cheesy L4 tease — *"Get ready to choose your Signature…"* — not a plain "coming soon" (+ feedback/Ko-fi). Game keeps idling after.
- **Audio:** **deferred until ALL of L3 is built + frozen**, then ONE pure audio pass (no content changes after it) — audio as a clean final layer.
- **Challenge rewards:** **separate, bigger power axis** than achievements (achievements cap ~×2.5–3; challenges can exceed it, with a sane cap so pacing holds). All rewards **dynamic/scaling**, one-time (no grind). Table in §4.3.
- **Filler achievements:** cleaned up for release (real markers, keep the drip, ≤ +150–200% global-mult budget).
- **Idle verification bar:** AFK from ~MO#3 (automation unlocked) reaches **Platinum AND completes the circuit hands-free** (any duration).

## 3. Current state (built + committed + pushed, branch `feat/layer3`)
| Done | Commit |
|---|---|
| AP currency (earned/Encore, persists, migrated) | fb97744 |
| Auto-encore execution + auto-MO/auto-encore AP-unlock + UI | fb97744 |
| Auto-encore 0-EP boundary fix (Codex) | 2320719 |
| Critical: auto-encore wall-gate (was starving auto-MO) + migration robustness + sim-fidelity | 36aefdf |
| Balance tuning: autoMO cost 25→75, auto-encore interval weak-on-first-use | 3f7533d |
| autoMO removed from L3 venues (decision #4) | bd736e2 |
| Per-encore sim cadence reporting; directory cleanup | (various) |

Reviewed by ultracode 4-lens + Codex + Claude balance; all confirmed findings fixed. Fast gate green (tsc + 45/45 unit). **Known broken:** the human-pacing resim crashes (OOM) under the auto-fire model — a sim-scale issue, fixed first in §4.1.

## 3b. Post-Platinum "BREAK" phase (added 2026-06-26 — was too thin; now a distinct payoff)
Platinum is a **Break Infinity-style event**, not the start of dead idle. The road Platinum → World Tour is real progression:
- **Sublinear MO growth** post-Platinum (the "break"; OP_PLAT formula already does this).
- **Crescendo choice:** idle/auto-conduct ×2.5 vs **×3 when actively holding** — active is rewarded. **Standing Ovation** (Fame node) raises this ceiling (lift TBD in resim, e.g. +0.5×/level active, idle ~83% of it).
- **Fame Tree (LOCKED):** Fame becomes spendable post-Platinum (like EP: spend on the tree + a lifetime passive mult). Nodes: **Limelight** (lifetime-Fame passive prod/OP mult) · **Standing Ovation** (crescendo ceiling) · **Sold-Out Shows** (records sell-rate) · **Tour Buzz** (lowers WT unlock gate) · **Encore Magnetism** (auto-encore speed + AP gain) · **Diamond Status** (Fame-gain mult). Distinct from the OP tree. Magnitudes resim-tuned.
- **Reset-Softening Perk Ladder (LOCKED):** achievements that progressively break the reset grind —
  Sight-Reading (partial SW carry, exists) → **★Encore Resonance** (Encore stops resetting SW) → Keep Encore Upgrades (exists) → Skip the Wall (~Platinum, exists) → **★Opus Memory** (MO stops resetting layers below) → Roadies (=keepAutobuyers, WT spares autobuyers) → **★Legacy** (challenge-time persists across all resets). ★=new.
- **World Tour reset (LOCKED) — what persists vs resets:**
  - **PERSIST:** Applause Points (re-deploy automations) · Fame + Fame tree · challenge-time (Legacy) · all meta (EP/OP/lifetime mults/achievements).
  - **RESET:** tiers/SW/tempo/crescendo/encoreCount/MO-progress · **autobuyer UNLOCKS incl. auto-encore & auto-MO** (re-buy with your persisted AP) — UNLESS **Roadies/keep-autobuyers** is owned (then they survive). The deep reset is a real sacrifice; Roadies is the payoff.

### 3b-numbers. Break-phase DRAFT magnitudes (proposed — resim-tuned, AWAITING VINCE APPROVE/TWEAK)
**Fame Tree** — Fame earned per post-Platinum MO ≈ `floor(1 + log10(records/1M))`; spendable + lifetime passive mult:
| Node | Effect/lvl | Base cost | Max |
|---|---|---|---|
| Limelight | +15% prod & OP (lifetime-Fame-scaled) | 3 Fame | 8 |
| Standing Ovation | +0.5× crescendo ceiling (active) | 5 | 4 |
| Sold-Out Shows | +20% records sell-rate | 4 | 6 |
| Tour Buzz | −8% World Tour venue component costs | 6 | 5 |
| Encore Magnetism | −10% auto-encore interval, +10% AP | 4 | 6 |
| Diamond Status | +25% Fame gain | 8 | 5 |

**Reset-Perk Ladder** unlocks: Sight-Reading (early, exists) · ★Encore Resonance (25 lifetime Encores → Encore stops resetting SW) · Keep Encore Upgrades (exists) · Skip the Wall (1st Platinum, exists) · ★Opus Memory (10 post-Plat MOs → MO stops resetting below) · Roadies/keepAutobuyers (L3 component) · ★Legacy (1st challenge → challenge-time persists across all resets).

**Crescendo (Standing Ovation):** active base ×3 → +0.5×/lvl → ×5 at lvl 4. **Idle/auto-conduct = 70% of active power (FLAT); active holding = 100%** → idle ×2.1 → ×3.5. ⚠️ SUPERSEDES all earlier "×2.5 auto-conduct cap / 83%" mentions in this doc — the rule is now "auto = 70% of whatever active is."

## 4. Work breakdown — build order: **sim-fix → idle-verify → Break phase → challenges → polish → ship**

### 4.1 Fix + harden the sim (FIRST — it's the verification backbone)
- The resim crashes (OOM, ~48min) simulating the fully-automated post-Platinum loop. Treat as **sim-scale**: add step caps + **coarse dt post-Platinum** (the autobuyer-throughput rule from L2-SPEC §9 — fine dt only where it matters), bound total work per seed. If it still blows up → escalate to a possible game degenerate-loop.
- Mirror the live model exactly: auto-encore wall-gate (`!layer1WallReached`), wall-clock throttle (simMs), AP accrual, AP-unlock purchases.
- **Acceptance:** human-pacing sim completes all seeds without crashing.

### 4.2 Idle/AFK verification sim (#12)
- New scenario: play to ~MO#3 (unlock auto-encore + auto-MO), then **zero manual input** — only autobuyers (OP-path tiers) + auto-encore + auto-MO fire on ticks.
- **Acceptance (the idle promise):** reaches **Platinum AND completes the circuit hands-free**, any duration. Report idle-time-to-Platinum vs the ~22h active figure. (Tempo stays baseline — idle is slow-but-hands-free by design until the Acoustic challenge grants tempo automation.)
- Model **auto-conduct crescendo capped at ×2.5** in the idle scenario (active can exceed); confirm idle still reaches the goal at that capped crescendo.
- If idle stalls → diagnose (likely tempo/production gating) and surface before proceeding.

### 4.3 Challenge full-reward redesign (#9) — the headline content
**LOCKED table** (magnitudes tuned in resim; rewards all dynamic, themed):

| # | Challenge (constraint) | Gate | Dynamic reward | Automation-power |
|---|---|---|---|---|
| 1 | Solo — only Notes | early | Notes prod **× current SW** | — |
| 2 | Duet — 2 tiers | opus 4 | bottom-2-tier prod **× per achievement** | — |
| 3 | Adagio — tick ÷10 | encore 8 | global prod-speed **× current SW** | faster auto-encore |
| 4 | Inflation — 10× cost | opus 5 | cost reduction **deepens per achievement** | — |
| 5 | One-Hit — ≤10/tier | peak 1e65 | value-per-purchase **× current SW** | autobuyer **bulk** tier |
| 6 | Acoustic — no tempo | encore 10 | tempo effectiveness **× per achievement** | **🎵 Tempo autobuyer** |
| 7 | Diminuendo — prod ÷100 | opus 6 | global prod **× current SW** | — |
| 8 | Playing It Flat — no milestones | peak 1e68 | milestone-mult strength **× per achievement** | — |
| 9 | Leaky — SW decay | encore 12 | **AP-gain × encore time** | autobuyer **speed** tier |
| 10 | Opening Night — rising cost | opus 7 | cost-growth reduction **× current SW** | — |
| 11 | Reverse — reversed prod | peak 1e72 | lower-tier prod **× current SW** | — |
| 12 | Unplugged — no prestige bonus | opus 8 + encore 15 | **META: global all-layer mult × total challenge time** | finale_auto (post-L3) |

- Each also pays a one-time **AP payout** (~50→600, scaling with difficulty).
- **Build:** extend `ChallengeConfig` reward shape; reward-application in `checkChallengeCompletion`; a new **dynamic-multiplier subsystem** wired into `formulas` (each reward reads live state — SW / achievement count / encore time / cumulative challenge time); persist challenge-reward state; `ChallengesPage` UI shows rewards; drop the vestigial `mo_auto` mapping; tests.
- **Power budget:** separate axis, bigger than achievements, with a cap that keeps Platinum ~22h / the idle arc intact (validated in resim).
- Tempo autobuyer becomes the **Acoustic** reward (challenge-gated, per decision #5).

### 4.4 Auto-tour capstone
- Full-auto (auto-collect + auto-advance venues) unlocked **near circuit end**, **AP-purchased**. Reuses existing `performTour()`; add an auto-trigger in the tick-driver (like autoMO) gated on the capstone unlock.
- **Acceptance:** with it on, the remaining venues tour + graduate hands-free.

### 4.5 Polish for release
- **Filler-achievement cleanup:** replace ~100 `ach_play_*`/`ach_active_*` time-fillers with meaningful markers; keep the unlock drip; stay ≤ +150–200% global-mult budget. (Redo properly — the reverted Cursor attempt is the cautionary tale.)
- **Sound of Silence:** add a **restraint-playstyle sim seed** proving reachability (it's reachable; the sim just never plays restraint-style).
- **Onboarding:** light intro + tooltips at the key beats (first Encore, the wall/MO, World Tour, buying AP automation).
- **Ko-fi + Feedback:** non-intrusive donation link + an in-game **Feedback** link (Discord/form) beside it.
- **Crescendo cap:** implement the ×2.5 auto-conduct cap (idle) vs active exceeding it.
- **Post-circuit finale card:** cheesy *"Get ready to choose your Signature…"* tease + feedback/Ko-fi; keep-idling after.
- **Audio: NOT in this phase** — deferred to a single pure pass after all L3 content is frozen (§4.6.1).

### 4.6 Ship
- Full gate: tsc + all unit + all 4 sims green + idle-sim passes. Merge `feat/layer3` → master. **Vince plays end-to-end → approves → public.**

### 4.6.1 Audio (FINAL pass, after content freeze)
All L3 content/mechanics complete + frozen FIRST; then a single dedicated audio pass so audio work never gets invalidated by content changes. Done after §4.6 (may be its own post-playtest or pre-public step per Vince).

## 5. Risks / watch-items
- **Idle pacing unverified** until §4.2 — the headline ~22h-mostly-idle claim rides on it. Highest risk; verified first.
- **Challenge power creep** — the bigger-axis dynamic rewards could trivialize pacing; cap + resim-validate.
- **Filler cleanup global-mult budget** — easy to overshoot; measure against achievement-pacing sim.
- **Living-venue art deferred** — playtest ships with simple visuals; first-impression risk accepted in exchange for validating fun first.

## 6. Out of scope (this release)
Living-venue art (post-playtest), L4+ build (light direction only), mobile/Steam monetization, offline auto-prestige.
