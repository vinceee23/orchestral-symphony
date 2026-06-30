# Mechanics Backlog — Sonance (ideation, 2026-06-28)

> **What this is:** a ranked, deduped backlog from a two-agent read-only mechanics review (L4 enrichment +
> risk audit · L0–L3 polish · cross-layer cohesion). **It is NOT a mid-build to-do.** Per the project rule
> (*no mid-build pivots*), ideas graduate into a real spec **deliberately, one at a time** — nothing here is
> bolted onto the in-flight L4. North star: **all three of narrative / build-craft / cozy-idle, balanced.**
>
> Tags: effort **S/M/L** · impact **lo/med/hi** · risk **lo/med/hi** · gate flag.

---

## ⛔ P0 — L4 tuning MUST-DOs (fold into the L4 sim-tuning pass; these are correctness/balance, not "ideas")

These came out of the risk audit and **must** be resolved when we tune L4's magnitudes (the structure Codex is
building leaves them as TBD placeholders, which is fine at zero-allocation but unsafe once allocated):

1. **Set `CHANNEL_CAPS.domain`** — the M9 cap hook is currently EMPTY; Brass's flat prodMult × efficiency
   growth can compound unbounded across `signatureCount` (the B3 permanent-× runaway). *Must* set a cap. (S, **hi risk**)
2. **Harmony-vs-mono band = the make-or-break.** Sim must assert *no mono strictly dominates* AND *thin-spread
   isn't strictly dominant* — a target band. Under/over-reward both kill the layer's reason to exist. (M, **hi risk**)
3. **Percussion → tempo ×20 ceiling.** Diminish Percussion as it nears `TEMPO_MIN_INTERVAL`'s ×20 cap (else
   further allocation is a *dead choice*), and sim the idle:active ratio stays in 1.4–1.75×. (S–M, med)
4. **Woodwinds cost floor.** Achievement cost-reduction already floors at 0.5; add a *combined* floor so deep
   Woodwinds can't approach free tiers. (S, med)
5. **Efficiency curve must reward early commitment.** Verify the capped-log makes committing early viable, so
   "always defer/respec latest" isn't optimal (a flattened, dead decision). (S, lo–med)
6. **Post-Signature re-climb pacing.** L4 resets all L3 (opusCount/lifetimeAcclaim/venue) — sim the first L4
   re-climb so it's a *beat*, not a full L1–L3 slog. (M, med)
7. **Auto-tour-at-L4 × Acclaim snowball.** Auto-tour was calibrated-but-dead; sim L4 cadence with it ON (and
   the snowballing ≤×49 Acclaim) so it doesn't trivialize re-tours. Revisit the deferred `RESIM_AUTOMO_RECLIMB`. (M, med)

---

## A. L4 Signature enrichment (fits the LOCKED structure — no new core verbs)

1. **Emergent "your sound" identity** — derive a label + subtle era/UI gold-tint from the dominant domain
   ("The Pulse-driven", "The Harmonist"), recorded from L4 on. *Makes the Identity axis FELT and pre-loads the
   L9 Signature-mirror — the hardest cross-layer payoff, cheapest seeded now.* (M, **hi**, lo) — serves story+craft
2. **Specialist & generalist achievement lines** — a "mono ≥0.9" per domain + a "balanced (all ≥0.15)" badge.
   *Validates both archetypes so neither reads as the wrong build.* (S, med, lo)
3. **Domain fingerprints in the narrator** — the "…one of us" beat (+ ambient lines) echo the dominant domain's
   god *fingerprint* (Pulse/Voice/Blaze/Breath/Twins), **never names**. *Cheap myth depth; seeds L8/L9.* (S, med, lo) — story
4. **Pre-commit blend preview** — live-preview a hypothetical allocation's effects before locking at ascension.
   *Teaches the zero-sum trade; counters reward-opacity.* (M, med, lo) — craft
5. **Named allocation presets ("voices")** — save/name presets to swap at the respec point. (S–M, med, lo) — craft+cozy
6. **Domain-tinted UI accent** — shift the gold accent per dominant domain via the existing era-tint. (S, med, lo) — cozy
7. **Peak-alignment cosmetic track** — `peakDomainAlignment` (already `never`) unlocks per-domain *cosmetic*
   flourishes, never power. (M, med, lo) — cozy+craft

