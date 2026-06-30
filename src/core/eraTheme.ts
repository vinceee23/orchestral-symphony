/**
 * Era theming — your prestige progression skins the WHOLE app (navbar, header, content bg), not just the
 * Compose stage, so the game visibly warms/recolors as you rise (gloomy-neutral era 0 → gold/violet/blaze).
 * Subtle undertone only (stays dark + readable). Mirrors the Compose stage's era + palette.
 */
export const ERA_COLORS = ['#d4a843', '#d4a843', '#7c3aed', '#2dd4bf', '#f59e0b', '#ef4444', '#fbbf24']

/** Stage/app era from progression — one tier per prestige layer (0 intimate · 1 Encore · 2 Magnum Opus · 3 World Tour · 6 Finale). */
export function getEra(
  lifetimeEncorePoints: number,
  opusCount: number,
  finalePoints: number,
  worldTourUnlocked: boolean,
  signatureCount = 0,
): number {
  return finalePoints > 0
    ? 6
    : signatureCount > 0
      ? 4
      : worldTourUnlocked
        ? 3
        : opusCount > 0
          ? 2
          : lifetimeEncorePoints > 0
            ? 1
            : 0
}

/** The era actually used for theming — honours the Settings "lock theme" toggle (freezes to lockedEra). */
export function effectiveEra(liveEra: number, settings: { theme: 'auto' | 'locked'; lockedEra: number }): number {
  return settings.theme === 'locked' ? settings.lockedEra : liveEra
}

/** A subtle era-color undertone gradient for app chrome. Strength ramps with era; stays readable.
 *  `weight` scales the max alpha (chrome panels lighter, content bg lighter still). */
export function eraTintCss(era: number, weight = 1): string {
  const e = Math.max(0, Math.min(6, era))
  const color = ERA_COLORS[e]
  const a = Math.min(0.18, (e / 6) * 0.18) * weight
  const hex = Math.round(a * 255).toString(16).padStart(2, '0')
  return `linear-gradient(180deg, ${color}${hex} 0%, transparent 78%)`
}
