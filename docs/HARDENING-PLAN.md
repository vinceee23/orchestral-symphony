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

## ⭐ SESSION SCOPE + WORKLIST (2026-06-28) — LOCKED
**This session = L0–L3 only.** L4+ is handled by FUTURE FRESH SESSIONS (bulkier, needs more context) —
armed by `docs/bible/`. L0 = the cold-open + era-0 onboarding (pre-Encore base, intro, light tutorial).
Decisions: **M9 + M11 refactors = THIS session** (hand the L4 session a clean registry); **venue art =
deferred** (document the approach in the bible, do in a later visual pass); **balancing = a FULL sim-tuned
pass.**

**VISION + TARGETS (LOCKED, Vince's words — anchor everything to these):**
- **North-star / player fantasy:** a **MYTHIC RISE → TRANSCENDENCE** — a mortal musician ascends from a
  single note to godhood through mastery, a fall, and a comeback. **The story arc is the point; idle is the
  vehicle.**
- **Target length/feel:** **AD-style long-haul** (~100–200h+ engaged + idle, **idle-FIRST** — works AFK,
  active amplifies; ~22h to Platinum).
- **L4–L9 build-spec gaps:** **mark TBD-decide-at-build** — do NOT invent numbers/specifics blind; the
  fresh session + Vince resolve them with sim/playtest data.
- **Balance finality:** sim-tune L0–L3 as "final for now"; **fine feel/pacing tuning is deferred to fresh
  sessions post-playtest** (documented per Vince).
- **how-to-work-here:** Vince approved the encoded method (gate-everything, tight-spec delegation,
  verify-don't-blind-fix, lock-plans-first, tap-batch decisions, no mid-build pivots, account/data policy). Ordered worklist (one Cursor code-task at a time on the tree):

1. **B5** save-migration refactor *(in progress)* → gate + commit.
2. **M9** multiplier-registry + declarative resets (after B5 — both touch gameStore/formulas).
3. **M11** Decimal-overflow guards (NaN/Infinity throw in calculateTick) — fold with M9 or right after.
4. **Capstone exploit fix** + build the **§2.8 challenge sim** → tune challenge magnitudes + autoMO cost.
5. **L3 re-climb soft-floor** + the "profitable-MO" auto-trigger (kill the 46→21→2 collapse).
6. **Onboarding (L0–L3):** cold-open light-tutorial (first-button highlight); gate the challenge panel until
   1–2 venues graduate; tour-start explainer.
7. **Challenge-reward readouts** (UI — they're opaque) + tiny-tempo-reward late-game check.
8. **Narrative copy micro-tweaks:** pull L5 "(We were never the living)" back to a fingerprint; go
   narrator-silent at the L7 Finale (fix the fake-credits leak). (Copy only — beats.ts.)
9. **Full sim-tuned balance pass:** re-run all sims (era/human/l3/challenge-pacing), dial the L0–L3 curve.
10. **Documentation:** review + commit `docs/bible/` (running); document the venue-art approach; reconcile
    any doc/code divergences found.
11. **Final gate** (tsc + full suite + build) → merge `feat/layer3` → master → deploy.

## REVIEW-DRIVEN STATUS + LOCKED CALLS (2026-06-28)
**Two candid outside reviewers (appeal + balance) both verdict: a good game worth building; L0–L3
fundamentally healthy, just needs tuning.** Verified strengths: idle-first economy (24h buffer ratio 1.00,
hands-free Platinum, active ≈1.4–1.75× idle), the cold-open, L3 World Tour, the axis-ladder design. The
uncapped funnel is the lone STRUCTURAL risk — correctly deferred behind M9 (sequenced before L4).
- **Done:** B1 reconcile · B5 save-migration · the bible (`docs/bible/`).
- **Locked calls:** Platinum target = **~16h** (realistic optimal; old 22h was a suboptimal-buy artifact +
  pushing back to 22h would deepen the mid-L2 coast). Mid-L2 coast fix = **reward-drip the SW-OOM gap**
  (preserves the post-Platinum auto-MO design). Early-loop = **BOTH** more early narrative beats/fingerprints
  AND one early active decision/verb.
- **Worklist ADDITIONS (from the reviews):** (a) wire the missing per-clear **AP payout** (challenges grant
  0 AP today); (b) **level the challenge difficulty spread** (1–17 min) via the §2.8 sim; (c) **mid-L2
  reward-drip**; (d) **more early narrative beats**; (e) **an early active verb**; (f) set Platinum ~16h in
  code/docs; (g) bake **"mechanic = story beat"** + **"L4 = the differentiator; public demo = L1–L4, not
  L1–L3"** into the bible + build-specs.
- **For the L4 fresh session (no action here):** L1–L3 alone reads as "AD reskinned" — the differentiation
  IS L4+; L4 is the priority first build + the demo floor.

## SEQUENCE
1. **B1** reconcile (docs + code + the one 9-layer reset matrix) + **B4** milestone-cap contract.
2. **B2** lock Recognition/Palimpsest forms + the L8 sim invariant; **B3** permanent-power budget/channels.
3. **B5** save-migration refactor + **M9** multiplier-registry + declarative resets + **M11** Decimal guards.
4. Fix the 2 built-code bugs (capstone gate, performTour) + build the §2.8 challenge sim.
5. **THEN** build L4 (re-pitched fixed-budget) → L5 → L6 → re-spec L9 as a boss-FSM, one god first.
