# L7 — Grand Finale: implementation-ready build-spec ("The Final Performance")

> **Status:** build-spec, written for a fresh session to BUILD with minimal re-design.
> **Layer axis:** Convergence. **Story beat:** the pure mortal triumph / the apparent end.
> **Source of truth this spec implements:** `docs/LADDER-MECHANICS.md:118-134` (L7 section) as **revised by**
> `docs/HARDENING-PLAN.md` decision 3 + L7 row (`:33`, `:62-64`) — **the scored axis is TIMING / the
> decrescendo SEQUENCE, NOT magnitude harmonic-mean.** Cross-checked against live code via `docs/bible/04-forward-design-L4-L9.md` §6/§8.
> **Build order:** L7 is built AFTER L4, L5, L6. It **reads** L6 Canon's Palimpsest reservoir and L4's Signature
> record exists by then; do not start L7 before L6 ships. See **Dependencies**.
>
> **GAP POLICY:** every undecided magnitude is tagged **`TBD — decide-at-build (sim/playtest)`**. Do NOT invent numbers.

---

## 1. Overview — the axis + the story beat it embodies

**The axis (LOCKED): Convergence — reward EVENNESS *expressed through TIMING*, not magnitude.** L7 inverts the
whole game's "maximize one number" instinct. It is a **ONE-TIME** event, not a repeatable prestige
(`LADDER-MECHANICS.md:32`, matrix row `finalePoints / performGrandFinale → one-time`).

**The mechanic in one paragraph.** Each layer L1–L6 is a **voice** on a final mixing board, each holding a
**stockpile** (its current live output / banked reserve). You **commit (silence) the voices one at a time** —
committing a voice **freezes its output and drains its stockpile into a single rising Performance meter**. The
empire goes silent voice by voice. A single **decrescendo / tempo knob** shapes the *pour* of each commit
(loud-and-short vs slow-quiet-and-higher). **The score is the SEQUENCE and TIMING of the commits + how each pour
is shaped** — *not* the raw magnitude blend. The empire fades to **zero**, then a **Standing Ovation + fake
credits** play, and a faint "applause still ticking" **ember** carries into the **L8 fall**.

**Why this is the story beat made playable** (`STORY-SPEC.md:89-93`, `:62-66`; locked principle 1):
> "The greatest performance of your life. / The last note rings out, and fades. / This is the end of the song."

