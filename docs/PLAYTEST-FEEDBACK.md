# Playtest feedback — 2026-07-01 (Vince, live testing on feat/layer4)

Captured during in-app testing of the §D1 build pass. Status: ✅ done · 🔜 queued · 🔎 needs-repro · 💬 discuss.

## ✅ Done this session (tsc clean; conducting pending sim re-gate)
- **Stats black screen** — root cause: `useGameStore((s) => getProductionBreakdown(s))` returned a new array
  each call → looped `useSyncExternalStore` → blank. Fixed: derive from the whole-store value.
- **Conducting faster burst** — `CRESCENDO_BUILD_SEC` 12→4 (punchy ramp), `CONDUCT_BURST_MS` 15s→9s
  (burst duration), `CRESCENDO_DECAY_SEC` 25→12. Re-gating sims (balance-critical).
- **Cleaner numbers** — `formatCost` 2→1 decimal (e.g. `2.51K` → `2.5K`).

## 🔜 Queued — Settings v2 (cohesive batch)
- **Settings as a nav tab** below Stats (remove the Header gear); render as a page, not a modal.
- **Re-enable confirmations → a toggle** (currently a button).
- **Hard Reset → dedicated in-app UI** (replace the `window.prompt` type-RESET).
- **Frame-rate readout** — the cap works but is invisible; add a live FPS counter so it's verifiable.
- **Configure hotkeys in Settings** — let the player rebind 1-7 / M / T / conduct.

## 🔜 Queued — bigger / separate
- **Save/Load dedicated UI** themed to the **destination save's era** — on import, preview the incoming
  save's era + key stats with that era's color before confirming; export themed to current era.
- **Per-reset-layer mechanic tutorial** — when you reach a new prestige layer, a small tooltip/tutorial of
  the new mechanics; disable-able in Settings; plus a first-time meta-tooltip noting it can be disabled.
  (Extends the existing `useOnboardingHint` / HintCard system + B4.)

## 🔎 Needs repro
- **Max-all hotkey (M)** "doesn't work." Code looks correct on inspection (`useHotkeys` maps `m` → buyMaxTier
  all tiers + buyMaxTempo; `buyMaxTier` guards on unlocked + affordable). Need: do 1-7 and on-screen Buy Max
  work? (isolates hotkey-plumbing vs buyMax vs just-nothing-affordable.)

## 💬 Discuss
- **The "gods" (L9)** — what the 6-god pantheon looks like (5 domain gods: Pulse/Voice/Blaze/Breath/Twins +
  Maestro). Tie to `docs/build-specs/L9-the-gods.md` + `bible/05-narrative-world` + the L4 Signature mirror.
