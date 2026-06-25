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
L1 Encore  →  L2 Magnum Opus  →  L3 World Tour  →  L4 Signature  →  L5 Virtuoso  →  L6 Grand Finale (END)
era 1          era 2              era 3            era 4           era 5            era 6 (Canon palette)
```
- **Grand Finale is the END (Layer 6)** — "more fitting to an end." (Vince has future ideas for a **Layer 7** beyond it; out of scope here.)
- The **era system was already right** — eras 3/4/5/6 map to L3/L4/L5/L6. They just need their layers built and the era formula to stop skipping 3→6. *(The era code labels — currently `Repertoire/Genre/Virtuoso/Canon` in `StageHall` — get renamed to **World Tour / Signature / Virtuoso / Grand Finale**.)*
- **Consequence — the existing code is mis-placed:** today's `finalePoints` / `finaleCount` / `performGrandFinale` (the ~1.79e308 reset) is *labelled* L3 but is conceptually **L6**. So **the next layer to build is NOT Grand Finale** — it's **L3 World Tour**, a brand-new prestige inserted *between* Magnum Opus and the eventual Grand Finale. The 1.79e308 Grand-Finale reset gets re-gated far higher and becomes L6; L3/L4/L5 each need their own gate + currency below it.

**This spec designs L3 = World Tour** (the touring ensemble). L4 Signature / L5 Virtuoso / L6 Grand Finale are sketched at the end (§6.5) but not fully specced — build them in order.

## 1.5 The automation arc — **LOCKED principle (governs L3–L6)**
**Each layer automates the layer below it.** Attention always rides the *newest* layer; older layers fade to background as the next matures (the AD pattern).
- **L2** frees your hands *within* a run (autobuyers, auto-conduct).
- **L3** automates **L1/L2 across runs** — Auto-MO + Keep-Autobuyers + the `lifetimeAcclaim` snowball make re-climbs trend from **~minutes at L3 entry → near-instant late-L3** (gradual, never instant at entry, so the catalogue-snapshot/re-tour loop keeps meaning). Your attention shifts to the **tour**. L3's own tour stays **hands-on**.
- **L4** automates **L3** — **auto-touring** lives in L4, not L3.
- **Passive currency-generation without resetting** (AD-style "auto-gen EP/OP, no reset") is an **L4+ reward only** — L3's automation is still reset-based (Auto-MO resets). 
- The rule scales up the ladder: each layer's *own* mechanic is hands-on while you're in it; the next layer up automates it.

**Concrete automation placement (locked 2026-06-25):**
- **Auto-Encore** (auto-*prestige* — still resets, gains Applause normally) = an **OP-tree upgrade** you buy, surfacing around L3. *(Auto-MO sits in the L3 venue tree per §2.5.)*
- **Passive Applause/EP generation WITHOUT resetting** (the AD-style "auto-gain 1%/sec of the Applause an Encore would grant you right now") = an **L4+ reward**. Tie it to current-run strength (not stored Applause) so it stays bounded by the sublinear gain. Applause gain is already sublinear: `floor((peakSW/1e15)^0.03)`.

---

## 2. Layer 3 design — "World Tour" (the touring ensemble)

**Fantasy:** you've mastered the concert hall (L1) and the studio/records (L2); now you **take the show on the road** — building up venues from a humble old house to a grand hall, touring the world. *Decisions in this section are LOCKED via the 2026-06-25 design walkthrough unless marked `[PROPOSAL]`.*

> **Terminology lock:** L3's currency is **Acclaim** (spendable) + **`lifetimeAcclaim`** (permanent). The words `finalePoints`/`finaleCount`/"Finale" do **not** appear in L3 — they're L6 only.

### 2.1 Entry / gate + reveal — **hybrid** (difficulty-first, structural floor)
A difficulty threshold (high SW / precursor) tuned to land naturally well after Platinum, that **also cannot fire before Platinum exists**. Honors "tune by difficulty, not artificial gates" (the threshold is the real gate) while guaranteeing it never appears pre-Platinum. NOT the 1.79e308 L6 gate. `[PROPOSAL]` first tour's full re-climb targets ~20–40 min; sim-tune.
- **Reveal (cliffhanger from L2):** hitting the gate fires a narrative beat at the studio's peak — *"you've outgrown the studio — take it on the road"* — and reveals the humble **old house** (Venue 1) to begin touring. Deliberate L2→L3 teaser, matching the layer-cliffhanger design value.

### 2.2 Currency
- **Acclaim** (spendable): earned by filling venues, spent on venue **component upgrades** (§2.4).
- **`lifetimeAcclaim`** (permanent, never spent): total Acclaim ever earned → drives a **global production multiplier** that boosts **all production** (multiplies SW, which cascades up through everything — the snowball that speeds re-climbs). `[PROPOSAL]` `1 + lifetimeAcclaim·k` additive or capped-log; sim before choosing. Mirrors the L1 `encorePoints`/`lifetimeEncorePoints` split. (It boosts production only — NOT the Acclaim/tour rate, which would be a one-layer self-feed.)

### 2.3 The venue ladder + the core loop
- **A linear ladder of 5–7 venues**: Old House → … → World Tour (final). The room you perform in.
- **The loop:** enter a venue → it **fills with Acclaim over time** (idle; **conducting/crescendo speeds the fill** — reuses the existing Space-hold) → spend that Acclaim on the venue's **component upgrades** → when the venue's components are maxed, **graduate** to the next venue. Repeat to the final venue.
- **Capacity-bounded (anti-AFK):** a venue fills toward a cap and **sells out** — accrual stops until you act (upgrade/graduate). Idle income is bounded by your venue/upgrade progress; you can't park and farm unbounded Acclaim (matters: offline replay runs up to **24h**, `gameStore.ts`).
- **Offline = bounded (~one buffer):** while away, the current venue fills its buffer once and then sells out, so you return to ~one buffer of Acclaim (rewards checking in; not a 24h Acclaim faucet). The earned **offline-boost** perk can enlarge this.

### 2.4 Venue components — the heart of L3 (a *living build*)
Each venue is a mini-build you improve by pouring Acclaim into **components**, each a multiplier that **visibly changes the venue's art** (functional-first; art layered after — §3).
- **HETEROGENEOUS COMPONENTS — LOCKED (Vince, 2026-06-26):** each component is EITHER a **multi-level multiplier** (~2–4 levels, scaling boost you grind) OR a **single-level UNLOCK** (one purchase = a feature/automation). A venue **graduates when ALL its components are maxed** (each to its own cap). This makes each venue a *build with decisions* (what to max, what's a one-and-done unlock), not a flat "level everything" chore.
  - **Old House (V1) = 3 components:** **Lighting** (3 levels, fill-speed mult) · **Roof** (3 levels, capacity mult) · **Instruments** (1-level UNLOCK = **auto-collect**: the venue auto-banks Acclaim).
  - **Automation unlocks** (single-level UNLOCK components) up the ladder: **auto-collect (V1) · Keep-Autobuyers (early venue) · Auto-MO (mid venue) · Auto-graduate (late venue)**. Auto-tour stays an **L4** reward.
  - **Escalating depth:** later venues have MORE components (mix of multipliers + the automation unlocks). V1=3; grow from there.
- **Granularity is per-component:** the **visual** components (Lighting/Instruments/Roof/Crowd) have **few discrete tiers (~5)**, each a distinct art state (dark→dim→lit→bright→dazzling); **pure-number** components (Acoustics/Marketing…) can have many small levels. Art only needs to render the visual ones' tiers.
- **Graduate = ALL components maxed** (superseded the earlier threshold idea — Vince 2026-06-26). Since each component has its own (small, varied) cap, maxing all is the gate; later venues stay reasonable because not every component is multi-level (some are 1-level unlocks). On graduate, **components reset on the new venue**; the **multiplier gains already banked** into `lifetimeAcclaim` stay.

| Component | Effect (lever) | Visible change |
|---|---|---|
| **Lighting** | ↑ venue **fill speed** (+ conduct-speedup) | dark → lights appear → brighten → chandeliers/spotlights |
| **Instruments** | ↑ **Acclaim earned** per fill (quality) | bare stage → instruments appear → multiply → full orchestra |
| **Roof / Structure** | ↑ venue **capacity** (Acclaim banked) | old house → repaired → grand-hall facade |
| **Crowd / Box office** *(later venues)* | ↑ passive **Acclaim rate** (draw) | empty → seats fill → packed house |
| **Acoustics / Marketing / Backstage** *(later)* | `[PROPOSAL]` global-mult / offline / quality | subtle stage + signage flourishes |

### 2.5 Two special upgrades (live in the venue tree)
- **Keep Autobuyers** — **Venue 1, early/cheap.** Autobuyers otherwise reset on every L3 tour reset; this keeps them, so **re-touring isn't tedious** (essential for idle-friendly). 
- **Auto-MO** — **mid-tour venue, earned.** Auto-performs a Magnum Opus **when it's profitable** (nets more OP than waiting), with a **toggle** to disable it for manual play. Removes re-climb tedium exactly when repeated L1/L2 resets would start to drag. (Auto-Encore is an OP-tree upgrade per the perk-architecture decision; Auto-MO sits here as a tour reward.)

### 2.6 Starting a tour = the L3 reset (one loop, re-tour bigger)
- **Booking a fresh tour IS the prestige reset:** it **resets L1 + L2** (SW/tiers/tempo/Encore + OP/Opus-upgrades + Records/Platinum) and **snapshots your catalogue** = **blend of `opusCount` + `recordsSold`** at that moment → sets this tour's Acclaim rate.
- **Snapshot, not live feed:** re-climbing L1/L2 mid-tour does NOT keep pumping Acclaim — kills the "tour funds the climb funds the tour" loop.
- **Re-tour bigger:** each new tour = a fresh L1/L2 reset with a **deeper catalogue → more Acclaim**. `lifetimeAcclaim` accumulates across tours; the venue ladder progress is what you're climbing.
- **Persists across L1/L2:** Encores and Magnum Opuses do NOT wipe the tour — only starting a new tour does.
- **Platinum resets each tour** (it's part of L2); the earned **Legacy** perk carries a fraction of `recordsSold` forward to soften it.

### 2.7 The break + the L3→L4 climax
- **The break (mirrors Platinum):** completing the **full circuit** (all venues graduated) switches Acclaim gain to **catalogue-scaling** — the earned-break beat. (The *layer* is "World Tour"; the all-venues milestone is "the full circuit" to avoid the name collision.)
- **Circuit complete = the L3 climax → reveals L4 Signature** (the cliffhanger into the next layer). After it, you **keep re-touring** to stack `lifetimeAcclaim` toward the L4 unlock gate. So circuit-complete is both L3's "aha" and the L4 teaser.

### 2.8 Challenges arrive at L3
- A **separate challenges panel** opens at L3 (moved here from the old L5 idea). Each challenge unlocks at **its own SW/Encore/MO threshold** (independent of the venue loop — optional side content). This also kills the old "challenges gated on finaleCount unlock after the end" bug.
  - **Confirmed live (sim, 2026-06-25):** all 12 challenges currently gate on `finaleCount >= unlockAt` (min 1), but a Grand Finale needs 1.79e308 SW → **challenges are unreachable in normal play today** (dead content; `ach_around_world`/`ach_vivaldi` can never fire). Re-gating them to L3 thresholds is the fix.
- **Clearing a challenge grants all three** reward types: a **permanent production/Acclaim bonus** + a **tour component/Acclaim lump** + a specific **unlock**.
- **Challenge rewards reset on an L4 (Signature) ascension** — making them L3-tier progress and giving L4 its own fresh-start meaning. (Note: this changes `completedChallenges` semantics — some achievements read it; handle in migration.)

### 2.9 Constraints (do NOT violate)
- Acclaim modest/flat pre-break → catalogue-scaling at the full-circuit break.
- Each tour feels **earned** (real re-climb), like MO re-masters the wall.
- **No two-way currency loops** — production→Acclaim cross-feed (if any) is one-way, capped, delayed (§ achievements perks).

---

## 3. The stage / visual (ties to the §11 work already shipped)

- **era 3 = World Tour (L3):** the touring-ensemble section lights up on the Compose stage (a second performer cluster). The backdrop palette for era 3 is already `#2dd4bf` (teal) in `ERA_COLORS` — re-tune to fit (or pick a "road/amber" tone).
- **The era formula must become a true layer→era ladder** (it currently skips 3→6). One tier per prestige layer:
  ```ts
  // getEra() in src/core/eraTheme.ts — replace the finale>0?6:opus>0?2:ep>0?1:0 short-circuit
  finalePoints > 0 ? 6   // L6 Grand Finale (Canon palette)
    : virtuosoUnlocked ? 5 // L5 Virtuoso
    : signatureUnlocked ? 4 // L4 Signature
    : tourPoints > 0   ? 3 // L3 World Tour
    : opusCount > 0    ? 2 // L2 Magnum Opus
    : lifetimeEP > 0   ? 1 // L1 Encore
    : 0                    // intimate
  ```
  Until L4/L5 exist, their branches are simply never true — so this is safe to land *with L3* (era jumps 2→3, not 2→6). `getEra` will need the new L3+ state fields passed in.
