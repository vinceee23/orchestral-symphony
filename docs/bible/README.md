# Sonance — Game Bible

> **What this game is.** Sonance is an orchestral-themed **idle/incremental** (clicker /
> prestige) game built as a React 19 + TypeScript + Vite single-page app with a Zustand store and
> `break_infinity.js` for big numbers, shipped to both **GitHub Pages** (web) and **Electron** (desktop).
> The player conducts an orchestra, grows production through a tiered economy, and climbs a **9-layer
> prestige ladder** — each layer resets the layers below it but grants a new permanent currency and a new
> automation that runs the layer beneath it. The arc is also a *story*: a birth→rise→apotheosis→fall→
> redemption→confrontation spine told through cold-open story beats. As of 2026-06-28, **Layers 0–3 are
> feature-complete, balance-gated, and deployed to `master`/Pages** — Encore → Magnum Opus → World Tour, plus
> the early **Warm-Up** active verb, light **first-run onboarding**, and the cold-open + per-layer story
> beats; full suite green (17/17 sim files). **Layers 4–9 are design-locked but not yet implemented** (only
> inert story-beat placeholders exist in code). See **`HANDOFF.md`** (repo root) for the live snapshot and
> two balance calls awaiting Vince's confirmation. (Citations below still reference `feat/layer3`, now merged
> to `master` — the code is identical.)

This bible is **code-grounded**: every load-bearing claim is cited to a `file:line` on `feat/layer3`, and
every known place where the **design docs and the live code diverge** is flagged explicitly. Trust the code
citations over prose — constants move.

---

## Table of contents

| # | Section | What it covers |
|---|---|---|
| **00** | [How to work here](./00-how-to-work-here.md) | **THE METHOD.** The working discipline that made development succeed: gate-before-commit, delegate-to-CLI, verify-before-fixing, lock-plans-first, the data/account policy, sequential agents. Read this before touching code. |
| **01** | [Architecture](./01-architecture.md) | Stack, `src/` layout, the dual Zustand stores, `GameState` shape, persist/migration pipeline, the RAF tick loop + `calculateTick` + automation orchestration, offline replay, Decimal gotchas, dev flags, npm scripts, the sim suite as the balance gate. |
| **02** | [Economy, formulas & resets](./02-economy-formulas-resets.md) | The single production-multiplier funnel (every factor + cap), achievement-multiplier aggregators, all caps/clamps, the L1/L2/L3 economy formulas, and the code-verified **reset matrix** reconciled against the four `perform*` functions. |
| **03** | [Built systems (L1–L3)](./03-built-systems.md) | The shipped systems in detail: L1 Encore ladder + prestige + AP currency + auto-encore; L2 Magnum Opus + records→Platinum + Opus tree + crescendo; L3 World Tour (venues, components, automations, `performTour`); the 12 challenges; the 5-beat cold-open story engine. |
| **04** | [Forward design (L4–L9)](./04-forward-design-L4-L9.md) | The locked-but-unbuilt layers: each layer's axis + mechanic (Signature, Virtuoso, Canon/Palimpsest, the harmonic-mean drain, the Gauntlet, the boss-FSM finale), the reset/persist matrix, build order, cross-layer dependency map. |
| **05** | [Narrative & world](./05-narrative-world.md) | The story spine, the collective-gatekeeper "we/mortals" voice, the gold→black motif, the 6-god pantheon, the L7→L8 fake-credits twist, and the full locked v2 beat copy verbatim with triggers. |
| **06** | [Hardening decisions & open work](./06-hardening-decisions-openwork.md) | The red-team verdict (front-half-sound / back-third-holes), the 4 LOCKED decisions, the 5 blockers + verified status, the permanence forms, and the annotated "what's next" sequence. |

---

## Read order for a new session

1. **Start with [00 — How to work here](./00-how-to-work-here.md).** It is the most important file: it is
   what stops a fresh session from mis-building. Internalize the gate, the delegation model, and the
   verify-before-fixing rule before you write or change anything.
2. **Then [01 — Architecture](./01-architecture.md)** for the runtime model and how to run/build/test/gate.
3. **Then [02](./02-economy-formulas-resets.md) + [03](./03-built-systems.md)** for the live game reality
   (the economy and the systems that actually ship).
4. **[06 — Hardening](./06-hardening-decisions-openwork.md) before [04](./04-forward-design-L4-L9.md):**
   read the locked decisions and the verdict *first*, so the forward design reads in the right frame.
5. **[05 — Narrative](./05-narrative-world.md)** any time — it is the creative spine and informs all
   layer naming, copy, and the late-layer twists.

> **One standing caution carried by every section:** the design docs and the code *diverge in known
> places* (e.g. the Opus tree persisting through Magnum Opus, the live `performGrandFinale` being a
> leftover 6-layer infinity-prestige, the LIVE capstone-challenge exploit). Each divergence is flagged in
> its section's DIVERGENCE table. **Never treat a design doc as ground truth without checking the cited
> code.**
