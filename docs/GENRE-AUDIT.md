# Genre Audit + Concept Proof-Test — Sonance vs the incremental/idle genre

> **Status (2026-06-29):** prompt READY; awaiting Vince to run it in **Gemini Deep Research** and paste the
> report back (likely in a FRESH session — this thread is a clean handoff point). Then we walk the findings
> one-by-one and graduate the real ones into `MECHANICS-BACKLOG.md`.

## Why this exists
Vince read r/incremental_games threads and saw heavy criticism/ideas for AD-style idlers. Goal: pressure-test
Sonance against the genre's collective wisdom **before** investing further in L4–L9.

## Alignment decisions (from the Q&A that scoped the prompt)
- **Goals (all):** audit & harden current L0–L3 · inform L4–L9 design · mine net-new mechanics · commercial/
  launch lens · proof-test whether the L0–L3 **concept** stands on its own out there.
- **Audience lens = HYBRID:** AD-level depth + welcoming (strong onboarding/QoL); idle-first, active play
  rewarded but never required. Judge all findings against this player.
- **Framing = genre-general catalog** (we map to Sonance together live) **+ one dedicated Sonance concept
  critique** section. Do NOT pre-map every criticism to Sonance.
- **Breadth = AD-lineage spine** (AD, Trimps, Synergism, NGU, Increlution, Kittens, Your Chronicle, Realm
  Grinder, Universal Paperclips…) **+ a clearly-flagged ADJACENT** sidebar of portable lessons from mobile/
  casual/ad idlers (Cookie Clicker, idle-tycoons) with the audience caveat.

## Processing plan (when the report comes back)
1. Paste the report (in category chunks if huge).
2. Walk Part A **C1, C2, …** one-by-one: tag each **✅ handled / ⚠️ partial / ❌ gap / N/A**, with a concrete
   fix + effort estimate for the ⚠️/❌ ones.
3. Part B (concept proof-test) = the gut-check: does the whole thing hold up, what's differentiated vs derivative.
4. Part C (commercial) = launch/discoverability/monetization notes.
5. Graduate the real, agreed items into `docs/MECHANICS-BACKLOG.md` (one at a time, per the no-mid-build-pivots rule).

## The Gemini Deep Research prompt (verbatim — reusable / re-runnable)