- All the liveliness systems (motes, audience-fill, focus-pull, chrome theming) already scale per era — each new layer inherits them for free; just supply that era's palette/intensities.

---

## 3.5 L3 state model + reset matrix (Codex MUST-FIX #3/#5/#11)

**New `GameState` fields (additive — `types.ts` today has only L1/L2 + `finalePoints`/`finaleCount`). All L3-tier state PERSISTS across tours; a new tour resets only L1/L2:**
```ts
// Layer 3 — World Tour / touring ensemble
acclaim: Decimal              // SPENDABLE wallet — earned from venue production, spent on component upgrades (persists across tours)
lifetimeAcclaim: Decimal      // PERMANENT — total ever earned → global production mult (mirrors lifetimeEncorePoints)
tourCount: number             // # tours started (= L3 resets); deeper catalogue each time
currentVenue: number          // index into the 5–7 venue ladder (0 = Old House … last = World Tour). PERSISTS.
venueBuffer: Decimal          // current venue's Acclaim buffer; fills at a rate, caps out ("sold out") if idle — anti-AFK
components: Record<string, number>  // CURRENT venue's component levels {lighting, instruments, roof, …}; reset to {} on graduate
catalogueSnapshot: Decimal    // blend(opusCount, recordsSold) frozen at last tour start → sets the Acclaim RATE
circuitComplete: boolean      // full-circuit break reached → Acclaim switches to catalogue-scaling
keepAutobuyers: boolean       // Venue-1 special upgrade — autobuyers survive tour resets
autoMO: boolean               // mid-venue special upgrade — auto-performs a Magnum Opus
// Challenges: completedChallenges already exists; now L3-tier, RESET on an L4 (Signature) ascension.
```
- The `acclaim`/`lifetimeAcclaim` split is mandatory (spend vs permanent mult) — mirrors `encorePoints`/`lifetimeEncorePoints`.
- **Persistence:** `acclaim`, `lifetimeAcclaim`, `currentVenue`, `components`, `keepAutobuyers`, `autoMO`, and challenge progress are **L3-tier and survive tours** — the venue ladder is a long climb. A new tour only resets L1/L2 (and re-snapshots `catalogueSnapshot`).
- **Venue production:** `venueBuffer` fills at a rate set by `catalogueSnapshot` × Instruments/Crowd components (Lighting speeds it; conducting speeds it more); it caps ("sells out") when idle → anti-AFK. Spend `acclaim` on `components`; max them → graduate (`currentVenue++`, `components = {}`, gains already banked in `lifetimeAcclaim`).

