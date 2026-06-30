import type { SignatureDomain } from '../store/types'

/**
 * The pantheon — VISUAL/identity data only (NOT the L9 boss FSM; that's a future `gods.ts`).
 *
 * Art direction (agreed 2026-07-01, REVISED to celestial): the six gods are vast custom CONSTELLATIONS in
 * the gold→black void — a FACELESS deity (head a blank of starlight, no features) drawn in delicate gold
 * line over a domain-tinted starfield, cradling/playing its instrument, antique celestial-atlas style
 * (Flamsteed/Uranometria). Each is known by its AURA: a cold domain tint + a signature "stir/blink"
 * behavior (the fingerprint — the Pulse flares on the beat, the Breath breathes, the Twins beat in/out of
 * phase). The Maestro is NOT a constellation — he is the central gold ORIGIN ORB (the cold-open orb) the
 * five wheel around, like an orrery. (Earlier humanoid-figure pass read too mundane; constellations make
 * "now you know our faces" literal — you connect the stars into the gods.)
 * v1 concept art (matched set): drafts/pantheon/{timpana,lyra,clarion,aeolia,twins,maestro}.png.
 * This data seeds the pantheon early: the L4 "your sound" identity glows toward the god you're becoming.
 */
export type GodAura = 'strobe' | 'vibrato' | 'blaze' | 'breathe' | 'beat' | 'downbeat'

export interface GodVisual {
  name: string        // provisional (roles/domains locked, names draft) — STORY-SPEC.md:35
  epithet: string     // the fingerprint the narrator drops pre-reveal
  tint: string        // cold aura color in the void
  aura: GodAura       // signature behavior (how the aura moves)
  fusion: string      // how the instrument reads in the faceless figure's silhouette
}

export const PANTHEON: Record<SignatureDomain, GodVisual> = {
  percussion: { name: 'Timpana', epithet: 'the Pulse', tint: '#c0414f', aura: 'strobe',
    fusion: 'torso is a taut drumhead that fires a shock on every beat' },
  strings: { name: 'Lyra', epithet: 'the Voice', tint: '#7b6ad0', aura: 'vibrato',
    fusion: 'a strung sounding-box, filaments trailing like bowed hair' },
  brass: { name: 'Clarion', epithet: 'the Blaze', tint: '#dd8b3a', aura: 'blaze',
    fusion: 'limbs flare open into brass bells; a figure made of light' },
  woodwinds: { name: 'Aeolia', epithet: 'the Breath', tint: '#41b3a7', aura: 'breathe',
    fusion: 'a hollow reed-body, tone-holes breathing light, half-dissolved' },
  harmony: { name: 'The Twins', epithet: 'Consonance & Dissonance', tint: '#56b487', aura: 'beat',
    fusion: 'two figures = two tines of one tuning-fork; the interval between them' },
}

/** The Maestro — origin/unifier, the cold-open orb taking figure. Pure gold; commands all domains. */
export const MAESTRO = {
  name: 'The Maestro',
  epithet: 'the Downbeat',
  tint: '#d4a843',
  aura: 'downbeat' as GodAura,
  fusion: 'plays the orchestra, not an instrument — one downbeat moves everything',
} as const

/** Map a Signature dominant-domain identity to the god it echoes (for the L4 "your sound" foreshadow). */
export function godForDomain(domain: SignatureDomain | null): GodVisual | null {
  return domain ? PANTHEON[domain] : null
}
