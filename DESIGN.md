# Orchestral Symphony — Design Doc

> Status: **v1 proposal** (2026-06-24). Build order: finish the whole-game design on paper, then
> build **Layer 1 only**, fully. Each layer ships complete and ends on a cliffhanger into the next.
> Grounded in research on Antimatter Dimensions, Cookie Clicker, Realm Grinder, Trimps, Synergism,
> NGU Idle, Universal Paperclips, loop-reset games, and Pecorella's *Math of Idle Games*.

---

## 1. Vision & pillars

You are a composer building from a single **Note** to an entire **Era of music**. The number that
goes up is **Soundwaves**, produced by a 7-tier chain. The fantasy is *scale*: what starts as one
person humming becomes an orchestra, then a recorded legacy, then a whole genre.

AD-inspired, but **its own game**. We borrow AD's spine (tiered production, buy-10 breakpoints,
tickspeed, nested prestige) and reject AD's weakness for our context (layers that are "just bigger
numbers"). Months-long depth. **Phased playstyle**: active early (learn by hand) → automation earned
gradually → idle-friendly late game.

**Five pillars** (each maps to a research finding):

1. **Buy-10 is a rhythm, not a slider.** Every 10th purchase doubles a tier — a discrete breakpoint chase.
2. **Each prestige layer has a distinct verb,** not just a bigger multiplier. (The anti-grind rule.)
3. **Automation is earned content, never a default toggle** — and once earned, never re-grinded.
4. **Every higher layer trivializes the layers below.** Re-clearing the first 7 tiers in seconds is the core dopamine.
5. **Always a clear next goal** at every zoom level: next buy → next breakpoint → next prestige → next layer.

---

## 2. The core loop (base game)

Unchanged in structure from what's built, with balance recommendations.

**The 7-tier cascade** (each produces the one below; Tier 1 produces Soundwaves):

| # | Tier | Base cost | Per-bracket cost ×| Produces |
|---|------|-----------|-------------------|----------|
| 1 | Notes       | 10    | 1e2 | Soundwaves |
| 2 | Motifs      | 200   | 3e2 | Notes |
| 3 | Phrases     | 5e3   | 1e3 | Motifs |
| 4 | Melodies    | 2e5   | 3e3 | Phrases |
| 5 | Harmonies   | 5e7   | 1e4 | Melodies |
| 6 | Movements   | 1e12  | 3e4 | Harmonies |
| 7 | Symphonies  | 1e18  | 1e5 | Movements |

**Buy-10 breakpoints** — every 10 purchased: tier output **×2**, unit cost steps up by the per-bracket
factor. This staircase is the heartbeat. **Recommendation: remove the current ×16 milestone cap**
(`MILESTONE_PROD_CAP = 4`). Capping the ×2 kills the breakpoint chase, which *is* the moment-to-moment
game. Instead control power through base costs + the tickspeed milestone bonus, not by capping the hook.

**Tempo (tickspeed)** — a single global multiplier on how fast all tiers tick. Own exponential cost
curve (base 1000, ×3.5/level). This is your second investment axis: **breadth** (more tier units) vs
**tempo** (faster ticks). Keep it.

**Balance targets** (Pecorella math):
- Cost grows exponentially, production polynomially → every tier inevitably stalls. That stall is the engine.
- 7-tier cascade approximates `xⁿ/n!` growth — near-exponential, so the game "explodes" after a slow build. Good.
- Tune so the **first Encore is reachable in the first session or two** (see §7). A too-slow first prestige is the #1 quit point.

---

## 3. The layer map — 6 prestige layers, each a distinct verb

Telescoping scope mirrors a musician's ascent from first performance to defining a canon. **Each layer
resets everything below but grants a currency that boosts everything below** (fractal nesting). The iron
rule: **every layer is a different MECHANIC, never just a bigger multiplier.** Each verb is a proven
archetype from the research (AD, Realm Grinder, Synergism, Trimps).

