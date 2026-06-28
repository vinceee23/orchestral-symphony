interface SonanceLogoProps {
  /** font-size: a number (px) or any CSS length, e.g. 'clamp(2.5rem, 9vw, 7rem)'. Drives the whole mark. */
  size?: number | string
  /** 0..1 reactive glow (crescendo / conducting). Subtle by design — never the highlight. */
  glow?: number
  className?: string
}

// The single game gold (index.css --color-accent-gold). The orb's two warm tones (#e8c46a hot core,
// #a07830 dim edge) are the same ones the in-game story orb already uses — no new colors, minimal gradient.
const GOLD = '#d4a843'

/**
 * The SONANCE wordmark, hand-built in the game's own font (Hanken Grotesk / --font-body) + palette.
 * The O is a gold orb. One restrained glow that spills faintly onto the letters and gently swells with
 * `glow`. Vector-crisp at any size; used in the intro card and the header.
 */
export function SonanceLogo({ size = 24, glow = 0, className = '' }: SonanceLogoProps) {
  const g = Math.max(0, Math.min(1, glow))
  const fontSize = typeof size === 'number' ? `${size}px` : size
  return (
    <span
      role="img"
      aria-label="Sonance"
      className={`inline-flex items-center font-body font-bold uppercase leading-none select-none ${className}`}
      style={{
        fontSize,
        letterSpacing: '0.14em',
        color: GOLD,
        // faint spill onto the letters; scales gently with glow
        textShadow: `0 0 ${2 + g * 6}px rgba(212,168,67,${0.06 + g * 0.2})`,
      }}
    >
      <span aria-hidden="true">S</span>
      <span
        aria-hidden="true"
        className="relative inline-block rounded-full"
        style={{
          width: '0.72em',
          height: '0.72em',
          margin: '0 0.05em',
          background: `radial-gradient(circle at 50% 44%, #e8c46a 0%, ${GOLD} 58%, #a07830 100%)`,
          boxShadow: `0 0 ${0.35 + g * 0.7}em rgba(212,168,67,${0.4 + g * 0.4})`,
          transition: 'box-shadow 500ms ease-out',
        }}
      />
      <span aria-hidden="true">NANCE</span>
    </span>
  )
}
