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

## 3. The layer map — 9 prestige layers, each a distinct verb

Telescoping scope mirrors a musician's ascent from busker to the cosmos. **Each layer resets everything
below but grants a currency that boosts everything below** (fractal nesting). The iron rule with this
many layers: **every layer is a different MECHANIC, never just a bigger multiplier.** Each verb below is
a proven archetype from the research (AD, Realm Grinder, Synergism, NGU, Trimps, Paperclips).

| # | Layer (music frame) | **Distinct verb (the new toy)** | Archetype borrowed | Cadence |
|---|---------------------|----------------------------------|--------------------|---------|
| 0 | **Compose** — the performance | Buy 7 tiers + tempo by hand | base loop | sec–min |
| 1 | **Encore** — take a bow, play again | **Pure ×production multiplier.** Teaches the prestige loop. | Clicker Heroes souls | hours → 1–2 days |
| 2 | **Magnum Opus** — record the album | **×tempo + the first autobuyers** (earned, slow). | AD tickspeed | days |
| 3 | **Repertoire** — go on tour | **Automation milestone ladder** — spend currency on permanent QoL/automation you keep *forever*. | AD Eternity Milestones | days → 1 wk |
| 4 | **Genre** — define a style | **Choice/build tree** — pick a Genre (Classical/Jazz/Electronic/Film) each reset; reshapes bonuses, respeccable. | Realm Grinder factions / AD Time Studies | 1–2 wks |
| 5 | **Virtuoso** — master the craft | **Voluntary-difficulty runs** — opt into constraints ("perform blindfolded") for permanent stacking multipliers. | AD Eternity Challenges / Synergism Corruptions | 2–4 wks |
| 6 | **Canon** — a body of work | **Collectible loadout** — earn randomized **Compositions** (equippable, leveled, rarity) and mix-and-match a build. | AD Glyphs / Synergism Talismans | weeks |
| 7 | **Zeitgeist** — a cultural movement | **Parallel multi-resource economy** — new bars (Influence / Inspiration / Resonance) feeding separate ratchets you juggle. | NGU Idle | weeks → month |
| 8 | **Conservatory** — teach the world | **Automator scripting** — write a real script that plays the whole game beneath you. | AD Automator | month+ |
| 9 | **Music of the Spheres** — the cosmic finale | **Finite narrative act** — rules reinvent, a true ending (or "break the game" endgame systems). | Universal Paperclips / AD Celestials | endgame |

**Why 9 distinct verbs and not 9 multipliers:** research is blunt — layers that are mechanically
identical with more zeroes are the deepest anti-pattern. Each layer here changes *how you play*: from
buying, to automating, to choosing builds, to opting into difficulty, to crafting loadouts, to juggling
economies, to programming, to a finite ending. That's what sustains months without becoming a spreadsheet.

**Build incrementally — 6 is the "complete core", 7–9 is deep expansion.** We finish one layer fully
before the next (your layer-by-layer plan). Layers 1–6 form a satisfying complete game; 7–9 extend it
for the hardcore. So 9 is the *roadmap ceiling*, not a commitment to build all nine before shipping.

**Naming:** existing Encore / Magnum Opus survive as layers 1–2. The old "Grand Finale" concept moves to
the true ending (layer 9, "Music of the Spheres"); the deep middle gets the new names above.

### Cliffhangers (mechanical wall + narrative teaser, per your call)
Each layer climaxes on a **hard wall you provably can't beat with this layer's tools**, paired with a
**music-themed story beat** that frames the next layer. No "???" UI element — the teaser is narrative.

The pattern, per layer: *diminishing returns set in → a themed hard wall → a one-line teaser reframing
the next verb.* Examples:
- **End of L1 (Encore):** Applause gains plateau; the hall hits a **volume ceiling**. *"A performance
  fades the moment it ends. What if you could capture it forever?"* → **Magnum Opus** (recording).
- **End of L2 (Magnum Opus):** max tempo + autobuyers still stall at a **mastering wall**. *"One album is
  a moment. A career is a tour."* → **Repertoire**.
- **End of L3 (Repertoire):** automation maxed but the same setlist every night. *"You've mastered the
  songs. Now write the rulebook."* → **Genre**.
- …each subsequent wall hands off to the next verb the same way, up to the finite L9 ending.

---

## 4. Automation philosophy

**Earned, ratcheted, phased** — the AD Eternity-Milestones model, which is also the spine of your
"phased playstyle" choice.

- **Phase A (Layer 0–1, manual):** buy everything by hand. Autobuyers appear *late* in Layer 1 as the
  first reward — and start *slow* (long interval, buy-1 only). You earn relief from tedium you've mastered.
- **Phase B (Layer 2):** the Automation ladder proper. Milestone-gated upgrades, in this order per autobuyer:
  **unlock → bulk (1 / 10 / max) → speed (interval down) → conditional (auto-prestige when reward ≥ ×N).**
