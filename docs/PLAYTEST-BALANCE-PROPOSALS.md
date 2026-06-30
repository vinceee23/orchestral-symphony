# Playtest balance proposals (L0–L3) — for Vince's feel verdict

> These are the **balance/feel** items from the audit. Per "gate behind proof," I did **NOT** change
> any of them autonomously — each needs your hands on the game. For each: the symptom you'll feel, why
> it happens (with the real numbers), concrete options, my recommendation, and what to re-sim after.
> Read while you play; mark a verdict and I'll implement + re-run the pacing sims.
>
> Source: `docs/L0-L3-POLISH-AUDIT.md` Tier 2. Numbers verified against `src/core/formulas.ts`,
> `constants.ts`, `crescendo.ts`, and the sim reports.

---

## P1 — Early Encore reward feels flat ("+1 Applause" every time)  ⭐ most likely to hurt the trial
**Feel:** Your first prestige loop — the emotional hook of the trial — hands the same "+1 Applause"
no matter how far you pushed the run.

**Why (real numbers):** `getEncoreGain = floor((peak / 1e15)^0.03)`. The 0.03 root is so flat that EP = 1
for every peak from 1e15 all the way to ~1e29. You need peak ~1e30 for EP 2, ~1e38 for EP 5. So across
basically the entire first climb-to-the-wall, every Encore pays exactly +1. And the multiplier is
additive (`1 + EP`), so once you have a few EP the marginal step also shrinks (encore #2 doubles you;
encore #8 adds ~14%). The back half of the 8-encore wall is the least rewarding part — right before MO.

**Options:**
- **A (recommended): add a small linear floor term** so early gains read +1, +2, +3 without touching the
  late curve. e.g. `gain = max(rootGain, floor(log10(peak/1e15) / K))` — tune K so a "pushed" run visibly
  pays more than a minimal one. Keeps the 8-encore wall timing roughly intact (re-sim to confirm).
- **B: raise `ENCORE_EP_ROOT`** 0.03 → ~0.05–0.06 (steeper growth). Simpler, but compresses the whole
  curve and will shift the wall — needs more re-tuning.
- **C: lower `ENCORE_EP_THRESHOLD`** (1e15) so EP starts climbing earlier. Cheapest, but you reach the
  wall faster.
- **D: leave gain, surface the cumulative ×multiplier more prominently** so the player sees lifetime
  growth, not the shrinking marginal step. (Pairs well with A.)

**My pick:** A + D. **Re-sim:** `human-pacing` (8-encore wall ~95min, first MO ~151min must stay in band),
`era-pacing`.

---

## P2 — Re-climb friction after every prestige
**Feel:** Right after an Encore/MO you replay the exact same opening (buy Notes → Motifs → …) from 10 SW.

**Why:** `applyReset` drops you to `STARTING_SOUNDWAVES = 10`, all tiers 0. The Sight-Reading encore
upgrade (head-start `peak^0.5`) mitigates it but is an EP purchase you may not own early, and only applies
on Encore (not MO). So 8 manual re-climbs per MO cycle replay the same trivial first ~15–30s.

**Options:**
- **A (recommended): a lifetime-scaled SW cushion on reset** — start each run with a small SW amount that
  scales with lifetime progress (fast-forwards only the *trivial* opening brackets, not the meaningful climb).
- **B: make Sight-Reading cheaper / partially default-on earlier.**
- **C: auto-rebuy the trivially-cheap opening brackets** on reset (the ones that cost a rounding error).

**My pick:** A (smallest, smoothest). **Re-sim:** `human-pacing` (don't trivialize the wall), `l3-pacing`
(re-climb snowball already PASS — keep the floored shape).

---

## P3 — The marquee active verb (Conduct/Crescendo) has thin payoff
**Feel:** Conducting doesn't feel worth it vs just idling.

**Why:** `CRESCENDO_BASE_MAX = 3`, `CRESCENDO_MAX_CEILING = 6` — fully upgraded the active verb tops out
at ×6. And `AUTO_CONDUCT_FRACTION = 0.7` means idle auto-conduct already sustains 70% of the ceiling, so
the active-vs-idle delta at full upgrades is only ~×6 vs ×4.5 (~33% upside for actively holding).

**Options (combine):**
- **A (recommended): lower `AUTO_CONDUCT_FRACTION`** 0.7 → ~0.5 — widens the active premium to ~×6 vs ×3
  (the upgrade copy literally used to say "half ceiling," so 0.5 also re-aligns intent). *(I already fixed
  the copy to say ~70%; if you pick 0.5 I'll revert the copy to "half.")*
- **B: raise the crescendo ceiling** (base and/or max) so the verb's absolute payoff is bigger.
- **C: add a short over-cap "peak" burst** on a fresh tap (a spike that decays) so active tapping has a
  satisfying momentary high above the idle floor.

**My pick:** A first (cheapest, biggest felt difference), then C if you want active to feel skill-rewarding.
**Re-sim:** `human-pacing` (tempo/active ratios), `era-pacing`. **Note:** idle-first is sacred — don't let
active become *mandatory*, just *rewarding*.

---

## P4 — No active verb at all in L0–L1
**Feel:** The opening hours (start → 8 encores → first MO) are pure idle-buy; the headline verb (Conduct)
doesn't appear until L2.

**Why:** Conduct is hard-gated to `opusCount > 0` (button hidden, crescendo pinned at 0). The only
production-affecting interaction before the first Magnum Opus is clicking Buy.

**Options:**
- **A: an earlier, weaker active beat** before the first MO (e.g. a lightweight "tap to flourish" or an
  early limited Conduct).
- **B: lean into idle-first for L0–L1** and accept buying-the-milestone-chase as the L1 verb — but make
  the buy-10 milestone chase more *active/visible* (juicier feedback, clearer "next ×2" pull).
- **C: foreshadow Conduct earlier** (a readable tease, not the current 8px "the baton awaits") so its L2
  arrival feels earned. *(This is a UI item I can do without balance impact — see the UI batch.)*

**My pick:** Decide A vs B with playtest feel. C regardless. This is the biggest *design* question here —
it shapes the whole first session. **Re-sim:** any new verb needs the full pacing pass.

---

## P5 — Offline autobuyers barely run (returning-player correctness)  ⚠ bug, but balance-adjacent
**Feel:** Come back after hours and your automation did almost nothing.

**Why (root cause, from the critic):** offline replay runs a synchronous `while` loop calling
`calculateTick`, but `tick.ts` reads `Date.now()` *inside* the loop — it never advances across iterations,
so `now - ab.lastTick ≈ 0` for every chunk after the first. Autobuyers fire ~once for the entire away
window; auto-encore/MO/graduate (which live in the tick *action*, not `calculateTick`) don't run offline
at all.

**Options:**
- **A (recommended): thread a simulated clock** through `calculateTick` for the offline replay so
  autobuyers fire once per elapsed interval across the whole window. Then run a lightweight offline
  auto-prestige pass (capped iterations).
- **B: minimal — just fix the autobuyer clock**, leave auto-prestige paused offline but *say so* in the
  Welcome-back modal.

**Why it's here, not auto-fixed:** the fix is a real correctness win, but it *increases offline output*,
which is a pacing change. **Recommend A, then you judge the new offline magnitude.** **Re-sim:**
`human-pacing` AFK-idle probes + a new offline-vs-foreground equivalence check.

---

## P6 — Challenge rewards are unsimmed placeholders + a few mistuned targets
**Feel:** Clearing an L3 challenge gives a reward that feels meaningless vs your current production; one
challenge (ch_acoustic) is trivially beatable for its gate.

**Why:** Every reward line in `challenges.ts` is marked `TUNE §2.8 sim` (placeholder AP + multipliers).
The challenge-pacing sim shows all 12 beatable and thresholds monotonic, but targets vs unlock-era aren't
all matched (ch_acoustic targets 2e21 but unlocks at 10 Encores → instant clear, so its noTempo constraint
never bites). Capstone measured ×8.23.

**Options:** Run the §2.8 sim and lock reward magnitudes so each clear is worth the run; re-tune the few
targets that don't bite at their unlock era. **My pick:** do this as a focused balance pass with you.
**Re-sim:** `challenge-pacing`.

---

## P7 — `ch_leaky` (swDecay) difficulty is framerate-dependent  ⚠ pure bug (could fix without you)
**Why:** `tick.ts` applies `soundwaves *= (1 - swDecay%)` once per `tick()` call; the loop runs once per
animation frame and `fpsCap` defaults to 0 (uncapped). So the decay compounds ~60–144×/s on a high-refresh
display vs 30×/s capped — the challenge is dramatically harder/easier by hardware. `risingCosts` already
does it correctly as `^(elapsedSec)`.

**Fix:** convert swDecay to a time-based rate `(1 - perSecRate)^(dt/1000)`, mirroring risingCosts. This is
a correctness fix, not a tuning choice — **say the word and I'll do it in the Tier-0 style** (then re-sim
`challenge-pacing` to confirm ch_leaky stays in band).

---

## P8 — L4 (Signature) leaks into the L0–L3 trial at circuit-complete
**Feel/why:** Completing the 6-venue circuit sets `circuitComplete` AND `signatureUnlocked`, revealing the
Signature tab + "Full circuit complete" — dropping the trial player at a gated L4 wall with no payoff.

**Options:**
- **A: a satisfying "you've completed the trial" capstone** at circuit-complete (a real ending beat).
- **B: cleanly gate the Signature reveal** behind the unshipped layer so the trial ends on a high note,
  not a locked door.

**My pick:** A (gives the trial a felt finish + a "more coming" hook). This is also a narrative/UI item.
**Decision needed:** what should the *end of the trial* feel like?

---

### Suggested order once you've played
1. **P1** (first-prestige reward feel) — biggest trial-impact.
2. **P3** (active verb payoff) + **P4** decision (active in L0–L1) — shapes the whole session.
3. **P5/P7** (returning-player correctness + the framerate bug) — I can take these as bug-fixes on your OK.
4. **P2** (re-climb smoothing), **P6** (challenge rewards), **P8** (trial ending).