## B. L0–L3 additive polish (trial-safe unless flagged; ships to the public trial → sim-gate + visual-check)

1. **Concrete challenge-reward readouts** — exact reward + live capstone value, not vague labels. (S, **hi**, lo)
2. **Prestige-preview tooltips** — gain + exactly what resets, before Encore/MO/Tour. (S, **hi**, lo)
3. **Offline-earnings summary modal** — surface what accrued while away (replay already computes it). (S–M, **hi**, lo)
4. **Per-layer mechanic cards** — teach each new verb without polluting the narrator (blessed minor). (M, **hi**, lo)
5. **Accessibility: toggle-Conduct** — tap/lock alt to holding Space; no hold-only path. (S, med, lo)
6. **L3 onboarding gate** — JIT explainer when World Tour unlocks (densest jump). (S–M, med, lo)
7. **Milestone/prestige juice** — subtle anim+sound on buy-10 + each prestige. (M, med, lo) — cozy
8. **Stats / Codex page** — lifetime counters + a live production-funnel breakdown. (M, med, lo) — craft
9. **Autobuyer presets/QoL** — enable-all, per-tier bulk memory. (S–M, med, lo)
10. **Production-neutral collectible achievements** — edge-play badges, no multiplier (mults → needs-sim-gate). (S, lo–med, lo)

## C. Cross-layer synergy & cohesion (L1–L9)

1. **Signature-mirror seed (L4→L9)** — see A.1 (the connective keystone). (S–M, **hi**, lo)
2. **Re-climb pacing audit L1–L4** — every layer's re-entry must have a *beat* (not slog, not instant-collapse).
   *#1 driver of "flat/grindy long game."* (M, **hi**, med) — **needs-sim-gate**
3. **Automation-cadence cohesion** — make "each layer automates the one below" read uniformly (L3→L1/2, L4→L3). (M, med, lo)
4. **Currency-flow legibility** — one "what feeds what" view (SW→EP→AP→OP→Records/Platinum→Acclaim→Signature). (M, med, lo)
5. **Era / gold→black motif continuity** — every layer shifts the orb-arc consistently (one arc, not 9 minigames). (M, med, lo) — story
6. **Early Palimpsest (L6) tease** — a faint eternal-score placeholder that visibly *wants* your peaks. (M, med, lo) — design-only now
7. **L7→L8 tonal build-up + Recognition foreshadow** — L4–L6 lean toward "the apparent end"; tease that falling
   isn't the end, so the fake-credits/ember keystone lands. (S, med, lo) — design-only

---

## ⭐ Top picks across everything (balanced north star)
- **Now-ish, trial (high impact / low risk / low effort):** B1 challenge readouts · B2 prestige-preview · B3
  offline summary · B4 mechanic cards. (All four are blessed "minors" + pure UX wins.)
- **With L4 (seed during this build):** A1 emergent identity / C1 mirror-seed (the keystone), A2 archetype
  achievements, A3 narrator fingerprints.
- **Foundational, do-during-tuning:** the entire **P0** list (esp. the `CHANNEL_CAPS.domain` cap).
- **Watch:** C2 re-climb pacing audit — the single biggest lever on "does the long game stay fun."

*Source: two read-only fork reviews, 2026-06-28. Nothing here is committed as work — pick items to graduate
into specs. P0 items are the exception: they're requirements for the L4 tuning pass, not optional ideas.*

---

## D. Genre-audit graduated items (2026-06-29)

> Source: the Gemini Deep Research genre audit (`docs/GENRE-AUDIT-REPORT.md`), walked one-by-one with Vince
> (C1–C21, I1–I6, Parts B & C). These are the **decided** outcomes. North-star lens added this session:
> **Sonance must feel like Sonance, not "AD Music Edition"** — differentiation must live in the *core-loop math*,
> not just the theme. Items below are tagged by disposition.

### D1 — Ready-to-build pass — ✅ BUILT (2026-06-29, `feat/layer4`)
1. ✅ **Settings panel v1** [C16 + C12] — full spec built; see `docs/SETTINGS-SPEC.md`. Closes the C16 gap.
   Save schema v2→v3. (M)
2. ✅ **Production Breakdown panel** [C10] — per-channel ×N on the Stats page, sourced from
   `coreProductionFactors`/`getProductionBreakdown`; drift-guarded test proves product === multiplier. (S–M)
