# Achievements Overhaul — Proposal (for Vince's review)

> ## ⚠ SUPERSEDED 2026-06-29 — historical proposal
> This 2026-06-24 draft (and the later `ACHIEVEMENTS-V2-SPEC.md` "keep ~70, no culling" lock) are
> **superseded** by the 2026-06-29 cull: achievements went **376 → 100**, cutting ~285 number/time-padding
> filler and curating for depth (commit `fb18542`). The governing rule now is **no-filler / meaningful-only**
> (memory: `achievements-no-filler`). The pacing sim's "reward every ≤20 min" gap gate that drove the filler
> was retired. **Current source of truth:** `src/core/achievements.ts` + `HANDOFF.md`. Read this doc only for
> historical naming/voice ideas, not as the active plan.

## The two real problems

1. **They flood early.** ~18 of the current 49 fire in the first hour, because every raw-Soundwave milestone
   (100 / 1k / 1M / 1e9) and every "own 1 of tier X" + first tempo upgrade all trip within minutes of each
   other. It reads as a confetti dump, not a drip.
2. **Fit & coverage.** The song-pun names are genuinely good, but a few sit on generic milestones where the
   joke would land harder elsewhere (your example: *Another One Bites the Dust* deserves an **Encore**, not
   "1,000 Soundwaves"). And **Layer 2 has almost no achievements** — nothing for Conducting, Crescendo, Going
   Platinum, the Opus tree, or records. That's the richest new content and it's unrewarded.

## Re-pacing principles

- **Drip, don't dump.** Aim for roughly one unlock every few minutes early, widening as you go.
- **Gate on ACTIONS, not raw SW.** Soundwaves explode exponentially, so SW thresholds bunch up. Tie more
  achievements to deliberate acts — Encores, Magnum Opuses, tiers owned, conducting, going platinum.
- **Thin & spread the SW ladder.** Keep a few iconic ones, spaced wide: 100 → 1e6 → 1e15 → 1e50 → 1e100 → 1e200.
  Drop the redundant 1,000 / 1e9 mid-rungs (or repurpose their names).
- **Keep the easter eggs** (Rickroll = exactly 42 Notes, Nyan = exactly 999, Sandstorm = 1e20/s) as surprises.

## Name re-maps (the fit pass — only the ones that change)

| Name | Was | Becomes | Why it fits better |
|---|---|---|---|
| **Another One Bites the Dust** | 1,000 Soundwaves | **Your 1st Encore** | A performance ends → you go again. Your call, and it's the right one. |
| **One More Time** | 1st Encore | **10 Encores** | Daft Punk's looping refrain = the grind of repeated encores. |
| **The Final Countdown** | 1e50 SW | **Reach the Grand Finale wall** | The countdown to the ultimate reset, not a mid SW rung. |
| **Don't Stop Me Now** | 600 BPM | **Auto-conduct unlocked** | The hall keeps swelling without you — unstoppable. |
| **Purple Rain** | 500 of a tier | **Enter the Magnum Opus era** | The stage turns violet at MO — the visual + the song. |
| **We Are the Champions** | own 1 Symphony | *(keep)* | Queen triumph on your first Symphony — already perfect. |
| **Is This the Real Life?** | own 1 Note | *(keep)* | Bohemian's opening line on your very first note — perfect. |

(Everything not listed keeps its name; we just re-space the *threshold* per the pacing principles.)

## New — Layer 2 achievements (witty, contextual)

| Name | Unlocks on | Note |
|---|---|---|
| **Raise the Baton** | First time you Conduct | Your first crescendo build |
| **Turn It Up to Eleven** | Hit the crescendo ceiling (max) | Spinal Tap — push the swell to the top |
| **Studio Time** | Buy your first Opus upgrade | Entering the OP tree |
| **Gold Record** | 100,000 records sold | Real certification ladder… |
| **Going Platinum** | 1,000,000 records → Platinum | The L2 breakthrough — the marquee one |
| **Diamond Hands** | 10,000,000 records sold | Post-Platinum fame climb |
| **Set It and Forget It** | All tier auto-buyers unlocked | The idle-late on-ramp |
| **The Whole Catalogue** | Max one full OP track | Mastery of a track |
| **Sold Out Tour** | Reach a packed-house era (deep MO) | Ties to the hall filling |

## Images

Per your steer: **no Gemini burn.** Plan = icon/emblem fallback now (already works), then a curated pass of
**free/public-domain** imagery (Wikimedia Commons CC0 — composers, instruments, halls, vinyl) for the marquee
achievements (Going Platinum, Grand Finale, Magnum Opus, We Are the Champions). The rest keep the clean icon
fallback. Sourced + attributed in its own pass; not blocking the name/pacing work.

## Open questions for you
1. **Naming voice** — keep it all real song-titles, or mix in original orchestral wit (e.g. "Raise the Baton")?
   The L2 ones above lean original since song-titles are thinner for conducting/records.
2. **Count** — 49 now + ~9 new L2 = ~58. Good, or trim?
3. **Hidden achievements** — show locked ones as "???" (mystery) or list them greyed with the condition visible?
