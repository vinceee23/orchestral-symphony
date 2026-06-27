# Pre-Build Hardening Plan — fix the spec/code before building L4+

Status: **LOCKED 2026-06-28** after a 7-lens ultracode red-team + an independent Codex pass (which
**corroborated** the findings). Verdict: **L1–L3 (built) are sound; the back third (L7–L9), the permanence
stack, and the 9-layer reset matrix have real holes.** Caught before building L4 — fix these first.
This doc's revisions **supersede** the matching `LADDER-MECHANICS.md` layer sections; fold them in when building.

## LOCKED DECISIONS (from the red-team question batch)
1. **Harden first** — do the reconcile + architecture refactors before any L4 code.
2. **Constraint-trio → 3 distinct modalities:** L3 = static single-constraint runs (keep). **L8 = race a
   GROWING debuff you buy down with Recognition** (axis: outrun a closing debuff, not beat a fixed handicap).
   **L9 = REACTIVE/adaptive bosses** — the warp changes phase in response to your dominant tier/domain (a
   duel: read-and-respond), categorically unlike L3/L8 solitaire optimization.
3. **L7 → score TIMING/ORDER (the decrescendo sequence)**, NOT magnitude-evenness. This escapes L4's
   allocation-math collision AND kills the harmonic-mean sandbagging (no magnitude blend to game). The layer
   leans on *when* you silence each voice (temporal), not *how much* each contributes.
4. **L5 idle fix:** the idle band's **HEIGHT/multiplier decays to the floor** (not just width widens) — AFK
   accrues only baseline rate; cap active:idle ≈1.5–2×; tie the headline Mastery reward to **completed-Take
   count** (idle-accruable), band-tightness only shaves time. Conduct-as-bonus shape. **Sim 24h-AFK vs
   active and assert the ratio sits in window.**

## BLOCKERS — do before L4
- **B1. Reconcile to 9 layers everywhere.** `LAYER3-SPEC.md` §1/§3.5/§6.5 is still the dead **6-layer**
  ladder (Grand Finale = L6 = end). Add a deprecation banner (RECONCILE-style). Re-tag
  `finalePoints`/`performGrandFinale` as **L7, one-time** (never a repeatable prestige). Build **ONE
  authoritative 9-layer reset matrix** — a column per event (each layer's reset + Platinum + the L8 fall +
  L9 wins), every field tagged. Re-map era tiers (7→9) or document eras 7/8/9 as L7/L8/L9 visual states.
