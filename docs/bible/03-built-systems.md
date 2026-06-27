# 03 — What is BUILT (the shipped systems)

> **Scope of this file.** A code-grounded inventory of the prestige/content systems that
> actually exist and run in the `feat/layer3` build: **L1 Encore**, **L2 Magnum Opus**,
> **L3 World Tour**, the **12 challenges + §2.8 reward system**, and the **cold-open
> story-beat system**. Every claim is cited to a file:line. Where the design docs and the
> live code disagree, the divergence is called out explicitly.
>
> **Branch reality (HANDOFF.md:5-22):** the full picture below is on **`feat/layer3`**, NOT
> merged to `master`. `master` is an older deployed playtest build with only a "Venue-1
> slice" of World Tour. Treat this file as the `feat/layer3` truth.
>
> **L4–L9 are NOT built** — they are designed only (`docs/LADDER-MECHANICS.md`). The story
> beats and the `StoryBeatId` union register placeholders for them, but no L4+ *mechanic*
> exists. `L4_UNLOCKED = false` (`src/core/constants.ts:4`) hard-gates everything labelled L4.

---

## 0. The ladder at a glance (what runs today)

| Layer | Name | Currency / counter | Reset action | Gate | Status |
|---|---|---|---|---|---|
| L1 | **Encore** | `encorePoints` (spend) / `lifetimeEncorePoints` (prod mult) / `encoreCount` | `performEncore` (gameStore.ts:603) | tier-cost gate `getEncoreCost` | **built** |
| L2 | **Magnum Opus** | `opusPoints` / `opusCount`; `recordsSold`→`platinum` | `performMagnumOpus` (gameStore.ts:660) | wall (8 Encores) + 72 Symphonies | **built** |
| L3 | **World Tour** | `acclaim` (spend) / `lifetimeAcclaim` (prod mult); `tourCount` | `performTour` (gameStore.ts:830) | `canUnlockWorldTour` (worldTour.ts:404) | **built** |
| L6* | **Grand Finale** | `finalePoints` / `finaleCount` | `performGrandFinale` (gameStore.ts:874) | `1.79e308` SW (constants.ts:160) | **stub** (reset exists, payoff doesn't) |
| L4/L5/L7/L8/L9 | Signature / Virtuoso / Canon / GF / Redemption / Gods | — | — | — | **designed only** |

\* The live code calls the `finalePoints` reset "Grand Finale / Layer 6" in comments, but
`docs/LADDER-MECHANICS.md:10-12` re-frames it as **L7, one-time, NOT the end** (9-layer
ladder). The *code* is unchanged; this is a known doc-vs-code label drift (see §6).

The locked design principle governing the ladder (LAYER3-SPEC §1.5): **each layer automates
the one below it.** L3 automates L1/L2 (Auto-MO, Keep-Autobuyers, auto-collect, auto-graduate);
auto-*touring* is deliberately deferred to L4.

---

## 1. L1 — Encore (tiers + prestige)

### 1.1 Tier production ladder (the base game)
Seven producer tiers, each producing the one below; tier 1 (Notes) produces Soundwaves
(`src/core/constants.ts:19-83`).

| # | Name | Produces | baseCost | costGrowth |
|---|---|---|---|---|
| 1 | Notes | Soundwaves | 10 | 251.19 |
| 2 | Motifs | Notes | 200 | 939.5 |
| 3 | Phrases | Motifs | 5 000 | 3 981 |
| 4 | Melodies | Phrases | 2e5 | 14 894 |
| 5 | Harmonies | Melodies | 5e7 | 63 096 |
| 6 | Movements | Harmonies | 1e12 | 235 879 |
| 7 | **Symphonies** | Movements | 1e18 | 1e6 |

Tier 7 (Symphonies) is the **prestige gate tier** for both Encore (late counts) and Magnum
Opus. Milestone multiplier: ×2 per 10 purchased (`getMilestoneMultiplier`), modifiable by
challenge `milestoneStrength`.

### 1.2 The Encore prestige
`performEncore` (`src/store/gameStore.ts:603-657`):
- **Gate:** the current `getEncoreCost(encoreCount)` tier must be purchased to its `amount`
  (`constants.ts` `getEncoreCost`, escalating: early counts use low tiers, counts ≥5 use
  Symphonies). `perk-second-wind` grants one free (gate-skipping) Encore per MO cycle
  (gameStore.ts:617).
- **EP gain:** `floor(getEncoreGain(peakSoundwaves) × overtureMult)` — EP is
  `floor((peak/1e15)^0.03)` (constants.ts:91-92), deliberately sublinear so EP stays bounded
  under uncapped production.
- **Reset:** SW/tiers/crescendo wiped (`resetTiersAndSW`); `peakSoundwaves` → 0.
- **Production multiplier:** `lifetimeEncorePoints` is the Encore production mult
  (`getEncoreMultiplier`). **Despite the name it is NOT permanent** — it resets every Magnum
  Opus (gameStore.ts:717) and every tour (gameStore.ts:845). The persistent counter is the
  separate `lifetimeEncoreCount` (gameStore.ts:651). *(Doc note: HARDENING-PLAN.md:81-85
  confirms a Codex "performTour wipes lifetimeEncorePoints" flag was a MISREAD — the reset is
  intentional.)*
- **Head-start:** `getHeadStartExponent` seeds the new run with `peak^exp` so the redundant
  re-climb is skipped (gameStore.ts:630-633).
- **The wall:** at `encoreCount >= ENCORE_WALL_COUNT (8)` (constants.ts:94) `layer1WallReached`
  becomes true → Magnum Opus unlocks (gameStore.ts:652).

### 1.3 Applause Points (L1/L2 automation currency)
Earned alongside EP on every Encore: `applausePoints += floor(getApplauseGain(gain))`,
where `getApplauseGain = floor(AP_BASE × encoreGain^AP_EXP)` (`constants.ts:129-133`,
gameStore.ts:649). AP persists across all resets. Spent via `unlockWithApplause`
(gameStore.ts:391) to buy the **auto-encore** autobuyer (`AP_UNLOCK.encore = {cost 5,
minOpusCount 1}`, constants.ts:147-149). Auto-MO is **NOT** an AP buy (it became an L3 venue
component — see §3.5); the only L3-era AP SKU, auto-tour, is gated behind `L4_UNLOCKED`
(gameStore.ts:394).

### 1.4 Auto-encore execution (the wired automation)
The `encore` autobuyer key is fired in the tick-driver (`gameStore.ts:178-193`):
- Conditions: unlocked + enabled + no active challenge + **`!layer1WallReached`** (so it
  re-climbs TO the wall then yields, never starving the 72-Symphony auto-MO) + `peakSoundwaves
  > ENCORE_EP_THRESHOLD` (`.gt` not `.gte` — at peak==threshold `getEncoreGain` returns 0, so
  equality would auto-reset for 0 EP — gameStore.ts:183).
- Throttle: `getAutoEncoreInterval(opusCount)` — weak at first (60s at MO#1), shortening with
  each MO, floored at 2s (`constants.ts:137-142`).
- **Auto-prestige self-sufficiency** (gameStore.ts:156-172): while auto-encore OR auto-MO is
  active, it auto-buys the *current* prestige gate tier (encore-gate pre-wall, 72-Symphony
  MO-gate post-wall), because nothing else auto-buys the gate tier until ~opus 27. Without it
  the automations would be dead weight.

---

## 2. L2 — Magnum Opus (records / Platinum / OP tree)

### 2.1 The Magnum Opus prestige
`performMagnumOpus` (`src/store/gameStore.ts:660-732`):
- **Gate:** `layer1WallReached` (the 8-Encore wall) AND the `getMagnumOpusCost(opusCount)`
  tier purchased. MO cost = **`72 + floor(opusCount/3)` Symphonies** (constants.ts:155-158).
- **OP gain:** `getOpusGain(...)` from Platinum status, the OP-tree `op-gain-flat` node,
  `opusCount`, `peakCrescendoMult`, and OP levels (gameStore.ts:677-683).
- **Reset:** full Encore-layer wipe (SW/tiers/EP/`lifetimeEncorePoints`/`encoreCount`,
  crescendo) — gameStore.ts:713-724. `encoreUpgrades` survive only with
  `perk-keep-encore-upgrades`.
- **Re-master the wall:** `layer1WallReached` resets to `false` unless `perk-skip-wall` —
  every MO must re-reach the 8-Encore wall so even +1 OP stays earned (gameStore.ts:709,720).
- **First MO** unlocks the `tier_1` autobuyer (gameStore.ts:686-698).
- **`postPlatinumMoCount`** increments only when already Platinum (gameStore.ts:730) — this is
  the L3-gate counter (see §3.1).

### 2.2 Records → Platinum (the parallel economy)
Records accrue passively while in L2 (`src/core/tick.ts:76-83` `accrueRecords`), scaling with
`opusCount` and crescendo. Key constants (`constants.ts:178-183`):

| Constant | Value | Role |
|---|---|---|
| `RECORDS_ALBUM_K` | 0.58 | `recordsPerSec = K × opusCount^EXP × crescendoMult × …` |
| `RECORDS_OPUS_EXP` | 1.08 | superlinear opus scaling |
| `PLATINUM_THRESHOLD` | 1 000 000 | records sold to Go Platinum |
| `FAME_PER` | 0.1 | post-Platinum `prod/OP ×= 1 + log10(recordsSold/1e6)×FAME_PER` |

Reaching 1M records sets `platinum = true` (a **non-reset milestone**; "ever reached Platinum"
persists). **`FAME_PER` / "Fame ×" is the only surviving "Fame" concept** — it is a
records-derived production multiplier, NOT the cut Fame currency (RECONCILE-PLAN TASK 3;
HANDOFF.md:10).

### 2.3 The Opus (OP) tree
OP nodes bought via `buyOpusUpgrade` (gameStore.ts:428+). Notably the `automator-unlock-N`
nodes unlock the **tier autobuyers** — this is the canonical autobuyer-unlock path (NOT
challenges; HANDOFF.md:37). Tempo OP node = ×1.5 production each (`TEMPO_OP_MULT_PER_LEVEL`,
constants.ts:177).

### 2.4 Crescendo (conduct/hold)
Holding Conduct builds a crescendo multiplier (CRESCENDO_BASE_MAX ×3 → ×6 ceiling). Idle /
auto-conduct sustains **70%** of the ceiling (`AUTO_CONDUCT_FRACTION = 0.7`, constants.ts:176;
Break-phase decision: active holding 100% > idle 70%).

---

## 3. L3 — World Tour (THE flagship built layer)

**Code home:** `src/core/worldTour.ts` (pure logic + configs), `src/store/gameStore.ts`
(actions, lines 734-871), `src/components/worldtour/WorldTourPage.tsx` (UI), `src/core/tick.ts`
(buffer fill via `calculateWorldTourTick`).

### 3.1 Entry gate
`canUnlockWorldTour` (`worldTour.ts:404-413`) — a **hybrid difficulty-first / structural floor**
gate:
- Must be Platinum (`platinum || recordsSold >= PLATINUM_THRESHOLD`), AND
- `postPlatinumMoCount >= L3.GATE_POST_PLAT_MO (2)`, AND
- optional peak-SW floor (`GATE_MIN_PEAK_SW_LOG10 = 0` → currently inert).

The tick-driver auto-fires `unlockWorldTour()` once the gate is met (gameStore.ts:195-197).
`unlockWorldTour` (gameStore.ts:735-747) snapshots the catalogue and seeds venue 0.

### 3.2 Acclaim — the two-currency split
Mirrors the EP/lifetimeEP split (LAYER3-SPEC §2.2):
- **`acclaim`** — spendable wallet, spent on components.
- **`lifetimeAcclaim`** — permanent, drives a **global production multiplier**
  `getAcclaimMultiplier(lifetimeAcclaim)` (worldTour.ts:388-402): a **capped-log + linear**
  form, `1 + min(MULT_LOG_MULT·log10(1+la·LOG_SCALE) + min(la·LINEAR_K, LINEAR_CAP), MULT_CAP)`,
  hard-capped at ×48 (`L3.MULT_CAP`, worldTour.ts:39). This boosts production only — never the
  Acclaim/tour rate (no one-layer self-feed).

### 3.3 The venue ladder (6 venues, linear)
`VENUES` (`worldTour.ts:168-211`). Heterogeneous components per venue; graduate = ALL
components maxed (`isVenueGraduatable`, worldTour.ts:330-336).

| id | Name | componentIds | costScale | capScale |
|---|---|---|---|---|
| 0 | The Old House | lighting, roof, instruments | 1 | 1 |
| 1 | Local Hall | lighting, roof, crowd, **keepAutobuyers** | 1.38 | 1.18 |
| 2 | City Theatre | lighting, roof, crowd, acoustics, **autoMO** | 1.82 | 1.38 |
| 3 | Concert Hall | lighting, roof, crowd, acoustics, marketing | 2.4 | 1.62 |
| 4 | Opera House | lighting, roof, crowd, acoustics, marketing, backstage | 3.1 | 1.9 |
| 5 | World Stage | lighting, roof, crowd, acoustics, marketing, backstage, premiere, **autoGraduate** | 4 | 2.25 |

> **Doc-vs-code divergence:** LADDER-MECHANICS / LAYER3-SPEC say "5–7 venues"; the code ships
> **6** (`LAST_VENUE_ID = 5`, worldTour.ts:213). Not a bug, just narrower than the design range.

### 3.4 Components (heterogeneous: multiplier OR unlock)
`L3.COMPONENTS` (`worldTour.ts:47-155`). `role: 'multiplier'` (multi-level, `perLevel` boost,
visible art) or `role: 'unlock'` (single-level feature/automation flag).

| id | label | role | maxLevel | costBase | costGrowth | target | perLevel |
|---|---|---|---|---|---|---|---|
| lighting | Lighting | multiplier | 3 | 185 | 2.28 | fillSpeed | 0.24 |
| roof | Roof | multiplier | 3 | 215 | 2.34 | capacity | 0.48 |
| instruments | Instruments | unlock | 1 | 235 | 2.4 | **autoCollect** | — |
| crowd | Crowd | multiplier | 3 | 275 | 2.38 | acclaimRate | 0.18 |
| keepAutobuyers | Keep Autobuyers | unlock | 1 | 165 | 1 | **keepAutobuyers** | — |
| acoustics | Acoustics | multiplier | 3 | 310 | 2.18 | fillSpeed | 0.14 |
| autoMO | Auto-Magnum Opus | unlock | 1 | 340† | 1 | **autoMO** | — |
| marketing | Marketing | multiplier | 4 | 295 | 2.22 | acclaimRate | 0.15 |
| backstage | Backstage | multiplier | 3 | 330 | 2.26 | capacity | 0.22 |
| premiere | Premiere | multiplier | 3 | 395 | 2.48 | acclaimRate | 0.1 |
| autoGraduate | Auto-Graduate | unlock | 1 | 520 | 1 | **autoGraduate** | — |

† `costBase 340` is flagged "TUNE in resim" (worldTour.ts:110).

Buying (`buyComponent`, gameStore.ts:749-778): spend `acclaim`, bump the level, and if it's an
`unlock` component, set the matching boolean flag via `getUnlockFlagsFromComponent`
(worldTour.ts:245-263) → `autoCollect` / `keepAutobuyers` / `autoMO` / `autoGraduate`.

### 3.5 Automation unlocks up the ladder (the L3-automates-L1/L2 arc)

| Unlock | Component (venue) | Effect |
|---|---|---|
| **auto-collect** | `instruments` (V0 Old House) | venue auto-banks Acclaim on sell-out (tick.ts side, see §3.7) |
| **Keep Autobuyers** ("Roadies") | `keepAutobuyers` (V1 Local Hall) | autobuyers + auto-MO/auto-tour survive tour resets |
| **Auto-MO** | `autoMO` (V2 City Theatre) | auto-performs a Magnum Opus when profitable |
| **Auto-graduate** | `autoGraduate` (V5 World Stage) | auto-graduates a venue once all its components are maxed |

> **Reconciled placement (HANDOFF.md:9, RECONCILE-PLAN TASK 2):** Auto-MO was briefly a 75-AP
> purchase during the "Break phase"; it was reverted to this **earned V2 venue component**
> (single-level unlock). Auto-MO is therefore a **post-Platinum** automation, not pre-Platinum.

- **Auto-MO** fires from the tick-driver via `canAutoPerformMagnumOpus` (worldTour.ts:379-386 /
  gameStore.ts:208-210): requires `autoMO && autoMOEnabled && layer1WallReached && !activeChallenge`
  AND the MO gate tier purchased. Toggle: `setAutoMOEnabled` (gameStore.ts:798) + the
  WorldTourPage checkbox (WorldTourPage.tsx:225-235).
- **Auto-graduate** fires from the tick-driver (gameStore.ts:198-206) and also inline inside
  `buyComponent` (gameStore.ts:768-775), both via `buildVenueGraduationPatch` (worldTour.ts:339-356).

### 3.6 The tour loop + `performTour` (the L3 reset)
The loop: enter a venue → it fills with Acclaim over time (idle; conducting speeds the fill) →
spend Acclaim on components → max all components → **graduate** to the next venue → repeat to
the World Stage. Booking a fresh tour is the prestige reset.

`performTour` (`gameStore.ts:830-871`):
- **Resets L1+L2:** SW/tiers, EP/`lifetimeEncorePoints`, OP/`opusUpgrades`, crescendo.
- **Sets `encoreCount: 3`, `layer1WallReached: true`** (gameStore.ts:846-848) — the re-climb
  starts mid-ladder, not from zero, so re-tours aren't full slogs.
- **Legacy carry:** `recordsSold` → `floor(recordsSold × L3.LEGACY_RECORDS_FRACTION (0.12))`
  (gameStore.ts:834,854); `platinum` re-set from the carried amount.
- **Catalogue snapshot:** `catalogueSnapshot = getCatalogueSnapshot(opusCount, carriedRecords)`
  (gameStore.ts:867) — **frozen at tour start**, so re-climbing L1/L2 mid-tour does NOT keep
  pumping Acclaim. `getCatalogueSnapshot = max(1, 1.15·opusCount + 2.2·(records/1M))`
  (worldTour.ts:265-268).
- **Persists by omission:** `acclaim`, `lifetimeAcclaim`, `currentVenue`, `components`,
  `keepAutobuyers`, `autoMO`, `tourCount`, AP, `lifetimeEncoreCount`, `opusCount`, challenge
  progress — all survive a tour.
- **Automations reset unless Roadies:** `autobuyers`, `autoMO`, `autoTour` reset to off unless
  `keepAutobuyers` (gameStore.ts:856-865). The player re-buys them from persisted AP otherwise.

### 3.7 The fill tick + sell-out (anti-AFK)
`calculateWorldTourTick` (`worldTour.ts:415-459`), called from `tick.ts`:
- No-ops entirely if `!worldTourUnlocked` (worldTour.ts:426) — this is why L3 code is inert on
  the `master` Venue-1 build / pre-unlock saves.
- Buffer fills at `getFillSpeed = getAcclaimRate × lighting/acoustics mult × (conducting ? 1.75
  : 1)` (worldTour.ts:305-315). `getAcclaimRate = 0.163 × catalogue^0.62 × crowd/marketing/
  premiere mult / venue.costScale^0.35` (worldTour.ts:292-303).
- **Sell-out:** buffer caps at `getVenueCapacity = 88 × venue.capScale × roof/backstage mult`
  (worldTour.ts:283-290); once full, `venueSoldOut = true` and accrual stops — bounded idle
  income. If `autoCollect` is owned, the cap auto-banks into `acclaim`/`lifetimeAcclaim`;
  otherwise the player taps **Collect** (`bankVenueAcclaim`, gameStore.ts:812; WorldTourPage.tsx:169).

### 3.8 The circuit break (L3 climax)
Graduating the LAST venue (`currentVenue >= LAST_VENUE_ID`) sets `circuitComplete = true`
instead of advancing (worldTour.ts:351-353). After the break, `getEffectiveCatalogue`
(worldTour.ts:271-281) switches from the frozen snapshot to the **live** catalogue
(`getCatalogueSnapshot(opusCount, recordsSold)`), so Acclaim now scales with your live L1/L2
progress — the earned-break reward. Per spec this also reveals L4 (not built).

### 3.9 Auto-Tour — present but DEAD in L3
`canAutoPerformTour` (worldTour.ts:367-377) and the tick-driver fire (gameStore.ts:213-215)
exist, but `canAutoPerformTour` returns `false` whenever `!L4_UNLOCKED` (worldTour.ts:368).
The `AP_UNLOCK_AUTO_TOUR` SKU (constants.ts:152) and `unlockWithApplause('autoTour')`
(gameStore.ts:393-397) are likewise gated. **By design** — auto-touring is an L4 reward
(LAYER3-SPEC §1.5; RECONCILE-PLAN TASK 1). The calibrated `AUTO_TOUR_CAT_RATIO = 1.12`
(worldTour.ts:46) is kept for when L4 ships.

### 3.10 What WORKS / known issues (L3)
**Works:** unlock gate, the venue ladder + heterogeneous components, Acclaim two-currency split
+ capped production mult, the fill/sell-out buffer (incl. auto-collect), all four automation
unlocks, `performTour` reset with Legacy carry + snapshot, the circuit break + live-catalogue
switch. Unit-covered in `src/core/worldTour.test.ts`.

**Known issues / open items:**
- **Living-venue art is NOT built** — WorldTourPage renders a placeholder dashed box with the
  venue name (WorldTourPage.tsx:138-153). The locked approach (layered web overlays driven by
  component levels) is a deferred polish pass (HANDOFF.md:99; LAYER3-SPEC §3 "art").
- **Auto-MO `costBase 340` un-tuned** (worldTour.ts:110, "TUNE in resim").
- **Two L3 sim asserts deferred** (`RESIM_AUTOMO_RECLIMB` gate in `sim/l3-pacing.test.ts`) —
  the tour loop didn't graduate to V2, so auto-MO was unreachable in-sim (HANDOFF.md:16;
  RECONCILE-PLAN "Deferred sim work").

---

## 4. The 12 Challenges

**Code home:** `src/core/challenges.ts` (configs + reward math), `src/store/gameStore.ts`
(start/abandon/complete, lines 479-579), `src/core/tick.ts` (constraint enforcement),
`src/components/challenges/ChallengesPage.tsx` (UI).

### 4.1 Gating
A challenge is visible/runnable when `isChallengeUnlocked` (challenges.ts:138-148) passes:
`worldTourUnlocked` (so challenges arrive **at L3**) AND its per-challenge
`peakSoundwaves`/`encoreCount`/`opusCount` threshold. *(This re-gating off the unreachable
`finaleCount` to reachable L3 thresholds was the big "Break phase" win — RECONCILE-PLAN KEEP.)*

### 4.2 The 12 challenges (`CHALLENGES`, challenges.ts:243-376)

| # | id | Name | Constraint | targetSW | Unlock gate | Reward | unlocksAutobuyer |
|---|---|---|---|---|---|---|---|
| 1 | ch_solo | Solo Performance | singleTier(1) | 5e7 | L3 | crescendoBonus +0.5 | — |
| 2 | ch_duet | Dynamic Duo | maxTiers 2 | 2.5e15 | opus 4 | globalProdMult ×1.15 | — |
| 3 | ch_inflation | Inflation Etude | inflatedCosts ×10 | 1.6e58 | opus 5 | costMult ×0.90 | — |
| 4 | ch_diminuendo | Diminuendo | nerfedProduction ÷100 | 5e25 | opus 6 | globalProdMult ×1.5 | — |
| 5 | ch_opening | Opening Night Jitters | risingCosts 1.01/s | 4e57 | opus 7 | costMult ×0.90 | — |
| 6 | ch_adagio | Super SLOOOW! | nerfedTickspeed ÷10 | 1e132 | encore 8 | tempoBonus +0.15 | — |
| 7 | ch_one_hit | One-Hit Wonder | maxPerTier 10 | 1e62 | encore 9 | costMult ×0.92 | — |
| 8 | ch_acoustic | Acoustic Set | noTempo | 2e21 | encore 10 | tempoBonus +0.05 | **tempo** |
| 9 | ch_leaky | Leaky Auditorium | swDecay 2%/tick | 1e165 | encore 12 | globalProdMult ×1.25 | — |
| 10 | ch_flat | Playing It Flat | noMilestones | 1.2e62 | peakSW 1e65 | milestoneStrength +0.2 | — |
| 11 | ch_reverse | Reverse Rehearsal | reversedProduction | 8e63 | peakSW 1e68 | globalProdMult ×1.3 | **finale_auto** |
| 12 | ch_unplugged | Unplugged Finale | noPrestige | 1e90 | peakSW 1e72 | **capstone** | **all_auto** |

Only ch_acoustic / ch_reverse / ch_unplugged grant an automation, and only where nothing else
grants it (LAYER3-SPEC §2.8 — challenges never duplicate the OP-tree / AP / venue unlocks).

### 4.3 Constraint enforcement
`getActiveChallengeModifiers` (challenges.ts:180-227) maps a `ChallengeConstraint` to a
`ChallengeModifiers` struct. All 12 constraint types are live:
- **Buy-time** (`buyTier`/`buyTempo`, gameStore.ts:229-247,308): `singleTier`, `maxTiers`,
  `maxPerTier`, `noTempo`.
- **Tick-time** (`tick.ts`): `inflatedCosts`/`risingCosts` (tick.ts:116-121 — rising compounds
  `1.01^elapsedSec`), `nerfedTickspeed`, `nerfedProduction`, `swDecay` (tick.ts:188-191,
  2%/tick), `reversedProduction` (tick.ts:124,289-293 — lower tiers produce higher),
  `noMilestones` (gameStore.ts:265-267).
- **Prestige block** (`noPrestige`): `performEncore`/`performMagnumOpus`/`performGrandFinale`
  all early-return when the active challenge has `noPrestige` (gameStore.ts:607-613, 665-671,
  879-885).

### 4.4 Start / abandon / complete
- **Start** `startChallenge` (gameStore.ts:539-579): blocks if already in one; snapshots
  pre-challenge SW/tiers/tempo into `preChallengeState`; resets tiers (only the allowed ones
  unlocked); grants challenge starting SW (`getChallengeStartingSoundwaves` enough to afford
  tier 1 under inflated costs — challenges.ts:230-240).
- **Abandon** `abandonChallenge` (gameStore.ts:581-600): restores the snapshot, no reward.
- **Complete** `checkChallengeCompletion` (gameStore.ts:479-537), called every loop from
  `useGameLoop.ts:32`: when `soundwaves >= targetSoundwaves`, records the best-time
  (`Math.min(prevBest, runTimeMs)`), adds the id to `completedChallenges` (idempotent), grants
  the automation unlock if any, and **restores the pre-challenge state** so the challenge run
  doesn't bleed into the main save.

### 4.5 §2.8 reward system — `getChallengeMultipliers`
`getChallengeMultipliers(completedChallenges, challengeBestTimes)` (challenges.ts:94-126),
derived (not stored), folded into production via `tick.ts:57-62` and into buy-cost via
`getChallengeMultipliers` at the buyTier call (gameStore.ts:233). Aggregation:
- `globalProdMult` and `costMult` **stack multiplicatively**; `tempoBonus`, `crescendoBonus`,
  `milestoneStrength` **stack additively** (challenges.ts:111-115).
- These thread into the live game: `tempoBonus` → `getTotalTempoBonus`; `milestoneStrength` →
  `getMilestoneMultiplier`; `costMult` → effective tier cost; `crescendoBonus` → crescendo.

### 4.6 The speed-scaled capstone (ch_unplugged)
`speedScaledCapstone(totalTimeMs)` (challenges.ts:73-87): maps the **sum of best-times across
completed challenges** to a global ×, LOWER time → HIGHER mult:
- `≥ 70 min` → ×2.0 (`CAPSTONE_MULT_FLOOR`)
- `≤ 20 min` → ×4.0 (`CAPSTONE_MULT_CAP`)
- linear in between.

Applied inside `getChallengeMultipliers` only when a completed challenge has `reward.capstone`
(i.e. ch_unplugged), multiplying `globalProdMult` by `speedScaledCapstone(Σ best-times of
completed)` (challenges.ts:116-122).

### 4.7 ⚠️ THE KNOWN CAPSTONE EXPLOIT (LIVE)
**Documented in `docs/HARDENING-PLAN.md:76-80` — currently LIVE on master.**

The capstone sums best-times over **only the `completed` set** (challenges.ts:117-120), and
ch_unplugged unlocks on a **peak-SW** gate (1e72), **not** on "all 12 cleared". So:

> A player who clears **only** ch_unplugged (or a small subset) fast keeps the total best-time
> small → lands at or near the **×4 cap**. A player who diligently clears all 12 *adds* every
> challenge's best-time to the sum, inflating the total past 70 min → collapses to the **×2
> floor**. **Skipping challenges is rewarded; completing them is punished** — the speed metric
> is gamed because uncleared challenges contribute 0 time instead of a penalty.

This inversion is confirmed by the unit test (`challenges.test.ts:77-85`): all 12 completed at
10 min each = 120 min total → above the 70-min floor → only the ×2 floor multiplier (the test
asserts `> 5` total because the ×2 capstone multiplies the stacked flat rewards, not because
the capstone itself is large).

**Intended fix (HARDENING-PLAN.md:78-80, not yet applied):** gate the capstone on all-12
clears, OR count uncleared challenges as floor-time penalties; fold the flat clears into one
additive bucket + the capstone as a separate capped factor. **A §2.8 challenge-completion sim
is still LOCKED/unbuilt** (LAYER3-SPEC §2.8 "Sim gate"), so all ×magnitudes, AP payouts, and
the capstone curve constants are **placeholders, not balance-final**.

Secondary gap: the `ChallengeReward` interface defines `globalProdMult / costMult / tempoBonus
/ crescendoBonus / milestoneStrength / capstone` but **no AP payout field** — the §2.8 design
table's "AP per clear" column is not implemented; challenge clears grant no Applause Points.

### 4.8 L4 persistence (defined, dormant)
`getL4ChallengeAscensionPatch` (challenges.ts:129-136) clears `completedChallenges` on an L4
ascension unless `keepChallenges`, while `challengeBestTimes` always persist (a permanent skill
record). L4 doesn't exist yet, so this is dormant.

---

## 5. The cold-open story-beat system

**Code home:** `src/components/story/beats.ts` (registry + triggers), `useStoryBeats.ts`
(hook), `StoryBeat.tsx` / `StoryBeatOverlay.tsx` (the gold-orb-on-black overlay). State:
`seenStoryBeats: string[]` + `setStoryBeatSeen` (gameStore.ts:904-908).

### 5.1 How it fires
`getNextStoryBeat(seenStoryBeats, state)` (beats.ts:161-172) walks `STORY_BEAT_ORDER` and
returns the **first unseen beat whose milestone condition is met**. `useStoryBeats`
(useStoryBeats.ts) subscribes to the trigger fields, displays the beat, and on dismiss marks it
seen — once per beat, skippable.

### 5.2 The 5 reachable beats (`STORY_BEAT_ORDER`, beats.ts:26-32)
Each has a `goldLevel` (0..1 — the breathing-orb gold/black balance, rising L1→) and terse
gatekeeper copy (1–3 lines). Triggers via `isBeatConditionMet` (beats.ts:143-158):

| Beat | goldLevel | Trigger condition |
|---|---|---|
| `intro` | 0.15 | always (first play) |
| `encore` | 0.25 | `encoreCount >= 1 \|\| lifetimeEncoreCount >= 1` |
| `magnum_opus` | 0.4 | `opusCount >= 1` |
| `platinum` | 0.55 | `platinum` |
| `world_tour` | 0.7 | `worldTourUnlocked` |

### 5.3 Future beats (registry placeholders, NOT wired)
`signature / virtuoso / canon / grand_finale / redemption / the_gods` exist in `STORY_BEATS`
with copy + goldLevels (beats.ts:78-134) but are **excluded from `STORY_BEAT_ORDER`** and have
**no trigger** (`isBeatConditionMet` returns `false` for them, beats.ts:155) — so they never
fire in the current build. They ship copy ahead of the L4–L9 mechanics. The narrator is the
collective "we" of the pantheon (STORY-SPEC §2); identity is revealed only at L8.

### 5.4 Migration (don't retroactively fire on existing saves)
`seedSeenStoryBeatsFromProgress` (beats.ts:200-208) + `hasPreStoryProgress` (beats.ts:185-194):
when `seenStoryBeats` is empty on a save that already has progress, it back-fills the
already-passed beats so a mid-game player isn't blasted with the intro/Encore/Platinum beats on
first load after the feature shipped.

**Works:** all 5 reachable beats fire correctly, once each, skippable, with migration. **Known
limitation:** L4+ beats are copy-only; they'll need triggers added to `STORY_BEAT_ORDER` +
`isBeatConditionMet` when those layers exist.

---

## 6. Doc ↔ code divergences (consolidated)

| # | Topic | Doc says | Code does | Status |
|---|---|---|---|---|
| 1 | Finale layer label | `finalePoints` reset = **L7, one-time** (LADDER-MECHANICS:10-12) | comments call it "L6 Grand Finale", repeatable (`finaleCount++`, gameStore.ts:874-902) | known drift; code unchanged, `performGrandFinale` is still a stub (no payoff) |
| 2 | Venue count | "5–7 venues" | **6** venues (worldTour.ts:213) | within range, narrower |
| 3 | Auto-MO placement | earned V2 venue component (reconciled) | matches — `autoMO` component on City Theatre | ✅ reconciled |
| 4 | Auto-Tour | L4 reward, not L3 | code present but `L4_UNLOCKED=false`-gated | ✅ reconciled, dead in L3 |
| 5 | Fame currency / tree | CUT | absent; only `FAME_PER` records-mult remains | ✅ reconciled |
| 6 | Reset-perks (Encore Resonance / Opus Memory) | CUT | absent | ✅ reconciled |
| 7 | Challenge AP rewards | each clear grants AP (§2.8 table) | `ChallengeReward` has **no AP field**; clears grant 0 AP | **not implemented** |
| 8 | Capstone | should reward clearing all 12 | sums only completed → skipping is rewarded | ⚠️ **LIVE EXPLOIT** (HARDENING-PLAN:76) |
| 9 | Living-venue art | layered web overlays per venue | placeholder dashed box | deferred polish |
| 10 | Challenge magnitudes | sim-tuned | placeholders; §2.8 sim still unbuilt | un-tuned |
| 11 | `lifetimeEncorePoints` | (old §3.5) "L3 keeps it" | resets every MO/tour by design | doc corrected; code intentional (HARDENING-PLAN:81) |

---

## 7. Key files (quick map)

| Concern | File |
|---|---|
| L3 logic, venues, components, Acclaim math | `src/core/worldTour.ts` |
| Challenges: configs, constraints, reward math, capstone | `src/core/challenges.ts` |
| Tier/Encore/MO/records/AP constants + formulas | `src/core/constants.ts` |
| All prestige actions + tick-driver automations | `src/store/gameStore.ts` (149-216 tick-driver; 603-902 prestige) |
| Constraint enforcement + production + venue fill | `src/core/tick.ts` |
| Story beats registry + triggers + migration | `src/components/story/beats.ts` |
| L3 UI | `src/components/worldtour/WorldTourPage.tsx` |
| Challenges UI | `src/components/challenges/ChallengesPage.tsx` |
| Design specs | `docs/LAYER3-SPEC.md`, `docs/LADDER-MECHANICS.md`, `docs/ACHIEVEMENTS-V2-SPEC.md`, `docs/STORY-SPEC.md`, `docs/RECONCILE-PLAN.md`, `docs/HARDENING-PLAN.md` |