- **Permanent ratchet:** once an automation milestone is earned, it is **kept on every future run forever.**
  You never re-grind convenience. This is the single most-copied idea in the genre and the reason resets
  stop feeling like punishment.
- **Late game (Layer 2–3):** the entire 7-tier + Encore loop runs itself; your attention moves up to
  tempo routing, then genre/build decisions. By Layer 3 you tune a self-running machine, not operate it.

Rule of thumb baked in: **automate an action ~one prestige cycle after the player first did it manually
and repeatedly.** Never sooner (kills engagement), never much later (tedium → churn).

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

**Scope:** base 7-tier game + Tempo + a fully-developed, repeatable **Encore** prestige + Layer-1
autobuyers + Layer-1 achievements/challenges + the cliffhanger wall & teaser into Magnum Opus.
"Done" = the checklist in §8 is all green.

**The Encore loop:**
1. Player builds tiers + tempo, hits the natural cost stall.
2. At a threshold (~30 Harmonies / Tier 5, as currently), the **Encore** button lights up, showing
   projected Applause gain and the multiplier it'll grant.
3. Encore resets tiers/tempo/SW, grants Applause (√ formula), each point ×prod permanently.
4. Next run re-clears the early tiers fast → visible "I'm so much stronger" payoff.
5. **Encore upgrade shop** (Applause sink): a small tree of permanent buys — e.g. *Sight-Reading*
   (start each run with N free Tier-1), *Perfect Pitch* (×prod), *Metronome* (cheaper tempo), and the
   **first autobuyer unlocks** (slow, buy-1) as the late Layer-1 reward.
6. After enough Encores, Applause gains plateau → **Layer-1 wall + teaser** → Magnum Opus unlocks.

**Concrete numbers to start tuning from** (all adjustable):
- Encore unlock: 30 Harmonies (keep).
- `EP_gain = floor(sqrt(peakSW / 1e8))` — placeholder; tune `threshold` so first Encore ≈ 20–40 min in,
  and the optimal-reset multiple (~+100%) recurs on a satisfying cadence.
- Each EP: ×1.5 to ×2 all production (start at ×2, watch for runaway; √ gain should contain it).
- Encore shop: 5–8 nodes, costs in EP, including 2–3 autobuyer unlocks gated behind several Encores.
- First autobuyer: unlock interval ~2s, buy-1 only; upgradable later (in Layer 2).

**Open balance question (needs a playtest pass):** exact `threshold`/`k` for EP gain, and whether EP
reward is ×1.5 or ×2 per point. We'll tune by playing, not by spreadsheet alone.

---

## 8. Build order & "done" checklist for Layer 1

Build sequence (rework existing code against this spec; current Encore code is a starting point, not law):

1. **Base loop balance pass** — uncap buy-10 milestone; verify cost/production curves feel right; first stall lands in-session.
2. **Encore rework** — √-based EP gain, max/per-run; ×prod reward; projected-gain + "reset now?" UI.
3. **Encore upgrade shop** — the Applause sink tree (5–8 nodes), incl. autobuyer unlocks.
4. **Layer-1 autobuyers** — earned late, slow, buy-1; milestone-ratcheted (kept forever).
5. **Layer-1 achievements & challenges** — scoped to the Encore epoch only.
6. **Cliffhanger** — the volume-ceiling wall + narrative teaser; Magnum Opus shown as "coming next" (locked, but framed narratively, not as a bare "???").
7. **Polish** — numbers formatting, soundwave/tempo feedback, save/load integrity across Encores.

**Layer 1 is "done" when:**
- [ ] Buy-10 breakpoints feel like a rhythm; no production cap kills the chase.
- [ ] First Encore reachable in session 1–2; each Encore visibly trivializes early tiers.
- [ ] EP gain is √-based, max/per-run; "reset now?" indicator fires at ~+50–200% gain.
- [ ] Encore upgrade shop gives a real shopping list, including earned autobuyers.
- [ ] Autobuyers are earned late, ratchet permanently, and start slow.
- [ ] Achievements/challenges scoped to Layer 1 exist and fire.
- [ ] The cliffhanger wall + narrative teaser lands and unlocks Magnum Opus.
- [ ] Saves survive Encores and a reload without corruption.

---

## 9. Decisions (locked 2026-06-24)

- **Layer map: 9 layers, each a distinct verb** (see §3). 1–6 = complete core, 7–9 = deep expansion.
  Build one layer fully before the next.
- The earlier "Genre choice + difficulty dial" call is now cleanly split into **L4 Genre** (choice tree)
  and **L5 Virtuoso** (voluntary-difficulty dial) — two distinct layers instead of one.
- **Build order: Layer 1 only, now.** Git initialized as a safety net before reworking.

Still to settle by playtest (not blockers):
- Whether to ship at L6 or push through L9 — decide when we reach L6.
- Currency flavor names per layer — decide as we build each.
- EP reward per point — ×1.5 vs ×2 (tune by playtest).
