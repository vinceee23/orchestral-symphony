# 01 — Architecture, Conventions & the Build/Gate/Deploy Process

> **Scope.** This is the "how the machine works" chapter of the Orchestral Symphony bible. It documents
> the stack, the file layout, the Zustand store shape + persistence/migration, the tick loop + offline
> replay, `break_infinity.js` (Decimal) usage and gotchas, how to run/build/test, the **sim suite as the
> balance gate**, the GitHub Pages deploy, and the `?fresh` / `?l3` / `?dev` dev flags.
>
> **Accuracy contract.** Everything here is cited to a file:line as of branch `feat/layer3`. Where the
> design docs and the live code diverge, it is called out explicitly under **DIVERGENCE**. Read the cited
> file before trusting any number — constants move.

---

## 1. Stack

| Concern | Choice | Where |
|---|---|---|
| UI | **React 19.2** (`react`, `react-dom` `^19.2.4`) | `package.json` deps |
| Language | **TypeScript ~5.9.3**, strict mode | `tsconfig.app.json` |
| Bundler / dev server | **Vite 8** + `@vitejs/plugin-react` | `vite.config.ts` |
| Styling | **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no `tailwind.config.js`; v4 config is CSS-first) | `vite.config.ts`, `src/index.css` |
| State | **Zustand 5** (`create` + `persist` middleware) | `src/store/gameStore.ts:144` |
| Big numbers | **break_infinity.js 2.2** (`Decimal`) | everywhere; see §6 |
| Desktop shell | **Electron 33** + `electron-builder` 26 (NSIS installer) | `electron/`, `package.json` `build` |
| Tests / sim | **Vitest 2** (`vitest run`) — pure-logic, no DOM | `src/**/*.test.ts`, `sim/*.test.ts` |
| Lint | **ESLint 9** flat config + typescript-eslint + react-hooks/react-refresh | `eslint.config.js` |

There is **no `tailwind.config.js`, no `postcss.config.js`, and no `vitest.config.*`** — all three tools
run on defaults/plugins. `vite.config.ts` is deliberately tiny:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',        // relative asset paths — REQUIRED for GitHub Pages + Electron file://
})
```

`base: './'` is load-bearing twice: GH Pages serves from a sub-path, and Electron loads `dist/index.html`
over `file://` (`electron/main.cjs:26`). Absolute asset paths would 404 in both. Do not change it.

---

## 2. File layout (the parts that matter)

