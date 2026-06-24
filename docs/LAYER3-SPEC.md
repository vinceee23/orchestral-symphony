# Layer 3 + the Prestige-Layer Ladder — SPEC (proposal, not implemented)

Status: **proposal for Vince's sign-off.** Self-iterated for loopholes (see §7). No code changed.

---

## 1. The problem to resolve first: how many layers, and is "Grand Finale" the end?

**What exists today (code reality):**
- **3 prestige layers:** L1 **Encore** (EP/Applause), L2 **Magnum Opus** (OP + Records→Platinum→Fame), L3 **Grand Finale** (`finalePoints`/`finaleCount`, reset gated at ~1.79e308 SW). L3 is *stubbed* — the reset exists, the payoff doesn't.
- **Visual era system (StageHall):** 7 tiers — `0 intimate · 1 Encore · 2 Magnum Opus · 3 Repertoire · 4 Genre · 5 Virtuoso · 6 Canon`. The era formula is `finalePoints>0 ? 6 : opusCount>0 ? 2 : lifetimeEP>0 ? 1 : 0` — so **eras 3,4,5 are never reached** (Finale jumps 2→6), and Repertoire/Genre/Virtuoso are **placeholder names with zero mechanics.**
- **§11 stage-growth vision:** each LAYER adds a performer section — orchestra (L1) → +recording console (L2) → +touring ensemble/2nd orchestra (L3 "Repertoire") → +soloists/choir (later). **§11 calls L3 "Repertoire", not Grand Finale.**

**The contradiction:** the code's L3 = "Grand Finale" (sounds terminal), but the era ladder + §11 imply 3 more layers after MO (Repertoire/Genre/Virtuoso) before a "Canon" finale. So either the game ends at L3, or "Grand Finale" is mis-named for a mid-ladder layer.

### DECISION A (the one Vince must make): the ladder shape
- **A1 — 3-layer game, Grand Finale = the climax/end.** Encore → Magnum Opus → Grand Finale (the grand last act). Collapse the era system to ~4 tiers (0/Encore/MO/Finale). Simplest, fully shippable, "Grand Finale" name fits. Repertoire/Genre/Virtuoso retired.
- **A2 — 6-layer ladder (the §11 vision).** Encore → Magnum Opus → **Repertoire** → **Genre** → **Virtuoso** → **Canon**, each adding a stage section + mechanic. "Grand Finale" is renamed/becomes the **Canon** (true final layer). Long game, most ambitious.
- **A3 (recommended) — build L3 NOW as the §11 "Repertoire / touring ensemble", keep the door open to L4–L6.** Treat the current `finalePoints` reset as **Layer 3 = Repertoire** (rename "Grand Finale" → "Repertoire" OR keep "Grand Finale" as the *eventual* Canon and insert Repertoire as the real L3). Ship L3's mechanic now; L4–L6 stay named placeholders. Gets a real L3 shipped without committing to the full 6-layer scope, and matches §11's "each layer adds a section."

**Recommendation: A3.** It unblocks a real, on-theme L3 immediately and defers the 3-vs-6 scope question without painting us into a corner. The rest of this spec designs L3 under A3 (the "touring ensemble" layer), with notes on how it generalizes if Vince picks A2.

---

## 2. Layer 3 design — "Repertoire" (the touring ensemble / second orchestra)

**Fantasy:** you've mastered the concert hall (L1) and the studio/records (L2); now you **take the show on the road** — a *touring ensemble* that performs your back-catalogue across venues, a second production running alongside the home orchestra.

**Unlock / entry:** after the L2 Platinum break is established (e.g., first Platinum + reach the L3 SW gate). The reset (currently 1.79e308 SW) is the "you've outgrown the studio" cliffhanger — re-tune the gate so L3 lands at a sane wall-clock (the pacing audit estimates Finale ~30h+; sim it).

**What it RESETS:** EP + OP + Records/Platinum (the L1+L2 layers), like the current Grand Finale — BUT grants a permanent new currency.