The *literal verb* — silencing each section of your orchestra in turn so the whole thing decrescendos to one
final dying note — **is** the beat. The triumph plays **clean: ZERO adversity** (no automation-stripping, no
re-climbs — that DNA is L8's; `LADDER-MECHANICS.md:129-131`, `HARDENING-PLAN.md` L7 row). The rug-pull is
deferred entirely to L8. **Build principle 2 (idle-first):** committing voices is a staged, untimed,
preview-then-confirm decision — it never demands APM (see §4.4 "idle-first").

**Why TIMING-not-magnitude (the red-team revision — LOCKED, `HARDENING-PLAN.md` decision 3):**
1. **Escapes the L4 collision.** A magnitude harmonic-mean over six channels is *the same allocation-math as
   L4's Signature budget* — two layers scoring "how evenly did you split a pie" is a reskin, violating the
   one-new-axis-per-layer rule. Scoring *when* you silence each voice is a genuinely new verb (temporal).
2. **Kills sandbagging.** A pure magnitude blend is gameable by deliberately under-building one channel to
   raise the harmonic mean's leverage. There is no magnitude to sandbag when the graded quantity is the
   *order and timing* of an irreversible sequence.

> **Naming caution (from `04-forward-design-L4-L9.md` §8.4):** the live code says `finale*` / "Layer 6". Treat
> all existing `finale*` identifiers as the **placeholder**, not the designed L7. This spec re-tags them.

---

## 2. New state — fields, types, resetTier, save-migration

All new fields go on `GameState` (`src/store/types.ts:38+`) and `createInitialState()`
(`src/store/initialState.ts`). Add a **save-migration entry** (§2.3) and register Decimal fields in
`TOP_LEVEL_DECIMAL_KEYS` (`src/store/saveMigration.ts:23`). resetTier per the **RESET MATRIX**
(`LADDER-MECHANICS.md:16-34`) — L7 is a `one-time` event, so its own records are `never` (they describe a
thing that happened once and must survive into L8/L9).

### 2.1 New fields

| Field | Type | Initial | resetTier | Notes |
|---|---|---|---|---|
| `grandFinalePerformed` | `boolean` | `false` | **never** | The one-time gate. Once `true`, the L7 commit flow is closed forever and the L8 "Come" path opens. Survives the Fall (it's why L8 exists). |
| `finaleScore` | `Decimal` | `0` | **never** | The final Performance-meter score the sequence produced (§3.3). Drives the **L7 permanence channel** (§3.4) + the L8 hand-off. Decimal (can exceed 1e308 — M11). |
| `finaleCommits` | `FinaleCommit[]` | `[]` | **never** | The committed-voice ledger (the *record of the sequence*): per voice `{ voiceId, order, committedStockpile: Decimal, decrescendo: number, tCommitMs: number }`. The replayable record of HOW the finale was performed; read by L8 ember + any future "best finale" display. |
| `finaleInProgress` | `boolean` | `false` | **run / never-relevant** | Transient UI state: the staging board is open and ≥1 voice committed but not all 6. Not persisted across the one-time boundary in a meaningful way; safe to treat as `never` (it's `false` after the single performance). |
| `finaleEmberSeenL8` | `boolean` | `false` | **never** | Set when the fake-credits → ember sequence has played; gates the L8 hand-off so the ember plays exactly once. |

`FinaleCommit` (add to `types.ts`):
```ts
export interface FinaleCommit {
  voiceId: VoiceId            // 'l1' | 'l2' | 'l3' | 'l4' | 'l5' | 'l6'
  order: number               // 1..6, the commit order (the scored sequence)
  committedStockpile: Decimal // the voice's stockpile at commit time (drained into the meter)
  decrescendo: number         // 0..1 knob value chosen for THIS pour (shapes loud-short ↔ slow-high)
  tCommitMs: number           // ms since finale start when this commit fired (timing component)
}
export type VoiceId = 'l1' | 'l2' | 'l3' | 'l4' | 'l5' | 'l6'
```

### 2.2 Re-tag the PLACEHOLDER fields (DO NOT silently break)

`finalePoints` / `finaleCount` (`initialState.ts:62-63`) are the **old repeatable L6=END infinity-prestige**
(`gameStore.ts:879-907` comment literally says "Prestige Layer 6"). They are **load-bearing** for three live
systems that must keep working (`04-forward-design-L4-L9.md` §8.1):

- **`getFinaleMultiplier(fp) = 10^fp`** — funnel factor #2 (`formulas.ts:180-182`, applied `:233`).
- **Era-6 theme** (`eraTheme.ts:15`: `finalePoints > 0 ? 6 : …`) + **liveliness** (`formulas.ts:190-198`).
- **3 achievements** keyed on `finaleCount` (`achievements.ts:740,749,2276`).

**Decision at build (LOCKED direction — `04-forward-design-L4-L9.md` §8.4):** the old repeatable
`finalePoints` multiplier has **no place in the L7 design**. Re-tag, do not repurpose as a repeatable:

1. **Retire `getFinaleMultiplier` from the production funnel.** Remove `.times(getFinaleMultiplier(...))` at
   `formulas.ts:233` and the `finalePoints` param from `getCoreProductionMultiplier`. The L7 permanence reward
   instead flows through the **M9 registry channel** (§3.4), NOT a raw `10^n` global ×. **This is the core
   anti-pile-on requirement (locked principle 3 / `HARDENING-PLAN.md` B3).**
2. **Keep `finalePoints`/`finaleCount` alive ONLY as era/liveliness/achievement signals**, OR migrate those
   three consumers to read the new `grandFinalePerformed` boolean. **Recommended:** since L7 is one-time,
   `finaleCount` can only ever be 0 or 1 going forward — migrate era-6 + liveliness + the 3 achievements to
   key off `grandFinalePerformed` and **delete `finalePoints`/`finaleCount`** in the save-migration. This is
   cleaner than carrying a now-meaningless repeatable counter. **Confirm at build** which consumers move.
   - Era: `eraTheme.ts:9-16` → `grandFinalePerformed ? 6 : …`.
   - Liveliness: `formulas.ts:190-192` → branch on `grandFinalePerformed`.
   - Achievements `:740,:749` ("Complete 2 Grand Finales") — **2 finales is now impossible**; re-author or
     retire the "2nd finale" achievement (it described the old repeatable). `:2276` ("MO in a new universe
     post-Finale") only makes sense in L8 now — **move to L8** or gate on `grandFinalePerformed`.
3. **Re-tag `performGrandFinale`** (`gameStore.ts:879`): delete the old repeatable body (the
   `GRAND_FINALE_SW_THRESHOLD` deep-reset that bumps `finalePoints++`) and replace with the one-time
   commit-drain event (§4). The old SW-threshold gate (`1.79e308`, `constants.ts:160`) is **not** the L7 gate —
   L7 gates on **L6 Canon existing + the unlock condition in §4.1**, not on a raw SW number.

> ⚠ **Reset-matrix bugs to fix while here** (`02-economy-formulas-resets.md` §6.4, items 2-4): the OLD
> `performGrandFinale` omitted `opusUpgrades`, `peakCrescendoMult`, `layer1WallReached` from its reset patch,
> so they leaked through. The NEW one-time event should **not** be doing a deep climb-reset at all (see §4.5) —
> committing voices freezes the empire; it does not hand you a fresh L1 climb. So these leaks disappear by
> construction. Verify no caller assumes the old deep-reset semantics.

### 2.3 Save-migration step

Bump `SAVE_SCHEMA_VERSION` to `2` (`src/store/saveSchema.ts:2`) and add a migration
(`saveMigration.ts:151`, `MIGRATIONS`):
```ts
2: (state) => {
  // L7 Grand Finale (one-time). Old repeatable finalePoints/finaleCount are retired.
  state.grandFinalePerformed = (state.finaleCount ?? 0) > 0   // honor any legacy finale as "performed"
  state.finaleScore = state.finaleScore ?? new Decimal(0)     // revived by TOP_LEVEL_DECIMAL_KEYS below
  state.finaleCommits = state.finaleCommits ?? []
  state.finaleInProgress = false
  state.finaleEmberSeenL8 = state.finaleEmberSeenL8 ?? false
  delete (state as Record<string, unknown>).finalePoints      // if migrating consumers off it (decision §2.2.2)
  delete (state as Record<string, unknown>).finaleCount
}
```
- Register `finaleScore` in `TOP_LEVEL_DECIMAL_KEYS` (`saveMigration.ts:23`):
  `{ key: 'finaleScore', defaultValue: 0 }`.
- `finaleCommits[].committedStockpile` is a nested Decimal array — extend `reviveDecimals`
  (`saveMigration.ts:98`) with a small loop (mirror `reviveTierDecimals`, `:83`) that revives each commit's
  `committedStockpile`. **Do not skip this** — every L4–L9 Decimal field risks a silent desync otherwise
  (`HARDENING-PLAN.md` B5).
- `applyUndefinedDefaults` (`:132`) handles the new boolean/array defaults automatically once they're in
  `createInitialState()`; add `finaleScore` and `finaleCommits` to `SKIP_DEFAULT_KEYS` only if their generic
  default would be wrong (Decimal/array → they need the Decimal-revive + array path, so add them like `tiers`).

---

## 3. The mechanic in detail — formulas / algorithm + the M9 channel

### 3.1 The voices and their stockpiles

There are **six voices**, one per built layer L1–L6. A voice's **stockpile** is the quantity that "pours" into
the Performance meter when committed. **What each stockpile reads (concrete, cite the live source):**

| Voice | Stockpile = (the layer's hoarded output at commit time) | Read from |
|---|---|---|
| `l1` Encore | current `soundwaves` (the live climb's standing reserve) | `state.soundwaves` (`tick.ts:47`) |
| `l2` Magnum Opus | `recordsSold` reserve **+** spendable `opusPoints` | `records.ts`, `state.opusPoints` |
| `l3` World Tour | spendable `acclaim` (the banked tour reserve) | `state.acclaim` (`gameStore.ts:823`) |
| `l4` Signature | the live Signature production contribution (its current channel value) | L4 build output — **TBD — decide-at-build** which scalar represents "L4's stockpile" |
| `l5` Virtuoso | banked Take area not yet spent / current Mastery contribution | L5 build output — **TBD — decide-at-build** |
| `l6` Canon | **TBD — decide-at-build:** the LIVE per-cycle Canon bonus ONLY. ⚠ **The eternal Palimpsest `{top, ghosts[]}` is NOT drained** (`HARDENING-PLAN.md` L7 row: "Drains LIVE channels only; the eternal Palimpsest is untouched"). | L6 build output (the live bonus), **never** the `{top,ghosts}` store |

> **LOCKED constraint (`HARDENING-PLAN.md` L7 row, resolves the M8 "drain-to-zero vs eternal" contradiction):**
> **L7 drains LIVE per-cycle channels only. The Palimpsest is untouched.** The finale discharges the *live*
> empire; the eternal canon survives into L8/L9 per its `never` resetTier (`LADDER-MECHANICS.md:31`).
> Concretely: when committing the `l6` voice you read L6's *live bonus contribution*, NOT `{top, ghosts[]}`,
> and you do **not** mutate the Palimpsest store.

**Normalization (required — magnitudes differ by hundreds of OOM across voices):** raw stockpiles span SW
(could be ~1e308), records (~1e6+), acclaim, etc. Convert each to a **comparable contribution** via a
**sublinear transform** before it enters the meter — e.g. `contribution = log10(1 + stockpile)` (Decimal log10,
`break_infinity` supports it). **Form TBD — decide-at-build (sim):** log10 vs a root; whichever keeps all six
voices in a comparable band so no single voice trivially dominates the timing decision. **M11:** all of this is
Decimal end-to-end; the dev-build guard in `calculateTick` must already throw on non-finite (B-spec M11).

### 3.2 The commit + the decrescendo pour

Committing voice `v` at finale-time `t` with knob `d ∈ [0,1]`:

1. **Freeze** voice `v`'s output (it stops contributing to live production — see §4.5 freeze semantics).
2. **Drain** its stockpile into the meter, shaped by the decrescendo knob `d`:
   - `d → 0` ("loud-short"): pours the full contribution **fast** but at a **lower captured value**.
   - `d → 1` ("slow-quiet-higher"): pours **slowly** (longer real-time tail) but captures a **higher value**.
   - **Pour formula TBD — decide-at-build (sim/playtest):** the trade curve `capturedValue(contribution, d)`.
     A candidate to tune: `capturedValue = contribution · (1 + d·k)` paid over `pourTime = base·(1 + d·m)` —
     so slow pours are worth more but cost real time, making the **knob a genuine timing decision**, never a
     free max-d. `k`, `m`, `base` are **TBD — decide-at-build**.
3. **Record** the commit: push `{ voiceId, order, committedStockpile, decrescendo: d, tCommitMs: t }` to
   `finaleCommits`.
4. **Append** the captured value to the running Performance meter `M`.

### 3.3 The SCORE — sequence/timing, not magnitude

The final `finaleScore` is computed from **the order, timing, and pour-shaping of the six commits**, NOT from
how evenly the magnitudes split. **The structural backbone may still use a harmonic-mean-style evenness term so
"six balanced voices beat one giant + five tiny"** (`LADDER-MECHANICS.md:124-125`), **but the GRADED skill
expression is the decrescendo sequence** (`HARDENING-PLAN.md` decision 3). Concretely the score is a function of:

- **Sequence quality** — *when* each voice is silenced relative to its contribution and the running meter. The
  intended "good performance" is a **true decrescendo**: a shape where the pour tapers toward the final silence.
  **The exact sequence-scoring function is TBD — decide-at-build (sim/playtest)** — candidates: reward a
  monotonically-tapering capture profile (later commits captured at lower values = a real decrescendo); reward
  matching big-contribution voices to early/loud commits and small to the quiet tail.
- **Timing** — the `tCommitMs` spacing of commits (a rushed all-at-once vs a paced decrescendo). **TBD form.**
- **Evenness floor** — a harmonic-mean-of-contributions term as the backbone so a degenerate single-voice
  finale scores poorly. **Weight TBD.**

> **Anti-collision invariant (must hold):** the score must NOT be expressible as "the harmonic mean of the six
> magnitudes" alone — if it were, L7 would collapse into L4's allocation math (`HARDENING-PLAN.md` decision 3).
> The sim (§5) asserts that two finales with **identical magnitudes but different orders/timings score
> differently**.

### 3.4 The permanence reward — via the M9 registry channel (NO new global ×)

`finaleScore` grants a **permanent bonus** that survives into L8 (it is *why* the comeback can be faster). It
**MUST flow through a SEPARATE M9 multiplier-registry channel** with its own cap — **NOT** another raw global ×
piled onto the funnel (locked principle 3; `HARDENING-PLAN.md` B3 + M9).

- **M9 dependency (see Dependencies §6):** by L7 build-time the M9 multiplier registry exists. L7 contributes
  **one** entry: `{ source: 'grandFinale', value: finaleBonus, channel: 'finale', appliesToProduction: true }`.
  The `'finale'` channel is **distinct** from the encore/opus/acclaim/achievement channels and has its **own
  hard cap** (a `MULT_CAP`-style ceiling, like Acclaim's ×49 — `02-economy-formulas-resets.md` §7). **Cap value
  TBD — decide-at-build (sim).**
- **Sublinear in `finaleScore`** (mandatory, `HARDENING-PLAN.md` B2): `finaleBonus = 1 + f(log/root of
  finaleScore)`, capped. **Form + cap TBD — decide-at-build.** This prevents the finale (which discharges a
  possibly-1e308 empire) from minting an unbounded permanent multiplier.
- If the M9 registry is *not yet built* when L7 is reached (it should be — it's sequenced before L7 in the
  HARDENING worklist), the fallback is **still a capped, sublinear, separate term** — never an uncapped `10^n`.

### 3.5 The fake-credits + ember → L8 hand-off

After all six voices are committed and the meter resolves to `finaleScore` (the empire is now silent — live
production is zero, all voices frozen):

1. **Standing Ovation + fake credits** play (`STORY-SPEC.md:89-93,110-111`). The narrator goes **silent at the
   Finale** (the locked copy-fix — `HARDENING-PLAN.md` MINORS: "go narrator-silent at the Finale; fix the
   fake-credits leak"). The `grand_finale` story beat (`beats.ts:105-113`, goldLevel 1 = PEAK gold) fires
   here, then the credits roll **with no narrator voice**.
2. The "applause still faintly ticking" **ember** plays as the credits fade — a faint pulse that does NOT stop.
   Set `finaleEmberSeenL8 = true`.
3. Set `grandFinalePerformed = true`. This **closes L7 forever** and **opens the L8 "Come" path** (the L8 build
   reads `grandFinalePerformed` as its entry gate; the `redemption` beat `beats.ts:114-123` is L8's).

**L7 itself does ZERO adversity** — no reset, no strip. The fall is **entirely L8's job**, triggered by the
player accepting "Come" in L8 (`STORY-SPEC.md:62-66`, `LADDER-MECHANICS.md:129-131`).

---

## 4. The commit flow (algorithm) + freeze/preview semantics

### 4.1 Unlock / gate

`performGrandFinale` (rebuilt) becomes the **open-the-board** action; the actual commits are separate actions.
**Gate (TBD exact threshold — decide-at-build):**
- L6 Canon must exist and be meaningfully progressed (the reservoir is real). **Concrete sub-gate TBD.**
- `grandFinalePerformed === false` (one-time).
- No `activeChallenge` with `noPrestige` (mirror the existing guard, `gameStore.ts:885-891`).
- **NOT** gated on `GRAND_FINALE_SW_THRESHOLD` — retire that as the L7 gate (§2.2.3). It may stay as one
  *optional* readiness signal but is not the trigger.

### 4.2 Staging (previewed, irreversible — LOCKED `HARDENING-PLAN.md` L7 row)

- Opening the board sets `finaleInProgress = true`.
- The player selects the **next voice to commit** and a **decrescendo knob value**; the UI shows a **projected
  score delta BEFORE confirming** ("commits previewed + staged" — `HARDENING-PLAN.md` L7 row).
- **Confirm is irreversible** — once a voice is committed it cannot be un-committed (permanent commit of a
  frozen whole-layer output; this is what distinguishes L7 from L4's respec-able budget,
  `LADDER-MECHANICS.md:130-131`).
- Repeat until all six voices committed → resolve → §3.5 sequence.

### 4.3 Actions to add (`gameStore.ts`)

```ts
openGrandFinale(): void          // gate-check (§4.1), set finaleInProgress = true
previewCommit(voiceId, d): { projectedDelta: Decimal, projectedTotal: Decimal }  // pure, no state change
commitVoice(voiceId, d): void    // freeze voice, drain stockpile, push finaleCommits, add to meter
resolveGrandFinale(): void       // all 6 committed → compute finaleScore (§3.3), register M9 entry (§3.4),
                                 //   set grandFinalePerformed=true, trigger credits/ember (§3.5)
abandonGrandFinale(): void       // OPTIONAL — only allowed BEFORE first commit (then it's irreversible)
```
Add to the `partialize` exclusion list (`gameStore.ts:924-936`) like the other actions.

### 4.4 Idle-first compliance (locked principle 2)

- The board is **untimed** — staging/committing has no APM demand; the player can leave mid-sequence and the
  partially-committed state persists (`finaleInProgress` + `finaleCommits` are persisted).
- The decrescendo pour's "real-time tail" (§3.2) should be **short and analytic**, not an idle gate — it's a
  visual flourish; the captured value is computed instantly. **No path requires holding/clicking.** (Mirror the
  L5 idle decision: accrue analytically, never demand timed input — `HARDENING-PLAN.md` decision 4 / L9 note.)
- Active play (choosing a smarter sequence) **amplifies** the score; a naive "commit all at d=0" still yields a
  valid (lower) finale. Target the ≈1.4–1.75× active:idle expressivity band where it makes sense, but since L7
  is one-time and skill-expressive, the relevant guarantee is **a no-thought commit-all still completes the
  finale** (no soft-lock).

### 4.5 Freeze semantics (how a committed voice stops contributing)

When a voice is committed, its live production contribution must drop to zero for the rest of the finale. Since
production is one funnel (`getCoreProductionMultiplier`, `formulas.ts:206`), the clean implementation is **via
the M9 registry**: each layer's contribution is a registry entry tagged by source; committing a voice
**removes/zeroes that source's entry** (the registry's filter-by-source is exactly the M9 design,
`HARDENING-PLAN.md` M9). The tick then naturally produces less as voices go silent. **This is the single
strongest reason L7 must be built on top of M9** (see Dependencies). If a voice's output is not yet a registry
entry by L7 build-time, that layer's tick contribution must be made suppressible by a `committedVoices` set the
tick reads — **decide-at-build which voices are registry-driven vs need a suppression hook.**

---

## 5. UI surface

- **The mixing board** (new component, e.g. `src/components/finale/FinaleBoard.tsx`): six voice channels
  (L1–L6), each showing its current stockpile/contribution, a **commit button**, and a **decrescendo knob**
  (slider 0..1). Committed voices render as **silenced/greyed** with their captured value shown.
- **The Performance meter**: one rising meter (the convergence of all pours) with the running projected score.
- **Preview readout**: before confirming a commit, show **projected score delta** (LOCKED requirement — staged
  + previewed). Make challenge/finale numbers **concrete, not opaque** (`HARDENING-PLAN.md` MINORS: readouts).
- **A mechanic card** teaching the new verb (commit voices → decrescendo → one performance), consistent with
  the per-layer mechanic-card pattern (`HARDENING-PLAN.md` MINORS); the **narrator stays pure/silent** here.
- **Era / chrome**: era 6 is PEAK gold (`eraTheme.ts:6` `ERA_COLORS[6]='#fbbf24'`, `getEra` →6). Keep era-6 the
  finale skin; re-key the `getEra` finale branch off `grandFinalePerformed` (§2.2.2).
- **Fake credits + ember sequence** (new component, e.g. `FinaleCredits.tsx`): Standing Ovation, credits roll,
  the gold orb at PEAK then the faint never-stopping ember pulse (`STORY-SPEC.md:30-34` gold↔black arc — gold
  peaks at L7). **CSS-only, no images** (consistent with the cold-open treatment, `STORY-SPEC.md:27-29`).
- **Visual gold arc**: L7 is **PEAK gold** (`STORY-SPEC.md:58`); the ember is the first hint of the L8
  black-flood inversion. Do not invert here — that's L8.

---

## 6. Sim / validation plan (what a sim MUST assert)

Add `sim/finale-pacing.test.ts` (mirror the harness in `sim/era-pacing.test.ts:1-60`: drive REAL game logic —
`calculateTick`, the store actions — headless, write a CSV to `sim/out/`). **Assertions (LOCKED intent; exact
numeric windows are sim-tuned — `TBD — decide-at-build`):**

1. **Anti-collision (the core revision):** two finales with **identical voice magnitudes** but **different
   commit ORDER and/or decrescendo timing** produce **different `finaleScore`** — proves the axis is timing,
   not magnitude (`HARDENING-PLAN.md` decision 3). **MUST pass or the layer is mis-built.**
2. **No-sandbag:** deliberately under-building one voice does NOT beat a balanced six-voice finale (the
   evenness backbone term holds). A balanced decrescendo beats "one giant + five tiny".
3. **One-time:** after `resolveGrandFinale`, `grandFinalePerformed === true` and the board cannot reopen;
   `performGrandFinale`/`openGrandFinale` is a no-op thereafter.
4. **Palimpsest untouched:** assert L6's `{top, ghosts[]}` (and its `never`-tier permanence) is **byte-identical
   before and after** the finale — L7 drains LIVE channels only (`HARDENING-PLAN.md` L7 row). **MUST pass.**
5. **Permanence is capped + sublinear:** drive `finaleScore` across orders of magnitude (incl. a ~1e308-empire
   discharge) and assert the **M9 `'finale'`-channel multiplier never exceeds its cap** and is monotone-but-
   sublinear in `finaleScore` (`HARDENING-PLAN.md` B2/B3). No uncapped `10^n`.
6. **M11 finiteness:** the finale math (Decimal log/pour/score) never yields NaN/Infinity; the dev-build guard
   in `calculateTick` does not throw during or after a finale (B-spec M11).
7. **Idle-first / no soft-lock:** a naive "commit all voices at d=0 immediately" completes a VALID finale (lower
   score, never a stuck state). No path requires timed input.
8. **Placeholder migration:** a save with legacy `finaleCount=1` migrates to `grandFinalePerformed=true`,
   era-6/liveliness/achievements still resolve, and the production funnel **no longer** applies `10^fp` (the old
   `getFinaleMultiplier` is gone from the funnel). Add to `saveMigration.test.ts`.

---

## 7. Acceptance criteria

- [ ] `performGrandFinale` is **one-time** (`grandFinalePerformed` gate); the old repeatable
      `finalePoints++`/`finaleCount++` infinity-prestige is removed (`gameStore.ts:879-907`).
- [ ] The score is computed from **commit sequence + timing + decrescendo shaping**, with an evenness backbone —
      NOT a pure magnitude harmonic mean. Sim assertion 1 (anti-collision) passes.
- [ ] L7 drains **LIVE per-cycle voice channels only**; the **L6 Palimpsest `{top, ghosts[]}` is untouched**
      (sim assertion 4 passes).
- [ ] The permanence reward flows through a **separate M9 `'finale'` channel with its own cap**, sublinear in
      `finaleScore`; the funnel gains **no new uncapped global ×** (sim assertion 5).
- [ ] Commits are **previewed (projected score shown) + staged + irreversible**.
- [ ] **ZERO adversity** in L7 — no reset, no automation-strip, no re-climb. The fall is L8's.
- [ ] **Fake credits play with the narrator silent**; the **ember** sets up L8; `grandFinalePerformed=true`
      opens the L8 "Come" path.
- [ ] `finalePoints`/`finaleCount` placeholder retired: `getFinaleMultiplier` removed from the funnel;
      era-6 / liveliness / the 3 dependent achievements re-keyed to `grandFinalePerformed` (or retired);
      save-migration v2 added + tested (sim assertion 8).
- [ ] All new Decimal fields revived in `saveMigration.ts`; `SAVE_SCHEMA_VERSION` bumped to 2.
- [ ] Idle-first: a no-thought commit-all completes a valid finale; no timed-input path (sim assertion 7).
- [ ] `tsc` clean, full test suite + the new `sim/finale-pacing.test.ts` green, build passes.

---

## 8. Dependencies (what must exist FIRST)

| Dependency | Why L7 needs it | State today |
|---|---|---|
| **M9 multiplier registry + declarative resets** (`HARDENING-PLAN.md` M9) | L7's permanence reward = a separate `'finale'` channel entry (§3.4); freezing a committed voice = removing its registry source (§4.5). **L7 is hard to build correctly without M9.** | ⚠ **NOT built yet** — no `multiplierRegistry`/`resetTier`/`applyReset` in `src/` (grep confirms). It is *sequenced before L7* in the worklist (`HARDENING-PLAN.md` SEQUENCE 3). **Must land before L7.** |
| **M11 Decimal-overflow guards** (`HARDENING-PLAN.md` M11) | L7 score/pour math can exceed 1e300; needs Decimal end-to-end + the `calculateTick` NaN/Infinity throw. | ⚠ NOT built yet (sequenced with M9). |
| **L6 Canon** (the Palimpsest) | L7 reads L6's **live** bonus as the `l6` voice; must explicitly **NOT** drain `{top,ghosts[]}`. The Canon layer must exist in code (today there is none). | ⚠ Designed only (`04-forward-design-L4-L9.md` §5). Build L6 first. |
| **L4 Signature + L5 Virtuoso** | The `l4`/`l5` voices read their live channel contributions (§3.1 TBD rows). | ⚠ Designed only. Build before L7 (sequential build order, `LADDER-MECHANICS.md:3-5`). |
| **L8 Redemption (consumer, not blocker)** | L8 reads `grandFinalePerformed` + `finaleScore` + the ember to trigger "Come". L7 just sets these; L8 is built after. | Designed only — fine, L7 ships its outputs and L8 consumes later. |
| **Story beat `grand_finale`** | The PEAK-gold beat fired at §3.5. | ✅ Exists (`beats.ts:105-113`). Narrator-silent-at-credits copy fix is in the worklist (`HARDENING-PLAN.md` MINORS / worklist item 8). |

---

## 9. Open gaps (TBD — decide-at-build, sim/playtest)

1. **Stockpile normalization transform** (§3.1) — log10 vs root; the band that keeps all six voices comparable.
2. **What scalar represents the L4 / L5 / L6-LIVE stockpiles** (§3.1 TBD rows) — finalize when L4/L5/L6 ship.
3. **The decrescendo pour trade curve** `capturedValue(contribution, d)` + `pourTime` (§3.2) — constants `k, m, base`.
4. **The sequence/timing score function** (§3.3) — how "a true decrescendo" is rewarded; the timing term; the
   evenness-backbone weight. Must satisfy the anti-collision invariant (sim assertion 1).
5. **The M9 `'finale'`-channel reward form + hard cap** (§3.4) — sublinear `f(finaleScore)` + `MULT_CAP`-style ceiling.
6. **The L7 unlock gate threshold** (§4.1) — what "L6 sufficiently progressed" means concretely.
7. **Placeholder retirement specifics** (§2.2.2) — confirm whether to delete `finalePoints`/`finaleCount`
      entirely vs keep as a 0/1 flag; re-author/retire the "2nd Grand Finale" achievement.
8. **Whether `abandonGrandFinale` is allowed at all** (§4.3) — and only-before-first-commit if so.

---

### Source citations index
- **Mechanic (locked + revised):** `LADDER-MECHANICS.md:118-134`, `:32` (one-time row), `:124-127`;
  `HARDENING-PLAN.md` decision 3 (`:` "L7 → score TIMING/ORDER"), L7 DESIGN-REVISION row, B2/B3, M9/M11.
- **Story:** `STORY-SPEC.md:89-93` (beat copy), `:62-66` (clean-triumph twist), `:27-34,58` (gold arc / PEAK).
- **Code (placeholder to replace):** `gameStore.ts:879-907` (`performGrandFinale`), `formulas.ts:180-182,233`
  (`getFinaleMultiplier`), `constants.ts:160` (`GRAND_FINALE_SW_THRESHOLD`), `eraTheme.ts:9-16`,
  `formulas.ts:190-198` (liveliness), `achievements.ts:740,749,2276`.
- **Code (build into):** `types.ts:38+`, `initialState.ts:62-77`, `saveMigration.ts:23,98,151`,
  `saveSchema.ts:2`, `tick.ts:89-104` (funnel call site), `beats.ts:105-113`.
- **Cross-check:** `docs/bible/04-forward-design-L4-L9.md` §6/§8 (the design↔code divergence), `§02` reset matrix.
```

(End of build-spec.)