| # | Layer (music frame) | **Distinct verb (the new toy)** | Archetype borrowed | Cadence |
|---|---------------------|----------------------------------|--------------------|---------|
| 0 | **Compose** — the performance | Buy 7 tiers + tempo by hand | base loop | sec–min |
| 1 | **Encore** — take a bow, play again | **Pure ×production multiplier.** Teaches the prestige loop. Fully manual. | Clicker Heroes souls | hours → 1–2 days |
| 2 | **Magnum Opus** — record the album | **×tempo + a deep tempo system you conduct by hand** (sections/movements). NO autobuyers here. | AD tickspeed | days |
| 3 | **Repertoire** — go on tour | **THE Automation layer.** Every autobuyer unlocks + upgrades here, on a milestone ladder you keep *forever*. | AD Eternity Milestones | days → 1 wk |
| 4 | **Genre** — define a style | **Choice/build tree** — pick a Genre (Classical/Jazz/Electronic/Film) each reset; reshapes bonuses, respeccable. | Realm Grinder factions / AD Time Studies | 1–2 wks |
| 5 | **Virtuoso** — master the craft | **Voluntary-difficulty runs** — opt into constraints ("perform blindfolded") for permanent stacking multipliers. | AD Eternity Challenges / Synergism Corruptions | 2–4 wks |
| 6 | **Canon** — a body of work (endgame) | **Collectible loadout** — earn randomized **Compositions** (equippable, leveled, rarity), mix-and-match a build. Open-ended terminal layer. | AD Glyphs / Synergism Talismans | weeks → ∞ |

**Why distinct verbs, not 6 multipliers:** research is blunt — layers that are mechanically identical with
more zeroes are the deepest anti-pattern. Each layer changes *how you play*: buy → conduct → automate →
choose a build → opt into difficulty → craft a loadout. That progression sustains months without becoming
a spreadsheet.

**The tightening (from design review):** automation lives in ONE place. L1–L2 are fully manual — you press
buy and conduct tempo yourself ("manual" = occasional decisions; production runs passively, so no
click-fatigue). L3 ("Repertoire") is the dedicated Automation layer where every autobuyer is earned and
permanently kept. This stops L2 and L3 from both reading as "more automation," and makes L3 a strong reveal.

**Endgame:** L6 (Canon) is open-ended — collect/level/equip Compositions forever, with the L5 difficulty
dial feeding infinite scaling. Genre-standard terminal state (AD Reality/Glyphs, Synergism, NGU all end
open-ended). A finite narrative finale was considered and cut to keep scope at a tight, complete 6 layers.

**Naming:** existing Encore / Magnum Opus survive as layers 1–2. The old "Grand Finale" is retired; the
deep game gets the new names above.

### Cliffhangers (mechanical wall + narrative teaser, per your call)
Each layer climaxes on a **hard wall you provably can't beat with this layer's tools**, paired with a
**music-themed story beat** that frames the next layer. No "???" UI element — the teaser is narrative.

The pattern, per layer: *diminishing returns set in → a themed hard wall → a one-line teaser reframing
the next verb.* Examples:
- **End of L1 (Encore):** after 8 Encores you've **mastered the stage** (the mechanical gate). Aspirational
  teaser — *"a performance fades by morning; to make your music endure, record it"* → **Magnum Opus**.
  (Note: the *natural* production stall lands later, ~Encore 11-12; the gate fires at 8 while play still
  feels good, so the teaser is framed as ambition, not a wall the player is grinding against.)
- **End of L2 (Magnum Opus):** the fastest tempo you can conduct by hand still stalls — *"You can't be in
  every city at once."* → **Repertoire** (touring / automation).
- **End of L3 (Repertoire):** automation maxed, but the same setlist every night. *"You've mastered the
  songs. Now write the rulebook."* → **Genre**.
- …L4 → L5 → L6 hand off the same way, ending in the open-ended Canon endgame.

---

## 4. Automation philosophy

**Earned, ratcheted, phased** — the AD Eternity-Milestones model, which is also the spine of your
"phased playstyle" choice.

**Automation lives in exactly one layer: L3 (Repertoire).**

- **Phase A (Layers 0–2, manual):** you buy tiers and conduct tempo by hand. "Manual" only means *you
  press buy* — production runs passively — so it's occasional decision-making, not click-fatigue. This is
  where you learn the loop and earn the *right* to automate it.
- **Phase B (Layer 3, the Automation reveal):** the big beat. Every autobuyer unlocks here on a milestone
  ladder, each upgraded in order: **unlock → bulk (1 / 10 / max) → speed (interval down) → conditional
  (auto-prestige when reward ≥ ×N).**
