# Achievement Set v2 — full redesign/expand SPEC (proposal, not implemented)

Status: **proposal for Vince's sign-off.** Self-iterated for loopholes (see §8). No code changed.
Depth: detailed + implementable. The reward *engine* stays; the **list, pacing, and perks** are redesigned.

---

## 1. What v1 is, and what's wrong with it

**v1 today:** ~70 achievements in `src/core/achievements.ts`, 10 rows, 10 perks (`src/core/perks.ts`). Reward engine (KEEP as-is): `globalPercent`, `tierPercent`, `tempoBonus`, `costReduction`, `tierCostReduction`, `startingSW`, `headStartBoost`, `perk`, `none`. Accumulators sum across the unlocked set. Naming = song titles + orchestral wit. Hidden easter eggs supported.

**Problems (from playtest + the audit):**
1. **Clustered at Magnum Opus** — Vince counted ~43 unlocked at first MO. The curve front-loads everything into L1→MO and starves L2/L3.
2. **Reward inflation / flat %** — dozens of `+x% all production` that just stack into one big number; little *functional* texture beyond the 10 perks.
3. **Thin past MO** — L2 (Records/Platinum/Opus-tree) has a handful; **L3 has 3** (`final_countdown`, `grand_finale`, `back_in_black`) and they're all flat %. No L3 *content*.
4. **A few mis-paced** (already partly fixed this session): Speed of Sound, Curtain Call, Perfect-Pitch affordability.
5. **No "tease" structure** — hidden achievements exist but the set doesn't deliberately drip 1 every few minutes the way good incrementals do.

---

## 2. v2 goals (the design contract)

- **Even drip across the WHOLE game**, not a wall at MO. Target cadence: roughly **one unlock every 3–8 min of active play early**, stretching to **one per run/milestone late**. Sim-verified (the `sim/` engine can timestamp first-unlock per achievement — see §7).
- **Functional > flat.** Keep flat % as the *connective tissue* (small, frequent dopamine) but make the **milestone** achievements grant perks or distinctive effects. Roughly: 55% flat-%, 25% tier/tempo/cost texture, 12% perks, 8% collectibles (`none`).
- **Every layer gets a full row.** L1 (Compose) · L1.5 (Encore) · L2a (Conducting/Records) · L2b (Opus-tree/Platinum) · **L3 (Repertoire/Finale — NEW, fleshed out)** · cross-cutting (time/hidden/mastery).
- **More + better perks** (§5): go from 10 → ~14, covering L2 and L3 quality-of-life, so perks remain the "build-defining" reward tier.
- **Keep the voice** (song titles + orchestral wit) and the hidden-easter-egg sprinkle.

**Hard count target:** ~**90–100** achievements (from ~70), with the *new* mass landing in L2b + L3 (the currently-starved zones), NOT more in early game.

---

## 3. v2 structure — rows mapped to progression beats

Each row = a progression zone with a target unlock-window. `[N]` = approx count.

| Row | Zone | When (active-play) | Count | Reward mix |
|----|------|----|----|----|
| R1 | First notes → 100 SW | 0–5 min | [6] | flat % small, 1 tierPercent, 1 collectible |
| R2 | Tier unlocks → first Encore | 5–20 min | [8] | tierPercent, tempo, 1 hidden (rickroll) |
| R3 | Encore loop (3/5/8) | 20–60 min | [9] | global %, headStart, **perk: Mass Production** |
| R4 | The 8-Encore wall + Symphonies | 1–2 h | [8] | costReduction, **perk: Second Wind**, 1 hidden |
| R5 | First Magnum Opus + Conducting | 2–4 h | [9] | global %, **perks: Warm-Up, Sound Check** |
| R6 | Records → Gold → **Platinum (mystery)** | 4–8 h | [10] | small %, **perk: Muscle Memory (hidden)**, Platinum reveal |
| R7 | Opus-tree mastery + automators | 6–12 h | [10] | tempo, cost, **perks: Session Musicians, Pick-Up-Tempo, Sustained Note** |
| R8 | MO repetition (3/5/10) + deep SW | 10–20 h | [9] | global %, headStart, 1 hidden |
| **R9** | **L3 Repertoire — touring, venues, Acclaim (NEW)** | 20–40 h | **[12]** | **L3 perks (§5), Acclaim milestones, stage-section unlocks** |
| **R10** | **L3 mastery / multi-Finale / endgame** | 40 h+ | **[10]** | big global %, **perk: Legacy**, prestige collectibles |
| RX | Cross-cutting (time-played, no-tempo runs, hidden eggs) | any | [8] | startingSW, hidden, collectibles |

