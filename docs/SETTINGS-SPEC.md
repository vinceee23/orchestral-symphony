# Settings Panel — v1 Spec

> **Status (2026-06-29):** ✅ BUILT on `feat/layer4`. Full v1 shipped (save export/import + .txt, Save Now,
> Hard Reset, audio mute/SFX-volume/mute-on-unfocus, notation, reduced-motion, FPS cap, theme-lock, offline
> toggle, re-enable confirmations, About, reset-to-defaults). Gear icon in the Header opens it. Save schema
> bumped v2→v3 (migration 3 defaults `settings`). Music/SFX split stays deferred (no music track yet).

## Why
Sonance currently has **no Settings panel at all** and **no save export/import** — the report (C16) calls
save string export/import "mandatory table-stakes before any public build." This panel closes that gap and
becomes the home for display/audio/QoL toggles surfaced by the audit.

## Access
New gear icon in `layout/Header.tsx` → opens a Settings overlay (modal, same pattern as `PrestigeDialog` /
help overlay). State: ephemeral open/close in `uiStore`; persisted preferences in `gameStore` (so they
survive reload and ride the save). Add a `settings` slice to `GameState` + register in
`createInitialState` + save-migration default-keys (schema bump if needed).

## Sections & items

### 🗄 Save  *(essential — closes C16)*
- **Export** → serialize current save to a Base64 string, show in a readonly textarea + "Copy" button.
- **Export to file** → download the same string as `sonance-save-<timestamp>.txt`.
- **Import** ← paste a string (or load a .txt) → validate (try/catch JSON+Decimal revive, check schema
  version, run `migratePersistedSave`) → **confirm overwrite** dialog → apply + reload.
- **Save Now** button + "last saved Xs ago" indicator (reads `useAutoSave` timing).
- **Hard Reset** → type-to-confirm ("RESET") double gate → existing `hardReset` action.
- Effort: **M** (serialization reuses the persist adapter in `save.ts`; import validation is the careful bit).

### 🔊 Audio  *(essential)*
- **Master mute** toggle → existing `setMuted` (trivial).
- **SFX volume** slider (0–100%) → add a module-level `volume` multiplier in `audio.ts` applied to each
  `gain` value. Effort: **S**.
- **Mute when tab unfocused** toggle → `visibilitychange` listener → `setMuted`. Effort: **S**.
- NOTE: no background-music track exists (audio.ts is SFX-only). Music/SFX split is deferred until/unless
  real music is added — tracked in MECHANICS-BACKLOG as a separate feature, NOT part of v1.

### 🖥 Display  *(essential)*
- **Number notation**: scientific / engineering / alphabetic-suffix (default). Add a `notation` pref read by
  `format.ts:formatNumber`. Effort: **S–M** (format.ts currently hardcodes suffix→scientific).
- **Reduced motion** toggle → gate the `animate-pulse-gold` / SmoothNumber animations behind the pref
  (accessibility). Effort: **S**.
- **Refresh-rate cap**: 60 / 30 / Uncapped → throttle the RAF loop in `useGameLoop` by accumulating delta
  and ticking only past the frame interval. Production is delta-based so totals are unaffected. Effort: **S–M**.
- **Theme**: follow auto era-theme (default) vs lock a fixed theme. Effort: **M** (depends on how
  `eraTheme.ts` drives CSS vars; lock = freeze the current era's palette).

### 🎮 Gameplay  *(essential)*
- **Re-enable confirmation dialogs** → clears the `prestige_skip_*` localStorage flags so dismissed prestige
  confirms come back. (Today they're permanently dismissible with no way back — a trap.) Effort: **S**.
- **Offline progress** on/off toggle → gate the `onRehydrateStorage` offline replay. Default ON. Report says
  never CAP offline; this is just a player opt-out for a "fresh" active session. Effort: **S**.

### ℹ️ About  *(cheap, expected for a live game)*
- Version/build string + link to changelog/repo. Effort: **XS**.

### Footer
- **Reset settings to defaults** (prefs only, not the save). Effort: **XS**.

## Out of scope for v1 (backlog)
- Background music + true Music/SFX volume split (needs an audio asset pipeline).
- Cloud save / cross-device sync.
- Hotkey rebinding (a static hotkey *reference* list could be a cheap add if wanted).

## Gate
`npm run build` (tsc) + full `npm test` green before commit. New `settings` state must be added to the three
schema-of-record lists (createInitialState, TOP_LEVEL_DECIMAL_KEYS only if it holds Decimals — it won't,
prefs are primitives, so just the default-key list) per the save-migration discipline.