- **Permanent ratchet:** once an automation milestone is earned, it is **kept on every future run forever.**
  You never re-grind convenience — the reason resets stop feeling like punishment.
- **Late game (Layers 4–6):** the entire 7-tier + Encore + tempo loop runs itself; your attention moves up
  to genre builds, difficulty runs, and loadout craft. You tune a self-running machine, not operate it.

Rule of thumb baked in: **automate an action ~one prestige cycle after the player first did it manually
and repeatedly** — which is exactly why automation lands at L3, after L1–L2 manual mastery.

---

## 5. Offline progress

Capped, with offline *quality* improving as a prestige reward (ties naturally to the Magnum Opus tempo layer).

- Capped accrual (current 24h cap is a fine start). Active play should always beat pure idle.
- Consider diminishing efficiency past the first window (e.g. 100% for N hours, then 50%) so idling
  never dominates active play.
- Offline-quality upgrades unlocked in Layer 2 = a clean "the game becomes idle-friendly as you progress" arc.

---

## 6. Balance math cheat-sheet (the dials)

- **Tier cost:** `base × bracketGrowth^(floor(purchased/10))`. Keep per-tier growth as tabled.
- **Buy-10:** ×2 production + cost step every 10. **Uncap it.**
- **Tempo:** global ×, own exponential cost curve. ~×1.1–1.12 effective speed-up per level is the AD-feel band.
- **Prestige gain = sublinear function of peak/lifetime currency.** Use a **root**:
  - **Layer 1 (Encore): √-based, max/per-run.** Idle-friendly, fast cycles. `EP_gain = floor(k · sqrt(peakSW / threshold))`.
    Tune `k`, `threshold` so first Encore lands in session 1–2 and you gain **~+50–200%** more EP each
    time you reset at the right moment (surface a "reset now?" indicator at that point).
  - **Layer 2/3: lower exponent (∛ or smaller), max-based** → longer, more strategic runs.
- **Reward shapes by layer:** L1 multiplicative-per-point (×prod); L2 ×tempo + automation unlocks; L3
  ×prod baseline **+ genre choice modifiers**.
- **Anti-worthlessness sink (Trimps fix):** pair the ×N/point currencies with a **linear-cost infinite
  sink** at endgame (a perk/upgrade whose cost rises linearly while giving a tiny additive bonus) so
  prestige points never stop mattering late.
