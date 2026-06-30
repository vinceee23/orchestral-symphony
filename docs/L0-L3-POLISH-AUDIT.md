# L0–L3 Polish Audit — toward the ideal final shippable trial

> Generated 2026-06-30 by a 10-agent ultracode sweep (9 dimension readers + a completeness critic),
> 986k tokens, 106 raw gaps. This is the ranked, actionable plan + live status tracker for the
> L0–L3 polish ship. Branch `feat/layer4` (L4+ gated). Gate before every commit (tsc + full vitest
> + build, real exit code). Source dump archived in the session task output.

**Legend:** ☐ todo · ◐ in progress · ☑ done (committed) · 🅿 proposal-only (needs Vince's playtest/taste) · ⏸ deferred

---

## TIER 0 — Ship-blockers the readers + critic surfaced (SAFE to fix now, non-balance)

These are correctness/integrity/resilience holes, not taste calls. Highest leverage, mostly cheap.

- ☐ **`?l3` URL cheat fires in production** (`gameStore.ts` onRehydrate). Unlike DevPanel (gated on `import.meta.env.DEV`), `?l3` runs in ANY build → instantly unlocks World Tour (opusCount=4, platinum, 750k records), skipping L0–L2. Spoiler/integrity hole on the public trial. **Fix: gate behind `import.meta.env.DEV`.** (S)
- ☐ **GH-Pages base-path bug → art 404s in prod.** `StageHall` uses `import.meta.env.BASE_URL` for the backdrop, but `OrchestraStage` (`/emblems/…`) and `AchievementsPage` (`/achievements/…`) use absolute `/` paths. The trial deploys under the `/orchestral-symphony/` subpath, so emblems + achievement art would 404 in production. **Fix: prefix all asset paths with BASE_URL; verify `vite.config` base.** (S–M)
- ☐ **No global error boundary** — any render throw white-screens the whole trial with no recovery. **Fix: top-level error boundary around AppShell with a "copy your save / hard reset" escape hatch.** (S)
- ☐ **localStorage not hardened.** `setItem` has no try/catch (throws per-frame in private mode / quota); `getItem` returns null on ANY parse error → zustand boots a fresh game and the next autosave **clobbers the corrupt blob** (silent total loss, no backup). **Fix: try/catch setItem (degrade gracefully + one-time banner); on parse failure stash raw bytes to a sidecar key before returning null.** (S–M)

---

## TIER 1 — Chosen autonomous areas (Audio · UI juice · Copy · A11y/Perf) — SAFE, no balance

### Audio / SFX  (#1 priority — biggest sensory gap)
Current: 3 sine-blip one-shots (buy/tempo/prestige); **Conduct/Crescendo, achievements, challenges, World Tour prestige, era step-ups, story beats, venue collect are all SILENT**; no music bed; keyboard buys silent. Engine rewrite already drafted in `audio.ts` (warm triangle bus + reverb + new SFX).
- ☑ **Rewrite `audio.ts`**: master bus + generated reverb, warmer triangle voices, new SFX (conduct phrase, crescendo, achievement, challenge start/complete, milestone, story beat) + a rate-gate for rapid input.
- ☑ **Conduct makes sound** (the core verb) — pentatonic phrase that climbs on repeated taps (fired from the shared `triggerConduct` action → covers button + global Space).
- ☑ **Distinct prestige stings per layer** — `playPrestigeSound(grandeur)`: Encore (1) < Magnum Opus (2, +low foundation) < World Tour (3, +crown/resolve).
- ☑ **Achievement unlock chime** (AchievementToast, one per batch).
- ☑ **Challenge complete sting** (gameStore completion path, fires once).
- ☑ **Input parity (audio)**: keyboard buys (1–7, M, T) now fire buy/flourish SFX on a successful purchase. *(Visual juice parity — section flash/+N pop on keyboard — is the UI batch.)*
- ☑ **Venue collect** cue. (era step-up swell intentionally skipped — it always coincides with a prestige sting; the silent **World Tour auto-unlock** belongs to the celebration task.)
- ☐ Upgrade/component buys still pass hardcoded pitches (buyBuySound(7)/(5)) — minor; map to meaningful pitch later.
- 🅿 **Procedural music/ambient bed** that evolves per era + a separate Music volume slider — needs your ear + a settings-schema/save change. Deferred to a reviewed batch.

### UI / UX juice
- ☑ **FloatingNotes reshuffle fixed**: deterministic module-level note field, sliced by liveliness — notes no longer teleport on prestige (existing notes keep position; higher tiers append).
- ☑ **World Tour distinct icon**: new `globe` icon (was sharing `sparkle` with Prestige).
- ☑ **Story beats now have a soft audio swell** (StoryBeat mount) — covers all narrative beats *including the previously-silent World Tour reveal*.
- ☑ **Buy-juice input parity** (DONE): unified via `uiStore.registerBuy` — pointer + keyboard buys now both flash the section, float a +N pop, and play the buy sound from one place. Max buys flash (no +N).
- ☐ **Locked tier pods** are flat grey "???" boxes — dim silhouette + next-unlock hint + ready shimmer. (M) *(deferred — taste-sensitive, your eye)*
- ☐ **World Tour unlock celebration** — a dedicated overlay on par with EncoreCelebration. (M) *(deferred — the WT story beat now plays a sound and serves as that moment; a competing overlay would stack on it.)*
- 🅿 **Orchestra stage clips below ~900px** (7 fixed-width no-wrap pods, scale keyed to era not width). Real responsive fix is L-effort + taste → proposal. (L)
- ⏸ **Overlay coordination** (Encore bloom + era-reveal + toast can stack) — M, lower priority.

### Copy
- ☑ **Layer-name contradiction**: Prestige ladder L3/L4 'Repertoire'/'Genre' → 'World Tour'/'Signature' (now matches every other surface). *(Virtuoso/Canon kept — they match the build specs; the era-vs-layer name unification is a deeper follow-up.)*
- ☑ **MO/OP copy fixed**: PrestigeDialog + the magnum_opus_done hint no longer claim raw Opus Points multiply tempo — now "spend OP in the Opus tree; its Tempo track → permanent global production". Dead `getOpusBPMMultiplier` deleted.
- ☐ **HelpModal** stops at Encore — add Magnum Opus, Conduct/Crescendo (incl. Space hotkey, currently undocumented), Records→Platinum, World Tour. (M) *(deferred — prose/voice work)*
- ☑ **Hint "tips" → "tutorials"** (matches the Settings label); **"Conducting (see below)" → "see the next tip"**.
- ☑ **Auto-Conduct copy** "half ceiling" → "~70% of its ceiling" (matches AUTO_CONDUCT_FRACTION=0.7). *(whether 0.7 is the right VALUE is balance proposal C4.)*
- ☑ **Stale "hold to conduct" comments** in ConductorPodium rewritten to the tap-burst-decay model.

### A11y / Perf
- ☑ **OS `prefers-reduced-motion`** now gates ALL decorative animation in `index.css` (global block mirroring `.reduce-motion`), not just the story overlay. *(Auto-defaulting the in-app toggle ON for OS-pref users skipped — handled directly instead, so no save-defaults change.)*
- ☑ **StoryBeat honors the in-app reducedMotion toggle** (OS pref OR setting; both hooks run unconditionally).
- ☑ **SmoothNumber** snaps to the real value and skips its per-frame rAF under reduced motion (OS or in-app) — a11y + perf (kills the ~8-loop setState storm in that mode). *(Full fps-clock throttle for the normal path still ☐.)*
- ☑ **Sidebar tabs** now carry `aria-current="page"` + `aria-label` + `title` (collapsed icon-only state is announced).
- ☑ **Modals** — new shared `ModalShell` (role=dialog + aria-modal + **focus-trap + focus-restore** + Esc + backdrop-close) applied to HelpModal + PrestigeDialog. *(HardReset modal in SettingsPanel can adopt ModalShell next — quick follow-up.)*
- ☑ **Number-heavy UI** — tier buy buttons carry a full `aria-label`; the Soundwaves headline is now a single `role="status"` label (value + rate) with the per-frame number `aria-hidden` to avoid SR spam.
- ☐ **Per-frame funnel recompute** in Header/Stage/Stats each call `getProductionMultiplier()` every tick — memoize once/tick. (M) *(deferred — risky cache-invalidation on the display hot path; needs a supervised pass)*
- ☑ **Save written every frame** (DONE): `createDecimalStorage.setItem` now debounces the full-state JSON.stringify + localStorage write to ~1/sec (trailing) and flushes on tab hide/close; writes synchronously in non-browser envs (tests). Was ~60 writes/sec.

---

## TIER 2 — Balance / feel (🅿 PROPOSALS ONLY — need Vince's playtest verdict, per "gate behind proof")

- 🅿 **C1 — Encore EP reward is flat & anticlimactic.** `getEncoreGain=floor((peak/1e15)^0.03)` → EP=1 for every peak from 1e15 up to ~1e29. The *entire* early Encore loop (the first prestige experience) pays a flat "+1 Applause" no matter how far you pushed. Options: raise the root, lower threshold, or add a small linear floor so early encores read +1,+2,+3. **Re-run human/era sims.**
- 🅿 **C2 — Re-climb friction.** Every Encore/MO drops to 10 SW + tiers 0 and replays the same opening cost brackets (8× per MO cycle). Options: cheaper/earlier Sight-Reading, auto-rebuy trivial opening brackets, or a lifetime-scaled SW cushion.
- 🅿 **C4 — `AUTO_CONDUCT_FRACTION=0.7`** makes idle crescendo sustain 70% of ceiling, so active-vs-idle delta at full upgrades is only ~33%. Plus crescendo ceiling is small (×3 base, ×6 max). The marquee active verb has thin payoff — widen the active/idle gap.
- 🅿 **No active verb in L0–L1.** Conduct is hard-gated to opusCount>0; the first several hours are pure idle-buy. Consider an earlier light active beat.
- 🅿 **Offline autobuyer frozen-clock bug.** `calculateTick` reads `Date.now()` inside the synchronous offline replay loop → it never advances → autobuyers fire ~once for the whole away period, and auto-encore/MO/graduate don't run offline at all. **Correctness bug, but the fix changes offline magnitude → balance-adjacent. Fix the mechanism (thread a simulated clock), re-sim, then you judge the new offline output.**
- 🅿 **Challenge rewards all "TUNE §2.8 sim" placeholders**; several targets unordered vs unlock gates (ch_acoustic 2e21 at 10 Encores = trivial). Run the sim, lock values.
- 🅿 **swDecay challenge (ch_leaky) is framerate-dependent** (decays per-frame, fpsCap default 0). Convert to time-based `^(dt/1000)` like risingCosts. *(Borderline — it's a bug; may fix in Tier 0 if you OK it.)*
- 🅿 **L4 leaks into the trial** at circuit-complete (Signature tab + "Full circuit complete"). Decide the trial's deliberate end-state (capstone vs clean gate).

---

## TIER 3 — Art (⏸ LAST — Vince's 50% attention; decisions, then generate)

Shipped raster art = **~9 files total** (7 tier emblems + 1 backdrop + 1 achievement image). Everything else is procedural CSS.
- 🅿 **Achievement art: 1 of 100** exists → 99 render as raw OS emoji (inconsistent cross-platform, clashes with the gold deco style). Biggest art gap. Decision: bespoke emblem set vs a designed SVG-glyph fallback that looks intentional.
- 🅿 **World Tour venues = dashed-box placeholder**, but **6 finished venue illustrations already exist in `drafts/l3-venues/`** (never copied to `public/`). Cheapest visible win — just wiring existing art. Decision: use the drafts as-is, or regenerate finals first.
- 🅿 **One backdrop faked across 7 eras** (zoom/desaturate/blur). Decision: distinct hall illustrations for L0–L3 eras (pipeline exists: `art/gen-halls.mjs`).
- 🅿 **Incomplete favicon/social set** — no apple-touch-icon, no og:image (shared trial links render blank), no manifest. + delete stale pre-rename `favicon.svg` (purple bolt) and dead `art/tiers/tier1_notes.jpg`.
- 🅿 **Prestige/Opus screens have no signature art** (record/EP crest, opus seal).
- (note) emblems are chroma-keyed at runtime via canvas — consider baking transparent PNGs at build.

---

## Repo hygiene (bundle into one cleanup commit)
- Dead code: `futureChallenges.ts` (imported nowhere), `getOpusBPMMultiplier` (dead), `art/tiers/tier1_notes.jpg`, stale `public/favicon.svg`. WarmUp plumbing is intentional save-compat (keep, documented).
- Stale docs: `docs/bible/05-narrative-world.md` says 5 story beats; actual is 8 (adds first_wall, first_records, signature). Re-sync.

---

## Status log
- 2026-06-30: Audit run + this plan written. Audio engine rewrite drafted. Starting Tier 0 + Audio wiring.
