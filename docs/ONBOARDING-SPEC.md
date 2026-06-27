# First-run onboarding (L0) — light, dismissible mechanical guidance

**Status:** LOCKED 2026-06-28. Goal: a brand-new player understands the first action + each new control as
it appears, and is NEVER nagged. MECHANICAL ("what this button does") — distinct from the narrative story
beats (which stay about the story). Idle-game appropriate: subtle pulse + small dismissible cards, no modal
walls, every hint shown at most once and persisted as seen.

## Scope (light)
1. **First-action highlight.** On a fresh save (no progress), pulse/highlight the first tier buy button with a
   one-line "Compose your first note." It clears the moment the player buys their first tier.
2. **Just-in-time control explainers** — a small dismissible card the FIRST time each control becomes
   available, 1–2 sentences, then never again:
   - Tempo/Conduct first usable → "Hold to conduct — a temporary production surge."
   - Warm-Up unlocks (3rd tier) → "Keep playing to fill Warm-Up for a production bonus; it fades when idle."
   - Encore first available → "Prestige: reset for a permanent multiplier."
   - Magnum Opus first available → one line on the L2 transition.
   - World Tour unlocks → one line; the Challenges panel unlocks → one line.
3. All hints **dismissible + persisted** (shown at most once). Respect existing saves: a save with progress
   seeds all already-passed hints as seen (mirror `seedSeenStoryBeatsFromProgress`).

## Implementation (light)
- State: `seenHints: string[]` on GameState (default `[]`); a `markHintSeen(id)` store action. Migration: for
  existing saves, seed hints whose milestone already passed (so they don't fire retroactively).
- A tiny `useOnboardingHint()` hook + a small `<HintCard>` / highlight wrapper. Reuse the story-beat
  show-once pattern (`src/components/story/*`) as the model — do NOT reuse the beat overlay UI (that's the
  fullscreen narrative one; hints are small inline cards).
- Gate each hint on the same signals the features use (tiers[n].purchased, encore/MO availability,
  worldTourUnlocked, isWarmUpUnlocked, challenge unlock).

## Constraints
- Never block input; never re-show a dismissed hint; no hint during offline-return or mid-prestige.
- Don't duplicate story-beat copy. Keep each hint ≤2 short sentences.
- Codex builds; Claude gates (tsc + build + full suite). No new sim needed (UI/flag only), but confirm
  existing sims still pass (the `seenHints` field must default cleanly via createInitialState / B5 migration).
