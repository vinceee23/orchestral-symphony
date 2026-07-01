# Monetization — strategy (Sonance)

Status: **plan, not implemented.** Decided 2026-06-25; **updated + price LOCKED 2026-07-02.** For the
early community playtest the only live channel is **Ko-fi donations**.

## LOCKED distribution model (2026-07-02) — the authoritative version

Three tiers, each feeding the next (this section supersedes any older numbers below):

| Tier | Content | Price / monetization |
|---|---|---|
| **Web** (GitHub Pages, live) | **L0–L3 trial** | Free, no ads — the shareable hook |
| **Mobile** (Capacitor, later) | **Full game** | Free + opt-in rewarded ads + "remove ads" IAP |
| **Steam** (Electron) | **Full game** | **$4.99 one-time (LOCKED)** — ad-free, achievements, cloud |

- **Release shape:** L0–L4 = the sellable 1.0; **L5–L9 ship as post-launch free content updates.**
- **Sequencing (2026-07-02):** web trial (live) → **Steam** → mobile **only after Steam proves demand**
  (wrapper + ad-SDK + store effort deferred until justified). Trial circuit pacing ACCEPTED as-is:
  the trial converts mid-journey; casuals aren't expected to finish the circuit (auto-tour is L4-gated).
- **Build matrix = 2 flags:** `L4_UNLOCKED` (FULL_GAME — `src/core/constants.ts`) and, later, an ADS flag.
  Web = off/off · Mobile = on/on · Steam = on/off. A postbuild spoiler check enforces trial cleanliness.
- **$4.99 rationale:** impulse-range; matches Cookie Clicker / Antimatter Dimensions; leaves discount
  headroom (−20% → $3.99 promos); avoids the "shallow at $2.99" signal.

## Guiding principles
- **Money follows reach, not the game.** A self-hosted link earns coffee money; real income needs
  traffic (portals / mobile / Steam). Prioritize getting it *in front of people*.
- **Core game is free + identical everywhere. Never sell power.** No pay-to-win. Monetize convenience,
  cosmetics, ad-removal, and goodwill — not progression advantage. This protects community goodwill.
- **Keep gameplay fair so it survives a community playtest's scrutiny.**

## Per-platform model (DECIDED)

| Platform | Price | Monetization | Notes |
|---|---|---|---|
| **Web portals** (itch.io, CrazyGames, Poki) | Free | Portal **ad-share** (their SDK) + itch pay-what-you-want | Lowest effort to actually earn — the portal brings traffic + handles ads. |
| **Mobile** (Android/iOS, via Capacitor) | **Free** | **Opt-in rewarded ads + IAP** | The full free-to-play model. **All in-game ads/cosmetics/boosts live here only.** Biggest idle-game market. |
| **Steam** (desktop, via the existing Electron build) | **Paid one-time — $4.99 (LOCKED 2026-07-02)** | Purchase only — **NO ads** | The premium/ad-free "definitive" version. Pay once, clean experience, supports the dev. |
| **Ko-fi** (now) | — | Donations | Goodwill tips. Live today: `ko-fi.com/vinceangelolmacaraig`. |

Coherent story: **try free on web/mobile → buy the ad-free premium cut on Steam if you love it.**

## In-game monetization (MOBILE ONLY — fair model)
- **Rewarded ads (opt-in, never forced):** "watch an ad → 2× production for 4h", "double your last
  offline earnings", "instant-finish the current venue fill" (L3). Players choose to engage.
- **IAP:**
  - **Remove Ads / Supporter Pack** — one-time; kills ads + a thank-you cosmetic.
  - **Cosmetic skins** — era/stage themes, alt instrument art, stage flourishes. Pure vanity.
  - **Convenience boosters** — permanent offline-earnings boost, an extra autobuyer slot. *Tune so
    they're convenience, not power spikes* (we're already building offline mechanics — natural hook).
- **Never sell:** raw production multipliers, prestige currency, skipping the climb for power. Boosts
  are time/convenience, not a power ladder.

## Rollout order (effort → payoff)
1. **Ko-fi** — done. Donations during the early playtest.
2. **itch.io + a portal (CrazyGames/Poki)** — submit the web build; real traffic + ad-share. Low effort.
3. **Steam** — polish the Electron build into a paid release (store page, $100 Steamworks fee, achievements/cloud saves are nice-to-have).
4. **Mobile** — wrap with Capacitor; integrate a rewarded-ad SDK + IAP; ship the free-to-play version. Most work, biggest market.

## Practical notes (PH-specific)
- **Payouts:** PayPal works in the Philippines; **Stripe does not support PH business accounts** (so
  Ko-fi = PayPal-only here). Steam/Play/App Store pay out to bank with their own tax/withholding setup.
- **Store fees:** Steam 30% + $100 one-time; Play/App Store ~15–30%; portals take an ad-revenue cut.
- **Ad networks:** web → the portal's built-in ads (don't self-manage); mobile → a rewarded-ad SDK
  (e.g. a mediation layer) chosen at mobile-build time.
- The **Electron build already exists**, so Steam is the lowest-friction "paid" path when ready.