```
ROLE & GOAL
Act as a senior game-design researcher specializing in incremental/idle games.
Deliver THREE things:
  (A) a genre-general, numbered catalog of the recurring CRITICISMS / anti-patterns
      AND the praised best-practices & innovations of incremental/idle games;
  (B) a critical "proof-test" of one specific game concept (described below) —
      would it stand on its own out there, what's strong, what's risky or derivative;
  (C) a commercial/launch-viability read for this kind of game.
Prioritize player-voiced, recurring sentiment over one-off opinions; flag where
opinion is contested. Be specific and critical — assume an experienced developer
who wants signal, not "just make it fun".

AUDIENCE LENS (apply throughout)
Evaluate against a "HYBRID" target: Antimatter-Dimensions-level depth and long game,
BUT welcoming — strong onboarding/QoL so newcomers stick; idle-first (always viable
to leave alone), with active play REWARDED, never REQUIRED. Judge criticisms and
recommendations by whether they serve that hybrid player.

SCOPE OF SOURCES / GAMES
PRIMARY spine: the AD-lineage enthusiast canon — Antimatter Dimensions, Trimps,
Synergism, NGU Idle, Increlution, Kittens Game, Your Chronicle, Realm Grinder,
Universal Paperclips, etc. SECONDARY (clearly labeled "ADJACENT — mobile/casual,
audience differs"): transferable insights from Cookie Clicker, mobile idle-tycoons,
and ad-driven idlers — include only genuinely portable lessons, with the caveat.
Lean on r/incremental_games (design/complaint/recommendation threads), Steam & web
reviews, design essays/postmortems, and community wikis.

PART A — GENRE-GENERAL CATALOG (the bulk; keep it general, do NOT pre-map to the
concept in PART B). Number EVERY item (C1, C2, C3 …) so each can be discussed
individually. Group by category and cover at least:
  - Pacing: walls, grind, dead zones, "nothing to do but wait", late-game slog,
    tedious re-climbs after a prestige reset.
  - Active vs idle balance: punishing idling; demanding constant clicking; how the
    best games reward active play without requiring it.
  - Prestige/layer design: too many layers, same-y layers, resets that feel bad,
    unclear what-resets/what-you-gain, reset anxiety, respec regret, layer bloat.
  - Number scaling & legibility: big-number formatting, growth that stops feeling
    meaningful, opacity of "what multiplies what", milestone/threshold clarity.
  - Achievements: filler/grind-gated vs meaningful; achievements as hidden power.
  - Offline & QoL: offline earnings done wrong; missing autobuyers/bulk-buy/buy-max;
    save import-export; mobile & cloud; settings/accessibility.
  - Onboarding & UX: confusing first hour, walls of text, undiscoverable mechanics.
  - Content cadence: running out of content; "fake length" via grind; content gated
    behind huge waits; replayability.
  - Theme & narrative: do players want story in idlers, or does it get in the way?
    when does theme elevate vs distract?
  - "AD-clone" fatigue: what makes a derivative feel soulless vs a worthy successor.
  For EACH numbered item: **Title** · one-line summary · frequency/strength ·
  example game(s) · root design cause · recommended fix / what good games do instead.

PART A2 — PRAISED INNOVATIONS WORTH STEALING
A numbered list (I1, I2 …) of standout mechanics/systems/UX the community celebrates
across the genre, what game they're from, and why they work.

PART B — CONCEPT PROOF-TEST (the ONLY Sonance-specific section; be candid/critical)
Concept under test — "Sonance", a web+desktop incremental, AD-inspired, orchestra/
music themed:
  - Core loop: buy tiers of producers (Notes → … → Symphonies), milestone "buy-10"
    multipliers, a tempo/tick-speed production multiplier.
  - A 9-LAYER prestige ladder; each resets the ones below and grants a new currency +
    a new automation of the layer beneath: Encore (Applause) → Magnum Opus (Opus
    Points + upgrade tree) → World Tour (records → Platinum → Acclaim) → Signature
    (a zero-sum "identity" allocation across 5 instrument domains) → … up to Layer 9.
  - Active verb "Conducting": hold to build a Crescendo (large TEMPORARY production
    burst), unlocked after the first Magnum Opus. Idle always viable.
  - Also: offline earnings, curated achievements (meaningful-only, no number-padding),
    constraint "challenges", and a light narrative via cold-open story beats.
  - Free, no ads/IAP. L0–L3 live; L4–L9 in development.
Assess critically:
  1. Does this concept stand on its own, or read as another AD reskin? What's
     genuinely differentiated vs table-stakes?
  2. Strongest ideas; weakest/riskiest ideas (esp. a 9-layer ladder, the zero-sum
     "Signature/identity" layer, conducting-as-active-verb, narrative in an idler).
  3. Where, against PART A, is this concept most likely to draw the catalog's
     criticisms? Which Cn items are the biggest landmines for THIS design?
  4. What would the r/incremental_games crowd most likely praise vs tear apart?

PART C — COMMERCIAL / LAUNCH VIABILITY
What makes incrementals succeed or flop (web/itch/Steam): discoverability, demo/
release norms, pricing/monetization expectations for the hybrid audience (free vs
one-time vs the ad/IAP models players resent), retention/first-session benchmarks,
and how comparable titles found their audience.

OUTPUT FORMAT
- Part A & A2 fully numbered (C#, I#) for one-by-one discussion.
- Parts B & C as focused prose with clear sub-headers.
- End with three lists: "Top 10 mistakes to avoid", "Top 10 things to get right",
  "Most-praised innovations worth adopting".
- Cite sources (links) per claim where possible; mark ADJACENT (mobile/casual) items.
```
