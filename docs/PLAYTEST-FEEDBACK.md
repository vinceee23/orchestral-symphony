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
Canonical data in `src/core/pantheon.ts`. **MATCHED concept-art set: `drafts/pantheon/*.png`**
(timpana/lyra/clarion/aeolia/twins/maestro; locked spec: thin double gold rule-frame · soft domain nebula ·
gold line + soft glow · faceless starlight head · Maestro = gold orrery). Earlier passes (humanoid + the
inconsistent constellation pass) moved to `drafts/_archive/gods-retired/`.
*(Tiny nit on the set: Clarion + Maestro rendered with a faint light matte around the plate; crop to the
black edge for a perfect match.)*
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
- Still open: the Twins two-phase fight; the join-the-pantheon ending. L9 gated far out (build last).

### Cold-open progressive pantheon reveal (forward design, 2026-07-01)
Vince's idea: the per-layer cold-open quotes don't just show the breathing gold orb — across the climb they
**reveal the pantheon**, the visual companion to the narrator's fingerprint breadcrumbs. Locked shape:
- **Hybrid accumulate + matched:** each cold-open glows in the god whose fingerprint the narrator drops that
  beat (text "the Pulse" → Timpana's constellation lights up), and they ACCUMULATE — the night sky fills
  with gods as you rise.
- **Faint, building:** barely-there at first (attentive players notice the watchers gathering), full
  presence by L9. Eerie.
- **Render = animated SVG/CSS line-constellations** (built FROM the `drafts/pantheon/` concept art): stars light
  up, lines draw themselves in, glow + the "blink"/stir in each god's rhythm. Stays in the cold-open's
  no-images ritual; fully animatable.
- **L9 payoff:** entering the gods' domain, all glimpsed constellations wheel together into the
  **Maestro-orrery** (gold origin orb at center) — the culmination of the whole climb's reveal.
- Status: FORWARD design (L4–L9 cold-open beats are inert today; needs the SVG-constellation system + beat
  wiring). Live-beat seed possible later (intro/encore/MO/platinum/world_tour). Builds on the L4 "your
  sound" god-tint seed (`1c2f770`).