```
src/
  main.tsx            React entry. Imports ./dev/freshStart FIRST (must run before store hydrates), then mounts <App/> in <StrictMode>.
  App.tsx             Wires the three driver hooks: useGameLoop(), useAutoSave(), useHotkeys(). Renders AppShell + overlays + <DevPanel/>.
  index.css           Tailwind v4 entry + design tokens.

  store/
    gameStore.ts      THE store. State + actions + persist config (onRehydrate, partialize, storage). ~1000 lines; the heart of the app.
    types.ts          GameState + GameActions + TierState/TempoState/AutobuyerState/ActiveChallengeState/PreChallengeSnapshot interfaces.
    initialState.ts   createInitialState() — the single source of default values (also used as the migration default-filler).
    saveMigration.ts  migratePersistedSave(): defaults + ordered migrations + Decimal revival + story-beat seeding.
    saveSchema.ts      SAVE_SCHEMA_VERSION (currently 1). Bump when adding a migration entry.
    uiStore.ts        SEPARATE, NON-persisted Zustand store: help modal, encore celebration, conduct (space/pointer held), devSpeed.

  core/               Pure game math + data (no React). The economy lives here.
    tick.ts           calculateTick(state, deltaMs, conducting) -> Partial<GameState>. The per-frame production/autobuyer/unlock engine.
    constants.ts      Tier configs, thresholds, prestige gate costs, AP/auto-encore curves, L2/Records constants.
    formulas.ts       getTierCost, getMilestoneMultiplier, getTempo*, getMaxBuyable, getEncoreGain, getCoreProductionMultiplier.
    save.ts           createDecimalStorage(): PersistStorage that JSON (de)serializes Decimal via {__decimal:"..."}.
    crescendo.ts      L2 crescendo build/decay + multiplier.
    records.ts        L2 records/sec accrual, Platinum check, OP gain (getOpusGain).
    worldTour.ts      L3 World Tour: venues, components, Acclaim, L3 unlock gate, auto-MO/auto-tour predicates, calculateWorldTourTick.
    achievements.ts   ACHIEVEMENTS[] + the perk/bonus getters they grant.
    perks.ts          Perk ids + perk-gated constants (warmup, head-start, fast-automators, etc.).
    challenges.ts     CHALLENGES[] + modifier/reward resolution.
    encoreUpgrades.ts / opusUpgrades.ts   The two prestige shops (EP shop / OP tree).
    *.test.ts         Unit tests colocated with the module they cover.

  hooks/
    useGameLoop.ts    requestAnimationFrame driver. Ticks every frame; throttles achievement/challenge checks to ~3x/sec.
    useAutoSave.ts    setInterval(30s) + beforeunload — bumps lastSaveTimestamp to trigger a persist write.
    useHotkeys.ts     Keyboard (spacebar = Conduct, etc.).

  dev/
    freshStart.ts     ?fresh URL flag — wipes the save BEFORE hydration. Imported first in main.tsx.
    DevPanel.tsx      ?dev URL flag on the dev server ONLY — speed multiplier + grant buttons. Never in the shipped build.

  components/         All UI. compose/ (main play), prestige/, opus/, worldtour/, challenges/, achievements/, autobuyers/, story/, layout/, shared/.

sim/                  Headless balance harness. *.test.ts files ARE the balance gate (run by vitest). *.mjs are standalone diagnostics.
  engine.mjs          Parameterized economy MIRROR for tuning solvers (NOT the real code path — see DIVERGENCE in §8).
  era-pacing.test.ts / human-pacing.test.ts / l3-pacing.test.ts / challenge-pacing.test.ts / achievement-pacing.test.ts
  out/                Generated CSV/log reports. GITIGNORED.

electron/
  main.cjs            BrowserWindow; dev => loadURL(localhost:5173), prod => loadFile(../dist/index.html).
  launch.cjs          Spawns .electron-dist/electron.exe with ELECTRON_RUN_AS_NODE deleted (VSCode sets it and breaks Electron init).
  preload.cjs         Exposes window.electronAPI = { platform, isElectron:true } via contextBridge.

.github/workflows/deploy.yml   push master -> build -> GitHub Pages.
docs/                 Design specs (LADDER-MECHANICS, STORY-SPEC, LAYER3-SPEC, HARDENING-PLAN, RECONCILE-PLAN, ACHIEVEMENTS-V2-SPEC) + this bible.
HANDOFF.md            Running session log / decisions. DESIGN.md — original design. BUILD.md / README.md — quickstarts.
```

---

## 3. The Zustand store

### 3.1 Two stores, one persisted

- **`useGameStore`** (`src/store/gameStore.ts:144`) — the persisted game. Created with the `persist`
  middleware. Holds `GameState & GameActions`.
- **`useUiStore`** (`src/store/uiStore.ts:25`) — ephemeral, **not** persisted: help overlay, the Encore
  celebration count-up, **`conducting`** (derived from `spaceHeld || pointerHeld`), and **`devSpeed`**.
  The tick reads `useUiStore.getState().conducting` to drive crescendo (`gameStore.ts:151`).

### 3.2 State shape

`GameState` is defined in `src/store/types.ts:38`. Defaults live in `createInitialState()`
(`src/store/initialState.ts:6`) — **that function is the single source of truth for defaults** and is
reused by the migration layer to back-fill missing fields. Field groups:

