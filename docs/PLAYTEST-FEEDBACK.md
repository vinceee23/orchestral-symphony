# Playtest feedback — 2026-07-01 (Vince, live testing on feat/layer4)

Captured during in-app testing of the §D1 build pass. Status: ✅ done · 🔜 queued · 🔎 needs-repro · 💬 discuss.

## ✅ All build items DONE + committed (gated: tsc · 80 src tests · build · sims for conducting)
- **Stats black screen** — `getProductionBreakdown` used as a Zustand selector returned a fresh array each
  call → looped `useSyncExternalStore` → blank. Fixed: derive from the whole-store value. (`b5f84d6`)
- **Conducting faster burst** — `CRESCENDO_BUILD_SEC` 12→4, `CONDUCT_BURST_MS` 15s→9s, decay 25→12. Sim
  re-gated, idle:active band intact. (`80dee89`)
- **Cleaner numbers** — `formatCost` 2→1 decimal (`2.51K` → `2.5K`). (`80dee89`)
- **Settings as a nav tab** (below Stats, gear removed) rendered as a page. (`b5f84d6`)
- **Re-enable confirmations → toggle.** (`b5f84d6`)
- **Hard Reset → in-app type-RESET dialog** (replaces window.prompt; removed from Stats Danger Zone). (`b5f84d6`)
- **Frame-rate readout** — live FPS counter beside the cap. (`b5f84d6`)
- **Configure hotkeys** — rebindable Conduct / Max all / Max tempo; schema v3→v4. (`7f09883`)
- **Per-layer mechanic tutorial** — disable toggle + L4 Signature hint + "turn off in Settings" note;
  fixed stale "Hold to conduct" text. (`7204483`)
- **Save/Load era-themed UI** — import preview themed to the incoming save's era + stats; Import disabled
  until valid. (`91732ba`)

## ✅ Resolved (was 🔎 needs-repro)
- **Max-all / all hotkeys "don't work"** — was the Stats infinite-loop FREEZING the whole React app
  (so keydown handlers died) until reload. Fixed with the Stats black-screen fix; hotkey system also
  hardened (defensive binding reads). **Hard-refresh once on the latest build to confirm.**

## ⚠️ Note for Vince
- **"Settings reset on refresh"** was an HMR artifact (live-editing the store module re-inits it mid-session),
  NOT a persistence bug — proven by a round-trip regression test. Hard-refresh on the committed build and
  settings persist.

## 🎺 Gods (L9) — visual direction DECIDED (2026-07-01)
Canonical data in `src/core/pantheon.ts`. Art direction:
- **Faceless figures, aura = character** (Journey/Sky language). Pure VOID where a face would be.
- **Human-scale, uncanny** — incl. the Maestro (the god who began everything is *your size*; you become
  the next downbeat). The mirror god = your domain's god, in your tint, where you'd stand.
- **Instrument-fused silhouettes**: Timpana=drumhead torso · Lyra=strung sounding-box · Clarion=brass-bell
  flare (made of light) · Aeolia=hollow reed-body · Twins=two tines of one tuning-fork (the interval) ·
  Maestro=plays the orchestra (the cold-open orb taking figure).
- **Per-domain cold tints** = the Maestro's gold split through a prism (gold #d4a843; crimson/violet/amber/
  teal/jade for the five). Behavior carries identity (Pulse strobes, Breath breathes…).
- **"Now you know our faces"** = the formless "we" takes FORM (figures), never literal faces.
- **Seeded early** (`9f…`): the L4 "your sound" identity now glows your god's tint + "…echoing Timpana,
  the Pulse." The cold-open orb already IS the Maestro (gold, breathing, reached back) — no code needed.
- Still open / next: orb performing other fingerprints on the (currently inert) L4–L9 beats; the Twins'
  two-phase fight; the join-the-pantheon ending. L9 itself is gated far out (build last).
