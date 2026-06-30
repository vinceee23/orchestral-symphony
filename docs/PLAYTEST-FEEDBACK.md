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
Canonical data in `src/core/pantheon.ts`. **v1 concept art in `drafts/god-*-constellation-v1.png` +
`drafts/god-maestro-orb-v1.png`** (the earlier humanoid pass `drafts/god-*-v1.png` is RETIRED — read too
mundane/uncanny; not celestial enough).
- **CELESTIAL: each god is a vast custom CONSTELLATION** in the gold→black void — a **faceless** deity (head
  a blank of starlight, NO features) drawn in delicate **gold line** over a domain-tinted starfield,
  cradling/playing its instrument, **antique celestial-atlas** style (Flamsteed/Uranometria).
- **Deity WITH instrument** (a muse + lyre, a herald + horn…), drawn star-to-star. Makes *"now you know our
  faces"* literal — you connect the stars into the gods.
- **Maestro = the central gold ORIGIN ORB** (the cold-open orb), the five wheeling around it like an orrery.
- **Per-domain cold tints**: crimson/violet/gold/teal/jade; aura BEHAVIOR carries identity.
- **The "blink" (Vince's idea):** each constellation STIRS in its fingerprint rhythm — stars twinkle, the
  figure flares into clarity then settles, "the we, watching, briefly noticing you." Future CSS animation
  for the L9 hub + cold-opens (Pulse flares on beat, Breath breathes, Twins in/out of phase). Captured.
- **Seeded early** (`1c2f770`): L4 "your sound" glows your god's tint + "…echoing Timpana, the Pulse."
- Minor polish TODO: unify the antique border treatment across the set (some have ornate frames, some torn-
  parchment, some full-bleed). Still open: the per-fingerprint orb animation; the Twins two-phase fight;
  the join-the-pantheon ending. L9 gated far out (build last).