**Reset matrix — what each event wipes (✗ = reset, ✓ = kept). The L3 column = what STARTING A NEW TOUR resets:**

| State | L1 Encore | L2 Magnum Opus | **L3 new tour** | L4 Signature | L6 Grand Finale |
|---|---|---|---|---|---|
| SW / tiers / tempo | ✗ | ✗ | ✗ | ✗ | ✗ |
| Encore upgrades | kept* | kept*/✗ | ✗ | ✗ | ✗ |
| `encorePoints` (spendable) | ✗ | — | ✗ | ✗ | ✗ |
| `lifetimeEncorePoints` | ✓ | ✓ | ✓ | ✓ | ✗ |
| Opus upgrades / OP | — | kept | ✗ | ✗ | ✗ |
| Records / Platinum | — | ✓ (live `performGrandFinale` keeps these) | ✗ (Legacy perk softens) | ✗ | ✗ |
| Autobuyers | ✓ | ✓ | ✗ **unless `keepAutobuyers`** | ✗ | ✗ |
| `acclaim` / `lifetimeAcclaim` / venue ladder | ✓ | ✓ | ✓ **(persists)** | ✓ | ✗ |
| `completedChallenges` (L3-tier) | ✓ | ✓ | ✓ | ✗ **(reset at L4)** | ✗ |
| `finalePoints` (meta-mult) | ✓ | ✓ | ✓ | ✓ | ✓ (grows) |
| Achievements + perks | ✓ | ✓ | ✓ | ✓ | ✓ **(survive L6)** |