**What it GRANTS — `finalePoints` → "Repertoire" / Tour currency:**
- A permanent **production multiplier** (the snowball that makes the next L1→L2 climb faster), AND
- **Tour progress** — the NEW mechanic (below). finalePoints both multiply production and fund the tour.

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
- The era formula must change so finale = era 3 (Repertoire), NOT jump to era 6. Under A3: `era = finalePoints>0 ? 3 : opusCount>0 ? 2 : lifetimeEP>0 ? 1 : 0` (and eras 4–6 reserved for future layers). Under A1: finale = the top era (3).
- All the liveliness systems (motes, audience-fill, focus-pull, chrome theming) already scale per era — L3 inherits them for free; just supply the era-3 palette/intensities.

---

## 4. Files this touches (when built)
- `src/store/types.ts` — L3 state (acclaim, venues, tourProgress) if added.
- `src/store/gameStore.ts` — `performGrandFinale` payoff (currency grant + reset), tour tick, venue purchases.
- `src/core/constants.ts` / a new `src/core/finale.ts` (or `repertoire.ts`) — formulas, venue configs, gate.
- `src/core/tick.ts` — Acclaim accrual (parallel track).
- `src/core/formulas.ts` — fold finalePoint mult into `getCoreProductionMultiplier`.
- `src/components/` — a Repertoire/Tour tab (venues) + the stage section in `StageHall`/`OrchestraStage`.
- `sim/` — an L3 pacing sim (new) BEFORE tuning any numbers.

## 5. Open decisions for Vince (sign-off)
1. **DECISION A** above (3-layer vs 6-layer vs A3). *Recommend A3.*
2. Name: keep "Grand Finale" (and make it the eventual Canon), or rename L3 → "Repertoire" now?
3. Is the new mechanic the **touring ensemble / venues** (recommended, on-§11-theme), or simpler (just a multiplier prestige)?
4. finalePoint gain shape (additive vs capped-exponential) — *decide after a sim.*

## 6. Build order (once signed off)
1. Lock DECISION A + the mechanic. 2. Sim the L3 gate + finalePoint curve. 3. Wire the reset payoff + currency (minimal: a multiplier) → playable L3. 4. Add the tour/venues tree. 5. Add the stage section + era-3 visuals. 6. Re-sim full L1→L3 pacing.

## 7. Self-iteration — loopholes / risks found (and mitigations)
- **L:** "Grand Finale" being mid-ladder is confusing. **M:** DECISION A resolves naming up front; recommend renaming L3 or reserving "Grand Finale" for the final layer.
- **L:** A parallel Acclaim track that runs while you climb L1/L2 could **trivialize** L1/L2 (idle income outpaces active play). **M:** cap Acclaim/sec relative to active production; sim the idle-vs-active balance; make venues *multiply your climb* rather than replace it.
- **L:** finalePoint multiplier could **runaway** (compounding across finales). **M:** additive or capped form, sim across many finales (reuse the records/OP runaway checks).
- **L:** Resetting Records/Platinum each Finale could feel **punishing** (losing the Fame snowball). **M:** a "Legacy" carry — keep a fraction of Fame, or a perk (mirrors keep-encore-upgrades). Sim the re-climb time.
- **L:** L3 gate at 1.79e308 is a **JS-float ceiling** (break_infinity handles it, but the *named* threshold is the Decimal infinity). **M:** confirm the gate is well below break_infinity's limit; pick a clean magnitude (e.g., 1e308 is fine, but ensure post-Finale you can still climb — Decimal not native float).
- **L:** the era system assumes finale=era6; changing to era3 **affects the shipped backdrop/liveliness/chrome**. **M:** one-line era-formula change + supply era-3 palette/intensities (the systems already interpolate).
- **L:** adding L3 state without a **save migration** could break existing saves. **M:** default the new fields in `createInitialState` + the persist migration (the store already guards undefined fields).
