# Ladder Mechanics — the 9 layers, each a distinct axis (mechanics, not numbers)

Status: **design in progress (2026-06-27), one layer at a time.** Mechanics only — no tuning/numbers
(those come from sims when each layer is built). Build rule (LOCKED): **spec all → build sequential** —
each layer fully playable + balanced before the next. Narrative for each layer lives in `docs/STORY-SPEC.md`.

## The arc of axes
produce → economy → space/automation → **identity → mastery → permanence → convergence → gauntlet → bosses**

| Layer | Theme | Novel axis / mechanic | Status |
|---|---|---|---|
| L1 Encore | foundation | tier production + Encore prestige | **built** |
| L2 Magnum Opus | first work | parallel Records economy + Platinum + Opus tech tree | **built** |
| L3 World Tour | the world | spatial venue ladder + touring loop + automation of L1/L2 + challenges | **built** |
| L4 Signature | your voice | **Identity** — domain-alignment "class" + Signature-budget blending | **designed** |
| L5 Virtuoso | mastery | **Mastery** — Perfect Take (bank area-under-a-consistency-curve) | **designed** |
| L6 Canon | immortalize | **Permanence** — The Palimpsest (accreting eternal score) | **designed** |
| L7 Grand Finale | the triumph | **Convergence** — The Final Performance (commit-drain voices, evenness-scored, decrescendo) | **designed** |
| L8 Redemption | the comeback | **Gauntlet** — 2–3 conditioned Grand-Finale re-climbs | sketched |
| L9 The gods | confrontation | **Bosses** — Celestials pantheon (6 instrument-gods, Maestro final) | sketched |

---

## L4 — Signature (DESIGNED)
**Fantasy:** you stop being a performer and become an artist with a *voice*. The new axis is **identity**.

- **Core = domain alignment (a "class").** You align your Signature to instrument **domains** — Percussion,
  Strings, Brass, Woodwinds, Harmony — which are *secretly the gods' domains* (the L9 foreshadow: you've
  been embodying one of them all along; "…Curious," says the watcher, recognizing itself in you). Each
  domain bends your whole build differently:
  - Percussion → tempo/rhythm (fast ticks, timing)
  - Strings → sustain/crescendo (slow build, huge peaks)
  - Brass → raw output (brute production, fewer tricks)
  - Woodwinds → agility/efficiency (cheap, nimble, decay-management)
  - Harmony → synergy (rewards balancing multiple tiers/mechanics)
- **One primary, blend the rest over time — via a finite "Signature budget."** Your voice has a fixed
  expressive capacity, allocated across domains. Mono = 100% in one (intense, pure). Blends split the pie
  (60/40, etc.) — secondaries are reduced *because they share a zero-sum budget*, so blending is always a
  real specialist-vs-generalist trade-off, never free stacking. **The budget GROWS with progress** — early
  L4 it's small (effectively mono); later the pie grows, which is *how* you "eventually mix in other
  domains" (a strong primary + meaningful secondaries becomes affordable late).
- **Respec between runs** — re-allocate your Signature each new L4 run. High build-craft replayability,
  no "wrong choice" trap.
- **Reset/persist:** TBD when built (L4 is a reset layer) — Signature allocation + budget growth are the
  L4-tier progress; ascending past L4 resets the layers below per the matrix.

---

## L5 — Virtuoso (DESIGNED) — "Perfect Take"
**Fantasy:** mastery = *the take with no wrong notes.* New axis = **scoring the shape of a curve (evenness over time).**
- Start a **Take** (a continuous performance). A live **Virtuosity meter** rises only while production stays
  **in-tempo** — actual output held inside a target band (spiking too high or going dark/idle drops you out
  the top/bottom). Breaking tempo **never resets** — it only **caps** the current multiplier until you
  re-stabilize.
- End-of-take banks the **integral of the meter over time** (total area under the curve) — so a long, *even*
  performance beats a short spiky one. Banked Takes raise a **permanent Mastery rank** that lifts the meter's
  idle **floor** and slowly widens the skill ceiling.
- **Idle-safe by construction:** the band auto-**widens** while away, so idlers always sit in-tempo at a low
  band (slow-but-safe trickle); the permanent floor guarantees a real baseline. Active play rides a tight band
  for far more area. Decay is to a **non-zero floor** — never zero, never a gate, no clicking required.