**The fix for "43-at-MO":** R1–R5 sum to ~40 and are *spread* over the first 2–4 h; R6–R10 (the new mass) only start unlocking once you're *in* L2/L3. The MO moment unlocks ~3–5 (its own row), not 43.

---

## 4. Concrete additions (the new/changed entries)

Detailed enough to implement directly against the v1 schema. (Existing kept entries omitted for brevity — full diff produced at build time.)

> **Ladder alignment (2026-06-25):** the ladder is now 6 layers — L3 Repertoire · L4 Genre · L5 Virtuoso · L6 **Grand Finale (end)**. So the "late rows" generalize to **one row per new layer**, detailed alongside each layer as it ships: **R9 = L3 Repertoire** (below), then future R-Genre / R-Virtuoso / **R-Grand-Finale** (the multi-Finale + endgame achievements — `finaleCount`-gated — belong to that LAST row, NOT R9). R9 gates on **L3** state only.

### R9 — Layer 3 "Repertoire" (NEW, depends on LAYER3-SPEC.md decisions)
*(IDs provisional; gate on the **L3** state fields once they exist — `tourPoints`/`acclaim`, `venues`, `tourProgress`, `tourCount`. NOT `finalePoints`/`finaleCount` — those are L6.)*
- `ach_on_the_road` — **On the Road Again** — "Unlock the Touring Ensemble" — first venue booked / `tourCount>=1` — `globalPercent 0.10`.
- `ach_first_venue` — **Opening Night** — "Book your first venue" — flat % small.
- `ach_full_house` — **Full House** — "Fill a venue to capacity (Acclaim milestone)" — `tierPercent` or tempo.
- `ach_world_tour` — **Around the World (Reprise)** — "Complete the World Tour (all venues)" — **perk: Encore Bus** (§5).
- `ach_acclaim_1` / `_2` / `_3` — **Standing Ovation / Critical Darling / Household Name** — Acclaim thresholds — escalating global %.
- `ach_two_orchestras` — **Double Bill** — "Run the touring ensemble + home orchestra simultaneously at full tilt" — **perk: Split the Bill**.
- `ach_legacy` — **Legacy** — "Complete an L3 tour reset" — **perk: Legacy** (carry a fraction of your L2 snowball — Fame/Records — across the L3 tour reset; mirrors keep-encore-upgrades). *(The Fame-across-Grand-Finale version belongs to the L6 row.)*
- `ach_catalogue_deep` — **The Back Catalogue** — "Reach catalogue-scaling finalePoint gain (the L3 break)" — big global %.
- 2× collectibles + 1 hidden L3 easter egg.

### R10 — L3 mastery / endgame
- Multi-Finale counts (2/3/5/10) — escalating global % + headStart (re-tune `back_in_black`'s 0.36 into a curve).
- `ach_perpetual_motion` — **Perpetual Motion** — "10 Finales" — large collectible/prestige badge.
- Endgame "completionist" — "Unlock all non-hidden achievements" — collectible capstone.

### Re-pacing fixes to EXISTING entries (carry tonight's audit forward)
- Distribute the L2b/Records achievements' SW/record thresholds so they don't all pop at the Platinum moment (stagger 100k / 1M / 10M / 50M record gates — already roughly staged; verify with sim).
- Convert a few redundant `+x% all` into `tierPercent`/`tempo`/`cost` for texture.
- Keep the session's fixes: Speed-of-Sound `1e100`-in-5min, Curtain Call (shop-mastery), Perfect Pitch baseCost 1.

---

## 5. Perks v2 — 10 → ~14

**Keep all 10.** Add (L2/L3 quality-of-life, the build-defining tier):
1. **Encore Bus** (`perk-encore-bus`) — *World Tour* — the touring ensemble also advances your Encore wall passively (L3 helps L1). Mirrors §11 "layers feed each other."
2. **Split the Bill** (`perk-split-bill`) — *Double Bill* — a fraction of home-orchestra production also feeds Acclaim (the two tracks cross-pollinate).
3. **Legacy** (`perk-legacy`) — *Legacy* — carry a fraction of Fame across a Grand Finale (softens the L3 reset; sim the fraction).
4. **Catalogue Royalties** (`perk-catalogue-royalties`) — an L2 perk: Records keep selling (at reduced rate) through an Encore/MO reset. Smooths the L2 grind.

**Engine change required:** `perks.ts` `PerkId` union + `PERKS` array + effect constants; `hasPerk` already generic. Each perk's *effect* wires into the same spots its sibling perks do (gameStore reset/tick/cost paths). No new engine concept — just more entries. (ponytail: reuse the existing perk plumbing, don't build a perk framework.)