| Group | Fields (types.ts) | Notes |
|---|---|---|
| Core production | `soundwaves`, `tiers[]`, `tempo`, `buyAmount` | `soundwaves` + tier `quantity`/`multiplier` are **Decimal** |
| L1 Encore | `encorePoints`, `lifetimeEncorePoints`, `encoreCount`, `lifetimeEncoreCount`, `encoreUpgrades`, `layer1WallReached` | `lifetimeEncorePoints` drives the production multiplier; spending in the shop never lowers it |
| Automation currency | `applausePoints`, `autobuyers{}` | AP is a plain `number`; autobuyers keyed `tier_1..tier_7`, `tempo`, `encore` |
| L2 Magnum Opus | `opusPoints`, `opusCount`, `opusUpgrades`, `crescendo`, `peakCrescendoMult`, `recordsSold`, `platinum`, `postPlatinumMoCount` | |
| L3 World Tour | `acclaim`, `lifetimeAcclaim`, `tourCount`, `currentVenue`, `venueBuffer`, `venueSoldOut`, `components{}`, `catalogueSnapshot`, `worldTourUnlocked`, `autoCollect`, `keepAutobuyers`, `autoMO`/`autoMOEnabled`, `autoGraduate`, `autoTour`/`autoTourEnabled`, `circuitComplete` | `acclaim`, `lifetimeAcclaim`, `venueBuffer`, `catalogueSnapshot` are **Decimal** |
| L6 Grand Finale | `finalePoints`, `finaleCount` | |
| Challenges | `activeChallenge`, `preChallengeState`, `completedChallenges`, `challengeBestTimes`, `keepChallenges` | `preChallengeState` snapshots SW/tiers/tempo so a challenge can restore on exit |
| Tracking / meta | `peakSoundwaves`, `producedThisRun`, `tempoPurchasesThisRun`, `silentEncores*`, `wallReachedWithoutTempo*`, `totalTimePlayed`, `activeTimePlayed`, `lastSaveTimestamp`, `currentRunStartTime`, `version`, `saveSchemaVersion`, `seenStoryBeats` | `activeTimePlayed` = foreground only; `totalTimePlayed` includes offline catch-up |

**Decimal fields (must be revived on load):** `soundwaves`, `peakSoundwaves`, `producedThisRun`,
`acclaim`, `lifetimeAcclaim`, `venueBuffer`, `catalogueSnapshot` (top-level, listed in
`saveMigration.ts:23` `TOP_LEVEL_DECIMAL_KEYS`), plus per-tier `quantity`/`multiplier` and the
`preChallengeState` snapshot. **`encorePoints`/`opusPoints`/`applausePoints`/`recordsSold` are plain
numbers** by design (comment at `types.ts:71` — pre-L4 magnitudes stay in JS-number range).

### 3.3 Actions

All mutations are store actions (`gameStore.ts`). Key ones:

| Action | Line | What it does |
|---|---|---|
| `tick(deltaMs)` | `149` | Calls `calculateTick`, applies the patch, then runs the **automation orchestration** (auto-prestige tier-building, auto-encore, World Tour unlock, auto-graduate, auto-MO, auto-tour). See §4.2. |
| `buyTier` / `buyMaxTier` | `218` / `277` | Affordability-checked loop; respects challenge modifiers (single-tier, maxPerTier, maxTiers). |
| `buyTempo` / `buyMaxTempo` | `301` / `327` | |
| `performEncore` | `603` | L1 prestige. Grants EP (+AP). Resets tiers/SW. Sets `layer1WallReached` at the 8th. Tracks "silent" (no-Tempo) runs for the patron achievement. |
| `performMagnumOpus` | `660` | L2 prestige (locked until `layer1WallReached`). Grants OP, **fully resets the Encore layer**, unlocks `tier_1` autobuyer on the 1st MO. |
| `performTour` | `830` | L3 prestige. Resets L1+L2, carries `LEGACY_RECORDS_FRACTION` of records, re-snapshots the catalogue, persists the venue ladder + Acclaim + AP. |
| `performGrandFinale` | `874` | L6 reset at `GRAND_FINALE_SW_THRESHOLD` (1.79e308). |
| `unlockWorldTour` / `buyComponent` / `graduateVenue` / `bankVenueAcclaim` | `735`+ | L3 venue progression. |
| `unlockWithApplause('encore'\|'autoTour')` | `391` | Spend AP to unlock auto-encore (and the L4-gated auto-tour). |
| `checkAchievements` / `checkChallengeCompletion` | `462` / `479` | Called ~3x/sec by the loop, not per frame. |
| `hardReset` | `911` | `set(createInitialState())`. |

### 3.4 Persistence config (`gameStore.ts:915`)

```ts
{
  name: 'orchestral-symphony-v6',     // localStorage key. The "-v6" is a hard-reset boundary: bumping it orphans old saves.
  storage: createDecimalStorage(),    // src/core/save.ts — Decimal-aware JSON (see §6.3)
  partialize: (state) => { /* strips every ACTION fn, persists only data */ },
  onRehydrateStorage: () => (state) => { /* migrate -> offline replay -> ?l3 seed -> stamp lastSaveTimestamp */ },
}
```

