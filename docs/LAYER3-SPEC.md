# Layer 3 + the Prestige-Layer Ladder — SPEC (proposal, not implemented)

Status: **proposal for Vince's sign-off.** Self-iterated for loopholes (see §7). No code changed.

---

## 1. The problem to resolve first: how many layers, and is "Grand Finale" the end?

**What exists today (code reality):**
- **3 prestige layers:** L1 **Encore** (EP/Applause), L2 **Magnum Opus** (OP + Records→Platinum→Fame), L3 **Grand Finale** (`finalePoints`/`finaleCount`, reset gated at ~1.79e308 SW). L3 is *stubbed* — the reset exists, the payoff doesn't.
- **Visual era system (StageHall):** 7 tiers — `0 intimate · 1 Encore · 2 Magnum Opus · 3 Repertoire · 4 Genre · 5 Virtuoso · 6 Canon`. The era formula is `finalePoints>0 ? 6 : opusCount>0 ? 2 : lifetimeEP>0 ? 1 : 0` — so **eras 3,4,5 are never reached** (Finale jumps 2→6), and Repertoire/Genre/Virtuoso are **placeholder names with zero mechanics.**
- **§11 stage-growth vision:** each LAYER adds a performer section — orchestra (L1) → +recording console (L2) → +touring ensemble/2nd orchestra (L3 "Repertoire") → +soloists/choir (later). **§11 calls L3 "Repertoire", not Grand Finale.**

**The contradiction:** the code's L3 = "Grand Finale" (sounds terminal), but the era ladder + §11 imply 3 more layers after MO (Repertoire/Genre/Virtuoso) before a "Canon" finale. So either the game ends at L3, or "Grand Finale" is mis-named for a mid-ladder layer.

### DECISION A — **LOCKED (Vince, 2026-06-25): full 6-layer ladder, Grand Finale = Layer 6 (the end).**

```
L1 Encore  →  L2 Magnum Opus  →  L3 Repertoire  →  L4 Genre  →  L5 Virtuoso  →  L6 Grand Finale (END)
era 1          era 2              era 3             era 4        era 5            era 6 (Canon palette)
```
- **Grand Finale is the END (Layer 6)** — "more fitting to an end." (Vince has future ideas for a **Layer 7** beyond it; out of scope here.)
- The **era system was already right** — eras 3/4/5/6 = Repertoire/Genre/Virtuoso/Canon. They just need their layers built and the era formula to stop skipping 3→6.
- **Consequence — the existing code is mis-placed:** today's `finalePoints` / `finaleCount` / `performGrandFinale` (the ~1.79e308 reset) is *labelled* L3 but is conceptually **L6**. So **the next layer to build is NOT Grand Finale** — it's **L3 Repertoire**, a brand-new prestige inserted *between* Magnum Opus and the eventual Grand Finale. The 1.79e308 Grand-Finale reset gets re-gated far higher and becomes L6; L3/L4/L5 each need their own gate + currency below it.

**This spec designs L3 = Repertoire** (the touring ensemble). L4 Genre / L5 Virtuoso / L6 Grand Finale are sketched at the end (§6.5) but not fully specced — build them in order.

---

## 2. Layer 3 design — "Repertoire" (the touring ensemble / second orchestra)

**Fantasy:** you've mastered the concert hall (L1) and the studio/records (L2); now you **take the show on the road** — a *touring ensemble* that performs your back-catalogue across venues, a second production running alongside the home orchestra.

**Unlock / entry:** after the L2 Platinum break is established (first Platinum + reach a NEW L3 SW gate that sits **above** Platinum's curve but **far below** the eventual L6 Grand-Finale gate of 1.79e308). The L3 gate is a fresh threshold to be sim-tuned (NOT the 1.79e308 finale gate — that's L6). The reset is the "you've outgrown the studio, take it on tour" cliffhanger.

**What it RESETS:** EP + OP + Records/Platinum (the L1+L2 layers), like a normal prestige — BUT grants a permanent new currency. (It does NOT touch the L6 finale state.)

**What it GRANTS — a NEW currency, e.g. `tourPoints` / "Acclaim" (NOT `finalePoints` — that belongs to L6):**
- A permanent **production multiplier** (the snowball that makes the next L1→L2 climb faster), AND
- **Tour progress** — the NEW mechanic (below). The L3 currency both multiplies production and funds the tour.