- **Milestone ratchets:** permanent perks at lifetime thresholds (e.g. "100 total Encores → Tier-1
  autobuyer is free and maxed forever").

**Avoid (research-flagged failure modes):** capped buy-10 multiplier (kills the hook); interval-checking
tyranny (buffs to re-cast / resources that overflow); manual clicking that *should* be automated;
too-slow first prestige; layers that are mechanically identical with more zeroes.

---

## 7. Layer 1 — complete spec (this is what we build first)

**Scope:** base 7-tier game + Tempo + a fully-developed, repeatable **Encore** prestige +
Layer-1 achievements/challenges + the cliffhanger wall & teaser into Magnum Opus. **Fully manual — no
automation** (that's the L3 reveal). "Done" = the checklist in §8 is all green.

**The Encore loop:**
1. Player builds tiers + tempo, hits the natural cost stall.
2. At a threshold (~30 Harmonies / Tier 5, as currently), the **Encore** button lights up, showing
   projected Applause gain and the multiplier it'll grant.
3. Encore resets tiers/tempo/SW, grants Applause (√ formula), each point ×prod permanently.
4. Next run re-clears the early tiers fast → visible "I'm so much stronger" payoff.
5. **Encore upgrade shop** (Applause sink): a small tree of permanent buys — e.g. *Sight-Reading* (start
   each run with N free Tier-1), *Perfect Pitch* (×prod), *Crescendo* (milestone bonus +), *Metronome*
   (cheaper tempo). **No autobuyers here — automation is the L3 reveal.** Player stays manual through L1.
6. After enough Encores, Applause gains plateau → **Layer-1 wall + teaser** → Magnum Opus unlocks.

**SHIPPED Layer 1 constants** (sim-validated in `sim/`, asserted by `src/core/layer1.test.ts`):
- `PRODUCTION_SCALE = 1` — full early production → **snappy opening** (10 Notes in ~30s), first Encore ~5 min (punchy).
- Cost growth: per-bracket factors **raised to ^1.2** (≈ 251, 940, 3981, 14894, 63096, 235879, 1e6) — the first bracket stays cheap (fast opening) while later brackets steepen into the wall. **Milestone uncapped** (`MILESTONE_PROD_CAP = Infinity`) so every 10th buy keeps doubling — the buy-10 chase stays alive.
- Cadence (sim, optimal play): Encores at ~5m, 3m, 2.7m, 2.7m, 3.8m, 10.8m, 33m, 1.6h — a smooth ramp that slows into the wall at Encore 8 (~2.6h total). Tuned from playtest feedback that the old 0.1 scale made the opening a trickle.
- Encore reward is **ADDITIVE**: production ×`(1 + ENCORE_REWARD_PER · totalEP)`, `ENCORE_REWARD_PER = 1`. (×2^EP explodes — proven; see the test's regression guard.)
- `EP_gain = floor((runPeak / 1e15)^0.03)`, accumulated into `lifetimeEncorePoints` (drives the multiplier) and `encorePoints` (spendable in the shop). The 0.03 exponent — much smaller than a √ — is what keeps EP bounded under uncapped production; it yields a healthy ×2–2.8 per-Encore cadence.
- Encore unlock gate: 30 Harmonies (escalates per Encore: 30 Movements → 30/50/70… Symphonies).
- `ENCORE_WALL_COUNT = 8` — after 8 Encores (~2–2.5h optimal) the cliffhanger fires and Magnum Opus unlocks.
- Encore shop: 3 nodes (Perfect Pitch ×prod, Sight-Reading head start, Overture +EP gain) — multipliers + QoL only, no automation (that's L3).

**Still feel-tunable on a playtest pass:** exact `PRODUCTION_SCALE`/`ENCORE_WALL_COUNT` for the desired session length, and shop upgrade magnitudes. Math fixed the pacing; subjective feel is a human call.

---

## 8. Build order & "done" checklist for Layer 1

Build sequence (rework existing code against this spec; current Encore code is a starting point, not law):

1. **Base loop balance pass** — uncap buy-10 milestone; verify cost/production curves feel right; first stall lands in-session.
2. **Encore rework** — √-based EP gain, max/per-run; ×prod reward; projected-gain + "reset now?" UI.
3. **Encore upgrade shop** — the Applause sink tree (5–8 nodes): multipliers + QoL only, no automation.
4. **Layer-1 achievements & challenges** — scoped to the Encore epoch only.
5. **Cliffhanger** — the volume-ceiling wall + narrative teaser; Magnum Opus shown as "coming next" (locked, framed narratively, not a bare "???").
6. **Polish** — number formatting, soundwave/tempo feedback, save/load integrity across Encores.

**Layer 1 is "done" when:**
- [ ] Buy-10 breakpoints feel like a rhythm; no production cap kills the chase.
- [ ] First Encore reachable in session 1–2; each Encore visibly trivializes early tiers.
- [x] EP gain is root-based (exp 0.03), per-run peak; projected gain shown on the Encore button.
- [ ] Encore upgrade shop gives a real shopping list (multipliers + QoL; no automation).
- [ ] Game stays fully manual through Layer 1 (automation is the L3 reveal).
- [ ] Achievements/challenges scoped to Layer 1 exist and fire.
- [ ] The cliffhanger wall + narrative teaser lands and unlocks Magnum Opus.
- [ ] Saves survive Encores and a reload without corruption.

---

## 9. Decisions (locked 2026-06-24)

- **Layer map: 6 layers, each a distinct verb** (see §3). Trimmed from a 9-layer draft to keep scope tight
  and complete. Build one layer fully before the next.
- **Automation tightening applied:** automation lives only in L3 (Repertoire). L1–L2 are fully manual
  ("active early"); L2 is the tempo axis, not automation.
- The earlier "Genre choice + difficulty dial" call = **L4 Genre** + **L5 Virtuoso** (two distinct layers).
- **Build order: Layer 1 only, now.** Git initialized (baseline `0c69e6b`).

Still to settle by playtest (not blockers):
- Currency flavor names per layer — decide as we build each.
- EP reward per point — ×1.5 vs ×2 (tune by playtest / simulation).
- Whether L6 Canon stays open-ended or gets a finite capstone — decide at L6.

---

## 10. Layer 2 — Magnum Opus spec (designed 2026-06-24)

**Theme:** *record the album.* **Unlock:** the Layer-1 cliffhanger (8 Encores). **Reset:** resets the
Encore layer (Applause, Encore upgrades, tiers, tempo) → grants **Opus Points (OP)**.

**The pivot — tempo becomes ACTIVE, and automation moves here.** L2's verb is the **Crescendo**: an
active push. Because conducting a crescendo demands attention, the rote buying (spamming M / 1–7) becomes
**automatable at L2** — so the player's active focus shifts *from buying → to conducting.* (This revises
the earlier "automation = L3" plan; see layer-map note below.)

**The Crescendo (the new verb — forgiving, a reward not a chore).** A meter that builds from your ACTIVE
input (manual buying / a "Conduct" hold-button) and grants a temporary production surge scaling with the
meter. Design rules so it's never punishing and never twitchy:
- **Idle is fine.** The meter cools to 0 and you produce at full baseline (automators keep buying). Missing
  crescendos costs only the BONUS, never your baseline — stepping away never craters you.
- **Decays slowly.** A short break barely dents it; you drift back, not fall off a cliff.
- **No rhythm/timing.** Just being active builds it; a single Conduct hold sustains it. Forgiving, not Guitar Hero.
- **Only YOUR input builds it** (automator buys don't) — so active play stays meaningfully better without
  idle being penalized. This is the "more rewarding to actively play" lever.

**Automators — unlocked FREE by your first Magnum Opus, upgraded by OP.** Performing MO unlocks the
autobuyers (thematic: the recording lets session players cover your parts). They run at a **baseline rate**
so idle keeps progressing — but **manual buying is faster AND builds the crescendo**, so players who press M
are rewarded. Automation is idle convenience, not the optimal play.

**Opus Points = the upgrade TREE** (OP does NOT unlock automators — it improves them). Spend OP on branches:
- **Automators** — speed (interval ↓), bulk (buy 1→10→max), later smart/conditional buys.
- **Tempo** — raise baseline tempo.
- **Crescendo** — raise the surge ceiling and slow the decay.
The tree gradually narrows the auto-vs-manual buying gap, leaving the **crescendo** as the enduring reason
to play actively.

**Loop:** Magnum Opus → unlock automators (hands freed) → spend OP in the tree (faster autos + tempo +
crescendo) → conduct crescendos for surges while autos handle the floor → accumulate OP toward Layer 3.
Cadence: days → weeks.

**Layer-map implication:** basic automation now enters at **L2**. **L3 (Repertoire)** shifts from "the
automation layer" to **automation MASTERY / permanence** — the AD-Eternity-Milestone idea: auto-prestige,
keep-automation-forever ratchets, and eventually light scripting. (Re-designed when we reach it.)

### Locked specifics (Q&A 2026-06-24)
- **Conduct** unlocks at your **first Magnum Opus** (it IS the L2 reveal). Hold a "Conduct" button / Spacebar.
- **Crescendo:** ×3 production surge at base (OP raises the ceiling). **Slow build** (~10-15s to full) / **slow
  decay** (~20-30s) — relaxed, lingers, a short break barely dents it. **Pure upside** (no penalty/cooldown).
  Peak crescendo **boosts OP gain.** A deep OP upgrade adds **auto-conduct** (holds ~50% crescendo while AFK).
- **OP gain arc (the original "Break"):**
  1. **Flat +1 OP** per Magnum Opus to start (simple).
  2. OP-tree upgrades raise OP gain and the crescendo→OP multiplier.
  3. **Go Platinum** — a **Records Sold** meter (fueled by a BLEND of production + crescendo spikes — a hit
     performance sells) climbs to **1,000,000** (real platinum cert). Hitting it = the breakthrough: OP gain
     flips from flat to **SUBLINEAR** (root of peak Soundwaves × a crescendo bonus). This is our Break-Infinity
     beat, but triggered by *reach* (a million listeners), not a number ceiling — distinctly ours.
  4. **Post-Platinum:** Records Sold keeps climbing as a permanent **"fame" multiplier** (small permanent
     production/OP bonus) — the meter never becomes vestigial.
- **Platinum timing:** MID-L2 breakthrough. The flat-+1-OP grind runs long enough to feel limiting, THEN
  the break lands and pays off (AD's grind-then-break rhythm). Not early, not a final-climax.
- **OP upgrades = categorized tracks** (NOT a branching web — the branching choice-tree is L4 Genre's job):
  clean panels for **Automators / Tempo / Crescendo / OP-gain**, each a short upgrade list.
- **L2→L3 cliffhanger:** post-Platinum the sublinear OP itself eventually plateaus — "one album isn't a
  career." That felt-slowdown wall + a *touring* teaser opens Layer 3 (Repertoire). Mirrors L1's cliffhanger.
- **Scope:** confirmed all-in (crescendo + automators + OP tracks + Records Sold/Platinum + fame + auto-conduct)
  — cohesive, each piece has a role. Build order may still ship a lean core first, but the design target is full.
- **Automators:** first Magnum Opus gives ONE automator FREE (taste of relief); the other 6 tiers are OP
  purchases (unlocking IS the upgrade). Power ceiling: through L2 maxed automators stay a notch BELOW manual
  peak (active hands always out-earn idle); true full-idle arrives only with the deep **auto-conduct** node —
  that's the on-ramp into the "idle late" phase. Reuse the existing `autobuyers` store scaffold.
- **OP tracks (LOCKED node draft):**
  - *Automators:* unlock each tier's auto-buyer · Speed · Bulk (auto-buy in 10s/milestones) · Auto-Conduct (deep).
  - *Crescendo:* raise ceiling (×3→×5→…) · slower decay · faster build · stronger crescendo→OP bonus.
  - *Tempo:* stronger tempo multiplier per OP · raise the BPM cap.
  - *OP-gain:* +flat OP/MO (pre-Platinum) · post-Platinum sublinear-exponent & crescendo-OP boosters ·
    faster record sales (reach Platinum sooner) · stronger fame multiplier.

> **L2 DESIGN STATUS (2026-06-24): decision-locked.** All mechanics, the original "Go Platinum" break,
> pacing shape, OP-track contents, automator behavior, and the L2→L3 cliffhanger are settled. Remaining
> work is NUMBERS (sim-tuning curves/thresholds — pure math, the simulator's job) → then delegate the build.

### L2 MATH — v0 formulas + constants (2026-06-24)
Formulas defined; numeric constants are **v0 starting values, tuned against the running build like L1 was**
(blind pre-tuning is slower than tuning once the OP-over-time curve exists in code). Lives in new pure
modules: `src/core/{opusUpgrades,crescendo,records}.ts` + appended `constants.ts` block.

- **Magnum Opus:** cost = `100 + 80·opusCount` Symphonies (existing, keep). `opusPoints` = spendable OP
  (spent on tracks); `opusCount` = lifetime MOs (monotonic, drives record sales).
- **OP gain:** pre-Platinum **flat** `1 + opGainLevel` per MO. Post-Platinum **sublinear**:
  `floor( (peakSoundwaves / 1e30)^0.05 × crescendoBonus )`, `crescendoBonus = 1 + peakCrescendo·0.25`.
  (Mirrors the encore-EP root shape; 1e30 threshold & 0.05 root are v0.)
- **Crescendo:** global production multiplier. `base ceiling ×3` (+1/level → ×6 max). Builds to ceiling over
  `BUILD_SEC=12` of holding Conduct; decays to ×1 over `DECAY_SEC=25` when released. `peakCrescendo` (the
  run's highest crescendo) feeds OP gain. Auto-conduct node sustains `0.5×` ceiling AFK.
- **Automators:** Notes auto-buyer free at first MO; tiers 2-7 are OP unlocks. Baseline interval 500ms
  (manual hold ≈90ms stays faster → active wins). Speed/bulk via existing `AUTOBUYER_SPEED_TIERS`/
  `_BULK_TIERS`. Floor kept above manual until the auto-conduct era.
- **Tempo track:** replaces the shipped auto-×2-BPM/OP. Each tempo node = `×1.5` global tempo/production;
  cost escalates. (Cursor must stop `performMagnumOpus` auto-granting tempo — flagged store change, Claude does it.)
- **Records Sold (the blend):** `recordsPerSec = 5 · log10(swPerSec + 10) · crescendoMult`. Production (via
  log, bounded across the huge SW range) AND crescendo both raise sales — the blend. `RECORDS_PROD_K=5` v0
  (≈1M in ~60-90 min of good active play → mid-L2 breakthrough).
- **Go Platinum:** `recordsSold ≥ 1,000,000` → one-time flip to sublinear OP gain. Records keep accruing after.
- **Fame:** post-Platinum permanent `prod/OP ×= 1 + log10(recordsSold/1e6)·0.1` (slow permanent climb).
- **L2→L3 plateau:** not in foundations; tuned later once OP curve is observed.

**MO-progression sim (`sim/l2progression.mjs`, 2026-06-24) — found 3 STRUCTURAL issues the static check missed.**
Coarse model (1h-cycle, active ×3 crescendo, abstractions stated in-file); human playtest is final arbiter.
1. **OP-gain runaway (must fix).** Post-Platinum `(peakSW/1e30)^0.05` looks bounded but peakSW is 1e73–1e313,
   so it yields +48,000 OP at MO#2 → +2e67 by MO#28 (OP→opPower→higher peakSW→more OP feedback). **Fix:**
   make OP gain *log-based* (∝ `log10(peakSW)−~70`) or catalog-based, capped to a human range (~+1..+120/layer).
2. **MO-gate escalation is the saboteur.** Shipped `100+80n` Symphonies = ×~1e61 SW cost PER MO; persistent
   power can't keep up → eras explode 1h→104h→483h→stall. **A FIXED ~100-Symphony gate gives the target loop:**
   steady ~1.2h/MO, opPower 1→3.4 (meaningful, not trivializing), reaches MO#30 in ~33h, NO runaway.
3. **Records/Platinum + the "break" payoff (OPEN — needs Vince).** With the fixed gate, peakSW stays ~constant,
   so a peakSW-based break gives no acceleration. Records tuned album-style (`~1·opusCount·cresc`) put Platinum
   at **MO#13 / ~15.7h ≈ mid-L2** ✓. But Going Platinum needs a real payoff that ISN'T peakSW-growth — likely
   **post-Platinum OP gain scales with opusCount (your catalog)** so the back half accelerates toward L3.
   DECISION PENDING: what does the Platinum break actually boost?

**VALIDATED L2 TUNING (sim/l2progression.mjs, 2026-06-24 — Vince's decisions + sim-tuned):**
- **MO gate:** `100 + floor(opusCount/3)` Symphonies. ("Gentle" flavor without whole-bracket jumps — `100+10n`
  was secretly brutal since 10 Symphonies = ×4e7 SW. This increment gives mild early lengthening.)
- **OP gain:** pre-Platinum flat `+1` (+ op-gain-flat levels). Post-Platinum **catalog-scaled**:
  `floor((1 + opusCount·0.5) · crescBonus)`, `crescBonus = 1 + (peakCrescendoMult−1)·0.25`. NOT peakSW-based
  (that ran away). Gives +10→+21 OP across the back half; powers the post-Platinum acceleration.
- **Records / Platinum:** `recordsPerSec = 1 · opusCount · crescendoMult` (album-style). 1M ≈ MO#13 / ~16h = mid-L2. ✓
- **Pacing result:** ~30.7h to MO#30; steady ~1.2h/MO early, accelerating to ~0.7h/MO late (catalog OP→power).
  Platinum mid-layer; no runaway; OP gain human-readable throughout. L2 ≈ 30h active (a week casual). ✓
- **OP tree depth:** needs ~14 power-node-levels of sink so catalog OP keeps buying production into the back half.
- **⚠ DEVIATION TO CONFIRM:** records driver changed from the locked "production+crescendo blend" to
  **catalog(opusCount)+crescendo** — pure production was a flat ~13-min timer (log-flatness). Production still
  gates MOs (matters indirectly). Awaiting Vince's nod before refactoring records.ts to this.
- **NOT yet baked into TS** — these validated numbers get implemented (getMagnumOpusCost, getOpusGain,
  getRecordsPerSec signature change) together with the tick/MO-reward wiring, as one coherent gated pass.

**Math self-check (`sim/l2check.mjs`, 2026-06-24 — all PASS):** OP-gain post-Platinum is finite/bounded
& monotonic across peakSW 1e31..1e300 (+1 at 1e31, +47 at 1e60); crescendo build/decay/auto-conduct hit
their marks; fame climbs slowly (×1.6 at 1e12 records). Two calibration findings:
  - **Plateau target:** OP/MO trivializes by peakSW ~1e120+ (tens-of-thousands of OP). Put the L2→L3 plateau
    wall around **peakSW ~1e60–1e80** (OP/MO still tens-to-thousands) so OP stays meaningful into the cliffhanger.
  - **Platinum timing is NOT yet calibrated:** records accrue *cumulatively* across MOs, so when 1M lands
    relative to total L2 length depends on the swPerSec-over-time curve — which needs the MO-progression sim
    or playtest. Formula is sound (reachable in ~1-2h active, never instant/never); tune `RECORDS_PROD_K` so
    Platinum lands ~40-60% through L2 active time once that curve exists.

**Build order (when we build L2):** OP gain formula → first-MO unlocks the autobuyer system (reuse the
existing `autobuyers` store scaffold, baseline rate) → OP upgrade TREE (automator speed/bulk, tempo,
crescendo) in the Magnum Opus section → the Crescendo meter + Conduct mechanic on the stage (input-built,
slow decay) → sim-validate OP gain + auto-vs-manual gap + crescendo balance → cliffhanger into L3.

**Open for playtest/tuning:** crescendo build/decay rates, hold-to-build vs click-to-pump, OP gain formula,
the baseline automator rate vs manual (must keep manual meaningfully faster), and OP tree costs/branch depth.

## §11 — The Living Hall (Compose stage redesign, 2026-06-24, Vince-locked)
The Compose stage becomes a hall that grows grander as you rise, and conducting makes the whole room swell.
The grand view is the *canvas*; Crescendo *animates* it. Decisions:

> **STAGE-GROWTH VISION (Vince-locked 2026-06-24): the stage is a growing production.** Each prestige LAYER
> adds a visible performer section to the stage — orchestra (L1) → +recording console (L2) → +touring
> ensemble / second orchestra (L3 Repertoire) → +soloists/choir (later). The stage fills downward/around as
> you ascend; by the endgame it's a packed production. "Grows grander" made FUNCTIONAL, not just lighting.
> Three vertical zones: **Orchestra (buy)** · **Podium (conduct)** · **Reach (records→Platinum now; future
> ensembles later)**. NEAR-TERM: surface the L2 **Records→Platinum** meter as a "now selling…" ticker + a
> platinum progress bar along the BOTTOM of the stage (currently buried in the Opus tab) so the L2 breakthrough
> is felt live on-stage.

- **Growth = punctuated PULL-BACK reveals at era-firsts.** The "camera" pulls back (orchestra scales down into
  a larger revealed hall) at the milestones that matter: **1st Encore** (intimate → warm gold hall), **1st
  Magnum Opus** (→ grand violet hall), **Grand Finale** (→ packed house). Each *later* Encore adds a small
  accent (a riser fills, a touch more audience). Pairs with the Encore gold-bloom moment. Driven by the existing
  stepped `getLiveliness` eras.
- **Hall populates with (all four):** tiered **risers/seating** (quartet → full ensemble), a filling **audience**
  (packed by Finale), **grand architecture** (organ pipes / proscenium / back wall), and **overhead light +
  atmospheric depth** (chandeliers, haze, god-rays). Recolors per era (gold → violet → blaze).
- **Conductor's podium, front-center.** Hold **Conduct** (button on the podium, or **Space**) → a vertical
  **swell-meter fills like a column of light** to the ceiling; the whole hall swells (spotlight blazes, notes
  rush, a gold wave rolls across the sections), slow decay on release. Tapping sections to buy stays free
  (separate control — no conflict). **Dormant/teased pre-L2** ("the baton awaits"); activates at first MO.
- **Assets:** a FEW generated backdrop images (one per era), recolored/overlaid; pods stay procedural on top.
  Camera pull-back = cross-fade + scale between era backdrops. (Cost-gated — see below.)
- **Build order:** L1-visible stage NOW (grander growing hall + era reveals + dormant podium); the live
  Crescendo swell animation is wired with the L2 tick-pass (Conduct is L2-locked). Structure built procedurally
  first, generated backdrops dropped in after cost sign-off.
