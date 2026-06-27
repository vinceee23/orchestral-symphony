# 02 — Economy, Formulas, the Multiplier Funnel, Caps & the Reset Matrix

> **Balance-critical reference.** Every number here is read from the live code, not from prose. Where a
> design doc disagrees with the code, the **code wins** and the divergence is flagged ⚠. Citations are
> `path:line` against the tree as of branch `feat/layer3`.
>
> Primary sources: `src/core/formulas.ts`, `src/core/constants.ts`, `src/core/records.ts`,
> `src/core/crescendo.ts`, `src/core/worldTour.ts`, `src/core/opusUpgrades.ts`,
> `src/core/encoreUpgrades.ts`, `src/core/achievements.ts`, `src/core/tick.ts`,
> `src/store/gameStore.ts`. All big numbers are `break_infinity.js` `Decimal`.

---

## 0. TL;DR — the things that bite you

1. **There is ONE production funnel:** `getCoreProductionMultiplier` (`formulas.ts:206`). It is the single
   source of truth shared by the tick AND every UI rate display, so the displayed rate can't drift from
   real production. Achievement global/tier multipliers are applied **outside** it (in `tick.ts` and the
   UI), by design — see §2.
2. **`lifetimeEncorePoints` is NOT permanent.** Despite the name, it *is* the Encore production multiplier
   (`getEncoreMultiplier`) and it **resets on every Magnum Opus** (`gameStore.ts:717`), hence also on Tour
   and Grand Finale. The persistent encore counter is the separate field `lifetimeEncoreCount`. This is the
   single most common misread in the codebase. See §6.
3. **Milestones are uncapped by design.** `MILESTONE_PROD_CAP = Infinity` (`constants.ts:102`). The "buy-10"
   doubling never stops; it is bounded only by exponential tier-cost growth. Any future layer that
   *snapshots* production must take this term sub-linearly or it runs away (`formulas.ts:50-54`).
4. **The only hard numeric cap in the funnel is the Acclaim multiplier**, `MULT_CAP = 48` (i.e. ×49 max),
   via the capped-log form in `getAcclaimMultiplier` (`worldTour.ts:388-402`).
5. **`opusUpgrades` / `opusPoints` survive a Magnum Opus** in code, but a design doc says they reset each
   MO. ⚠ DIVERGENCE — see §6.4.

---

## 1. The production funnel — `getCoreProductionMultiplier`

`formulas.ts:206-244`. Returns a `Decimal`. This is the global multiplier applied to **every tier's**
per-tick production (`getTierProductionPerSec` = `quantity × baseProduction × tier.multiplier ×
globalMultiplier`, `formulas.ts:75-85`). The per-tier `tier.multiplier` is the milestone product (§3.2);
`globalMultiplier` is this funnel.

### 1.1 Every factor that feeds the funnel

In the exact `.times()` order they are multiplied (`formulas.ts:232-243`):

| # | Factor | Source fn | Source file:line | Formula | Resets on | Cap |
|---|---|---|---|---|---|---|
| 1 | **Encore** | `getEncoreMultiplier(lifetimeEncorePoints)` | `formulas.ts:163-165` | `1 + ENCORE_REWARD_PER · EP` = `1 + 1·EP` (additive) | Magnum Opus | none (additive, EP bounded) |
| 2 | **Grand Finale** | `getFinaleMultiplier(finalePoints)` | `formulas.ts:180-182` | `10 ^ FP` | one-time layer, never | none |
| 3 | **Tempo OP node** | `getTempoOpMultiplier(opusUpgrades)` | `opusUpgrades.ts:222-224` | `1.5 ^ level(tempo-op-mult)` | Tour (opusUpgrades wiped) | level ≤ 8 ⇒ ≤ `1.5^8 ≈ 25.6` |
| 4 | **Crescendo** | `getCrescendoMultiplier(crescendoLevel, opusUpgrades, crescendoBonus)` | `crescendo.ts:42-50` | `1 + clamp01(level)·(ceiling−1)` | run (Encore+) | `ceiling = CRESCENDO_BASE_MAX(3) + lvl + crescendoBonus`, hard ceiling `CRESCENDO_MAX_CEILING = 6` |
| 5 | **Fame** (post-Platinum only) | `getFameMultiplier(recordsSold, opusUpgrades)` if `platinum` else `1` | `records.ts:54-58` | `1 + log10(recordsSold/1e6)·famePer` | Tour (platinum re-earned) | log-bounded; `famePer = 0.1·1.5^lvl(fame-strength)` |
| 6 | **Perfect Pitch** (Encore shop) | `getPerfectPitchMultiplier(encoreUpgrades)` | `encoreUpgrades.ts:72-74` | `1 + 0.2·level(perfectPitch)` | Magnum Opus (encoreUpgrades wiped) | level ≤ 10 ⇒ ≤ ×3 |
| 7 | **Production scale** | `PRODUCTION_SCALE` | `constants.ts:90` | constant `1` (no-op; snappy opening knob) | — | — |
| 8 | **Tempo (real)** | `getTempoProductionMultiplier(tempoLevel, achievementTempoBonus)` | `formulas.ts:116-118` | `TEMPO_BASE_INTERVAL / tickInterval` where `tickInterval = max(50, 1000/speedFactor)`, `speedFactor = 1 + level·0.10 + achTempoBonus` | run (tempo level resets) | interval floored at `TEMPO_MIN_INTERVAL = 50` ⇒ multiplier ≤ ×20 |
| 9 | **Milestone tickspeed** | `getMilestoneTickspeedMultiplier(tiers)` | `formulas.ts:68-72` | `1 + totalMilestones·0.01` | run (tiers reset) | none (grows with total milestone rows) |
| 10 | **Mass Production** (perk) | `2 ^ (#tiers with purchased ≥ 1000)` if perk else `1` | `formulas.ts:227-230` | `Decimal.pow(2, count)` | run | ≤ `2^7` (7 tiers) |
| 11 | **Acclaim** (L3) | `acclaimMult` ← `getAcclaimMultiplier(lifetimeAcclaim)` | `worldTour.ts:388-402` | capped-log, see §4 | **persists across Tour** (L4-tier) | **`1 + MULT_CAP = 49`** (the one hard cap) |
| 12 | **Challenge global** | `challengeGlobalProdMult` (default 1) | `tick.ts:102` ← `getChallengeMultipliers` | stacked challenge reward | per challenge config | — |