- **B2. Permanence runaway (locked forms):** **Recognition = additive, capped** (`1 + r·comebacks`, capped
  at 3), **does NOT feed L9**. **Palimpsest top-snapshot = SUBLINEAR** in peak (log/root, like
  `getEncoreGain`'s `^0.03`), **snapshot EXCLUDES the Canon bonus** (no self-feed loop), explicit
  `MULT_CAP`-style ceiling on `(top + Σghosts)`, bounded max-effective-depth. **L8 sim invariant (LOCKED):**
  `comeback_time[1] > [2] > [3]` AND each stays above a ~30–60s floor (never instant, never a wall).
- **B3. Permanent-multiplier budget (Codex blocker):** production is ONE multiplicative funnel (achievements
  ~×3.57, Acclaim ≤×49, challenges ×5.6–11.2 already). L4/L5/L6/L8 must NOT all become global-prod ×. Give
  later layers **separate channels / hard caps / scoped effects** (see M4: Recognition buys speed/time;
  Palimpsest pays structurally-different unlock-slots/floors).
- **B4. `MILESTONE_PROD_CAP = Infinity` contradicts its docstring** (constants.ts vs formulas.ts "capped at
  4"). It's the uncapped exponential that makes B2 reachable. Fix the code/contract disagreement: cap it,
  OR keep uncapped but force L6's snapshot sublinear in it. Decide + align now.
- **B5. Save-migration refactor (do while only L1–L3 exist):** replace the hand-maintained `undefined`-check
  list + the 45-field offline-replay literal with a numeric `version` + ordered `migrations[]` of pure
  `(old)=>new` fns + a table-driven `reviveDecimals(state, DECIMAL_KEYS)`. Otherwise every L4–L9 Decimal
  field risks a silent desync / load crash.

## ARCHITECTURE REFACTORS — cheap now, expensive later (do before L7)
- **M9. Multiplier registry + declarative resets.** Each layer contributes `{source, value, channel,
  appliesToProduction}` to an array the tick reduces + UI reads (challenges/bosses filter by source tag
  instead of callers hand-zeroing fields). Tag every field with a `resetTier`
  (run/encore/opus/tour/signature/finale/fall/never) in ONE table = the §3.5 matrix as source of truth;
  every prestige action becomes `applyReset(state, tier)`. Fixes `performGrandFinale` being out of sync.
- **M11. Decimal-overflow guards.** Anything that can exceed ~1e300 (L7 harmonic/sequence math, L6
  `top+Σghosts`, L9 goal-checks) must be Decimal end-to-end (break_infinity has log10/pow/recip). Add a
  dev-build NaN/Infinity guard in `calculateTick` that THROWS on a non-finite multiplier.

## DESIGN REVISIONS (supersede LADDER-MECHANICS sections)
- **L4:** keep the allocation pie **FIXED** (don't let "budget grows" become free late stacking → Harmony+all
  becomes objectively correct). Growth, if any, unlocks **efficiency/slots with hard diminishing returns**,
  not more raw pie. Signature **allocation persists as the identity record** (drives the L9 mirror) even
  across the fall; the live production effect resets with the layer.
- **L5:** per decision 4 above (height-decay idle, ratio cap, Take-count reward, grow-smoothly definition,
  render the corridor UI). Offline Take = accrue floor only (analytic, not 86k chunked iterations).
- **L7:** per decision 3 (timing/decrescendo-sequence axis). Commits **previewed + staged** (irreversible —
  show projected score before commit). Drains **live per-cycle channels only**; the **eternal Palimpsest is
  untouched** (resolves the M8 "drain-to-zero vs eternal" contradiction).
- **L8:** per decision 2 (growing debuff). The fall must be **explicit + previewed + framed as a postgame
  campaign**, never a surprise punishment after fake credits. Recognition = the **gods' attention** (persists,
  consistent with "it was ours"); mortal fame resets each comeback (so "the world forgot you" stays true).
- **L9:** per decision 2 (reactive bosses) — spec as its own **boss-FSM module** (`Boss` interface:
  applyWarp→modifiers, phase, tick→{progress,phaseAdvance}, isDefeated), reusing `ChallengeModifiers` only as
  the warp output type. **Budget it as the single largest build; build ONE god end-to-end first.** Every god
  goal **reachable by passive accrual** (warp changes the MATH, never demands timed input — accessibility).
  Signature-mirror = "hardest" means **longest, never requires the opposite build** (no soft-lock); allow a
  free L9-scoped Signature re-allocation between fights.

## BUILT-CODE BUGS (Codex found — fix soon; the capstone one is LIVE on master)
- **Capstone exploit:** `getChallengeMultipliers` sums only *completed* challenge times + `ch_unplugged`
  unlocks on peak-SW (not all-12-cleared) → skipping challenges contributes 0 time, gaming the speed metric.
  **Fix:** gate the capstone on all 12 clears, OR count uncleared as floor-time penalties. Build the
  still-LOCKED §2.8 challenge sim before shipping magnitudes; fold the 4 flat clears into ONE additive bucket
  + capstone as a separate capped factor.
- ~~`performTour` resets `lifetimeEncorePoints`~~ — **VERIFIED NOT A BUG (2026-06-28).** `lifetimeEncorePoints`
  IS the Encore production mult (`getEncoreMultiplier`) and resets every Magnum Opus by design (gameStore:789),
  so resetting it on a tour is consistent/intentional (it's MO-tier, not permanent — the name misleads). The
  old §3.5 "L3 keeps it" row was wrong; the reset matrix is corrected. **No code change.** (Codex misread it
  without full code context — a reminder to verify, not blind-fix.)

## MINORS (fold in during the work) — see the red-team output for the full list
L5 "(We were never the living)" reveals too early (pull back to a fingerprint); fake-credits leak (go
narrator-silent at the Finale); L6 add a 2nd lever (choose what a Work snapshots) + show the eternal delta on
the button; per-layer **mechanic cards** to teach each new verb (narrator stays pure); challenge-reward
opacity (concrete readouts); L3 re-climb soft-floor (already 46→21→2 min collapse); L3 onboarding (gate the
challenge panel until 1–2 venues graduate); accessibility (toggle-conduct, no hold-only paths).

## SEQUENCE
1. **B1** reconcile (docs + code + the one 9-layer reset matrix) + **B4** milestone-cap contract.
2. **B2** lock Recognition/Palimpsest forms + the L8 sim invariant; **B3** permanent-power budget/channels.
3. **B5** save-migration refactor + **M9** multiplier-registry + declarative resets + **M11** Decimal guards.
4. Fix the 2 built-code bugs (capstone gate, performTour) + build the §2.8 challenge sim.
5. **THEN** build L4 (re-pitched fixed-budget) → L5 → L6 → re-spec L9 as a boss-FSM, one god first.