---

## 6. Reward-engine: keep, with two small extensions (optional)
- **KEEP** all v1 reward types + accumulators verbatim.
- **Optional new reward field `acclaimPercent`** (L3 Acclaim-rate bonus) IF R9 wants achievement-driven Acclaim boosts — same accumulator pattern as `tempoBonus`. Add ONLY if L3 ships with Acclaim. (ponytail: skip until L3 exists.)
- No other engine changes. The whole v2 is **data** (the `ACHIEVEMENTS` array + `PERKS` array), which is why it's safe + sim-able.

---

## 7. How to validate pacing (the sim — do this BEFORE shipping numbers)
- Extend the headless `sim/` run to **record the tick/elapsed-time at which each achievement's `check()` first returns true** over a representative playthrough (cold start → several MOs → a Finale).
- Output a CSV: `id, first-unlock-minute, layer`. Plot the histogram; the target is a **smooth drip**, no spike at the MO tick, and **non-empty buckets for L2b/L3**.
- Iterate thresholds until the curve is smooth. This is the objective check that "43-at-MO" is fixed.
- `check()` functions are pure over `GameState`, so the sim can call them directly each tick — no UI needed.

## 8. Self-iteration — loopholes / risks found (and mitigations)
- **L:** v2 depends on L3 state (`acclaim`, `venues`) that doesn't exist yet — R9/R10 can't be built until LAYER3-SPEC lands. **M:** ship v2 in **two waves** — Wave A (R1–R8 re-pace + new perks that don't need L3) now-ish; Wave B (R9/R10) with L3. Spec is structured so Wave A is independent.
- **L:** more flat-% achievements → **multiplier inflation** (the global mult balloons, trivializing early tiers). **M:** keep early %s tiny; sim the *total* achievement mult at each layer and fold it into the pacing pass (the audit already tracks global mult). Cap or curve if it runs away.
- **L:** "Unlock all achievements" capstone + **hidden** achievements = a logically unreachable 100% if any hidden one is gated on a removed mechanic. **M:** the capstone checks **non-hidden** only (as noted); audit that every achievement is actually reachable in the sim.
- **L:** re-pacing **existing** achievement thresholds changes what *already-unlocked* players have — could **revoke** an achievement on load. **M:** achievements are append-only/once-earned; never re-lock. If a threshold drops, players keep it; if it rises, don't re-check earned ones (the store stores unlocked IDs, not derived state — verify the unlock path is monotonic).
- **L:** new `PerkId`s + a new reward field touch the **save schema**. **M:** additive only; default-undefined-safe; bump the persist migration to seed new fields. No removals.
- **L:** R9 perks (Encore Bus / Split the Bill) **cross-feed layers** → risk of trivializing L1/L2 once L3 is reached. **M:** these are *late* perks (post-World-Tour); by then trivializing the early climb is the intended "snowball" reward — but sim the re-climb time so it's *fast*, not *instant*.
- **L:** count target (~90–100) is **a lot of authoring** — risk of filler. **M:** every achievement must clear a bar: distinct trigger + (functional reward OR genuine flavor/easter-egg). Collectibles capped at ~8%. Delegate the bulk authoring to Cursor against this spec; Codex reviews for filler/duplication.

## 9. Build order (once signed off)
1. Lock §2 goals + §3 row targets with Vince. 2. Build the sim timestamp instrument (§7). 3. Wave A: re-pace R1–R8 + add L2 perks → sim → tune. 4. Ship Wave A. 5. After L3 (LAYER3-SPEC) lands: Wave B R9/R10 + L3 perks → sim → tune.