`crescendoBonus` (additive ceiling boost, challenge "Solo" reward) defaults 0; `challengeGlobalProdMult`
defaults 1; `acclaimMult` defaults 1. For `noPrestige` challenges the caller passes `0` for
`lifetimeEncorePoints` and `finalePoints` and `1` for `acclaimMult` (`tick.ts:85-91`).

### 1.2 What is deliberately NOT in the funnel

The funnel's docstring (`formulas.ts:200-205`) says it "Excludes only achievement/tier-achievement mults
and challenge-only modifiers (handled by their callers)." Applied separately:

- **Achievement global %** — `getAchievementGlobalMultiplier` → multiplied onto the funnel in
  `tick.ts:89` (`achievementGlobal.times(getCoreProductionMultiplier(...))`) and identically in every UI
  surface (`Header.tsx:50`, `OrchestraStage.tsx:118`, `SoundwaveDisplay.tsx:36`).
- **Achievement tier %** — `getAchievementTierMultiplier(set, tierId)` → multiplied per-tier in the tick
  (`tick.ts:136,165`) as `fullMult = globalMult.times(tierAchMult)`.
- **Challenge production divisor** — `globalMult.div(mods.productionDivisor)` (`tick.ts:107-109`).

So the *true* per-tier production multiplier in the tick is:
`achievementGlobal × getCoreProductionMultiplier(...) ÷ productionDivisor × tierAchMult`.

---

## 2. Achievements as multipliers — the "budget"

`achievements.ts` defines **118 achievements** (`ACHIEVEMENTS`, header comment `achievements.ts:84`).
Rewards are typed `AchievementReward` (`achievements.ts:14-24`): `globalPercent`, `tierPercent`,
`tempoBonus`, `costReduction`, `tierCostReduction`, `startingSW`, `headStartBoost`, `perk`, or `none`.

The aggregators (`achievements.ts:2293-2392`):

| Aggregator | file:line | Combine rule | Cap / floor |
|---|---|---|---|
| `getAchievementGlobalMultiplier` | 2297 | `1 + Σ globalPercent` | **No cap** (linear sum of unlocked %s) |
| `getAchievementTierMultiplier(tierId)` | 2312 | `1 + Σ tierPercent[tierId]` | **No cap** |
| `getAchievementTempoBonus` | 2327 | `Σ tempoBonus` (additive, feeds speedFactor) | none (but tickInterval floors at 50ms) |
| `getAchievementCostReduction` | 2342 | `1 − Σ costReduction` | **floor `0.5`** (max −50% cost) |
| `getAchievementTierCostReduction(tierId)` | 2357 | `1 − Σ tierCostReduction[tierId]` | **floor `0.5`** |
| `getAchievementStartingSW` | 2371 | `Σ startingSW` | none |
| `getAchievementHeadStartBoost` | 2385 | `Σ headStartBoost` | none (feeds head-start exponent) |

