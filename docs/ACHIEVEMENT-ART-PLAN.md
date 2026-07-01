# Achievement Art — Status & Resume Plan

**STATUS: 65 / 100 done — IN PROGRESS.** 35 remaining (all thematic/game + perk emblems; every song
reference is complete). Halted 2026-07-01 when Gemini prepay credits ran out mid-batch.

**To resume (future session, after topping up Gemini):**
1. Top up the Gemini project at ai.studio/projects → Billing (~$1.50–2 covers the rest + regens).
2. Read `docs/ACHIEVEMENT-ART-WORKFLOW.md` for the full locked style + pipeline (and the CRITICAL
   `env -u GEMINI_API_KEY node --env-file=.env` credit-key gotcha).
3. Generate each remaining item with the proposed subject below (tap-confirm/adjust with Vince first if he
   wants), e.g.:
   ```
   env -u GEMINI_API_KEY SUBJECT="<subject>" [SONG="<Song> - <Artist>"] OUT="drafts/pilot-<id>.png" \
     node --env-file=.env art/gen-emblem-styled.mjs
   ```
   QA in a grid, then `cp drafts/pilot-<id>.png public/achievements/<id>.png`, then gate + commit.
4. Recompute remaining anytime: list `public/achievements/*.png` vs the `id:` list in
   `src/core/achievements.ts` (a png named `<id>.png` = done).

**Credit-free alternative in flight:** Codex is trying to make the LOCAL ComfyUI/AMD rig match our style
(see `drafts/local-match/FINDINGS.md` + `compare.png` when it finishes). If that lands, the remaining can be
generated with zero credits.

---

## Remaining 35 — proposed subjects (grouped for coordination; confirm/adjust at gen time)

Style is constant for all (flat 2D, black body + gold accents, concentric ring glow, near-black navy,
faceless people, text only if clean). Proposed subjects are coordinated to NOT clash with what's already
made. These are game-milestones (no song), so usually no `SONG` hint.

### ⚠️ Needs a specific redo
- `ach_second_movement` — **Second Movement** → Roman **"II" from two mixer faders**, to MATCH
  `ach_third_movement` (which is "III" from three faders). (The earlier attempt came out as ambiguous
  dotted domino columns — that's why it's unmade.)

### Magnum-Opus count (matches done: Double Feature=2 reels, Three-peat=3 medals, Sold Out Tour=SOLD OUT stack, Perfect Ten=scorecard 10)
- `ach_twenty_pieces` — Twenty-Twenty Hindsight → a pair of round "20/20" spectacles / eye-chart
- `ach_the_long_game` — The Long Game → a chess king piece

### Opus-tree (matches done: Whole Catalogue=books, Third Movement=III faders, Maestro=conducting hands)
- `ach_tree_legacy` — Legacy Recording → a large master tape reel (a "legacy master")

### Symphonies
- `ach_symphony_horde` — Orchestra Pit → an orchestra pit: rows of music stands/seats
- `ach_symphony_forty` — Full Orchestra → a full-orchestra semicircle silhouette

### Automators / conducting (make the bots a matching sub-family)
- `ach_raise_baton` — Raise the Baton → a single conductor's baton raised with a motion flourish
- `ach_studio_time` — Studio Time → a glowing "ON AIR" studio sign (clean text)
- `ach_crescendo_forte` — Mezzo Forte → a musical crescendo hairpin `<` swelling into a soundwave
- `ach_session_player` — Session Player → a robotic arm strumming
- `ach_melody_machine` — Melody Machine → a wind-up music box emitting notes
- `ach_harmony_bot` — Harmony Bot → a cute robot head singing harmony notes
- `ach_set_forget` — Set It and Forget It → a toggle switch flipped to "AUTO"
- `ach_perk_session_musicians` — Session Musicians (perk) → a row of small robot musicians
- `ach_autopilot` — Set the Tempo, Walk Away → a faceless figure walking away as instruments play themselves

### Records / sales (matches done: Gold=framed gold disc, Platinum=silver disc, Diamond Certified=faceted diamond, Cultural Icon=fame halo)
- `ach_diamond_hands` — Diamond Hands → two firm hands encrusted with diamond facets (meme)
- `ach_royalty_check` — Royalty Check → an oversized royalty cheque
- `ach_blitz_platinum` — Blitz Platinum → a platinum disc streaking with speed lines
- `ach_a_side` — A-Side Single (perk) → a 7-inch 45 single record labeled side "A"

### Encore / prestige feats
- `ach_purist` — The Purist → a serene lotus / zen circle (restraint, no-tempo)
- `ach_flash_encore` — Flash Encore → a stopwatch with speed lines
- `ach_prodigy` — Prodigy → a radiant lightbulb of talent (avoid star/medal — those are used)
- `ach_remaster_wall` — Back to the Wall → a determined faceless figure braced against a barrier (NOT a plain brick wall — that's Another Brick)
- `ach_encore_of_encores` — Encore of Encores → a theater curtain with a shower of stars
- `ach_perk_skip_wall` — No Encore Required (perk) → a glowing doorway/portal through a barrier (a shortcut)
- `ach_perk_muscle_memory` — Muscle Memory (perk) → a flexed arm with subtle memory-loop/circuit lines
  (note: P2 re-gates this perk to an early achievement, but the emblem is still needed)
- `ach_perk_warmup` — Sound Check (perk) → a microphone emitting a test soundwave
- `ach_perk_sustained_note` — Legato to the Limit (perk) → a long sustained note under a legato slur arc
- `ach_perk_second_wind` — Curtain Call (perk) → a single stage curtain parting with a spotlight/bow
  (keep distinct from Encore-of-Encores' star-curtain)

### Completionist
- `ach_renaissance` — Renaissance → a Vitruvian-style faceless figure in a circle
- `ach_polymath` — Polymath → a graduation mortarboard cap (avoid laurel — that's Magnum)

### Prestige finale (make these a cosmic family)
- `ach_the_sonance` — The Sonance → a radiant mystical orb of pure soundwave (the game's phenomenon; echoes the orb logo)
- `ach_big_bang` — Big Bang → a cosmic explosion / supernova burst of light + particles
- `ach_grand_finale` — Grand Finale! → a grand fireworks burst
- `ach_grand_tour` — Grand Tour → a passport covered in tour stamps (avoid globe — that's Around the World)

---

## What's already DONE (65) — do not regenerate
Every song reference + all multi-song artists (Queen, Beatles, MJ, AC/DC, Beethoven, Daft Punk, Pink Floyd),
the records/awards tier (gold/platinum/diamond/cultural icon), the Magnum-Opus-count puns (double feature,
three-peat, sold out tour, perfect ten), and part of the opus-tree (whole catalogue, third movement, maestro)
+ Vivaldi, Twinkle, Sound of Silence, Climb Ev'ry Mountain. Check `public/achievements/*.png` for the exact set.
