# SONANCE

*Reach into the silence; something reaches back.*

A music idle game: grow an orchestra from a single note — compose, conduct swelling crescendos, and
prestige through eras of sound. React 19 + TypeScript + Zustand + break_infinity.js, Vite-built,
deployed as a free L0–L3 trial at **https://vinceee23.github.io/orchestral-symphony/**.

## Run / build / test

```bash
npm run dev        # dev server (add ?dev to the URL for the DevPanel: speed, grants, L0–L4 layer jumps)
npm run build      # tsc + vite build + postbuild trial-spoiler check (fails on L4+ leaks)
npm test           # vitest — unit + pacing sims (fast suite)
JOURNEY=1 npx vitest run sim/l4-journey.test.ts   # heavy 6-profile human journey sim (minutes)
```

## Layout

- `src/core/` — game math: tick, formulas, prestige resets, multiplier registry, audio
- `src/store/` — Zustand store, save/migration (`SAVE_KEY = 'sonance-v1'`)
- `src/components/` — UI (Compose stage, Prestige, World Tour, Achievements, …)
- `sim/` — pacing/balance simulations with asserted bands
- `docs/` — design bible, build specs (L4–L9), plans; **start at `HANDOFF.md`** for current state
- `art/` — asset-generation scripts (emblems, capsules, og-card)

## The one flag that matters

`L4_UNLOCKED` (`src/core/constants.ts`) is the FULL_GAME gate: `false` = public L0–L3 trial (this
repo's default — L4+ never renders and a postbuild check enforces no spoiler strings ship);
`true` = full game (mobile/Steam builds). See `docs/MONETIZATION.md` for the distribution model.
