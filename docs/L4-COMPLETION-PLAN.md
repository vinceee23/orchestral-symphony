# L4+ Build Plan — Finish Signature, Sequence the Ladder

**Author's TL;DR:** L4 is **~95% built**, not unbuilt. The real work is *wiring the reveal,
tuning, and proving the verb by playtest* — which is the LOCKED gate for L5+. So this plan scopes the
**executable-now** effort to **finishing L4**, and treats L5→L9 as a **sequential post-launch roadmap.**
That maps cleanly onto the [distribution model](MONETIZATION.md): **L0–L4 = Steam/mobile 1.0; L5–L9 = free
content updates** (which also feed Steam's "recent updates" visibility).

Assessment basis: full code+doc sweep 2026-07-02 (see summary in that session). Key spec: `docs/build-specs/L4-signature.md`; ladder: `docs/LADDER-MECHANICS.md`, `docs/bible/04-forward-design-L4-L9.md`.

---

## 0. The reframe (what's actually true)

| Layer | Design | Code | Verdict |
|---|---|---|---|
| **L4 Signature** | LOCKED (fixed 1.0 budget, 5 domains, identity record) | **~95% wired** — mechanics, `SignaturePage`, `applyReset('signature')`, M9 `domain` channel, pantheon visuals, `L4-signature.test.ts` | **FINISH + PROVE**, don't build |
| L5 Virtuoso | LOCKED, build-spec ready | 0% | Blocked: "prove L4 first" (spec REFRESH:12) |
| L6 Canon | Designed (bible only) | 0% | Later, sequential |
| L7 Grand Finale | LOCKED, build-spec ready | **Placeholder ACTIVE** (old repeatable finale) | Replace-not-extend; after L5/L6 |
| L8 Redemption | Designed (bible only) | 0% | Later, sequential |
| L9 The gods | LOCKED, build-spec ready | 0% | Hard-couples to L4 `peakDomainAlignment` |

**The load-bearing find:** `signatureUnlocked` is set to `true` **nowhere in production** — only in tests.
`worldTour.ts:357-358` deliberately completes the circuit *without* revealing L4 (that's the trial
capstone). So turning L4 on = wiring that reveal behind the full-game flag. `L4_UNLOCKED`
(`constants.ts:4`, currently a dead `false`) is the intended build gate.

---

## PART 1 — L4 COMPLETION (execute now)

### Task 1 — Wire the unlock reveal *(the deliberate seam)*
- Repurpose `L4_UNLOCKED` as the **FULL_GAME build flag** (web trial = `false`, mobile/Steam = `true`).
- In `buildVenueGraduationPatch` (`worldTour.ts:344`), when `currentVenue >= LAST_VENUE_ID`:
  - trial (`L4_UNLOCKED` false): keep current behavior → `{ circuitComplete: true }` only.
  - full (`L4_UNLOCKED` true): also `signatureUnlocked: true` → **reveal L4.**
  - (The graduation patch is built from a `Pick<>`; thread the flag in, or read the const directly.)
- Fire the L4 reveal **story beat** (`STORY-SPEC.md:86` has the `signature` beat) + reveal the Signature sidebar tab (already gated `L4_UNLOCKED && signatureUnlocked` in `AppShell.tsx:39`, `Sidebar.tsx:45`).
- **Acceptance:** in a full build, finishing the L3 circuit reveals Signature; in the trial build it does not. Add a test for both.

### Task 2 — De-orphan + cleanup
- `L4_UNLOCKED` is no longer dead once Task 1 uses it — document it as the build gate.
- Audit `breakPerks.test.ts:50` — assert against `state.signatureUnlocked`, not the const.
- Verify all gate sites still read `L4_UNLOCKED && signatureUnlocked` consistently (`AppShell.tsx:39`, `Sidebar.tsx:45`, `hints.ts:167,196`, `SignaturePage.tsx:52,66-67,88`).

### Task 3 — Tune the magnitudes (the real design work)
All marked `TBD-tune (sim/playtest)`; values exist but are provisional:
- `signature.ts:21-32` — efficiency curve (`_LOG_SCALE`, `_LOG_MULT`, `_CAP`), the five domain `*_MAX` (Percussion→tempo, Strings→crescendo, Brass→output, Woodwinds→cost, Harmony→synergy), `HARMONY_EVENNESS_EXPONENT`, `MIN_SIGNATURE_COST_MULT`.
- `multiplierRegistry.ts:31` — `domain` channel cap (currently 1.0; comment eyes a ×2.0 ceiling).
- **Method:** stand up an **L4 pacing sim** (mirror the existing `sim/*-pacing.test.ts`) asserting bands, then hand-playtest. The `L4-signature.test.ts` already exists for correctness; the sim is for *pacing*.

### Task 4 — Prove the verb *(the LOCKED gate for L5+)*
The design gate (spec REFRESH:12, `HARDENING-PLAN` D1–D6) is: **is domain allocation a genuinely
interesting, distinct decision** that changes how you play the next run? Concretely, tune until:
- **No dominant lever.** All-in on any single domain must NOT strictly beat a considered split. Balance so playstyles diverge: Percussion→idle, Strings→active-conduct, Woodwinds→buy-heavy, Brass→raw push, Harmony→broad/balanced.
- **Harmony is a real counterweight.** The evenness exponent should make generalization competitive with specialization, not a trap.
- **Specialization has a felt identity.** `getSignatureIdentity` ("your sound") should read differently across allocations — and remember `peakDomainAlignment` is a permanent record that later makes your most-embodied domain your hardest **L9** fight (the single hardest cross-layer coupling — `bible/04:436-445`). Don't finalize as if L4 is isolated.
- **Verdict:** if allocation feels irrelevant or has one obvious answer, re-tune before touching L5.

### Task 5 — Gate + ship-ready
- Self-review (correctness + edge cases — **Codex is rate-limited, so I do this**).
- `npm run build` + `npm test` (read REAL exit codes) + the new L4 pacing sim in-band.
- Commit on `feat/layer4`. L4 now ships the moment a full (mobile/Steam) build is packaged.

---

## PART 2 — L5→L9 ROADMAP (sequential, each gated on the prior)

Build order is LOCKED sequential (`LADDER-MECHANICS.md:3-5`). Each is its own effort; do NOT start until the previous layer is proven by playtest.

1. **L5 Virtuoso** — build-spec ready (`L5-virtuoso.md`). Mastery = consistency/control; grade+streak; reward is a permanent production **floor** via the M9 registry (no new global ×). New persistent state: `completedTakeCount`, `masteryRank`, `bestTakeArea`. Unlock: first Signature ascension.
2. **L6 Canon** — bible-only design (Palimpsest, `never`-tier accrual). Needs a build-spec first.
3. **L7 Grand Finale** — build-spec ready (`L7-grand-finale.md`), **but there's an active placeholder to replace, not extend:** `performGrandFinale` (`gameStore.ts:930`) is the OLD repeatable "infinity prestige." Building real L7 (a *one-time*, commit-voices, scored-by-timing event) requires **removing `getFinaleMultiplier` from the funnel** (`formulas.ts:180`, applied `:233`) and re-tagging era-6 theme / liveliness / 3 achievements from `finalePoints`→`grandFinalePerformed`. Do NOT let this rot — note it now.
4. **L8 Redemption** — bible-only (3 conditioned re-climbs). Needs a build-spec.
5. **L9 The gods** — build-spec ready (`L9-the-gods.md`). Reactive boss-FSM, passive-completable, **hard-couples to L4** via the permanent `peakDomainAlignment` record. Build ONE god end-to-end (recommend Timpana), then template. Cannot start until L4 is shipped and the record is confirmed permanent.

Foundations already in place for all of the above: the **M9 multiplier registry** (per-channel caps, no new global ×) and **`applyReset`** are built and wired — L4 is their first consumer.

---

## PART 3 — Strategic sequencing (ties to distribution)

- **Steam/mobile 1.0 = L0–L4.** Finishing L4 gives a sellable full game; you don't need all 9 layers to launch.
- **L5–L9 = post-launch free content updates**, built sequentially. This is the proven incremental-genre model (Melvor, Antimatter Dimensions) and it *feeds* Steam visibility (recent-updates, re-reviews) instead of delaying launch by a year.
- **`L4_UNLOCKED` = the FULL_GAME flag** in the 2-flag build matrix (web off / mobile on+ads / Steam on). Task 1 makes it real.

---

## Decisions — LOCKED 2026-07-02 (Vince)

1. **Scope:** Finish L4 only. L5 stays blocked until L4 is proven by playtest.
2. **Release shape:** L0–L4 = Steam/mobile 1.0; L5–L9 = post-launch free content updates.
3. **Tuning philosophy:** Distinct viable builds — specialization matters; allocation is a real decision.
4. **Reveal moment:** Instantly on L3 circuit completion (no extra gate).

## Progress

- ✅ **Task 1 (reveal wiring)** — `worldTour.ts` sets `signatureUnlocked` on circuit capstone when `L4_UNLOCKED`; added a full-game `circuit_complete` story beat (trial keeps `trial_complete`); `buildVenueGraduationPatch` took a `fullGame = L4_UNLOCKED` param for testability. Dormant while the flag is false → trial unchanged.
- ✅ **Task 2 (cleanup)** — documented `L4_UNLOCKED` as the FULL_GAME gate (no test referenced it as dead). Gate sites verified consistent.
- ✅ **Tests** — 3 new: trial-safety (no L4 leak), full-game reveal, mid-ladder advance.
- ✅ **Task 3 (tune magnitudes)** — ALREADY DONE + sim-proven pre-session. `sim/l4-signature.test.ts` (in the gated suite, 10 tests) drives the real `calculateTick` across all 5 mono-builds + blend + a mix at signatureCounts [1,5,40] and asserts `DOMINANCE_BAND = 1.30` — the exact "diverse-but-viable" philosophy (decision 3). Also guards idle:active balance, overflow (M11), and no-op identity. The `TBD-tune` labels are conservative; the values were tuned (e.g. Percussion 0.08→0.07, 2026-06-29).
- ⏳ **Task 4 (prove the verb — HUMAN playtest)** — the only remaining gate. Sim says builds are mathematically diverse-but-viable; Vince must confirm the *feel* (is the allocation an interesting decision?). Requires a full build (`L4_UNLOCKED` true) locally. Optional: a DevPanel shortcut to jump into L4 without grinding L0–L3.
- ✅ **Task 5 (gate)** — build + 109 tests + L4 sim all green. L4 ships the moment a full build is packaged.

**Net: L4 is functionally finished and sim-validated. Only the human feel-playtest remains.**