- **`partialize`** (`:918`) destructures out **all action functions by name** and persists the rest. If you
  add an action, it is *automatically* stripped (it's not in `GameState`); if you add a **state field**, it
  persists automatically. No allowlist to maintain — but the destructure list must stay in sync if you
  rename an action.
- **`createDecimalStorage()`** (`save.ts:24`) wraps `localStorage` with a JSON replacer/reviver. A Decimal
  serializes to `{ "__decimal": "1.23e45" }` and revives back to a `Decimal`. A parse failure returns
  `null` (treated as no save).

### 3.5 `onRehydrateStorage` — the load pipeline (`gameStore.ts:932`)

Order matters. On every page load, after Zustand parses localStorage:

1. **`migratePersistedSave(state)`** (`saveMigration.ts:166`) — mutates the rehydrated object in place:
   run the ordered migration chain → back-fill missing fields from `createInitialState()` → revive all
   Decimals → seed story beats from progress.
2. **Offline replay** (`:938`) — if `now - lastSaveTimestamp > 1000ms`, replay `calculateTick` in **1000ms
   chunks** up to `MAX_OFFLINE_MS` (24h, `constants.ts:104`), then copy the production-relevant fields back
   onto `state`. See §5.
3. **`?l3` dev seed** (`:967`) — if the URL has `?l3`/`#l3`, force-unlock World Tour with a seeded
   catalogue and strip the flag from the URL. See §7.
4. **`state.lastSaveTimestamp = now`** (`:992`) — stamp so the next session's offline calc is correct.

### 3.6 Migration system (`src/store/saveMigration.ts`)

- **`SAVE_SCHEMA_VERSION`** lives in `saveSchema.ts` and is currently **`1`**.
- `runMigrationChain` (`:156`) walks `state.saveSchemaVersion` up to the current version, applying
  `MIGRATIONS[v]` in order. **`MIGRATIONS[1]` is an identity baseline** — pre-schema saves are handled
  purely by default-filling + Decimal revival.
- **To add a migration:** bump `SAVE_SCHEMA_VERSION` to N, add `MIGRATIONS[N] = (state) => {...}` that
  mutates the parsed save toward the new shape. Keep migrations pure and idempotent.
- Default-filling is layered for legacy guards: `applyFalsyDefaults` (fields old code checked with
  `if (!x)`), `applyFiniteNumberDefaults` (`lifetimeEncoreCount`, `applausePoints`), then
  `applyUndefinedDefaults` (everything else missing). `SKIP_DEFAULT_KEYS` (`:56`) lists fields handled by
  the specialized passes so they aren't double-processed.
- `TOP_LEVEL_DECIMAL_KEYS` (`:23`) **must be kept in sync with the Decimal fields in
  `createInitialState`** — there's a comment to that effect. Forgetting one means a string/number survives
  where a `Decimal` is expected and the tick throws.

---

## 4. The tick loop & automation

### 4.1 The driver (`src/hooks/useGameLoop.ts`)

A single `requestAnimationFrame` loop, mounted once in `App.tsx`:

- Computes the real elapsed `deltaMs` per frame and **caps it at `DELTA_CAP_MS` (5000ms,
  `constants.ts:106`)** so a backgrounded tab doesn't dump a huge delta in one tick (offline handles long
  gaps instead).
- Multiplies by `useUiStore.getState().devSpeed` (1 in production; `1/10/100/1000` via the dev panel).
- Calls `useGameStore.getState().tick(cappedDelta)` **every frame** — production accrues smoothly
  per-frame, not in 1s chunks. Tempo / Opus / milestone "tickspeed" are **production multipliers**, not
  gating intervals (comment at `useGameLoop.ts:8`).
- **Throttles** `checkAchievements()` + `checkChallengeCompletion()` to once per ~300ms accumulated
  game-time (`:28`) to avoid per-frame overhead.

### 4.2 `calculateTick` (`src/core/tick.ts:29`) — the pure engine

Signature: `calculateTick(state, deltaMs, conducting=false): Partial<GameState>`. Pure — no `set`, no side
effects. Steps:

