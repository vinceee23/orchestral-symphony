# 05 — Narrative & World

*The gatekeeper, the pantheon, the gold→black arc, and the locked v2 beat copy.*

This file is the canonical narrative reference. It is **code-grounded**: every claim is checked against
the live source. Where the design docs and the shipped code diverge, that is called out explicitly in
[§9 Divergences](#9-divergences-design-vs-code). Primary sources:

| Source | Path | Role |
|---|---|---|
| Story spec | `docs/STORY-SPEC.md` | Design intent (still labelled "draft for sign-off"; copy itself is locked v2) |
| Beat data + gating | `src/components/story/beats.ts` | The **locked v2 copy** + trigger logic (source of truth for copy) |
| Beat renderer | `src/components/story/StoryBeat.tsx` | The orb + line-by-line overlay (the gold/black motif, in code) |
| Resolver hook | `src/components/story/useStoryBeats.ts` | Picks the next unseen beat, manages display lifecycle |
| Mount | `src/components/story/StoryBeatOverlay.tsx` + `src/App.tsx:19` | Root-level overlay |
| Orb/line CSS | `src/index.css:219–251` | `story-orb-breathe` + `story-line-in` keyframes |
| Ladder cross-ref | `docs/LADDER-MECHANICS.md` | Layer roles + which narrative layers are built vs designed |

---

## 1. The spine — one emotional arc

`docs/STORY-SPEC.md:8–13`. A single arc drives the whole game:

> **Birth → Rise → Apotheosis → Fall → Redemption → Confrontation**

A musician is born from silence, **rises** through the craft, reaches a mortal peak (the **Grand Finale**) —
then **falls** (hiatus / a record that flops). The gods, who *engineered* the fall, call them to rise again
under trial (**Redemption**); only by proving the peak was no accident do they earn an audience with the
pantheon in the eternal dark (**Confrontation**).

Mapped onto the ladder (`docs/STORY-SPEC.md:49–60`):

| Arc phase | Layers | Narrative |
|---|---|---|
| Birth | Intro | Reaching into silence; something reaches back |
| Rise | L1–L6 (Encore → Canon) | Climbing the craft; the dark begins to watch |
| Apotheosis | L7 Grand Finale | The pure mortal triumph / the apparent end (PEAK gold) |
| Fall | L8 Redemption (opening) | Silence, the world forgets — then the mask cracks |
| Redemption | L8 Redemption (trial) | Conditioned Finale re-climbs; prove it was no accident |
| Confrontation | L9 The gods | Face the pantheon in the eternal dark |

---

## 2. The narrator — the collective gatekeeper (LOCKED)

`docs/STORY-SPEC.md:15–24`.

- **Who:** the *collective voice* of the immortals — the pantheon (§4). An ambiguous **"we"** speaking from
  the dark. Never an individual until L9.
- **Tone:** **enigmatic gatekeeper** — mysterious, testing, slightly challenging. It *warms toward reverence*
  as you prove yourself, then turns to **invitation** ("Come", "Stand with us").
- **Reveal:** the voice's identity (that it is the gods) is revealed **only at L9**. No names before then.
- **Density:** terse — **1–2 lines per beat** (Redemption is the deliberate exception at 5 lines). Sparse,
  poetic, AD-style restraint.

### 2.1 The "many-as-one" weave — fingerprints, never names

The spec's most load-bearing device (`docs/STORY-SPEC.md:21–23`): it is always the *single* collective voice,
but it occasionally speaks like it is secretly **many** — a line that keeps perfect time (**the Pulse**), a
phrase that breathes (**the Breath**). **Fingerprints, never names.** The player should sense a *chord* behind
the one voice and only learn *who* at L9. These fingerprints are the same epithets attached to the six gods in
§4 (Voice / Breath / Blaze / Pulse / Twins / Downbeat).

### 2.2 The "we / the living / mortals" breadcrumb logic

The escalation is encoded in the pronoun and noun choices across the locked copy (`src/components/story/beats.ts:34–134`).
Tracing the breadcrumbs in order:

| Beat | Breadcrumb line | What it plants |
|---|---|---|
| Platinum | "Something in the dark **turns to listen**." / "…Who are you, young musician?" | First direct address; first hint of an *audience* |
| World Tour | "**We** have known a thousand names." | First "we" — the voice is plural, and *old* |
| Signature | "Now you sound like… **one of us**." / "…Curious." | You are starting to resemble *them* (seeds the L9 Signature-mirror) |
| Virtuoso | "(**We were never the living**.)" | The watchers are explicitly **not mortal** |
| Canon | "Mortals call that immortality. / **We** call it a beginning." | "We" vs "mortals" — the gap is now overt |
| Redemption (L8) | "It was never theirs. It was **ours**." | The applause was *them* all along — the rug-pull |
| The gods (L9) | "Now you know **our faces**." | Identity revealed; "we" finally gets faces |

The logic is monotonic: the voice moves from *overheard whisper* → *we* → *we vs mortals* → *we, and you are
becoming one of us* → *we, with faces*. This is the mystery being **woven**, not withheld — the player is given
enough to feel the chord before the L9 reveal pays it off.

---

## 3. The gold→black motif

`docs/STORY-SPEC.md:26–34, 67–68`. The connective ritual of the whole game, rendered **CSS-only, no images**:
pure black screen, a single **gold orb that breathes** (~4s pulse), narrative text fading in line-by-line
beneath it, click/tap to advance, always skippable, soft fade into the game UI on finish.

The motif is a **separate visual language** from the colorful in-game StageHall era palettes — it is the
game's ritual thread.

### 3.1 The arc of the orb

Gold **swells** L1→L7 (peak at the Grand Finale), then **inverts** at L8: the gold *concentrates* to a small,
cold, brilliant point in an expanding void. Early beats are warm/bright/gold-dominant; late beats are
black-dominant with gold a lonely point. The fall at L8 is the pivot — the orb is nearly snuffed; redemption
fights it back to a flicker; at L9 it is a cold brilliant point in the void.

### 3.2 How `goldLevel` encodes the arc (in code)

Each beat carries a `goldLevel: number` (0..1) — `src/components/story/beats.ts:20`. It drives the orb's size,
warmth, blur, and breathing amplitude in `StoryBeat.tsx:63–134`:

```
orbSize    = 72 + goldLevel * 320      // px (StoryBeat.tsx:63)
coreAlpha  = 0.28 + goldLevel * 0.52   // inner warmth
haloAlpha  = 0.06 + goldLevel * 0.14   // outer halo
blur       = 8 + goldLevel * 10        // px
```

The breathing itself is the `story-orb-breathe` keyframe (`src/index.css:219–231`), a 4s ease-in-out scale +
opacity pulse; a second smaller inner "hot core" runs the same animation offset by `-0.5s`
(`StoryBeat.tsx:121–134`). Lines fade up via `story-line-in` (`src/index.css:233–239`). `prefers-reduced-motion`
disables both animations and shortens the exit fade (`StoryBeat.tsx:13–28, 67`; `src/index.css:241–251`).

### 3.3 The locked `goldLevel` ladder (exact values, from code)

| Beat (id) | `goldLevel` | Source | Motif phase |
|---|---|---|---|
| `intro` | **0.15** | `beats.ts:37` | Birth — a faint spark |
| `encore` | **0.25** | `beats.ts:46` | gold flickers |
| `magnum_opus` | **0.40** | `beats.ts:54` | gold warms |
| `platinum` | **0.55** | `beats.ts:62` | (milestone) gold brightens |
| `world_tour` | **0.70** | `beats.ts:71` | gold swells |
| `signature` | **0.75** | `beats.ts:81` | richer |
| `virtuoso` | **0.82** | `beats.ts:90` | near-blaze |
| `canon` | **0.88** | `beats.ts:98` | near-peak gold |
| `grand_finale` | **1.0** | `beats.ts:107` | **PEAK gold** (apotheosis) |
| `redemption` | **0.12** | `beats.ts:116` | **THE INVERSION** — black floods, orb nearly snuffed |
| `the_gods` | **0.05** | `beats.ts:127` | deepest black, gold a cold point |

The numbers *are* the arc: a near-monotonic rise to **1.0** at the Grand Finale, then a hard cliff to **0.12**
at the Fall and **0.05** at the gods. The pivot is the gap between `grand_finale` (1.0) and `redemption`
(0.12) — that single drop is the gold→black motif in one number.

---

## 4. The pantheon — the six gods of music

`docs/STORY-SPEC.md:35–48`. **Six gods**: four instrument families + one concept-twin + the Conductor (final
boss). Each is an **L9** Celestials-style boss — a reality with bent rules themed to its domain (the same DNA
as the L3 challenges, escalated). Their epithets are the §2.1 "fingerprints" the narrator drops before the
reveal.

| God (draft name) | Epithet | Domain | Boss-mechanic direction |
|---|---|---|---|
| **Lyra** | the Voice | Strings | sustain / crescendo / melodic-line bending |
| **Aeolia** | the Breath | Woodwinds | breath / tickspeed / decay |
| **Clarion** | the Blaze | Brass | raw output / loudness / overpower |
| **Timpana** | the Pulse | Percussion | rhythm / tempo / timing windows |
| **Consonance & Dissonance** | the Twins | Harmony (two-as-one) | duality — a two-phase fight; balance consonance vs dissonance |
| **The Maestro** | the Downbeat | Conductor — **FINAL boss** | commands all domains; the downbeat that began everything |

Notes:
- Names are flagged "first draft, rooted+epithet register" in the spec — treat names as provisional, the
  *roles/domains* as locked.
- The **Twins** are one god expressed as two — a single two-phase fight, not two bosses.
- The **Maestro** is the final boss and the cosmological origin ("the downbeat that began everything") — he
  rhymes with the Intro's "Something reached back."
- **L9 structure** (`docs/LADDER-MECHANICS.md:51, 151–155`): bent-reality fights, fought in **any order**
  with the **Maestro last**, then you **join the pantheon**. The **Signature mirror** (the L4 payoff): the
  domain you most embodied in L4 is your **hardest** fight.

---

## 5. The L7→L8 keystone twist (the fake-credits rug-pull)

`docs/STORY-SPEC.md:62–68` — the single most important narrative mechanic.

1. **L7 Grand Finale plays as a pure, *earned* triumph.** The last note, the end of the song. **Let it land** —
   silence, even **fake credits**. No twist *yet*. (`grand_finale` copy: "The greatest performance of your
   life. / The last note rings out, and fades. / This is the end of the song." — `beats.ts:108–112`.)
2. **Then you fall.** At L8 the mask cracks (`redemption`, `beats.ts:117–122`):
   - "Then: silence."
   - "The records gather dust. The world forgets your name."
   - "…But the applause never stopped."
   - "It was never theirs. It was **ours**."  ← the reveal: the applause was *the gods* all along
   - "Rise. Show us the first time was no accident. **Come**."
3. **The gods engineered the fall to test you.** Redemption is the trial: **3 conditioned Grand-Finale
   re-climbs**, faster as Recognition grows, each harder (`docs/STORY-SPEC.md:100`; mechanic in
   `docs/LADDER-MECHANICS.md:140–143`). Surviving it earns the **L9** audience.

**Why it's structured this way** (`docs/STORY-SPEC.md:66`): keeping the triumph *clean* and dropping the
rug-pull **AFTER** it lands hits harder than twisting the Finale itself. The gold→black pivot is therefore the
**fall at L8**, not the Finale — Finale is peak gold (1.0); the Fall is the snuff (0.12).

> **Code status:** the L7 fake-credits / fake-ending sequence and the L8 fall are **not implemented**. There
> is no credits component, no finale fade-out sequence, and `grand_finale`/`redemption`/`the_gods` beats exist
> only as registry copy that *cannot fire* (see §6.3, §9). The twist is fully *specced* and the copy is locked,
> but it is future world-building. (`docs/STORY-SPEC.md:107–112` build scope; verified: `grep -i
> credits/fake/finale` over `src/App.tsx` returns no twist machinery.)

---

## 6. The beat system — triggers, ordering, gating (code reality)

### 6.1 When beats fire (triggers)

Spec'd triggers (`docs/STORY-SPEC.md:70–74`): (a) cold-open intro on first play, (b) **Platinum** (a non-reset
milestone — first direct address), (c) each layer's first reset L1–L7, plus future (d) L8 Redemption and (e) L9.
First-time-only per trigger, skippable, flagged in `localStorage`.

**Implemented triggers** — the condition each beat checks, from `isBeatConditionMet` (`beats.ts:143–158`):

| Beat | Condition (code) | Game-state field |
|---|---|---|
| `intro` | always `true` | — (fires on first play) |
| `encore` | `encoreCount >= 1 \|\| lifetimeEncoreCount >= 1` | `types.ts:65–67` |
| `magnum_opus` | `opusCount >= 1` | `types.ts:79` |
| `platinum` | `platinum === true` | (Platinum milestone flag) |
| `world_tour` | `worldTourUnlocked === true` | `types.ts:96` |
| *(signature … the_gods)* | `default → false` (never fires) | — |

### 6.2 Ordering + "next unseen" resolution

`STORY_BEAT_ORDER` (`beats.ts:26–32`) is the only set that can fire in the current build:

```
['intro', 'encore', 'magnum_opus', 'platinum', 'world_tour']
```

`getNextStoryBeat(seenStoryBeats, state)` (`beats.ts:161–172`) walks this order and returns the **first unseen
beat whose condition is met**. The hook `useStoryBeats` (`useStoryBeats.ts:18–44`) subscribes to the five gate
fields, latches the resolved beat into local state, and on dismiss calls `setStoryBeatSeen(id)` then clears the
display (keeping the overlay mounted through the exit fade). `setStoryBeatSeen` (`gameStore.ts:904–909`)
appends the id to `seenStoryBeats` (idempotent). `seenStoryBeats: string[]` is persisted
(`types.ts:141`, `initialState.ts:76`).

### 6.3 The registry vs. the reachable set

`STORY_BEATS` (`beats.ts:34–135`) holds **all 11** beats including the L4–L9 copy. But:
- Only the **5** ids in `STORY_BEAT_ORDER` are iterated, so only those can ever be returned.
- The L4–L9 beats also fall through `isBeatConditionMet`'s `default → false`, so even if ordered they would
  not fire.

So the L4–L9 copy is **locked and present in code but inert** — registry placeholders awaiting wiring
(`beats.ts:78` comment: "L4–L9: registry placeholders for future wiring"; `beats.ts:10` "triggers not wired
yet"). This is intentional, not a bug — see §9.

### 6.4 Save migration — don't retro-fire on old saves

For saves that predate the story system, `seedSeenStoryBeatsFromProgress` (`beats.ts:200–208`) pre-marks beats
whose milestones were already passed, so they don't all fire at once on load. `hasPreStoryProgress`
(`beats.ts:185–194`) detects a meaningful prior save. Wired in two places:
- Migration: `applyStoryBeatSeeding` (`saveMigration.ts:140–143`) — seeds only when `seenStoryBeats` is empty
  *and* there's prior progress.
- Rehydrate / `?l3` dev seed: `gameStore.ts:981` re-seeds when the playtest shortcut jumps you to World Tour.

### 6.5 The overlay (rendering)

`StoryBeatOverlay` (`StoryBeatOverlay.tsx`) is mounted at the app root (`App.tsx:19`, above `AppShell`). It
renders `<StoryBeat>` keyed by beat id when a beat is active, passing `lines` + `goldLevel` + `onDone=dismiss`.
`StoryBeat.tsx` is a `z-[200]` fixed full-viewport `role="dialog"` modal: click/Enter/Space advances a line
(`advance`, lines 50–61); the Skip button (lines 90–100) or advancing past the last line calls `finish`
(lines 44–48) → fade → `onDone`. Footer reads "Click to continue" until the last line, then "Click to begin"
(`StoryBeat.tsx:155`).

---

## 7. The locked v2 beat copy (verbatim, with triggers)

This is the **source of truth** copy, transcribed verbatim from `src/components/story/beats.ts` (which matches
`docs/STORY-SPEC.md:76–105`). Bold marks the §2.2 breadcrumbs; `[goldLevel]` and trigger noted.

### Intro — *birth, pre-recognition* — `[0.15]`, fires first play
> Before the first note: silence.
> You reached into it.
> Something reached back.

*(Spec tutorial nudge: the first button glows. "Play." — `STORY-SPEC.md:81`; not wired in `StoryBeat.tsx`.)*

### L1 Encore — `[0.25]`, fires when `encoreCount≥1 || lifetimeEncoreCount≥1`
> Again. You play it again.
> The first sign of someone who refuses to be forgotten.

### L2 Magnum Opus — `[0.40]`, fires when `opusCount≥1`
> Not a song this time. A work.
> Something that outlives the hand that made it.

### Platinum — *FIRST DIRECT ADDRESS* — `[0.55]`, fires when `platinum`
> A million voices sing your name.
> Something in the dark **turns to listen**.
> …Who are you, young musician?

### L3 World Tour — `[0.70]`, fires when `worldTourUnlocked`
> The world is learning your name.
> **We** have known a thousand names.
> They are all quiet now.

### L4 Signature — `[0.75]` — *registry only, not wired*
> Now you sound like no one else.
> Now you sound like… **one of us**.
> …Curious.

*(Seeds the L9 Signature-mirror — `STORY-SPEC.md:86`.)*

### L5 Virtuoso — `[0.82]` — *registry only, not wired*
> There is nothing left for the living to teach you.
> (**We were never the living**.)

### L6 Canon — `[0.88]` — *registry only, not wired*
> They will play your work long after you are dust.
> Mortals call that immortality.
> **We** call it a beginning.

### L7 Grand Finale — *pure triumph, the apparent end* — `[1.0]` — *registry only, not wired*
> The greatest performance of your life.
> The last note rings out, and fades.
> This is the end of the song.

*(Let it land — silence, fake credits. The twist comes AFTER, at L8. See §5.)*

### L8 Redemption — *the fall, then "Come"* — `[0.12]` — *THE INVERSION; registry only, not wired*
> Then: silence.
> The records gather dust. The world forgets your name.
> …But the applause never stopped.
> It was never theirs. It was **ours**.
> Rise. Show us the first time was no accident. Come.

*(→ the trial: 3 conditioned Grand-Finale re-climbs, faster as Recognition grows, each harder.)*

### L9 The gods — *reveal + confront* — `[0.05]` — *registry only, not wired*
> Anyone can rise once.
> You fell, and rose again.
> Now you know **our faces**. *(the pantheon revealed, first time)*
> Stand with us.

---

## 8. The ladder, as it relates to the narrative

`docs/STORY-SPEC.md:49–60` + `docs/LADDER-MECHANICS.md:43–51`. Build state is the code reality.

| Layer | Name | Narrative role | Orb (`goldLevel`) | Build state |
|---|---|---|---|---|
| L1 | Encore | gold flickers | 0.25 | **built** |
| L2 | Magnum Opus | gold warms (+ Platinum milestone, 0.55) | 0.40 | **built** |
| L3 | World Tour | gold swells | 0.70 | **built** |
| L4 | Signature | richer (Identity / domain-class) | 0.75 | designed |
| L5 | Virtuoso | near-blaze (Mastery / Perfect Take) | 0.82 | designed |
| L6 | Canon | near-peak (Permanence / the Palimpsest) | 0.88 | designed |
| L7 | Grand Finale | **PEAK** mortal triumph / apparent end | 1.0 | designed |
| L8 | Redemption ("Come") | the fall → invitation; conditioned re-climbs | 0.12 | designed |
| L9 | The gods | confront the pantheon in the eternal dark | 0.05 | designed |

Reset chain (`docs/LADDER-MECHANICS.md:13–14`): Encore → MagnumOpus → Tour(L3) → Signature(L4) → Virtuoso(L5)
→ Canon(L6) → GrandFinale(L7, ONE-TIME) → Fall(L8). Platinum is a non-reset milestone; L9 wins reset nothing.
The narrative layers L1–L3 are the only ones whose **beats actually fire** in the current build (§6).

---

## 9. Divergences (design vs. code)

The spec is realistic about scope; these are *intended* gaps, not defects — but a fresh session must know them.

| # | Divergence | Spec says | Code reality | Evidence |
|---|---|---|---|---|
| 1 | **L4–L9 beats inert** | Per-layer beats L1–L7 + L8/L9 (future) | Only `intro, encore, magnum_opus, platinum, world_tour` can fire; L4–L9 are registry-only + `default→false` | `beats.ts:26–32, 78, 155` |
| 2 | **L7 fake-credits unbuilt** | Grand Finale plays clean, then *fake credits*, then fall | No credits/finale sequence anywhere; `grand_finale` is inert copy | `STORY-SPEC.md:92–93, 110`; no match for credits/fake/finale in `App.tsx` |
| 3 | **L8 fall / re-climbs unbuilt** | 3 conditioned Finale re-climbs, Recognition-scaled | No Recognition field, no comeback loop in the live store; `redemption` inert | `STORY-SPEC.md:100`; `LADDER-MECHANICS.md:140–143` ("designed") |
| 4 | **Pantheon / L9 bosses unbuilt** | 6 bent-reality bosses, any-order + Maestro last, Signature mirror | No boss system in code; pantheon is design-only; `the_gods` inert | `STORY-SPEC.md:35–48`; `LADDER-MECHANICS.md:151–155` ("designed") |
| 5 | **Intro tutorial nudge** | Intro ends with first button glowing + "Play." | Intro beat ends; no glow/"Play." handoff wired in the overlay | `STORY-SPEC.md:81` vs `StoryBeat.tsx` (no tutorial hook) |
| 6 | **Spec header still "draft"** | Header: "draft for Vince's sign-off"; "beat COPY is a first draft" | The **copy** is in fact locked v2 and shipped verbatim in `beats.ts` | `STORY-SPEC.md:3–6` (stale header) vs `beats.ts:34–135` |
| 7 | **God names provisional** | Names = "first draft, rooted+epithet register" | No god names appear in code at all yet — nothing to contradict | `STORY-SPEC.md:35` |

**Bottom line for a future session:** the narrative *spine, voice, pantheon, motif, and the full L1–L9 copy*
are locked and present. What's **built** is the beat-overlay engine + the L1–L3/intro/Platinum triggers
(`goldLevel` 0.15→0.70). Everything from L4 up — including the L7 fake-credits twist and the L8→L9 fall/
confrontation — is **specced + copy-locked but not wired**. To ship a later layer's beat: add its id to
`STORY_BEAT_ORDER` and give it a real case in `isBeatConditionMet` (`beats.ts:26–32, 143–158`). The copy is
already there.

---

*Summary: documented the narrative spine, the collective-gatekeeper "we/mortals" breadcrumb logic, the 6-god
pantheon + boss directions, the gold→black motif (incl. exact `goldLevel` ladder from code), the L7→L8
fake-credits twist, the full locked v2 beat copy with triggers, and a 7-row design-vs-code divergence table —
all path/line-cited against `beats.ts`, `StoryBeat.tsx`, the store, and `STORY-SPEC.md`.*
