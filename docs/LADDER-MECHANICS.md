# Ladder Mechanics — the 9 layers, each a distinct axis (mechanics, not numbers)

Status: **design in progress (2026-06-27), one layer at a time.** Mechanics only — no tuning/numbers
(those come from sims when each layer is built). Build rule (LOCKED): **spec all → build sequential** —
each layer fully playable + balanced before the next. Narrative for each layer lives in `docs/STORY-SPEC.md`.

## The arc of axes
produce → economy → space/automation → **identity → mastery → permanence → convergence → gauntlet → bosses**

## ⭐ RESET MATRIX (authoritative — supersedes LAYER3-SPEC §3.5's 6-layer table) — B1
**Model (= the M9 declarative-reset plan):** every field has ONE `resetTier` = the *deepest* prestige that
wipes it; every shallower event **keeps** it. A prestige action is `applyReset(state, tier)`. Reset events,
shallow→deep: **Encore → MagnumOpus → Tour(L3 start) → Signature(L4) → Virtuoso(L5) → Canon(L6) →
GrandFinale(L7, ONE-TIME) → Fall(L8)**. (Platinum is a non-reset *milestone*; L9 wins reset nothing.)

| Field(s) | resetTier (deepest wipe) | Notes |
|---|---|---|
| soundwaves, tiers, crescendo, producedThisRun, tempoPurchasesThisRun | **run** (Encore+) | the active climb |
| encorePoints, encoreUpgrades, encoreCount | **encore** (MO+) | (Encore Resonance perk was CUT — Encore always resets SW) |
| opusPoints, opusUpgrades (OP tree) | **tour** | reset on Tour ONLY — they **PERSIST through Magnum Opus** (verified vs code by the bible; the earlier "+ each MO" was wrong). ⚠ opusUpgrades + `peakCrescendoMult` + `layer1WallReached` also **survive Grand Finale** (omitted from `performGrandFinale`'s reset patch) — fix when L7's one-time reset is rebuilt (bible §02/§04). |
| opusCount (catalogue counter) | **L4** ⚠ | KEPT across tours (performTour:922 keeps it); feeds the catalogue snapshot. Reset-at-L4 = confirm at L4 build |
| lifetimeEncorePoints | **MagnumOpus** | NOT permanent despite the name — it IS the Encore production mult (`getEncoreMultiplier`) and resets every MO (gameStore:789), hence every tour/finale too. *Codex's "performTour wipes it" flag was a MISREAD (verified: code is consistent + intentional); the old §3.5 "L3 keeps it" row was wrong.* `lifetimeEncoreCount` (separate field) is the persistent counter. |
| recordsSold, platinum | **tour/L3** | Platinum re-earned each tour; "ever reached Platinum" + its seen-beat persist forever |
| acclaim | **tour** (spendable) · **lifetimeAcclaim = L4** ⚠ | lifetimeAcclaim→prod-mult persists across tours; reset-at-L4? = decide at L4 build |
| currentVenue, components, keepAutobuyers, autoMO (venue ladder) | **L4** ⚠ | persist across tours (L3); reset-at-L4 = confirm at L4 build |
| completedChallenges (reward mults) | **L4** unless `keepChallenges` | per §2.8 |
| challengeBestTimes | **never** | skill record — survives the Fall (capstone recomputes from survivors) |
| seenStoryBeats | **never** | story-seen flags; only `?fresh` wipes |
| **Signature allocation** (L4 identity) | **never** (identity record) | drives the L9 mirror; live PRODUCTION effect resets with the layer |
| **Mastery rank** (L5) | TBD at L5 build | permanent floor; likely **never** |
| **Palimpsest** {top, ghosts[]} (L6) | **never** | the eternal score — survives ALL resets incl. the Fall |
| finalePoints / performGrandFinale (L7) | **one-time** | NOT a repeatable prestige; fires once |
| **Recognition** (L8) | **never** (gods' attention) | persists across comebacks + the Fall; mortal fame (Platinum etc.) resets each comeback |
| L9 claimed god-powers | **never** (boss-rush retry) | losing resets nothing; powers stack |

⚠ = needs code-verification or a per-layer build decision (don't invent — confirm against `gameStore` /
decide when that layer is built). The DEEP-permanent rows (Palimpsest, Recognition, Signature-identity,
best-times, seen-beats) are locked — those are what L8/L9 depend on. **The Fall (L8) keeps everything tagged
`never`; resets the rest like a deep prestige.** This table is the source of truth; `applyReset` reads it.

| Layer | Theme | Novel axis / mechanic | Status |
|---|---|---|---|
| L1 Encore | foundation | tier production + Encore prestige | **built** |
| L2 Magnum Opus | first work | parallel Records economy + Platinum + Opus tech tree | **built** |
| L3 World Tour | the world | spatial venue ladder + touring loop + automation of L1/L2 + challenges | **built** |
| L4 Signature | your voice | **Identity** — domain-alignment "class" + Signature-budget blending | **designed** |
| L5 Virtuoso | mastery | **Mastery** — Perfect Take (bank area-under-a-consistency-curve) | **designed** |
| L6 Canon | immortalize | **Permanence** — The Palimpsest (accreting eternal score) | **designed** |
| L7 Grand Finale | the triumph | **Convergence** — The Final Performance (commit-drain voices, evenness-scored, decrescendo) | **designed** |
| L8 Redemption | the comeback | **Gauntlet** — 3 authored conditioned Finale re-climbs + growing Recognition | **designed** |
| L9 The gods | confrontation | **Bosses** — bent-reality fights, Signature-mirror, any-order + Maestro last → join pantheon | **designed** |

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
  real specialist-vs-generalist trade-off, never free stacking. ~~Budget = HYBRID (decided 2026-06-28):
  fixed early, hard-capped growth late.~~ ⛔ **SUPERSEDED by the final LOCK (HARDENING-PLAN +
  build-specs/L4-signature.md, and AS BUILT): the budget is FIXED at 1.0 forever.** What grows is
  **efficiency** (`getSignatureEfficiency(signatureCount)`, capped ~×1.75) — allocations strengthen with
  ascensions; the pie itself never grows. Blending is affordable from day one; it's the evenness-scaled
  Harmony domain (not budget growth) that keeps generalists competitive without being optimal.
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
- **Open tuning knob (build-time):** what "in tempo" means — *hold a flat steady rate* vs *grow smoothly*
  (spikes/stalls are the sin, not growth). Leaning **grow-smoothly** (more natural for an idle game; keeps the
  consistency soul). The core SOUL is locked: L5 rewards **control/consistency**, inverting L1–L4's brute-maximize.

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

## L8 — Redemption (DESIGNED) — "the Gauntlet"
**Fantasy:** the fall (hiatus/a flop), then the gods' "Come" — prove the first time was no accident.
- **The fall:** accepting "Come" triggers a deep reset (Finale-reset-like) — but **permanence stays**
  (L6 Palimpsest) and a new **Recognition** stat carries your name forward.
- **The gauntlet:** re-climb the whole ladder to the Grand Finale **3 times** (rule of three: fall →
  comeback 1 → comeback 2 → triumphant 3rd that earns the gods), each under a **NEW authored comeback-
  condition** — narrative industry-adversity (e.g. "the world forgot you" = reduced start; "critics circle"
  = harsher gates), escalating. Built on the existing constraint ENGINE but **distinct from L3's side-
  challenges** (these are the redemption story, not optional content).
- **Recognition (the "recognized = faster" mechanic):** a multiplier that **grows each comeback and persists
  across the re-climbs** (+ L6 permanence) — so each climb is faster even as the conditions harden. A
  **tightening race**: faster you vs harder conditions. Clearing all three earns the L9 audience.

## L9 — The gods (DESIGNED) — "the Bosses"
**Fantasy:** confront the **pantheon** (Lyra/Aeolia/Clarion/Timpana + the Twins of Harmony + the Maestro).
- **The fight = a reality with bent rules** (AD-Celestials, escalated L3-challenge DNA): enter a god's domain
  where the rules **warp toward what they rule** (Timpana → all rhythm/tempo, Lyra → all sustain, Clarion →
  raw power, Aeolia → breath/decay, the Twins → a two-phase consonance/dissonance fight); hit a goal **under
  that warp** to defeat them and **claim that domain's power**.
- **Signature mirror (the L4 payoff):** the domain you most **embodied** in L4 is your **HARDEST** fight —
  you face yourself / your patron ("you've been channeling me all along").
- **Sequencing:** face the 5 domain-gods in **any order**; the **Maestro unlocks LAST** (the conductor who
  commands all domains) as the true final fight.
- **The ending:** beat the Maestro → **you join the pantheon** — become the newest god of music. "Stand with
  us," fulfilled. The true completion.
- (Detailed per-god goals/rewards = a later pass before building L9; the framework is locked.)
