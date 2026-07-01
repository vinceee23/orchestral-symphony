# Pacing / Scaling / Monotony — findings + YOUR morning tap-questions

*Written unsupervised 2026-07-02 (late) while you slept, per your ask: "note the questions you have
in mind." Data: the 6-profile journey sim (`sim/l4-journey.test.ts`, JOURNEY=1) + a new targeted
probe (`sim/l2-probe.test.ts`, PROBE=1). PC was shut down at the end of this workflow as requested.*

## The short version

**Scaling math: healthy.** No inversions, no plateaus, no runaway — cycle times shrink monotonically,
costs outrun milestones, nothing funky found. **Pacing texture: one real desert found and quantified.**

## Finding 1 — THE L2 DESERT (the one that matters)

Between the first Magnum Opus and Platinum, a player grinds **~30 near-identical MO cycles** with
**zero new mechanics entering the game**:

| Profile | First MO | Platinum | MO cycles | Cycle time trend |
|---|---|---|---|---|
| rusher (15s acts, conducts) | 0.40h | 5.44h | **32** | 16min → 7.5min |
| casual (2-min acts) | 2.43h | 30.72h | **30** | 94min → 20min |

The cycle loop is: wait for 72 Symphonies → MO → spend OP → repeat. The Opus tree exhausts partway
through, thinning even that decision. Crucially, **Challenges are gated behind World Tour** — the
variety system that exists sits locked exactly where the monotony lives. Cadence does accelerate
(2–4.7× faster by the end — real felt progress), but 30 same-shaped cycles is a lot, especially the
casual's ~28 hours.

**Q1 (headline): what do we do about the L2 desert?**
- **(a) Unlock Challenges earlier (my recommendation)** — e.g. at ~5 Magnum Opuses instead of World
  Tour. Zero new content needed; 12 existing challenges inject decisions exactly into the desert;
  re-gate the handful whose mechanics genuinely need L3. Needs a challenge-pacing re-sim.
- (b) Shorten the desert — boost the records curve so Platinum lands at ~15–20 MOs. (Less grind, but
  also less idle-game meat; touches sim-validated pacing.)
- (c) Accept — genre-standard midgame; idle games are allowed a wait-loop era. (Defensible!)
- (d) New mini-mechanic in L2 — most design work; scope warning; against the "finish L4 first" rule.

## Finding 2 — idle-heavy players fall off a cliff pre-automation

A true idler (checks every 10 min, never conducts): **8.5h to the 8-encore wall** (vs 16 min active),
**no Platinum within 60h**. The design intent is "active early, automation earned" — that's working —
but the magnitude means a passive first-session player likely bounces before anything automates.

**Q2: is the pre-automation activity demand intended at this magnitude?**
- (a) Yes, accept — the trial's first hour is meant to be played, not watched.
- (b) Soften slightly — e.g. auto-encore unlock earlier / first tier-autobuyer before the first MO.
- (c) Don't rebalance; just message it — an early hint that says "Sonance rewards presence until the
  orchestra learns to play itself."

## Finding 3 — Ovation dead-ends in the trial

After the one 5-Ovation auto-encore unlock, **Ovation has no sink until L4's auto-tour (200)** — it
just piles up all through L2/L3. Minor, but it reads as "why am I earning this?"

**Q3: Ovation surplus in the trial —**
- (a) Accept (it forward-saves for the full game's L4 sink).
- (b) Add a small "future use" line in the Ensemble panel so the pile-up reads as savings, not waste.
- (c) Add a trial sink (e.g. repeatable small automator-speed buy) — touches balance; needs a sim.

## Finding 4 — informational, no action needed

- My journey profiles run HOTTER than the calibrated human-pacing sim (rusher Platinum 5.4h vs the
  official 12–22h band) — they act with perfect discipline. Both are valid lenses: bands = realistic
  humans, journeys = mechanical bounds. Don't over-index on either alone.
- Longest no-progress stall in any profile was 31 min (idler) — numbers keep moving; the desert is a
  VARIETY problem, not a stall problem.
- Auto-encore, auto-MO, tier automators, auto-tour: all verified firing in their windows (sim-tested).

## Carry-over questions already waiting on you

- **Q4: BGM verdict** — the bed is now era-reactive (grows with progress, swells on conduct). Needs
  your ear: keep / tune / revert. (`2d95f0a`)
- **Q5: Redeploy?** — 4 commits are LIVE-WORTHY but undeployed (offline hardening, reactive BGM,
  **the mobile fix** — phones currently can't reach the Notes pod on the live build!, docs). I did
  NOT deploy unsupervised. Morning me + your word = push master.
- **Q6: Steam $100 + individual-vs-company** — page is now 100% asset-complete (capsules, copy, 5
  screenshots in `drafts/steam/screenshots/`). Only your paperwork starts the wishlist clock.

## What I did NOT touch (and why)

No balance changes, no gate moves, no deploys — all of the above are your calls, made rested. The
probe + journey harnesses are committed so any option can be re-simmed before we commit to it.
