# Story & World Spec — the cold-open, the beat system, the pantheon

Status: **draft for Vince's sign-off (2026-06-27).** Narrative direction locked via Q&A this session;
the beat COPY below is a first draft to react to, not final. Build target: the cold-open intro + the
reusable story-beat system (L1 copy first). The L8 gods battle + L6 mechanic are future world-building
that this spine sets up.

## 1. The spine (one emotional arc)
**Birth → Rise → Apotheosis → Invitation → Confrontation.**
A musician is born from silence, rises through the craft, reaches a mortal peak — and discovers the peak
was a disguised invitation from the gods of music to join (and face) them in the eternal dark.

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
Six gods. Four instrument families + one concept-twin + the Conductor (final boss). Each is an L8
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
| **L7** | **Grand Finale — the invitation masked as the achievement** | **PEAK gold → the mask cracks** |
| **L8** | **The gods** (confront the pantheon in the eternal dark) | black deepens, gold a cold point |

**The keystone twist (L7):** the Grand Finale presents as the ultimate triumph / the end (possibly fake
credits). Then the beat turns — the applause was never mortal; it was *them*. The Finale was the gods'
**audition**, and you passed. The achievement IS the mask; the invitation IS the truth. This is where the
gold→black pivot happens narratively, not just visually.

## 6. Beat triggers
The beat system fires on: **(a) the cold-open intro** (first play), **(b) Platinum** (a non-reset
milestone — first contact), and **(c) each layer's first reset** (L1–L7), plus **(d) L8** (future).
First-time only per trigger + skippable; flag in localStorage.

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
- **L7 Grand Finale (mask → turn):**
  > This is the greatest performance of your life. The last note. The end of the song.
  > …The applause does not stop. It was never theirs. It was *ours*. **Come.**
- **L8 The gods (reveal + confront):** > You stand where the greats stand. Now — *show us.* *(pantheon named here, first time)*

## 8. Build scope
- **NOW:** cold-open intro + the reusable beat-system (triggers, gold/black arc param, skip, first-time
  flags), with L1/Platinum/Intro copy wired. Later layers just add copy.
- **FUTURE (world-building, not this build):** L6 Canon mechanic, L7 Grand-Finale fake-ending sequence,
  L8 pantheon boss fights (built on the L3-challenge DNA).