> **"Achievement budget" reality check.** There is **no explicit `BUDGET` constant or programmatic cap**
> on the summed achievement production %. The only caps are the two **cost-reduction floors at 0.5**
> (`Math.max(0.5, …)`, lines 2350 & 2365). The production-% budget is enforced *editorially* — the design
> keeps each reward small (mostly +0.02–0.10) so the total stays modest; the spec source for the intended
> ceiling is `docs/ACHIEVEMENTS-V2-SPEC.md`, not a runtime guard. If you add big-% achievements they stack
> uncapped into the global multiplier.

Production-bearing rewards are sparse: most achievements are `{ none: true }` collectibles (notably the
long "streams" record drip `ach_records_*` and the per-count Symphony drips, all collectible). The
production movers are the `globalPercent` (+2%…+10%) and `tierPercent` (+10%…+20%) achievements scattered
through Rows 1–10. Tempo achievements feed `achievementTempoBonus`, which flows into **funnel factor #8**
(real tempo multiplier) — so "tempo speed" achievements ARE production, via the tempo term.

**Perks** (`reward.perk`) are not multipliers themselves; they flip behaviour read elsewhere
(`hasPerk(...)`): `perk-bulk-unlock` → Mass Production (funnel #10), `perk-platinum-press` → records sell
`PLATINUM_PRESS_MULT×` faster (`tick.ts:75`), `perk-second-wind` → one free Encore/MO cycle, `perk-warmup`
/`perk-tempo-headstart`/`perk-crescendo-headstart`/`perk-skip-wall`/`perk-keep-encore-upgrades`/
`perk-encore-discount` → reset-seeding / QoL (see §6).

---

## 3. Layer 1 economy — tiers, milestones, tempo

### 3.1 Tier ladder (`constants.ts:19-83`)

7 tiers (`TIER_COUNT = 7`). Tier 1 (Notes) produces Soundwaves; tier *n* produces tier *n−1*.
`baseProduction = 1` for **all** tiers — production scaling comes entirely from quantity × milestones ×
the funnel, not from per-tier base.

| id | Name | baseCost | costGrowth (per 10-bracket) |
|---|---|---|---|
| 1 | Notes | 10 | 251.19 |
| 2 | Motifs | 200 | 939.5 |
| 3 | Phrases | 5,000 | 3,981 |
| 4 | Melodies | 2e5 | 14,894 |
| 5 | Harmonies | 5e7 | 63,096 |
| 6 | Movements | 1e12 | 235,879 |
| 7 | Symphonies | 1e18 | 1e6 |

**Cost** (`getTierCost`, `formulas.ts:28-31`): `baseCost · costGrowth^bracket · costMultiplier`, where
`bracket = floor(purchased/10)` (`MILESTONE_INTERVAL = 10`). Batch cost respects bracket changes
(`getTierBatchCost`, `formulas.ts:34-48`). `getMaxBuyable` loops with a 10,000-iter safety cap
(`formulas.ts:135`).

`STARTING_SOUNDWAVES = 10` (`constants.ts:87`).

### 3.2 Milestones — the uncapped "buy-10 chase"

`getMilestoneMultiplier(purchased, milestoneStrength)` (`formulas.ts:55-59`):
`base = MILESTONE_MULTIPLIER(2) + milestoneStrength`, `milestones = min(floor(purchased/10),
MILESTONE_PROD_CAP)`, returns `base ^ milestones`.

- `MILESTONE_MULTIPLIER = 2`, `MILESTONE_INTERVAL = 10`, **`MILESTONE_PROD_CAP = Infinity`**
  (`constants.ts:100-102`). Every 10th purchase doubles that tier's `tier.multiplier`. Uncapped by design;
  bounded in practice by exponential cost growth (`formulas.ts:50-54`).
- `milestoneStrength` (challenge "Flat" reward) raises the per-milestone base (e.g. +0.2 → ×2.2 per row).
- **Tickspeed side-effect:** total milestone rows across all tiers also feed funnel factor #9 via
  `getTotalMilestones` + `getMilestoneTickspeedMultiplier` (`+1%` per row, `MILESTONE_TICKSPEED_BONUS =
  0.01`).

> ⚠ **Hardening note** (`formulas.ts:50-54`, `docs/HARDENING-PLAN.md` B2): any *permanent* layer that
> snapshots production (e.g. L6 Canon's Palimpsest) must take the milestone term log/root, or it becomes an
> unbounded runaway.

### 3.3 Tempo (`formulas.ts:97-123`, `constants.ts:95-99`)

- `speedFactor = 1 + level·TEMPO_SPEED_FACTOR(0.10) + achievementTempoBonus` (`getTempoSpeedFactor`).
- `tickInterval = max(TEMPO_MIN_INTERVAL(50), TEMPO_BASE_INTERVAL(1000)/speedFactor)`
  (`getTempoTickInterval`). Display-only now (loop ticks per frame).
- **Real production effect** = `getTempoProductionMultiplier = 1000/tickInterval` (funnel #8). Floor at
  50ms ⇒ max ×20. Comment at `formulas.ts:115` explains the loop only shrank the interval (which cancels),
  so this multiplier is the *fix* that makes tempo actually pay.
- `getTempoCost(level) = TEMPO_BASE_COST(1000) · TEMPO_COST_GROWTH(3.5)^level` (`formulas.ts:121-123`).
- `getTempoBPM = round(60000/tickInterval)` (display).

---

## 4. Layer 3 — World Tour: Acclaim economy & the one hard cap

All L3 tuning lives in the frozen `L3` const (`worldTour.ts:27-46`); it is the single source of truth
ported from `sim/l3-pacing.test.ts`.

### 4.1 The capped-log Acclaim multiplier (funnel #11) — `getAcclaimMultiplier` (`worldTour.ts:388-402`)

`MULT_FORM = 'capped-log'`. For `lifetimeAcclaim = la`:

```
logTerm  = log10(1 + la · MULT_LOG_SCALE)        // MULT_LOG_SCALE = 0.022
logAdd   = MULT_LOG_MULT · logTerm               // MULT_LOG_MULT  = 0.72
linearAdd= min(la · MULT_LINEAR_K, MULT_LINEAR_CAP)  // K = 0.00032, LINEAR_CAP = 36
add      = min(logAdd + linearAdd, MULT_CAP)     // MULT_CAP = 48  ← THE hard cap
mult     = 1 + add                               // ⇒ ranges 1 … 49
```

Returns `1` if `la == 0` or non-finite. **This is the only numeric clamp inside the production funnel.**
`lifetimeAcclaim` snowballs across tours (it is *not* reset by `performTour` — see §6), so over a full
circuit the multiplier asymptotes toward ×49.

### 4.2 Acclaim accrual (the touring loop) — `calculateWorldTourTick` (`worldTour.ts:415-459`)

- **Catalogue** drives everything. `getCatalogueSnapshot(opusCount, recordsSold)`
  (`worldTour.ts:265-268`): `max(1, CATALOGUE_OPUS_W(1.15)·opusCount + CATALOGUE_RECORDS_W(2.2)·
  (recordsSold/PLATINUM_THRESHOLD))`. During a tour the catalogue is the **frozen snapshot**; after the
  circuit completes it uses the live values (`getEffectiveCatalogue`, `worldTour.ts:270-281`).
- **Acclaim rate:** `getAcclaimRate` (`worldTour.ts:292-303`) =
  `ACCLAIM_BASE(0.163) · cat^CAT_EXP(0.62) · qualityBoost / venue.costScale^0.35`, where `cat = max(1,
  snapshot)` and `qualityBoost` = product of `acclaimRate` component multipliers.
- **Fill speed:** `getFillSpeed = acclaimRate · lightBoost · (conducting ? CONDUCT_FILL_MULT(1.75) : 1)`
  (`worldTour.ts:305-315`).
- **Capacity:** `getVenueCapacity = CAP_BASE(88) · venue.capScale · capacityBoost` (`worldTour.ts:283-290`).
- The buffer fills to cap, then "sells out"; with `autoCollect` it auto-banks into `acclaim` +
  `lifetimeAcclaim` (`worldTour.ts:444-456`). Manual banking: `bankVenueAcclaim` (`gameStore.ts:812-828`).

### 4.3 Venue ladder & components (`worldTour.ts:159-211`, `47-155`)

6 venues (Old House → World Stage), linear ladder, `costScale 1 → 4`, `capScale 1 → 2.25`. Each venue
exposes a subset of 11 components. `getComponentCost = costBase · venue.costScale · costGrowth^level ·
discountFactor` (`worldTour.ts:317-328`). Component roles: `multiplier` (per-level boost to fillSpeed /
capacity / acclaimRate via `multiplierBoost`, `worldTour.ts:234-243`) or `unlock` (flips a flag:
`autoCollect`, `keepAutobuyers`, `autoMO`, `autoGraduate` — `getUnlockFlagsFromComponent`,
`worldTour.ts:246-263`). Graduation requires every component in the venue maxed (`isVenueGraduatable`,
`worldTour.ts:330-336`).

### 4.4 World-Tour gate (`canUnlockWorldTour`, `worldTour.ts:404-413`)

Requires: Platinum (`platinum || recordsSold ≥ 1e6`) **and** `postPlatinumMoCount ≥ GATE_POST_PLAT_MO(2)`.
`GATE_MIN_PEAK_SW_LOG10 = 0` ⇒ the peak-SW sub-gate is currently disabled.

### 4.5 Auto-Tour / Auto-MO (mostly L4-gated)

- `canAutoPerformTour` (`worldTour.ts:367-377`) returns `false` immediately because `L4_UNLOCKED = false`
  (`constants.ts:4`). Auto-tour is dormant until L4.
- `canAutoPerformMagnumOpus` (`worldTour.ts:379-386`): fires when `autoMO && autoMOEnabled &&
  layer1WallReached && !activeChallenge` and the MO gate tier is satisfied. Driven from the tick
  (`gameStore.ts:209`).

---

## 5. Layer 2 — Records → Platinum, the Opus tree

### 5.1 Records economy (`records.ts`, `constants.ts:178-183`)

- **Records/sec** (`getRecordsPerSec`, `records.ts:9-19`):
  `getEffectiveRecordsK(levels) · opusCount^RECORDS_OPUS_EXP(1.08) · crescendoMult`.
  `getEffectiveRecordsK = RECORDS_ALBUM_K(0.58) · 1.5^lvl(records-sell-rate)` (`opusUpgrades.ts:251-253`).
  (`RECORDS_PROD_K = 5` is a dead legacy constant, `constants.ts:178`.) In the tick the crescendo factor is
  multiplied by `perk-platinum-press`'s `PLATINUM_PRESS_MULT` (`tick.ts:75-82`).
- **Platinum** at `PLATINUM_THRESHOLD = 1,000,000` records (`isPlatinum`, `records.ts:32-34`).
- **Fame** (post-Platinum) feeds funnel #5: `getFameMultiplier = 1 + log10(recordsSold/1e6)·famePer`
  (`records.ts:54-58`), `famePer = FAME_PER(0.1)·1.5^lvl(fame-strength)`.

### 5.2 Opus Point (OP) gain (`getOpusGain`, `records.ts:36-51`)

- **Pre-Platinum:** flat `1 + opGainFlatLevel` (OP_GAIN node `op-gain-flat`, +1/level, max 8).
- **Post-Platinum (catalog):** `floor( (1 + opusCount·OPUS_CATALOG_K(0.5) + opGainFlatLevel) ·
  getCrescendoOpBonus(peakCrescendoMult, levels) )`. `getCrescendoOpBonus = 1 + (peakMult−1)·bonusPer`,
  `bonusPer = OPUS_CRESCENDO_BONUS_PER(0.25) + 0.25·lvl(crescendo-op-bonus)` (`crescendo.ts:53-56`,
  `opusUpgrades.ts:243-245`).
- (`OPUS_PLAT_THRESHOLD = 1e30` / `OPUS_PLAT_ROOT = 0.05` / `OPUS_CATALOG_K` for catalog scaling; note the
  catalog form in code is the linear `opusCount·0.5` path, not the `(peakSW/1e30)^root` form mentioned in
  the constant comment — the root constants feed `getPlatRoot` but `getOpusGain` uses the catalog base.)

### 5.3 The Opus tree (`opusUpgrades.ts:27-207`)

4 tracks. OP cost to next level = `ceil(baseCost · costGrowth^currentLevel)` (`opusUpgrades.ts:214-216`).

| Track | id | Effect | base / growth / max |
|---|---|---|---|
| AUTOMATORS | `automator-unlock-2…7` | unlock tier *n* autobuyer | 1–6 / 1 / 1 |
| AUTOMATORS | `automator-speed` (Swift Fingers) | −1 speed tier/level (`AUTOBUYER_SPEED_TIERS`) | 3 / 1.8 / 5 |
| AUTOMATORS | `automator-bulk` (Bulk Orders) | +1 bulk tier/level | 4 / 1.7 / 4 |
| AUTOMATORS | `auto-conduct` | AFK crescendo floor at `AUTO_CONDUCT_FRACTION(0.7)` | 25 / 1 / 1 |
| CRESCENDO | `crescendo-ceiling` (Grand Crescendo) | +1 ceiling/level | 2 / 1.9 / 3 (3→6) |
| CRESCENDO | `crescendo-slow-decay` | ×1.4 decay time/level | 3 / 1.8 / 3 |
| CRESCENDO | `crescendo-fast-build` | ×0.8 build time/level | 3 / 1.8 / 3 |
| CRESCENDO | `crescendo-op-bonus` (Rave Reviews) | +0.25 OP-bonus factor/level | 5 / 2 / 3 |
| TEMPO | `tempo-op-mult` (Allegro Spirit) | **funnel #3:** ×1.5 global/level | 1 / 1.7 / 8 |
| TEMPO | `bpm-cap` (Breakneck) | +25% BPM cap/level | 4 / 1.9 / 3 |
| OP_GAIN | `op-gain-flat` (Opus Mastery) | +1 flat OP/level (pre-Plat) | 2 / 1.4 / 8 |
| OP_GAIN | `records-sell-rate` (Chart Climber) | ×1.5 records/sec/level | 3 / 1.7 / 5 |
| OP_GAIN | `plat-root-boost` (Platinum Roots) | +0.01 post-Plat OP root/level | 6 / 2 / 3 |
| OP_GAIN | `fame-strength` (Superstardom) | ×1.5 fame bonus/level | 5 / 2 / 3 |

### 5.4 Crescendo dynamics (`crescendo.ts:19-50`, `constants.ts:172-176`)

`advanceCrescendo`: holding Conduct rises toward 1 over `getCrescendoBuildSec = 12·0.8^fastBuild`; releasing
decays toward 0 over `getCrescendoDecaySec = 25·1.4^slowDecay`; with `auto-conduct` the AFK floor is
`AUTO_CONDUCT_FRACTION = 0.7` (active holding still reaches 100% — Break-phase decision active > idle,
`constants.ts:176`). Maps 0..1 → `1..ceiling` via funnel #4.

---

## 6. THE RESET MATRIX (authoritative — reconciled with code)

The design source is `docs/LADDER-MECHANICS.md` §"RESET MATRIX" (it itself supersedes LAYER3-SPEC §3.5).
Below, each field is reconciled against the **actual reset code**: `performEncore`
(`gameStore.ts:603-657`), `performMagnumOpus` (`gameStore.ts:660-732`), `performTour`
(`gameStore.ts:830-871`), `performGrandFinale` (`gameStore.ts:874-902`), and the shared
`resetTiersAndSW` helper (`gameStore.ts:60-94`).

> **Reset semantics:** each `set({...})` patch lists exactly the fields a prestige *wipes*. Any field NOT
> in the patch **persists by omission.** So to know what survives, read what's absent.

### 6.1 What each prestige action writes

**`resetTiersAndSW`** (shared by ALL four actions, `gameStore.ts:60-94`) resets: `soundwaves`
(= `STARTING_SOUNDWAVES + achievementStartingSW + (warmup? WARMUP_BONUS_SW)`), `tiers` (all qty/purchased
0, multiplier 1, only tier 1 unlocked — unless `perk-warmup` pre-buys the first tiers), `tempo` (level 0
unless `perk-tempo-headstart`), `crescendo` (only if `perk-crescendo-headstart`), `currentRunStartTime`,
`producedThisRun`, `tempoPurchasesThisRun`.

| Action | Additionally resets / sets (beyond `resetTiersAndSW`) | Notably PERSISTS (omitted) |
|---|---|---|
| **performEncore** (`603`) | `peakSoundwaves→0`; `encorePoints += gain`; **`lifetimeEncorePoints += gain`**; `applausePoints += gain`; `encoreCount++`; `lifetimeEncoreCount++`; `layer1WallReached` (sticky once true); patron/silent flags. Sight-Reading seeds `soundwaves = peak^headExp`. | encoreUpgrades, opus*, records, acclaim, venue, crescendo (carries across Encore unless perk seeds it) |
| **performMagnumOpus** (`660`) | `peakSoundwaves→0`; `encorePoints→0`; **`lifetimeEncorePoints→0`**; `encoreCount→0`; `encoreUpgrades→{}` (unless `perk-keep-encore-upgrades`); `layer1WallReached = skipWall`; `crescendo = crescHeadstart(0 default)`; `peakCrescendoMult→1`; `opusPoints += gain`; `opusCount++`; seeds tier_1 autobuyer on MO#1; `postPlatinumMoCount++` if wasPlatinum. | **opusUpgrades, opusPoints (only += gain, the prior balance stays)**, recordsSold, platinum, acclaim, lifetimeAcclaim, venue ladder, autobuyers (except the new tier_1) |
| **performTour** (`830`) | `resetTiersAndSW`; `peakSoundwaves→0`; `encorePoints→0`; `lifetimeEncorePoints→0`; `encoreCount→3` (Symphonies pre-revealed); `encoreUpgrades→{}` (unless keep); `layer1WallReached→true`; **`opusPoints→0`; `opusUpgrades→{}`**; `crescendo`/`peakCrescendoMult→1`; `recordsSold = floor(prev·LEGACY_RECORDS_FRACTION 0.12)`; `platinum = carried ≥ 1e6`; autobuyers `{}` unless Roadies; `autoMO/autoTour` reset unless Roadies; `tourCount++`; `catalogueSnapshot` re-frozen; venueBuffer→0. | **opusCount** (kept!), **lifetimeAcclaim** (kept — snowball), acclaim (kept — spendable), venue ladder/components, applausePoints, lifetimeEncoreCount, challenge records, seenStoryBeats |
| **performGrandFinale** (`874`) | `resetTiersAndSW`; `peakSoundwaves→0`; `encorePoints→0`; `lifetimeEncorePoints→0`; `encoreCount→0`; `encoreUpgrades→{}`; **`opusPoints→0`; `opusCount→0`**; `finalePoints++`; `finaleCount++`. | recordsSold, platinum, acclaim, lifetimeAcclaim, venue ladder, achievements, **opusUpgrades** (⚠ not in patch — persists; see §6.4) |

### 6.2 Field-by-field authoritative matrix (code-verified)

`R` = reset by that action · `K` = kept · `+` = incremented/accumulated · `→` = set to a fixed value.

| Field | Encore | Magnum Opus | Tour | Grand Finale | Source |
|---|---|---|---|---|---|
| soundwaves, tiers, tempo, producedThisRun, tempoPurchasesThisRun | R | R | R | R | `resetTiersAndSW` |
| crescendo | K (unless perk seed) | →0 / seed | →0 / seed | →0 / seed | `657,722,852,891` |
| peakSoundwaves | →0 | →0 | →0 | →0 | all |
| peakCrescendoMult | K | →1 | →1 | (omitted → K ⚠) | `723,853` |
| encorePoints | + gain | →0 | →0 | →0 | all |
| **lifetimeEncorePoints** (= Encore prod mult) | **+ gain** | **→0** | **→0** | **→0** | `648,717,845,894` |
| encoreUpgrades | K | →{} (unless keep) | →{} (unless keep) | →{} | `719,847,896` |
| encoreCount | +1 | →0 | →3 | →0 | `650,718,846,895` |
| lifetimeEncoreCount | +1 | K | K | K | `651` only |
| layer1WallReached | sticky-true at wall | = skipWall perk | →true | K (omitted) | `652,720,848` |
| applausePoints | + gain | K | K | K | `649` |
| opusPoints | K | + gain | →0 | →0 | `727,849,897` |
| **opusUpgrades** | K | **K (persists)** ⚠ | →{} | **K (persists)** ⚠ | `851` only resets it |
| opusCount | K | +1 | **K** | →0 | `728,850,898` |
| postPlatinumMoCount | K | +1 if Plat | K | K | `730` |
| recordsSold | K | K | →floor(·0.12) | K | `854` |
| platinum | K | K | re-derived | K | `855` |
| acclaim (spendable) | K | K | **K** | K | persists everywhere |
| **lifetimeAcclaim** (= Acclaim mult) | K | K | **K (snowball)** | K | never in any reset patch |
| currentVenue, components, keepAutobuyers, autoMO, autoCollect, autoGraduate | K | K | K (autoMO reset unless Roadies) | K | `860` |
| autobuyers | K | tier_1 added MO#1 | →{} unless Roadies | K | `729,856` |
| finalePoints / finaleCount | K | K | K | +1 | `899,900` |
| completedChallenges, challengeBestTimes, achievements, seenStoryBeats | K | K | K | K | never reset by prestige |

### 6.3 The `lifetimeEncorePoints` clarification (the headline)

`lifetimeEncorePoints` is **the Encore production multiplier** (funnel #1 via `getEncoreMultiplier`,
`formulas.ts:163`), **not** a permanent lifetime total. It is incremented on Encore (`gameStore.ts:648`)
and **zeroed on Magnum Opus** (`gameStore.ts:717`), therefore also on Tour (`845`) and Grand Finale
(`894`). The genuinely-permanent encore counter is **`lifetimeEncoreCount`** (`gameStore.ts:651`), reset by
nothing. This matches `docs/LADDER-MECHANICS.md` row "lifetimeEncorePoints | MagnumOpus" and supersedes the
old LAYER3-SPEC §3.5 claim that L3 keeps it. ✅ doc and code agree.

### 6.4 ⚠ Divergences between `docs/LADDER-MECHANICS.md` and code

1. **`opusUpgrades` (the OP tree) reset timing.** LADDER-MECHANICS row 20 says *"opusPoints, opusUpgrades
   (OP tree) | resetTier = tour | reset each tour + each MO."* **Code disagrees:** `performMagnumOpus`
   does NOT reset `opusUpgrades` or zero `opusPoints` (it only `+= gain`) — they **persist across a Magnum
   Opus** and are reset **only by Tour** (`gameStore.ts:851`). So the OP tree carries through MOs; the doc's
   "+ each MO" clause is wrong. The deepest-wipe (`resetTier = tour`) is correct; the per-MO note is not.
2. **`opusUpgrades` survives Grand Finale too.** `performGrandFinale` resets `opusPoints→0` and
   `opusCount→0` but **omits `opusUpgrades`** (`gameStore.ts:890-901`) — so the OP tree levels persist
   through a Finale. The matrix doesn't call this out. (Likely intentional given Finale's "new universe"
   framing keeps your tech, but flag it for the L7 build.)
3. **`peakCrescendoMult` after Grand Finale.** Reset to 1 on MO (`723`) and Tour (`853`), but **omitted**
   from the Finale patch ⇒ persists. Minor (it's recomputed live in the tick), but inconsistent.
4. **`layer1WallReached` after Grand Finale.** Omitted from the Finale patch ⇒ stays `true`. The matrix
   treats run-level fields as reset; this one isn't. Means post-Finale you remain "in the Magnum Opus era"
   gate-wise. Flag for L7.
5. **`⚠`-marked doc rows** (`opusCount`, `lifetimeAcclaim`, venue ladder = "L4, confirm at build"):
   code currently keeps all three across Tour, consistent with "deepest wipe ≥ L4". No divergence today;
   they simply have no L4 reset path yet (`L4_UNLOCKED = false`).

---

## 7. Caps & clamps — the complete list

| Cap / floor | Value | Where | Effect |
|---|---|---|---|
| `MULT_CAP` (Acclaim) | 48 (→ ×49 mult) | `worldTour.ts:42,398` | **only hard cap inside the funnel** |
| `MULT_LINEAR_CAP` (Acclaim linear term) | 36 | `worldTour.ts:38,396` | caps the linear half before the outer `MULT_CAP` |
| `MILESTONE_PROD_CAP` | **Infinity** | `constants.ts:102` | milestones uncapped *by design* |
| `TEMPO_MIN_INTERVAL` | 50 ms | `constants.ts:98` | tempo prod multiplier ≤ ×20 |
| `CRESCENDO_MAX_CEILING` | 6 | `constants.ts:173` | crescendo multiplier ≤ ×6 |
| Achievement cost reduction floor | 0.5 (−50% max) | `achievements.ts:2350,2365` | global + per-tier |
| Achievement production % | **no cap** | `achievements.ts:2305,2320` | editorial budget only (`ACHIEVEMENTS-V2-SPEC.md`) |
| `getMaxBuyable` / `getMaxTempoLevels` loop | 10,000 iters | `formulas.ts:135,150` | safety bound, not a balance cap |
| `getEncoreGain` overflow guard | `MAX_SAFE_INTEGER` | `formulas.ts:171` | extreme peaks can't poison numeric EP |
| EP root | `ENCORE_EP_ROOT = 0.03` | `constants.ts:92` | keeps EP bounded under uncapped production |
| `MAX_OFFLINE_MS` / `DELTA_CAP_MS` | 24h / 5000ms | `constants.ts:104,106` | offline catch-up bounds |

---

## 8. Prestige reward formulas — quick reference

| Reward | Formula | file:line |
|---|---|---|
| Encore mult | `1 + 1·EP` (additive; `×2^EP` "explodes", sim-proven) | `formulas.ts:163` |
| EP gained | `0` if `peak ≤ 1e15` else `floor((peak/1e15)^0.03)` | `formulas.ts:168-172` |
| Applause gained | `floor(AP_BASE(1)·encoreGain^AP_EXP(1.0))` | `constants.ts:131-133` |
| Opus BPM mult | `2^op` (display/BPM) | `formulas.ts:175-177` |
| Finale mult | `10^FP` | `formulas.ts:180-182` |
| Magnum Opus gate | `72 + floor(opusCount/3)` Symphonies | `constants.ts:155-158` |
| Encore gate (escalating) | per `getEncoreCost(encoreCount)` table | `constants.ts:113-123` |
| Grand Finale threshold | `1.79e308` SW (JS `Number.MAX_VALUE`) | `constants.ts:160` |
| Auto-encore interval | `max(2000, 60000/(1+max(0,op−1)·0.55))` | `constants.ts:138-142` |
| Head-start (Sight-Reading) | new-run SW = `peak^(0.5 + achBoost)` | `encoreUpgrades.ts:56,77`; `gameStore.ts:631` |

---

*Cross-references: `docs/LADDER-MECHANICS.md` (reset matrix source), `docs/LAYER3-SPEC.md` (L3 detail),
`docs/HARDENING-PLAN.md` (B2 milestone-snapshot hazard), `docs/ACHIEVEMENTS-V2-SPEC.md` (achievement
budget intent), `docs/RECONCILE-PLAN.md` (the audit that produced the matrix), `HANDOFF.md`.*
