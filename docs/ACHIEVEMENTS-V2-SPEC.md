# Achievement Set v2 — full redesign/expand SPEC (proposal, not implemented)

> ## ⚠ SUPERSEDED 2026-06-29 — its core lock is REVERSED
> This spec's Wave-A lock — *"keep all ~70, **no culling**, never re-lock, expand to ~90–100"* — was
> **reversed** on 2026-06-29. The achievement set had ballooned to **376** (mostly auto-generated
> number/time-padding filler) and was **culled to 100** with a **no-filler / meaningful-only** mandate
> (commit `fb18542`; memory: `achievements-no-filler`). What still holds: the **reward engine**, the
> **globalPercent budget guard** (achievements must not become the progression system — now sim-checked by
> human-pacing's `globalAtPlat` band), and the **song-title + orchestral-wit voice**. What's DEAD: the
> "no culling / keep ~70-100" count target and the per-row drip targets. **Current source of truth:**
> `src/core/achievements.ts` + `HANDOFF.md`.

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
- **Per-row global-mult budget (Codex NTH#1).** Set an explicit cap on total `globalPercent` each row may contribute, so ~90–100 achievements don't quietly *become* the progression system. Starting budget: the **whole achievement set's `globalPercent` sum stays ≤ ~+150–200%** end-to-end, allocated per row (early rows tiny, late rows larger). The pacing sim (§7) prints the running total per layer; tune to the budget. This is the guard against "achievement mult is the real game."
- **Every layer gets a full row.** L1 (Compose) · L1.5 (Encore) · L2a (Conducting/Records) · L2b (Opus-tree/Platinum) · **L3 World Tour (NEW, fleshed out)** · L4/L5/L6 rows built with each layer · cross-cutting (time/hidden/mastery).
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
| **R9** | **L3 World Tour — touring, venues, Acclaim (NEW)** | 20–40 h | **[12]** | **L3 perks (§5), Acclaim milestones, stage-section unlocks** |
| **R10** | **L3 tour mastery (tourCount / all venues / Acclaim thresholds)** | 40 h+ | **[10]** | big global %, **perk: Legacy**, tour collectibles |
| *(future)* | *R-Signature (L4) · R-Virtuoso (L5) · **R-Grand-Finale (L6)*** — built with each layer; **all `finaleCount`/multi-Finale + endgame-completionist achievements live in the L6 row, NOT R10** | — | — | per-layer perks |
| RX | Cross-cutting (time-played, no-tempo runs, hidden eggs) | any | [8] | startingSW, hidden, collectibles |

**The fix for "43-at-MO":** R1–R5 sum to ~40 and are *spread* over the first 2–4 h; R6–R10 (the new mass) only start unlocking once you're *in* L2/L3. The MO moment unlocks ~3–5 (its own row), not 43.

---

## 4. Concrete additions (the new/changed entries)

Detailed enough to implement directly against the v1 schema. (Existing kept entries omitted for brevity — full diff produced at build time.)

> **Ladder alignment (2026-06-25):** the ladder is now 6 layers — L3 World Tour · L4 Signature · L5 Virtuoso · L6 **Grand Finale (end)**. So the "late rows" generalize to **one row per new layer**, detailed alongside each layer as it ships: **R9 = L3 World Tour** (below), then future R-Signature / R-Virtuoso / **R-Grand-Finale** (the multi-Finale + endgame achievements — `finaleCount`-gated — belong to that LAST row, NOT R9). R9 gates on **L3** state only.

### R9 — Layer 3 "World Tour" (NEW, depends on LAYER3-SPEC.md decisions)
*(IDs provisional; gate on the **L3** state fields once they exist — `tourPoints`/`acclaim`, `venues`, `tourProgress`, `tourCount`. NOT `finalePoints`/`finaleCount` — those are L6.)*
- `ach_on_the_road` — **On the Road Again** — "Unlock the Touring Ensemble" — first venue booked / `tourCount>=1` — `globalPercent 0.10`.
- `ach_first_venue` — **Opening Night** — "Book your first venue" — flat % small.
- `ach_full_house` — **Full House** — "Fill a venue to capacity (Acclaim milestone)" — `tierPercent` or tempo.
- `ach_full_circuit` — **Around the World** — "Book every venue (the full circuit)" — **perk: Encore Bus** (§5).
- `ach_acclaim_1` / `_2` / `_3` — **Standing Ovation / Critical Darling / Household Name** — Acclaim thresholds — escalating global %.
- `ach_two_orchestras` — **Double Bill** — "Run the touring ensemble + home orchestra simultaneously at full tilt" — **perk: Split the Bill**.
- `ach_legacy` — **Legacy** — "Complete an L3 tour reset" — **perk: Legacy** (carry a fraction of `recordsSold` across the L3 tour reset; mirrors keep-encore-upgrades). *(The carry-across-Grand-Finale version is a separate L6 perk.)*
- `ach_catalogue_deep` — **The Back Catalogue** — "Reach catalogue-scaling **Acclaim** gain (the L3 World-Tour break)" — big global %.
- 2× collectibles + 1 hidden L3 easter egg.

### R10 — L3 tour mastery
- **tourCount** milestones (2/3/5/10 tours) — escalating global % + headStart.
- All-venues / repeat-World-Tour collectibles + Acclaim-threshold capstones.
- `ach_legacy` perk lives here (or late R9).
- **Multi-Finale (`finaleCount`) + the "unlock all non-hidden achievements" endgame capstone do NOT live here** — they belong to the future **L6 Grand-Finale row**, built with L6. (Putting them in R10 was the contradiction Codex flagged: R10 is L3, finaleCount is L6.)

### Re-pacing fixes to EXISTING entries (carry tonight's audit forward)
- Distribute the L2b/Records achievements' SW/record thresholds so they don't all pop at the Platinum moment (stagger 100k / 1M / 10M / 50M record gates — already roughly staged; verify with sim).
- Convert a few redundant `+x% all` into `tierPercent`/`tempo`/`cost` for texture.
- Keep the session's fixes: Speed-of-Sound `1e100`-in-5min, Curtain Call (shop-mastery), Perfect Pitch baseCost 1.

---

## 5. Perks v2 — 10 → ~14

**Perk architecture (LOCKED):** perks = **earned QoL / convenience**, never raw production (so they don't eat the ≤+150–200% power budget). **Automation you *buy* lives in the Opus tree** (auto-conduct exists; **auto-prestige/auto-Encore = a new OP-tree upgrade**, NOT a perk) — perks are the things you *earn*. Game is **strongly idle-friendly**; the strongest QoL is **earned late**.

**Keep all 10.** New perks, split by wave:

**Wave A (now — no L3 dependency):**
1. **Offline Boost** (`perk-offline-boost`) — *earned late* — base offline is already full-fidelity replay capped at **24h** (`MAX_OFFLINE_MS`), so this perk **extends the cap** (e.g. 24h→48–72h) **and adds a >100% offline bonus** (come back to ~+25–50% more than idling online would give). A real "reward for stepping away."
2. **Mass Production / Autobuyer Max** (`perk-bulk-unlock` already exists; extend or add) — bulk-buy + autobuyers available early — **earned via an achievement tied to investing OP into autobuyers** (not handed out free).

**Wave B (with L3):**
3. **Encore Bus** (`perk-encore-bus`) — *full circuit* — a **flat, capped per-run head-start** toward the Encore wall (e.g. start +1 Encore), NOT a continuous passive advance. *(Codex #4: perpetual advance compounds into a runaway.)*
4. **Split the Bill** (`perk-split-bill`) — *one-way, capped, delayed* trickle from home production into Acclaim (slow flat bonus, not a multiplier). *(Codex #4: no two-way self-feed.)*
5. **Legacy** (`perk-legacy`) — carry a **fraction of `recordsSold`** across an **L3 tour reset**. *(Codex #6: Fame is derived from `recordsSold`, not stored — preserve records, not "Fame". The carry-across-Grand-Finale version is a separate **L6** perk.)*
6. **Catalogue Royalties** (`perk-catalogue-royalties`) — L2: records keep selling (reduced rate) through an Encore/MO reset.

**Plus a non-perk note:** **auto-prestige/auto-Encore** must be added as an **OP-tree upgrade** (separate follow-up task after Wave A), per the architecture decision.

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
- Most `check()` functions are pure over `GameState` so the sim can call them directly each tick — **with two caveats Codex flagged (#10):** (a) a few use wall-clock — `ach_perk_tempo_headstart` reads `Date.now()` in `achievements.ts` — so the sim must inject a deterministic clock (it already tracks `currentRunStartTime`/tick count; feed those instead of real time); (b) **`sim/engine.mjs` has drifted from live `constants.ts`** (stale gates/growth) — the sim MUST be re-synced to live constants before its timestamps are trustworthy, or the "smooth drip" claim is measuring the wrong game. Sync + a constants-parity assert is step 0 of the pacing pass.

## 8. Self-iteration — loopholes / risks found (and mitigations)
- **L:** v2 depends on L3 state (`acclaim`, `venues`) that doesn't exist yet — R9/R10 can't be built until LAYER3-SPEC lands. **M:** ship v2 in **two waves** — Wave A (R1–R8 re-pace + new perks that don't need L3) now-ish; Wave B (R9/R10) with L3. Spec is structured so Wave A is independent.
- **L:** more flat-% achievements → **multiplier inflation** (the global mult balloons, trivializing early tiers). **M:** keep early %s tiny; sim the *total* achievement mult at each layer and fold it into the pacing pass (the audit already tracks global mult). Cap or curve if it runs away.
- **L:** "Unlock all achievements" capstone + **hidden** achievements = a logically unreachable 100% if any hidden one is gated on a removed mechanic. **M:** the capstone checks **non-hidden** only (as noted); audit that every achievement is actually reachable in the sim.
- **L:** re-pacing **existing** achievement thresholds changes what *already-unlocked* players have — could **revoke** an achievement on load. **M:** achievements are append-only/once-earned; never re-lock. If a threshold drops, players keep it; if it rises, don't re-check earned ones (the store stores unlocked IDs, not derived state — verify the unlock path is monotonic).
- **L:** new `PerkId`s + a new reward field touch the **save schema**. **M:** additive only; default-undefined-safe; bump the persist migration to seed new fields. No removals.
- **L:** R9 perks (Encore Bus / Split the Bill) **cross-feed layers** → risk of trivializing L1/L2 once L3 is reached. **M:** these are *late* perks (post-World-Tour); by then trivializing the early climb is the intended "snowball" reward — but sim the re-climb time so it's *fast*, not *instant*.
- **L:** count target (~90–100) is **a lot of authoring** — risk of filler. **M:** every achievement must clear a bar: distinct trigger + (functional reward OR genuine flavor/easter-egg). Collectibles capped at ~8%. Delegate the bulk authoring to Cursor against this spec; Codex reviews for filler/duplication.
- **L (Codex NTH#5):** inserting L3–L5 rows affects **old saves** that already have `finalePoints>0` / challenge completions / post-Platinum state. **M:** same migration as LAYER3-SPEC §7 — additive fields default to zero, earned achievements never re-lock, legacy `finalePoints` is treated as L6 progress. Test against a pre-L3 save fixture.

> **Adversarial review:** run through Codex (gpt-5.5) on 2026-06-25. Folded-in must-fixes: R10/multi-Finale contradiction (→ finaleCount moved to the L6 row), the Legacy/Fame-derivation inconsistency (Legacy now carries `recordsSold`, not "Fame"), the runaway cross-feed perks (Encore Bus & Split the Bill now one-way/capped), the `Date.now()`-impurity + stale-`sim` pacing caveat, and the per-row mult budget.

## 9. Build order (once signed off)

**Wave A scope — LOCKED (2026-06-25), ⚠ REVERSED 2026-06-29 (see top banner — culled 376→100, no-filler):** keep **all ~70** existing achievements (re-pace + re-distribute thresholds/reward-types; **no culling**, never re-lock); keep the **easter-egg sprinkle + add a few** across later rows; new achievements keep the **song-title + orchestral-wit** voice; total achievement power **capped ≤ +150–200%**; new Wave A perks = **Offline Boost** + **OP-autobuyer-gated bulk** (QoL, not raw power). L3/R9+ achievements + Wave-B perks come with L3.

1. **Sync `sim/` to live `constants.ts`** (import as source of truth) + add the per-achievement first-unlock timestamp instrument (§7). 2. Re-pace R1–R8 (re-distribute existing thresholds, smooth the drip, kill the MO spike) + add the two Wave A perks → sim → tune to the budget. 3. Ship Wave A (Cursor builds, Codex reviews, Claude gates). 4. *(Separate follow-up)* add **auto-prestige as an OP-tree upgrade**. 5. After L3 lands: R9 (World Tour) + Wave-B perks → sim → tune.
