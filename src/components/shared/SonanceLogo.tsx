interface SonanceLogoProps {
  /** font-size: a number (px) or any CSS length, e.g. 'clamp(2.5rem, 9vw, 7rem)'. Drives the whole mark. */
  size?: number | string
  /** 0..1 reactive glow (crescendo / conducting). Subtle by design — never the highlight. */
  glow?: number
  /** hero mode (the intro splash): a much bigger/brighter breathing glow. Header stays non-hero (subtle). */
  hero?: boolean
  className?: string
}

const GOLD = '#d4a843'
// The AI-generated gold orb (transparent PNG, bloom baked in) forms the O. Text stays CSS (Hanken Grotesk).
const ORB_SRC = `${import.meta.env.BASE_URL}sonance-orb.png`

/**
 * The SONANCE wordmark — CSS text (the game's --font-body) with the O replaced by the AI gold orb image.
 * The orb's baked bloom spills onto the neighbouring letters; a reactive gold drop-shadow gently swells
 * with `glow` (crescendo / conducting).
 */
export function SonanceLogo({ size = 24, glow = 0, hero = false, className = '' }: SonanceLogoProps) {
  const g = Math.max(0, Math.min(1, glow))
  const fontSize = typeof size === 'number' ? `${size}px` : size
  // hero (intro) = a big, dramatic breathing glow; non-hero (header) = restrained.
  const haloInset = hero ? '-100%' : '-25%'
  const haloBg = hero
    ? 'radial-gradient(circle, rgba(245,225,150,0.6) 0%, rgba(212,168,67,0.22) 45%, transparent 78%)'
    : 'radial-gradient(circle, rgba(245,225,150,0.5) 0%, rgba(212,168,67,0.2) 46%, transparent 72%)'
  // blur the halo so it has NO visible circular edge — just a soft edgeless bloom the orb melts into
  const haloBlur = hero ? '0.55em' : '0.12em'
  const haloDur = hero ? '2.8s' : '3.6s'
  // hero (intro) = a big three-layer bloom; non-hero (header) = a restrained two-layer glow
  const orbFilter = hero
    ? `drop-shadow(0 0 ${0.22 + g * 0.18}em rgba(248,230,165,${0.8 + g * 0.2})) drop-shadow(0 0 ${0.85 + g * 0.6}em rgba(232,196,106,${0.55 + g * 0.35})) drop-shadow(0 0 ${1.9 + g * 1.1}em rgba(212,168,67,${0.4 + g * 0.35}))`
    : `drop-shadow(0 0 ${0.08 + g * 0.16}em rgba(245,225,150,${0.45 + g * 0.3})) drop-shadow(0 0 ${0.3 + g * 0.6}em rgba(212,168,67,${0.25 + g * 0.4}))`
  return (
    <span
      role="img"
      aria-label="Sonance"
      className={`inline-flex items-center font-body font-bold uppercase leading-none select-none ${className}`}
      style={{
        fontSize,
        letterSpacing: '0.08em',
        color: GOLD,
      }}
    >
      <span aria-hidden="true">S</span>
      <span
        aria-hidden="true"
        className="relative inline-flex shrink-0"
        // asymmetric negative margin: pull the (round) S in harder than the flat-left N so both gaps look even
        style={{ width: '1.15em', height: '1.15em', margin: '0 -0.12em 0 -0.22em' }}
      >
        {/* constant gentle "breathing" halo — the always-on animating glow (slow opacity pulse) */}
        <span
          className="absolute rounded-full animate-pulse motion-reduce:animate-none"
          style={{ inset: haloInset, background: haloBg, filter: `blur(${haloBlur})`, animationDuration: haloDur }}
        />
        {/* the orb itself; its drop-shadow adds the reactive swell on Conduct, layered over the breathe */}
        <img
          src={ORB_SRC}
          alt=""
          className="relative h-full w-full"
          style={{
            filter: orbFilter,
            transition: 'filter 500ms ease-out',
          }}
        />
      </span>
      <span aria-hidden="true">NANCE</span>
    </span>
  )
}
