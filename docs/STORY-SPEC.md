# Story & World Spec — the cold-open, the beat system, the pantheon

Status: **draft for Vince's sign-off (2026-06-27).** Narrative direction locked via Q&A this session;
the beat COPY below is a first draft to react to, not final. Build target: the cold-open intro + the
reusable story-beat system (L1 copy first). The L8 gods battle + L6 mechanic are future world-building
that this spine sets up.

## 1. The spine (one emotional arc)
**Birth → Rise → Apotheosis → Fall → Redemption → Confrontation.**
A musician is born from silence, rises through the craft, reaches a mortal peak (the Grand Finale) — then
**falls** (hiatus / a record that flops). The gods, who engineered the fall, call them to rise again under
trial (Redemption); only by proving the peak was no accident do they earn an audience with the pantheon in
the eternal dark.

## 2. The narrator (LOCKED)
- **Who:** the *collective voice* of the immortals — the pantheon (§4). Ambiguous "we" from the dark.
- **Tone:** **enigmatic gatekeeper** — mysterious, testing, a little challenging; warms toward reverence
  as you prove yourself, then turns to invitation.
- **Reveal:** the voice's identity (the gods) is **revealed only at L8.** No names before then.
- **Weave (mystery but woven):** throughout it's the single collective voice — but it occasionally speaks
  like it's secretly *many*: a line that keeps perfect time (the Pulse), a phrase that breathes (the
  Breath). **Fingerprints, never names.** The player senses a *chord* behind the one voice; learns who
  only at L8.
- **Density:** terse — **1–2 lines per beat.** Sparse, poetic, AD-style restraint.

## 3. Visual treatment (LOCKED)
- Pure **black** screen; a single **gold orb that breathes** (~4s pulse), CSS-only, no images.
- Narrative text fades in **line by line beneath the orb**; **click/tap to advance**; **always skippable**.
- Soft fade into the game UI on finish.
- **The gold↔black ARC (the motif evolves across beats):** gold swells L1→L7 (peak at the Grand Finale),
  then **inverts** — at L8 the gold *concentrates* to a small cold brilliant point in an expanding void.
  Early beats: warm, bright, gold-dominant. Late beats: black-dominant, gold a lonely point. This motif
  is SEPARATE from the colorful in-game StageHall era palettes — it's the game's connective ritual.

## 4. The pantheon — the gods of music (names = first draft, rooted+epithet register)
Six gods. Four instrument families + one concept-twin + the Conductor (final boss). Each is an **L9**
Celestials-style boss: a reality with bent rules themed to its domain (same DNA as the L3 challenges,
escalated). Boss-mechanic hints below.

| God (draft name) | Domain | Boss-mechanic direction |
|---|---|---|
| **Lyra, the Voice** | Strings | sustain / crescendo / melodic-line bending |
| **Aeolia, the Breath** | Woodwinds | breath / tickspeed / decay |
| **Clarion, the Blaze** | Brass | raw output / loudness / overpower |
| **Timpana, the Pulse** | Percussion | rhythm / tempo / timing windows |
| **Consonance & Dissonance, the Twins** | Harmony (two-as-one) | duality — a two-phase fight; balance consonance vs dissonance |
| **The Maestro, the Downbeat** | Conductor — **FINAL boss** | commands all domains; the downbeat that began everything |

## 5. The ladder (REVISED this session — supersedes the old "6-layer, Finale = end")
| Layer | Name | Arc / role |
|---|---|---|
| L1 | Encore | gold flickers |
| L2 | Magnum Opus | gold warms |
| L3 | World Tour | gold swells |
| L4 | Signature | richer |
| L5 | Virtuoso | near-blaze |
| **L6** | **Canon** (NEW — your work immortalized into the eternal canon; unwitting foreshadow of the gods) | near-peak gold |
| **L7** | **Grand Finale** — the pure mortal triumph / the apparent end | **PEAK gold** |
| **L8** | **Redemption ("Come")** — the fall (hiatus/flop), then the gods' invitation to rise again; escalating conditioned Finale re-climbs (2–3) | black floods → a fighting flicker |
| **L9** | **The gods** — confront the pantheon in the eternal dark | deepest black, gold a cold point |

**The keystone twist (L7 → L8):** the Grand Finale (L7) plays as a pure, *earned* triumph — the last note,
the end of the song (let it land; even fake credits). Then you **fall.** At L8 the mask cracks: the
applause was never mortal — it was *them*, and the gods **engineered the fall to test you.** "Come — rise
again; prove the first time was no accident." Redemption is the trial; surviving it earns the L9 audience.
Keeping the triumph clean and dropping the rug-pull AFTER it hits harder than twisting the Finale itself.
The gold→black pivot is the **fall at L8** (the orb nearly snuffed; redemption fights it back to a flicker;
L9 it's a cold brilliant point in the void).

## 6. Beat triggers
The beat system fires on: **(a) the cold-open intro** (first play), **(b) Platinum** (a non-reset
milestone — first contact), **(c) each layer's first reset** (L1–L7), and (future) **(d) L8 Redemption**
(the fall/"Come" + a beat per conditioned re-climb) and **(e) L9** (the gods). First-time only per trigger
+ skippable; flag in localStorage.

## 7. Beat copy — FIRST DRAFT (terse, gatekeeper voice; react + refine)
- **Intro (birth, pre-recognition):**
  > Before the first note, there was silence.
  > Then you reached into the dark — and the dark answered.
  *(→ tutorial nudge: the first button glows. "Play.")*
- **L1 Encore:** > You end. And you begin again. The mark of someone who means to be heard.
- **L2 Magnum Opus:** > Not a song now. A *work* — something that outlives its own playing.
- **Platinum (FIRST DIRECT ADDRESS):** > A million voices carry your name. …Who are you, young musician?
- **L3 World Tour:** > The world learns your name. We have always known names. They fade.
- **L4 Signature:** > Now you sound like no one else. Now you sound like *yourself*. …Curious.
- **L5 Virtuoso:** > There is nothing left for the living to teach you.
- **L6 Canon:** > They will play your work when you are dust. The mortals call that immortality. *We* call it a beginning.
- **L7 Grand Finale (pure triumph — the apparent end):**
  > This is the greatest performance of your life. The last note. The end of the song.
  *(let it land as a real ending — silence, maybe fake credits.)*
- **L8 Redemption — the fall, then "Come":**
  > Then — silence. The records gather dust. The world forgets your name.
  > …The applause was never theirs. It was *ours*. Rise again, young musician — show us the first time was no accident. **Come.**
  *(→ the trial: 2–3 conditioned Grand-Finale re-climbs, faster because you're recognized, each harder.)*
- **L9 The gods (reveal + confront):** > Anyone can rise once. You rose again. Now — *stand with us.* *(pantheon named here, first time)*

## 8. Build scope
- **NOW:** cold-open intro + the reusable beat-system (triggers, gold/black arc param, skip, first-time
  flags), with L1/Platinum/Intro copy wired. Later layers just add copy.
- **FUTURE (world-building, not this build):** L6 Canon mechanic, L7 Grand-Finale fake-ending sequence,
  L8 Redemption (2–3 conditioned Finale re-climbs — challenge DNA at the layer scale), L9 pantheon boss
  fights (also built on the L3-challenge DNA).