1. Resolve active-challenge modifiers (`getActiveChallengeModifiers`) and apply `tickspeedDivisor` to get
   `effectiveDeltaMs` (`:39`).
2. Build the **global production multiplier** via `getCoreProductionMultiplier` (`:89`) — the **single
   source of truth** shared with the UI rate displays so they can't drift (encore/finale/opus/tempo/
   milestone-tickspeed/crescendo/records/Acclaim/achievement/challenge all stack here). `noPrestige`
   challenges zero out the prestige contributions.
3. Advance crescendo + accrue records (`:70`), compute `acclaimMult` if World Tour is unlocked.
4. **Tier cascade** (`:124`): highest→lowest, each tier produces the tier below; tier 0 (Notes) produces
   Soundwaves. (`reversedProduction` challenge flips the direction.)
5. **Autobuyer pass** (`:199`): for each unlocked+enabled `tier_N` autobuyer, fire once per elapsed
   interval (multi-fire catch-up for coarse/lagged dt), buy `bulk` or `'max'`. Interval/bulk scale with
   Opus upgrades once `opusCount > 0`. Tempo autobuyer handled separately (`:262`).
6. **Tier unlocks** (`:291`): a tier unlocks when the prior tier has ≥1 purchased — except **Movements
   (idx 5) waits for the 1st Encore** and **Symphonies (idx 6) waits for the 4th Encore
   (`encoreCount >= 3`)** so they aren't spoiled (`:301`).
7. Track `peakSoundwaves`, fold in `calculateWorldTourTick`, return the patch.

### 4.3 Automation orchestration (in the `tick` ACTION, `gameStore.ts:149`)