- **Distinct:** nothing else scores *evenness/curve-shape*; explicitly NOT L3's self-handicap toggles (scores a
  self-generated output signal, no constraint plumbing), not L4's budget allocation, opposite temporality to L6
  (transient/re-earnable vs permanent). *Runner-up: Rubato (a time↔power tempo dial) — rejected as heaviest
  build + flirts with L3's manipulate-lower-layers axis.*
- Build: all scalar Zustand state; the only subtle piece is the timestamp-driven band-widening function.

## L6 — Canon (DESIGNED) — "The Palimpsest"
**Fantasy:** immortalize your legacy into one eternal manuscript. New axis = **accrete-by-overwrite into
permanent sediment.**
- One eternal score `{ top: Work, ghosts: Work[] }` that **survives ALL deeper resets** (the first truly
  permanent layer). The **top** Work pays full bonus; each **ghost** pays `base × decay^depth` — fainter the
  deeper, but **never zero** (it's canon, it can't fully die). Permanent bonus = `top + Σ ghosts`, forever.
- A **Work** snapshots a peak you hit (e.g. peak multiplier at canonize-time). Canonizing a new Work puts it on
  top at full strength and **sinks** the old top a level (everything below sinks deeper, decaying more).
- **The one decision:** ride a strong top Work for full live bonus *now*, or **sink it** — locking a smaller-
  but-eternal fraction and freeing the top for a bigger peak. Order matters (depth sets decay). Pure-idle payout
  (the stack pays passively forever and only grows).
- **Composes with L7:** the accreted score is the *reservoir* L7's Final Performance *discharges*.
- *Runner-up: Movements of a Symphony (permanence by sequencing/ordering) — bolder verb, needs a reorder UI +
  flirts with idler-unfriendly penalties.*
- Build: lowest-risk — pure data; canonize = unshift + recompute; one-line production reducer; persists by not
  being wiped. Tuning (what a Work snapshots, canonize gating, decay rate) is build-time.

## L7 — Grand Finale (DESIGNED) — "The Final Performance (decrescendo)" — HYBRID
**Fantasy:** the pure triumph / the apparent end. New axis = **reward EVENNESS, not magnitude** (inverts the
whole game's maximize-one-number instinct).
- Each layer L1–L6 is a **voice** on a mixing board. You **permanently commit (silence) them one at a time**;
  committing a voice **freezes its output and drains its hoarded stockpile** into one rising **Performance
  meter**. (Merges "Final Performance" commit-voices + "One Last Breath" drain-to-zero.)
- Final payoff is a **harmonic mean** of the committed channels — **six balanced voices vastly outscore one
  giant + five tiny.** A single **decrescendo/tempo knob** shapes the pour (loud-short vs slow-quiet-higher).
- The empire goes **silent voice by voice**, draining into one balanced performance that fades to **zero** —
  then a **Standing Ovation + fake credits**, with the "applause still faintly ticking" **ember** leading into
  the **L8 fall.**
- **Clean triumph (LOCKED twist):** ZERO adversity here — no automation-stripping, no re-climbs (that DNA is
  L8's). The rug-pull is deferred to L8. Distinct from L4 (permanent irreversible commits of frozen whole-layer
  outputs, not a live respec-able budget).
- *Runner-up folded in: "One Last Breath" decrescendo spend-down (the drain + tempo knob came from it).*
- Build: trivial — read existing per-layer outputs, store committed fractions, harmonic-mean formula, one
  meter + a credits/ember component.

## L8 — Redemption (SKETCHED) — "the Gauntlet"
The fall (hiatus/flop), then the gods' "Come." Re-climb to the Grand Finale **2–3× under escalating
conditions** — challenge-constraint DNA at the *layer* scale; re-climbs are faster ("recognized") but each
gated by a harsher condition. (Detailed design in a later pass, before building L8.)

## L9 — The gods (SKETCHED) — "the Bosses"
Confront the **pantheon** (Lyra/Aeolia/Clarion/Timpana + the Twins of Harmony + the Maestro, final). Each god
is a **Celestials-style boss**: a reality with bent rules themed to its domain + a unique meta-reward — the L3
challenge DNA escalated to boss tier. (Detailed design in a later pass.)