3. ✅ **Conducting → tap-to-trigger timed burst** [C4] — `uiStore` burst window (`CONDUCT_BURST_MS`), Space/
   button now tap; no holding. *Superseded B5.* (S–M)
4. ✅ **`ch_unplugged` ordering gate** — capstone now requires the other 11 cleared (the reported "exploit"
   was a false positive — the reward was already correctly gated on all-12; verified per THE METHOD). (S)

### D2 — Identity spine + depth (needs a design spec each before build; the not-AD core work)
5. **Signature-as-spine** [C21/Part B] — elevate L4 so each domain allocation *reshapes which tier-interaction
   matters*, so runs play differently. On-branch, low trial risk. Build on Part B's "strongest idea". (L)
6. **Harmony/Resonance between tiers** [C21/Part B] — adjacent tiers in consonant ratios (chords/intervals) grant
   bonuses → puzzle becomes balancing for consonance, not dumping into the top tier. **⚠️ Touches the live L0–L3
   loop — reworks the public trial; biggest differentiation, biggest build.** (L, **trial-affecting**)
7. ~~**Tempo risk/reward dial**~~ — **CUT (2026-07-01).** It was Conducting v2 — "spike production for
   short-term power" is already Conducting's job (L2). Redundant; removing it keeps the tempo verbs distinct
   (Conducting = spike; L5 Virtuoso = the anti-spike discipline). The not-AD core now leans on #5 + #6 only.
8. **Time Banking offline model** [C15 / I1] — bank offline time as a spendable resource burned at accelerated
   speed with active decisions on return. Report's top offline pick + a non-AD differentiator. (M–L)
9. **Rule-inversion challenges** [I2] — add 2–3 challenges that fundamentally change play (e.g. "buying a tier
   resets lower tiers"), not just constraints. Feeds depth + identity. (M)
10. **Systematic milestone auto-completion** [I5] — early tiers auto-clear on later resets; the principled fix for
    C2 (tedious re-climb). Supersedes ad-hoc head-start perks. *This is the chosen C2/C-section-C2 answer.* (M)

### D3 — Folded into the #6 L4 playtest / feel pass (magnitudes, not mechanics)
- C1 dead-zone audit: verify every layer transition has a lateral action available at the wall.
- C2 early re-climb: measure the opening re-climb length; apply D2-#10 only if it actually feels tedious.
- C4 `AUTO_CONDUCT_FRACTION`: tune the idle-floor-to-ceiling gap so idling never feels mandatory.
- C18/C20: keep hint cards concise; verify story beats are skippable.

### D4 — Roadmap doctrine (decisions, not build items)
- **9-layer ladder → gate behind proof** [Part B]: do NOT pre-commit to 9 full resets. Build L4→L5, prove each
  verb is genuinely distinct AND well-paced before committing the next; collapse any that don't justify a full
  reset into a parallel upgrade tree. (Update `DESIGN.md` / `bible/04-forward-design`.)
- **Monetization → free demo (L0–L3) → premium L4+ on Steam** [Part C]: matches the existing branch split and
  the report's gold standard. (Confirm in `docs/MONETIZATION.md`.)
- **Early community feedback → deferred** to launch-prep (post trial to r/incremental_games + Galaxy Click once
  L4 reflects the identity direction).
- **PH tax (RA 12023):** Steam = Merchant of Record, auto-remits 12% VAT on PH sales; only action is correct
  BIR/ORUS classification for foreign royalties. Informational.

### D5 — Backlog (later / endgame)
- **Custom difficulty dials** [I3] — Synergism-style; candidate for L8 Redemption endgame replayability.
- **Background music + true Music/SFX volume split** — needs an audio asset pipeline; `audio.ts` is SFX-only today.

### Cleared as already-handled (no action — Sonance is at or ahead of genre norms)
C3 (sim pacing gate), C5 (no mandatory clicking), C6 (distinct verbs, built layers), C7 (free respec),
C8 (`PrestigeDialog` gain/resets/keeps preview), C9 (Roadies + higher-order automation + buy-max),
C11 (uncapped milestones + cascade), C13 (376→100 cull), C14 (additive specific rewards), C16 QoL (Buy-Max +
bulk-buy exist; save export = D1-#1), C17 (progressive disclosure), C19 (built content), I4 (automation thesis),
I6 (Signature free respec).