This is the part `calculateTick` deliberately does **not** do (it's a `set`-driven loop, not pure math).
After applying the tick patch, the `tick` action runs, in order:

1. **Auto-prestige self-sufficiency** (`:161`) — when auto-encore or auto-MO is active and no challenge is
   running, hand-build toward the current prestige gate tier (Encore gate pre-wall, Magnum Opus gate
   post-wall) so the automation isn't dead weight before the gate-tier's own autobuyer unlocks.
2. **Auto-encore** (`:184`) — fires `performEncore()` on the MO-upgraded interval
   (`getAutoEncoreInterval`), gated so it can't re-reset past the 8-Encore wall and starve auto-MO. Uses
   `.gt` not `.gte` on the EP threshold so it never auto-prestiges for 0 EP.
3. **World Tour unlock** (`:195`) → **auto-graduate venue** (`:198`) → **auto-MO** (`:208`) →
   **auto-tour** (`:213`), each guarded by its own predicate in `worldTour.ts`.

> **Why two layers?** `calculateTick` is pure and unit-testable (the sim calls it directly). The
> orchestration needs to call other actions (`performEncore`, `buyTier`) and re-read fresh state, so it
> lives in the `tick` action wrapper.

---

## 5. Offline replay (`gameStore.ts:938`)

On load, elapsed offline time = `min(now - lastSaveTimestamp, MAX_OFFLINE_MS)` (24h cap). If > 1s, the
game **replays `calculateTick` in fixed 1000ms chunks** over a local `currentState` copy, then writes back
the production-relevant fields (`soundwaves`, `tiers`, `tempo`, `autobuyers`, `totalTimePlayed`,
`peakSoundwaves`, `producedThisRun`, `crescendo`, `peakCrescendoMult`, `recordsSold`, `platinum`,
`acclaim`, `lifetimeAcclaim`, `venueBuffer`, `venueSoldOut`).

Notes / gotchas:
- **No `conducting` argument** during offline replay → crescendo decays toward idle, which is intended
  (you weren't holding Conduct while away).
- **Automation orchestration does NOT run offline** — offline replay calls the *pure* `calculateTick`
  directly, not the `tick` action. So **auto-encore / auto-MO / auto-tour do not fire while away**; only
  production + autobuyers (which are inside `calculateTick`) accrue. This is a known design boundary, not
  a bug.
- `activeTimePlayed` is **not** advanced offline (only `totalTimePlayed` is) — that's the whole point of
  the split (`types.ts:131`).
- 1000ms chunking keeps each step's multipliers fresh (records/crescendo/Acclaim recompute per chunk).

---

## 6. break_infinity.js (`Decimal`) — usage & gotchas

`Decimal` from `break_infinity.js` represents numbers up to ~`1e9e15` (mantissa+exponent), used wherever a
value can exceed `Number.MAX_VALUE` (Soundwaves, tier quantities, Acclaim). The Grand Finale gate is
literally `1.79e308` (`constants.ts:160`) — the JS double ceiling — which is why production above it needs
Decimal.

### 6.1 Which fields are Decimal vs number

- **Decimal:** `soundwaves`, `peakSoundwaves`, `producedThisRun`, tier `quantity`/`multiplier`, `acclaim`,
  `lifetimeAcclaim`, `venueBuffer`, `catalogueSnapshot`.
- **Plain number (intentional):** `encorePoints`, `lifetimeEncorePoints`, `opusPoints`, `applausePoints`,
  `recordsSold`, `crescendo`, `peakCrescendoMult`, all `*Count` and `*Upgrades` levels. These stay within
  JS-number range pre-L4 (`types.ts:71`).

### 6.2 API gotchas (Decimal is immutable + value-typed)

- **Immutable:** `a.plus(b)` returns a new Decimal; it does **not** mutate `a`. Always reassign:
  `sw = sw.minus(cost)` (e.g. `gameStore.ts:252`).
- **Comparisons are methods, not operators:** use `.gt`, `.gte`, `.lt`, `.lte`, `.eq` — never `>`, `<`,
  `===`. A subtle live example: auto-encore uses `peakSoundwaves.gt(ENCORE_EP_THRESHOLD)` **(`.gt` not
  `.gte`)** because `getEncoreGain` returns 0 at exactly the threshold (`gameStore.ts:184`).
- **`new Decimal(decimal)` clones** — used defensively when snapshotting (e.g. `startChallenge` clones the
  tier array, `gameStore.ts:549`).
- **Mixed math:** `.times(number)` and `.times(decimal)` both work; `Decimal.max(a, b)` / `Decimal.pow`
  are static helpers.
- **Defensive revival in the tick/actions:** several spots guard `value instanceof Decimal ? value : new
  Decimal(value ?? 0)` (e.g. `producedThisRun` at `tick.ts:48`, `acclaim` at `gameStore.ts:758`) because a
  field *could* arrive as a number from a partially-migrated save.

### 6.3 Serialization (`src/core/save.ts`)

Decimals don't survive `JSON.stringify` natively. `createDecimalStorage` installs a replacer that turns a
`Decimal` into `{__decimal: value.toString()}` and a reviver that turns it back. **Any new Decimal field
must be added to `TOP_LEVEL_DECIMAL_KEYS` in `saveMigration.ts`** (the reviver handles nested ones inside
the storage layer, but the migration default-filler needs to know which keys are Decimal so it reconstructs
them on saves written before the field existed).

---

## 7. Dev flags (URL query/hash)

| Flag | Read in | Effect |
|---|---|---|
| `?fresh` | `src/dev/freshStart.ts` (imported **first** in `main.tsx` so it runs before hydration) | Removes every `orchestral-symphony*` localStorage key → clean start. Strips itself from the URL afterward. |
| `?l3` | `gameStore.ts:967` (inside `onRehydrateStorage`) | Force-unlocks World Tour with a seeded catalogue (`getCatalogueSnapshot(4, 750_000)`), sets `layer1WallReached`, `platinum`, `opusCount>=4`, `postPlatinumMoCount>=GATE_POST_PLAT_MO`, seeds story beats. For instant L3 playtesting. Strips itself from the URL. |
| `?dev` | `src/dev/DevPanel.tsx:8` | Shows the dev pacing panel — **only on the Vite dev server** (`import.meta.env.DEV && ?dev`). Speed `1/10/100/1000×`, grant SW/OP/records buttons. **Never present in the shipped Electron/Pages build** (`import.meta.env.DEV` is false there). |

All three accept the flag in either `location.search` or `location.hash` (regex `(?:[?&#])flag\b`), which
matters because GH Pages SPA links sometimes carry state in the hash.

---

## 8. Running, building, testing

### 8.1 npm scripts (`package.json`)

| Script | Command | Use |
|---|---|---|
| `npm run dev` | `vite` | Dev server at `http://localhost:5173`. Add `?dev` / `?fresh` / `?l3`. |
| `npm run build` | `tsc -b && vite build` | **Type-check (project refs) THEN bundle** to `dist/`. A type error fails the build. This is the production web build. |
| `npm run lint` | `eslint .` | |
| `npm test` | `vitest run` | Runs all `*.test.ts` (unit + the sim suite) once. **This is the gate.** |
| `npm run preview` | `vite preview` | Serve the built `dist/` locally. |
| `npm run electron:dev` | `concurrently` vite + `wait-on` + `launch.cjs` (NODE_ENV=development) | Electron pointed at the live dev server. |
| `npm run electron:build` | `tsc -b && vite build && electron-builder` | NSIS installer → `release/` (one-click, win/nsis per `package.json` `build`). |
| `npm run electron:preview` | `launch.cjs` (NODE_ENV=production) | Electron loading the built `dist/`. |

### 8.2 Test environment

There is **no `vitest.config.*`** — Vitest runs on defaults (Node environment, **no jsdom**). The tests are
**pure logic**: they import `src/core/*` and `src/store/*` functions and assert on their return values.
Tests that need browser globals **shim them manually** — e.g. `src/store/breakPerks.test.ts:6` assigns a
fake `globalThis.localStorage`. There are **16 test files** total (`src/**/*.test.ts` + `sim/*.test.ts`).

### 8.3 GATE discipline (per CLAUDE.md)

The standing workflow: Claude runs the **compile/test gate before every commit** — `npm run build` (catches
type errors) **and** `npm test` (unit + sim). Do not commit on red. The sim suite is part of `npm test`, so
a balance regression fails CI-style locally before it can land.

---

## 9. The sim suite = the balance gate (`sim/`)

The `sim/*.test.ts` files are not ordinary unit tests — they are **headless economy simulators that drive
the REAL game logic** (`calculateTick`, the real constants/formulas, the real prestige actions) over
many simulated hours and **assert that pacing stays inside hand-tuned windows**. A change that makes the
game too fast or too grindy fails these. They write CSV/log reports to `sim/out/` (gitignored).

| Sim test | What it drives | Representative gate assertions (file:line) |
|---|---|---|
| `era-pacing.test.ts` | Full L1→L2 era through Encore wall, first MO, Platinum, OP tree, toward Grand Finale | `opusCount >= 1`, `platinum` reached, restraint achievements don't auto-unlock from head-start, `longestDeadZoneMin < 25` (`:1137-1141`) |
| `human-pacing.test.ts` | Multi-seed "human" player model (active play, realistic buying) | 8-Encore wall median active-play **70–140 min**, first MO **110–230 min**, Platinum **12–22 h**, achievement gaps ≤20/25 min, global mult at Platinum **2.4–3.3×** (`:1101-1146`) |
| `l3-pacing.test.ts` | L3 World Tour: venue graduation, re-tour cadence, auto-tour circuit | Venue-1 graduate median **30–60 min**, re-tour cadence **30–60 min**, post-Platinum→L3 **2–4.5 h**, tour-8 < 0.7×tour-1, circuit completes hands-free ≤40 h (`:1401-1456`) |
| `challenge-pacing.test.ts` | All 12 challenges beatable; reward stacking | reward `globalProdMult`, `costMult≈0.90`, `tempoBonus≈0.15`, `milestoneStrength≈0.2`, capstone time-scaling (`:914-958`) |
| `achievement-pacing.test.ts` | Achievement unlock cadence / dead-zones | (writes `achievement-pacing.csv`; asserts no stranded achievements) |

The `*.mjs` files (`engine.mjs`, `tune.mjs`, `cadence.mjs`, `opening.mjs`, `l2*.mjs`, etc.) are
**standalone diagnostic/tuning scripts** run by hand with `node sim/<file>.mjs`, **not** part of `npm test`.

> **DIVERGENCE — `sim/engine.mjs` is a MIRROR, not the real path.** Its header says so
> (`engine.mjs:1-2`): *"Mirrors src/core/{constants,formulas,tick}.ts. Keep in sync if those change."* It
> hardcodes its own `TIERS`, `encoreGate`, tempo model, etc. for the **tuning solver** (`tune.mjs`). The
> numbers can drift from the shipped constants — note the comment at `engine.mjs:65` that its intended
> tempo-as-production-multiplier "current code doesn't apply this; flagged for rework," and its
> `encoreGate` amounts (`30/30/70/50…`) differ from the shipped `getEncoreCost` amounts
> (`12/12/28/18…`, `constants.ts:113`). **Trust the `.test.ts` sims (they import real code); treat
> `engine.mjs` as an approximate solver only.**

---

## 10. Deploy: push `master` → GitHub Pages (`.github/workflows/deploy.yml`)

```
on: push to master (or manual workflow_dispatch)
permissions: pages: write, id-token: write   # OIDC deploy to Pages
concurrency: group "pages", cancel-in-progress: false  # let an in-flight deploy finish
job build:  checkout -> setup-node@20 (npm cache) -> npm ci -> npm run build
            -> configure-pages (enablement: true) -> upload-pages-artifact (path: dist)
job deploy: needs build -> deploy-pages@v4 (environment github-pages)
```

- **Trigger:** any push to `master`. Branch work (e.g. `feat/layer3`) does **not** deploy — merge/PR to
  master does. (Repo default branch is `master`; PRs target it.)
- **One-time setup** (per the workflow comment): Repo Settings → Pages → Source = **GitHub Actions**.
- **`base: './'`** in `vite.config.ts` is what makes the Pages sub-path serve correctly.
- `npm run build` runs `tsc -b` first, so **a type error fails the deploy** — the type-check is the deploy
  gate, but the sim/test suite is **not** in this workflow (it's the local pre-commit gate). Keep running
  `npm test` locally before pushing to master.
- `dist/` is **gitignored** (`.gitignore`) — it's built fresh in CI, never committed.

### 10.1 GitHub account pinning (per user CLAUDE.md)

This PC has two GitHub accounts. Before any push, the repo's `origin` must be **pinned repo-locally** to
the right account (`vinceee23` personal / `vmacaraig-star` work) or GCM's account picker silently wedges
the push. Use the `gh-pin` skill / the pinning recipe in CLAUDE.md. Never set credentials globally.

---

## 11. Conventions & gotchas cheat-sheet

- **Pure core, side-effectful store.** `src/core/*` is pure functions over `GameState`; `gameStore.ts`
  owns all `set`/`get`. The sim and unit tests rely on this — keep new economy math in `core/` and pure.
- **`getCoreProductionMultiplier` is the one true multiplier** (`formulas.ts`, called `tick.ts:89`). The
  UI rate displays call the same function so on-screen numbers can't drift from actual production. Don't
  recompute the stack anywhere else.
- **Adding a state field:** add to `GameState` (`types.ts`) + a default in `createInitialState`
  (`initialState.ts`). It auto-persists (partialize) and auto-back-fills on old saves
  (`applyUndefinedDefaults`). If it's a **Decimal**, also add it to `TOP_LEVEL_DECIMAL_KEYS`
  (`saveMigration.ts:23`).
- **Adding an action:** add to `GameActions` (`types.ts`) + implement in `gameStore.ts`, and make sure the
  `partialize` destructure (`gameStore.ts:918`) lists it so it's stripped from the persisted blob.
- **Changing the save shape incompatibly:** bump `SAVE_SCHEMA_VERSION` and add a `MIGRATIONS[N]` entry; or
  for a hard reset, bump the `name: 'orchestral-symphony-v6'` suffix (orphans all old saves).
- **`Date.now()` is read inside actions/tick** for prestige timing, autobuyer intervals, and offline calc.
  Sim tests `vi.useFakeTimers()` to control it.
- **`StrictMode`** double-invokes effects in dev — the loop/auto-save hooks are written to tolerate
  mount/unmount/mount (cleanup cancels the RAF and clears the interval).
- **`L4_UNLOCKED = false`** (`constants.ts:4`) gates auto-tour-via-AP and other L4 rewards off; auto-tour
  is currently only reachable as an L3 venue capstone path, not the AP purchase.

---

*Sources: every claim above is cited to a file:line on branch `feat/layer3`. The companion chapters cover
the economy/ladder design (LADDER-MECHANICS), the story system (STORY-SPEC), Layer 3 (LAYER3-SPEC), and
achievements (ACHIEVEMENTS-V2-SPEC); this chapter is the runtime/infra reference.*
