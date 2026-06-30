/**
 * Minimal gold line-art icon set — matches the tier-emblem aesthetic.
 * Stroke uses currentColor, so existing text-color classes (text-accent-gold, etc.) just work.
 * Note heads are filled with currentColor for legibility at small sizes.
 */
export type IconName =
  | 'brand'        // beamed eighth notes — app mark
  | 'note'         // single note — Compose
  | 'sparkle'      // four-point star — Prestige
  | 'medal'        // medallion + ribbon — Achievements
  | 'bars'         // bar chart — Stats
  | 'metronome'    // tempo device — TempoBar
  | 'disc'         // vinyl record — Opus / records / platinum
  | 'gear'         // cog — Autobuyers
  | 'sliders'      // equalizer sliders — Settings
  | 'globe'        // world tour
  | 'lock'         // locked layer/feature

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

const ICONS: Record<IconName, React.ReactNode> = {
  brand: (
    <>
      <line x1="9" y1="18" x2="9" y2="5" />
      <line x1="17" y1="18" x2="17" y2="5" />
      <line x1="9" y1="5" x2="17" y2="5" />
      <line x1="9" y1="8" x2="17" y2="8" />
      <ellipse cx="7" cy="18" rx="2.2" ry="1.6" fill="currentColor" stroke="none" />
      <ellipse cx="15" cy="18" rx="2.2" ry="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  note: (
    <>
      <line x1="10.2" y1="17" x2="10.2" y2="5" />
      <path d="M10.2 5 C13 5.5 14.5 7 14 9.5" />
      <ellipse cx="8" cy="17" rx="2.4" ry="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  sparkle: (
    <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" strokeLinejoin="round" />
  ),
  medal: (
    <>
      <line x1="9" y1="3" x2="11" y2="11" />
      <line x1="15" y1="3" x2="13" y2="11" />
      <circle cx="12" cy="16" r="5" />
      <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  bars: (
    <>
      <line x1="6" y1="20" x2="6" y2="13" strokeWidth="2.5" />
      <line x1="12" y1="20" x2="12" y2="7" strokeWidth="2.5" />
      <line x1="18" y1="20" x2="18" y2="15" strokeWidth="2.5" />
    </>
  ),
  metronome: (
    <>
      <path d="M8.5 20 L15.5 20 L13.5 5 L10.5 5 Z" strokeLinejoin="round" />
      <line x1="7.5" y1="20" x2="16.5" y2="20" />
      <line x1="12" y1="18" x2="14" y2="7" />
      <circle cx="14" cy="7" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  disc: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <line x1="12" y1="2.5" x2="12" y2="5.4" />
      <line x1="12" y1="18.6" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5.4" y2="12" />
      <line x1="18.6" y1="12" x2="21.5" y2="12" />
      <line x1="5.3" y1="5.3" x2="7.3" y2="7.3" />
      <line x1="16.7" y1="16.7" x2="18.7" y2="18.7" />
      <line x1="5.3" y1="18.7" x2="7.3" y2="16.7" />
      <line x1="16.7" y1="7.3" x2="18.7" y2="5.3" />
    </>
  ),
  sliders: (
    <>
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="9" cy="8" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="1.8" />
      <path d="M8 10 V7 a4 4 0 0 1 8 0 V10" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}
