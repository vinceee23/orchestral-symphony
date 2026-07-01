# Steam "Coming Soon" Page — Launch-Prep Plan

**Goal:** stand up a Steam store page *now* (long before the game is done) to start banking
**wishlists**. Wishlists compound for months, and launch-day wishlist→purchase conversions are what
trigger Steam's "Popular Upcoming" placement and the post-launch visibility algorithm. This is the
single highest-leverage thing we can do before L4+ is finished.

Ties into the locked [distribution model](../MEMORY.md): **Steam = paid, ad-free, full game.** This
page sells that tier. (The free web trial keeps funneling; mobile comes later.)

---

## 1. Prerequisites & cost (one-time)

| Item | Detail |
|---|---|
| **Steamworks account** | partner.steamgames.com — needs the personal/company legal + banking + tax info (W-9 for US, W-8BEN otherwise). |
| **Steam Direct fee** | **$100 USD per app.** Recoupable once the app earns $1,000. Paid before you can create the app. |
| **Valve store-page review** | Valve reviews the store page before it goes public — usually a few business days. |
| **Timing rule** | A Coming Soon page must be live **≥ 2 weeks before** you set a release date. Standing it up early is fine and encouraged. |

> Decision needed from Vince: register as an **individual** or a **company/sole-prop**? (Affects tax
> paperwork + how the payee appears.) Personal is simplest to start.

---

## 2. Asset checklist

Steam won't publish the page until the **required** graphics exist. Exact pixel sizes matter.

### Required for a Coming Soon page
- [ ] **Header capsule** — 460 × 215 (the main library/store thumbnail; most-seen asset)
- [ ] **Small capsule** — 231 × 87 (search results — must have readable logo)
- [ ] **Main capsule** — 616 × 353 (top of the store page / front-page features)
- [ ] **Vertical capsule** — 374 × 448 (upcoming/curator lists)
- [ ] **Screenshots** — minimum **5**, 1920 × 1080 (16:9). Pull from the live trial.
- [ ] **Short description** — ≤ 300 characters (draft below)
- [ ] **About This Game** — full description (draft below)
- [ ] **Tags, genre, release estimate** ("Coming Soon" or a quarter, e.g. "TBA 2026")

### Needed later (at release, not for Coming Soon)
- [ ] Library capsule 600 × 900, Library hero 3840 × 1240, Library logo 1280 × 720, Page background 1438 × 810
- [ ] **Trailer** — Steam strongly favors games with a trailer for featuring. Even a 30–60s screen
      capture of the stage + crescendo + era transitions + achievement pops works for v1.

### What we can reuse / generate
- Visual identity is set: navy + gold orb-O logo, era tints, the emblem art. The `og-image.png`
  (1200×630) and `art/gen-og-card.py` are a good base — adapt the same generator for the capsule sizes.
- Screenshots: capture the live trial (Compose stage mid-crescendo, an era-tinted later screen, the
  achievements grid with real emblems, World Tour). Use `?tab=` to frame each.

---

## 3. Store copy — DRAFT (voice matches the site meta)

**Established tagline:** *"Reach into the silence; something reaches back."*

### Short description (≤300 chars)
> Reach into the silence; something reaches back. **Sonance** is a music idle game: grow an orchestra
> from a single note — compose, conduct swelling crescendos, and prestige through eras of sound toward
> something vast, and listening.

### About This Game
> It starts with one note.
>
> **Sonance** is an idle game about making music grow. Coax sound from silence, layer instrument on
> instrument, and watch a whole orchestra bloom from almost nothing. Tap to **conduct** a crescendo
> when you want to lean in — or let it play itself while you're away.
>
> Prestige runs deep: reset for **Encore** power, mint a **Magnum Opus**, take your sound on a **World
> Tour**, and press further into stranger, grander layers. The world *reacts* — visuals shift era by
> era and a generative ambient score drifts underneath the whole climb.
>
> **100 hand-crafted achievements** nod to the songs that shaped music, each with its own bespoke emblem.
>
> Play for a minute or lose an afternoon. Numbers go up; the music gets bigger.

### Feature bullets
- 🎼 Grow from a single note into a full orchestra
- 🎯 **Conduct** — an active crescendo mechanic layered over relaxing idle play
- 🔁 Deep prestige layers: Encore → Magnum Opus → World Tour → and beyond
- 🏆 100 bespoke, music-history achievements
- 🎨 Era-reactive visuals + a generative ambient soundtrack
- 💤 Offline progress — it keeps composing while you're gone
- ✅ **No ads, one-time purchase**, Steam achievements + Cloud saves

### Tags / genre (initial)
Idle · Incremental · Clicker · Music · Casual · Relaxing · Atmospheric · Minimalist · Singleplayer ·
"Numbers Go Up". Genre: **Casual / Indie / Simulation.**

---

## 4. Steps to publish

1. Register Steamworks partner account; complete banking + tax paperwork.
2. Pay the $100 Steam Direct fee; create the app ("Sonance").
3. Fill the store page: descriptions, tags, genre, release = "Coming Soon".
4. Upload the 4 capsules + ≥5 screenshots (+ trailer if ready).
5. Submit for review → Valve approves → set the page **public**.
6. Share the wishlist link everywhere the free web trial already lives (in-game "Wishlist on Steam"
   button, the trial's L3 end-cap, socials, the Ko-fi page).

---

## 5. Suggested timeline

- **Now → 1 wk:** account + fee + paperwork; generate the 4 capsules from the og-card generator; grab 5 screenshots.
- **~2 wks:** copy finalized (draft above is ~90% there), page submitted for review.
- **Ongoing:** trailer when there's more game to show; refresh screenshots as L4+ lands.
- **Release date:** set only when L4+ (the full game) is content-complete and mobile/Steam builds are packaged — and no sooner than 2 weeks out.

---

## Open decisions for Vince
1. Register as **individual** vs **company**?
2. OK to spend the **$100** Steam Direct fee now to start the wishlist clock?
3. Want me to adapt `gen-og-card.py` into a **capsule-image generator** (the 4 required sizes) as the next concrete step?