*per the keep-encore-upgrades / skip-wall perks.
**Two things this surfaces:**
1. **L6 "resets EVERYTHING" is too strong as written** — achievements/perks and `finalePoints` itself must survive, or the meta-layer is pointless. "Everything" = the *progression currencies* (SW→Acclaim), not the meta-state. Fixed above.
2. **Live `performGrandFinale` (`gameStore.ts`) currently does NOT reset records/Platinum/Opus/autobuyers/challenges** — so when L6 is re-gated it needs its reset broadened to match the L6 column. Flag for the L6 build, not L3.

## 4. Files this touches (when built)
- `src/store/types.ts` — NEW L3 state (`tourPoints`/`acclaim`, `venues`, `tourProgress`, `tourCount`). Leave `finalePoints`/`finaleCount` alone — those become L6.
- `src/store/gameStore.ts` — a NEW `performTour()` action (L3 currency grant + L1/L2 reset, distinct from `performMagnumOpus`/`performGrandFinale`) + tour tick + venue purchases. `performGrandFinale` stays as-is for L6 (re-gate later).
- `src/core/constants.ts` / a new `src/core/repertoire.ts` — L3 formulas, venue configs, the new L3 gate (NOT `GRAND_FINALE_SW_THRESHOLD` — that's L6).
- `src/core/tick.ts` — Acclaim accrual (parallel track).
- `src/core/formulas.ts` — fold the **Acclaim** (`lifetimeAcclaim`) production mult into `getCoreProductionMultiplier`.
- `src/components/` — a **dedicated "World Tour" tab** (sidebar reveals it at L3, same pattern as Opus/Autobuyers appearing post-MO): the venue ladder + per-venue component upgrades + the **living-venue art** (old house → grand hall) live here, NOT on the Compose stage. Compose keeps only the lighter era-3 ambient nod (§11). Don't let the tour UI coincide with Compose.

**Living-venue art — approach LOCKED (Vince, 2026-06-26):** **layered web overlays**, NOT per-state AI images. ONE base venue image per venue (the Gemini concept drafts in `drafts/l3-venues/`, painterly/warm/Art-Deco — Vince approved the ladder-1 Old House style) with **browser-composited layers driven by component levels** (same technique as the Compose stage's StageLife motes/audience): Lighting → glows/lamps brighten; Instruments → instrument sprites appear + multiply; Crowd → audience silhouettes fade in; + a camera pull-back as the venue grows. Each component's level drives its layer's intensity/count, so the SAME house visibly transforms in place. (The 4 independent AI "upgrade-state" drafts were scrapped — inconsistent rooms.) **Timing:** a polish pass AFTER the L3 mechanics batch deploys (functional-first).
- `sim/` — an L3 pacing sim (new) BEFORE tuning any numbers.

## 5. Decisions — status
**LOCKED (Vince, 2026-06-25):**
- Ladder = full **6 layers**, Grand Finale = **L6** (the end); L7 reserved.
- L3 mechanic = **touring ensemble + venues** (parallel Acclaim track + venue tree).
- Ladder philosophy = **every layer introduces a brand-new mechanic** (see §6.5 sketches).
- Spec depth = **detail L3 now, sketch L4–L6**.

**LOCKED via the 2026-06-25 L3 walkthrough:** currency = **Acclaim**/`lifetimeAcclaim`; **5–7 linear venues**; venue **components** (V1=3, +more per venue) with visible art; **graduate** = components reset + gains bank; **Keep-Autobuyers** (V1) + **Auto-MO** (mid); **starting a tour = the reset**, resets only L1/L2, re-snapshots catalogue (**blend opusCount+records**); **venue ladder + Acclaim persist** across tours; **re-tour when Acclaim rate stalls**; **continuous rate + sell-out buffer**; **hybrid gate** (difficulty-first, can't fire pre-Platinum); **Platinum resets** (Legacy softens); **challenges arrive at L3** (separate panel, per-challenge SW/Encore/MO gates, reward = permanent bonus + components + unlock, **reset at L4**).

**Still open — deferred to the SIM (numbers, not design):**
1. `lifetimeAcclaim` → production-mult shape (additive `1+n·k` vs capped-log) + magnitude.
2. The hybrid gate's difficulty threshold value + target first-tour re-climb minutes.
3. Per-venue component counts/costs + capacity/rate curves; effects of the later components (Acoustics/Marketing/Backstage) — `[PROPOSAL]` in §2.4.
4. Where exactly Auto-MO sits (which mid venue) + its trigger condition.

## 6. Build order (once signed off)
1. Sync `sim/` to live `constants.ts` (see ACHIEVEMENTS-V2 §7) + sim the L3 gate + Acclaim curve. 2. Add L3 state (§3.5) + migration. 3. Wire `performTour()` reset + the Acclaim multiplier (minimal) → playable L3. 4. Add the tour/venues tree (capacity-bounded). 5. Add the stage section + era-3 visuals + era-formula ladder. 6. Re-sim full L1→L3 pacing.

## 6.5 Sketches — L4 Signature, L5 Virtuoso, L6 Grand Finale (each a DISTINCT new mechanic)
*Not full specs — design intent + the novel mechanic, to be detailed in order. Each adds a stage section (§11) and an era tier (4/5/6).*

- **L4 — Signature (era 4, `#ec4899` pink).** *Mechanic: branching specialization / fusion.* You commit to **signature styles** (e.g. Classical · Jazz · Film Score · Electronic), each a distinct global modifier + its own skill-tree. **Fusion:** you can eventually run **multiple styles at once** (stacking modifiers), with a **respec/reset option per Signature reset** to re-pick trees. Currency: **Signature Mastery**. An L4 (Signature) ascension is what **resets L3 challenge progress**. Detail when we get here.

- **L5 — Virtuoso (era 5, `#ef4444` red).** *Mechanic: **OPEN — to be redesigned.*** Challenges have **moved to L3** (see §2.8), so L5 needs a fresh mechanic. The `Sidebar.tsx` "Challenges hidden until Layer 5" comment is now **stale** — challenges unlock at L3, so that gate + `ChallengeConfig.unlockAt` (currently `finaleCount`) must be re-pointed to the L3 per-challenge SW/Encore/MO thresholds. **L5's actual mechanic is a future design pass** (don't lock it now).

- **L6 — Grand Finale (era 6, `#fbbf24` gold/Canon — the END).** *Mechanic: total ascension / new universe.* The existing `finalePoints`/`performGrandFinale` reset, **re-gated to ~1.79e308** and moved here. Resets EVERYTHING (L1–L5 currencies included) for a permanent meta-multiplier (`finalePoints`). The "new universe" framing already exists (`ach_second_universe` = "Record a Magnum Opus in a new universe (post-Grand Finale)"). This is the climactic full-wipe-for-meta-power layer. L7 (future) would sit beyond it.

## 7. Self-iteration — loopholes / risks found (and mitigations)
- **L:** ~~"Grand Finale" being mid-ladder is confusing.~~ **RESOLVED:** Grand Finale = L6 (the end); L3 is the new "World Tour" layer. But the *existing code* still labels the finale reset as L3 — **building L3 must NOT touch `finalePoints`/`performGrandFinale`**; introduce parallel L3 state, or the two will collide. (Called out in §4.)
- **L (NEW, from the 6-layer + every-layer-novel decision):** four distinct from-scratch mechanics (L3 tour, L4 genre, L5 challenges, L6 ascension) is a **large, long-horizon scope** — risk of an unfinished ladder. **M:** strictly build in order, each layer fully playable+balanced before the next; L5 is partly free (Challenges already stubbed); ship L3 end-to-end first and re-evaluate.
- **L (Codex MUST-FIX #2/#3):** a parallel Acclaim track running while you climb L1/L2 could **trivialize** the climb or be **AFK-farmed** (24h offline replay in `gameStore.ts`). **M (folded into §2):** Acclaim is **capacity-bounded** (per-venue caps, not infinite/sec) and rate is fixed from a **catalogue snapshot at tour start** (live re-climbing doesn't keep pumping it); plus the `acclaim`/`lifetimeAcclaim` spendable-vs-permanent split (§3.5).
- **L (Codex MUST-FIX #4):** the Acclaim multiplier or any production→Acclaim cross-feed could **runaway** (compounding). **M:** additive/capped `lifetimeAcclaim` mult; **one-way, capped, delayed** cross-feed only (§2 "no two-way loops"); sim across many tours.
- **L:** the **L3 tour** reset wiping Records/Platinum could feel **punishing** (losing the snowball). **M:** the **Legacy** perk carries a fraction of `recordsSold` across the tour reset (not "Fame" — it's derived; see ACHIEVEMENTS-V2 §5). Sim the re-climb time to ~20–40 min.
- **L:** ~~L3 gate at 1.79e308~~ — **CORRECTED:** that's the **L6** gate. The **L3** gate is a new, far-lower threshold (post-Platinum MO count + target re-climb minutes, §2). The 1.79e308 float-ceiling concern applies to **L6** when it's built (confirm it's below break_infinity's limit and post-ascension climb still works).
- **L:** the era system assumes finale=era6; the new **layer→era ladder** (§3) routes L3→era3 etc. and **affects the shipped backdrop/liveliness/chrome**. **M:** the era-formula change is additive (new branches never true until L4/L5 exist) + supply era-3 palette/intensities (the systems already interpolate).
- **L:** adding L3 state without a **save migration** could break existing saves. **M:** default the new fields in `createInitialState` + the persist migration (the store already guards undefined fields).
- **L (Codex NTH#5):** existing saves may already have `finalePoints > 0` (people who hit the *old* L3-labelled finale), plus challenge completions and post-Platinum state, *before* L3–L5 exist. Inserting the middle layers could strand or double-count them. **M:** migration must (a) treat any legacy `finalePoints>0` as legitimate L6 progress (it always was conceptually L6), (b) leave `completedChallenges` intact but re-gate display to the new Virtuoso flag, (c) seed `acclaim`/`lifetimeAcclaim`/`venues` to zero. Write a migration test against a pre-L3 save fixture.

> **Adversarial review:** this spec was run through a Codex (gpt-5.5) adversarial design review on 2026-06-25; its 11 must-fixes (terminology leaks, the AFK Acclaim exploit, the spendable/lifetime split, the production↔Acclaim runaway, reset-matrix contradictions, the L5 challenge-gating blocker, the underspecified state model) are folded into §2/§3.5/§6.5 above.