**THE NEW MECHANIC (the point of L3) — the Touring Ensemble:**
- A **second, parallel production track**: a *touring ensemble* that auto-performs your catalogue and earns **Acclaim** (L3 resource) over time, scaling with `opusCount`/Records you'd amassed (your "catalogue depth") and the number of finales.
- **Venues:** spend finalePoints/Acclaim to unlock **venues** (a small tree/list) — each venue is a multiplier node + a flavor (Local Hall → City Theatre → National Tour → World Tour). Venues give: production mult, faster L1/L2 climbs, and Acclaim rate. This is L3's "OP-tree equivalent."
- **Stage section (§11):** the touring ensemble appears as a **new performer section** on the Compose stage (a second cluster beside the orchestra), lit at era ≥3 — the visible "stage grows a section per layer."
- **The L3 break (mirrors Platinum):** at a milestone (e.g., complete the World Tour / N venues), unlock a **catalogue-scaling** finalePoint gain (parallel to how Platinum switches OP to catalog-scaling). Keeps the "earned break" rhythm.

**Locked-constraint parity (do NOT violate):**
- finalePoint gain stays **modest/flat pre-break**, switches to scaling at the L3 break (the Platinum-style switch — the player's "aha").
- Each Finale should feel **earned** (re-climb the layers), like MO re-masters the wall.
- Tune by **natural difficulty**, not artificial gates (per the established principle).

**Numbers (sim-tunable, starting points):**
- finalePoint production mult: `1 + finalePoints * k` (additive, stable) or `2^finalePoints` capped — **sim before choosing** (the engine has the tooling).
- Acclaim/sec ∝ `catalogueDepth (opusCount-at-finale) * venueMult * tourMult`.
- L3 gate: re-tune from 1.79e308 so first Finale lands ~25–35h (sim with `sim/` once L2 P1 pacing settles).

---

## 3. The stage / visual (ties to the §11 work already shipped)

- **era 3 = Repertoire:** the touring-ensemble section lights up on the Compose stage (a second performer cluster). The backdrop palette for era 3 is already `#2dd4bf` (teal) in `ERA_COLORS` — re-tune to fit (or pick a "road/amber" tone).
- **The era formula must become a true layer→era ladder** (it currently skips 3→6). One tier per prestige layer:
  ```ts
  // getEra() in src/core/eraTheme.ts — replace the finale>0?6:opus>0?2:ep>0?1:0 short-circuit
  finalePoints > 0 ? 6   // L6 Grand Finale (Canon palette)
    : virtuosoUnlocked ? 5 // L5 Virtuoso
    : genreUnlocked    ? 4 // L4 Genre
    : tourPoints > 0   ? 3 // L3 Repertoire
    : opusCount > 0    ? 2 // L2 Magnum Opus
    : lifetimeEP > 0   ? 1 // L1 Encore
    : 0                    // intimate
  ```
  Until L4/L5 exist, their branches are simply never true — so this is safe to land *with L3* (era jumps 2→3, not 2→6). `getEra` will need the new L3+ state fields passed in.
- All the liveliness systems (motes, audience-fill, focus-pull, chrome theming) already scale per era — each new layer inherits them for free; just supply that era's palette/intensities.

---

## 4. Files this touches (when built)
- `src/store/types.ts` — NEW L3 state (`tourPoints`/`acclaim`, `venues`, `tourProgress`, `tourCount`). Leave `finalePoints`/`finaleCount` alone — those become L6.
- `src/store/gameStore.ts` — a NEW `performTour()` action (L3 currency grant + L1/L2 reset, distinct from `performMagnumOpus`/`performGrandFinale`) + tour tick + venue purchases. `performGrandFinale` stays as-is for L6 (re-gate later).
- `src/core/constants.ts` / a new `src/core/repertoire.ts` — L3 formulas, venue configs, the new L3 gate (NOT `GRAND_FINALE_SW_THRESHOLD` — that's L6).
- `src/core/tick.ts` — Acclaim accrual (parallel track).
- `src/core/formulas.ts` — fold finalePoint mult into `getCoreProductionMultiplier`.
- `src/components/` — a Repertoire/Tour tab (venues) + the stage section in `StageHall`/`OrchestraStage`.
- `sim/` — an L3 pacing sim (new) BEFORE tuning any numbers.

## 5. Decisions — status
**LOCKED (Vince, 2026-06-25):**
- Ladder = full **6 layers**, Grand Finale = **L6** (the end); L7 reserved.
- L3 mechanic = **touring ensemble + venues** (parallel Acclaim track + venue tree).
- Ladder philosophy = **every layer introduces a brand-new mechanic** (see §6.5 sketches).
- Spec depth = **detail L3 now, sketch L4–L6**.

**Still open (defaults proposed; decide on review):**
1. L3 currency name — "Acclaim" vs "Tour Points" vs "Repertoire". *Default: Acclaim (the earned resource) + a meta-mult.*
2. L3 currency gain shape (additive `1+n·k` vs capped-exponential) — *decide after a sim.*
3. Does an Encore/MO reset wipe the touring ensemble's Acclaim, or does the tour persist across lower-layer resets? *Default: tour persists across L1/L2 resets, only an L3 reset banks it.*
4. L3 SW gate value — *sim-tune; must sit above Platinum's curve, well below L6's 1.79e308.*

## 6. Build order (once signed off)
1. Lock DECISION A + the mechanic. 2. Sim the L3 gate + finalePoint curve. 3. Wire the reset payoff + currency (minimal: a multiplier) → playable L3. 4. Add the tour/venues tree. 5. Add the stage section + era-3 visuals. 6. Re-sim full L1→L3 pacing.

## 6.5 Sketches — L4 Genre, L5 Virtuoso, L6 Grand Finale (each a DISTINCT new mechanic)
*Not full specs — design intent + the novel mechanic, to be detailed in order. Each adds a stage section (§11) and an era tier (4/5/6).*

- **L4 — Genre (era 4, `#ec4899` pink).** *Mechanic: branching specialization / loadout.* You pick a **Genre** (e.g. Classical · Jazz · Film Score · Electronic), each granting a distinct global modifier + its own small skill-tree. Switching genre = a sub-reset of the genre tree (not your layers). This is a *build-diversity* mechanic — fundamentally different from L3's parallel-income track. Currency: **Genre Mastery**. Open Q: can you eventually run multiple genres at once (fusion), or one at a time?

- **L5 — Virtuoso (era 5, `#ef4444` red).** *Mechanic: voluntary-difficulty challenges.* **This layer already has its hook in code** — `Sidebar.tsx` hides the Challenges tab with the comment *"Challenges hidden until Layer 5 (Virtuoso) — they ARE that layer's voluntary-difficulty content."* So L5 = the Challenges system goes live: constrained runs (no-tempo, capped tiers, etc.) that grant permanent **Virtuoso** bonuses on completion. Distinct mechanic (self-imposed constraints for reward). Reuse the existing `challenges.ts` + `completedChallenges` state.

- **L6 — Grand Finale (era 6, `#fbbf24` gold/Canon — the END).** *Mechanic: total ascension / new universe.* The existing `finalePoints`/`performGrandFinale` reset, **re-gated to ~1.79e308** and moved here. Resets EVERYTHING (L1–L5 currencies included) for a permanent meta-multiplier (`finalePoints`). The "new universe" framing already exists (`ach_second_universe` = "Record a Magnum Opus in a new universe (post-Grand Finale)"). This is the climactic full-wipe-for-meta-power layer. L7 (future) would sit beyond it.

## 7. Self-iteration — loopholes / risks found (and mitigations)
- **L:** ~~"Grand Finale" being mid-ladder is confusing.~~ **RESOLVED:** Grand Finale = L6 (the end); L3 is the new "Repertoire" layer. But the *existing code* still labels the finale reset as L3 — **building L3 must NOT touch `finalePoints`/`performGrandFinale`**; introduce parallel L3 state, or the two will collide. (Called out in §4.)
- **L (NEW, from the 6-layer + every-layer-novel decision):** four distinct from-scratch mechanics (L3 tour, L4 genre, L5 challenges, L6 ascension) is a **large, long-horizon scope** — risk of an unfinished ladder. **M:** strictly build in order, each layer fully playable+balanced before the next; L5 is partly free (Challenges already stubbed); ship L3 end-to-end first and re-evaluate.
- **L:** A parallel Acclaim track that runs while you climb L1/L2 could **trivialize** L1/L2 (idle income outpaces active play). **M:** cap Acclaim/sec relative to active production; sim the idle-vs-active balance; make venues *multiply your climb* rather than replace it.
- **L:** finalePoint multiplier could **runaway** (compounding across finales). **M:** additive or capped form, sim across many finales (reuse the records/OP runaway checks).
- **L:** Resetting Records/Platinum each Finale could feel **punishing** (losing the Fame snowball). **M:** a "Legacy" carry — keep a fraction of Fame, or a perk (mirrors keep-encore-upgrades). Sim the re-climb time.
- **L:** L3 gate at 1.79e308 is a **JS-float ceiling** (break_infinity handles it, but the *named* threshold is the Decimal infinity). **M:** confirm the gate is well below break_infinity's limit; pick a clean magnitude (e.g., 1e308 is fine, but ensure post-Finale you can still climb — Decimal not native float).
- **L:** the era system assumes finale=era6; changing to era3 **affects the shipped backdrop/liveliness/chrome**. **M:** one-line era-formula change + supply era-3 palette/intensities (the systems already interpolate).
- **L:** adding L3 state without a **save migration** could break existing saves. **M:** default the new fields in `createInitialState` + the persist migration (the store already guards undefined fields).
