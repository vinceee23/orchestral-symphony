import { useCallback, useEffect, useRef, useState } from 'react'
import { SonanceLogo } from '../shared/SonanceLogo'
import { useGameStore } from '../../store/gameStore'
import { playStoryBeatSound } from '../../core/audio'

export interface StoryBeatProps {
  lines: string[]
  /** 0..1 — scales orb size and warmth (low = lonely spark; high = swelling glow). */
  goldLevel: number
  onDone: () => void
  /** When true, after the last line a logo card zooms in + blooms (~2s) before finishing. Intro only. */
  logo?: boolean
}

const FADE_IN_MS = 700
const FADE_OUT_MS = 800
const LINE_FADE_MS = 600
const LOGO_HOLD_MS = 2400

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof matchMedia !== 'undefined'
      ? matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * Full-viewport narrative overlay — gold orb, line-by-line copy, skip, dissolve on finish.
 * When `logoSrc` is set (the intro), the last line gives way to a logo card that zooms in + blooms.
 */
export function StoryBeat({ lines, goldLevel, onDone, logo }: StoryBeatProps) {
  // Honor BOTH the OS preference and the in-app Settings toggle (the toggle alone couldn't reach
  // these JS-inline orb/logo animations before). Both hooks run unconditionally (Rules of Hooks).
  const osReducedMotion = usePrefersReducedMotion()
  const settingReducedMotion = useGameStore((s) => s.settings.reducedMotion)
  const reducedMotion = osReducedMotion || settingReducedMotion
  const containerRef = useRef<HTMLDivElement>(null)
  const [lineIndex, setLineIndex] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [lineVisible, setLineVisible] = useState(true)
  const [showLogo, setShowLogo] = useState(false)
  const [logoIn, setLogoIn] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    containerRef.current?.focus()
    playStoryBeatSound() // a soft low swell under each narrative beat (incl. the World Tour reveal)
    // fade IN on mount (next frame) so the overlay eases to black instead of popping instantly
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const finish = useCallback(() => {
    if (exiting) return
    setExiting(true)
    window.setTimeout(onDone, reducedMotion ? 200 : FADE_OUT_MS)
  }, [exiting, onDone, reducedMotion])

  // Logo card: trigger the zoom-in/bloom next frame, then auto-finish after a brief hold.
  useEffect(() => {
    if (!showLogo) return
    const raf = window.requestAnimationFrame(() => setLogoIn(true))
    const hold = window.setTimeout(finish, reducedMotion ? 1400 : LOGO_HOLD_MS)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(hold)
    }
  }, [showLogo, finish, reducedMotion])

  const advance = useCallback(() => {
    if (exiting) return
    if (showLogo) {
      finish()
      return
    }
    if (lineIndex < lines.length - 1) {
      setLineVisible(false)
      window.setTimeout(() => {
        setLineIndex((i) => i + 1)
        setLineVisible(true)
      }, reducedMotion ? 0 : 180)
    } else if (logo) {
      setShowLogo(true)
    } else {
      finish()
    }
  }, [exiting, finish, lineIndex, lines.length, reducedMotion, showLogo, logo])

  const orbSize = 72 + goldLevel * 320
  const bloomSize = orbSize * 1.85
  const coreAlpha = 0.28 + goldLevel * 0.52
  const haloAlpha = 0.06 + goldLevel * 0.14
  const breatheDuration = reducedMotion ? '0.01ms' : '4s'

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black select-none transition-opacity ${
        exiting || !entered ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        transitionDuration: reducedMotion ? '200ms' : `${exiting ? FADE_OUT_MS : FADE_IN_MS}ms`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Story"
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          advance()
        }
      }}
      tabIndex={0}
    >
      {!showLogo && (
        <button
          type="button"
          className="absolute top-5 right-5 z-10 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-text-muted/70 hover:text-text-secondary transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            finish()
          }}
          aria-label="Skip story"
        >
          Skip
        </button>
      )}

      {showLogo ? (
        /* Logo card — the CSS wordmark zooms in + blooms, then the container fades into the game */
        <div
          className="px-8 pointer-events-none select-none"
          style={{
            opacity: logoIn ? 1 : 0,
            transform: reducedMotion ? 'none' : `scale(${logoIn ? 1 : 0.82})`,
            filter: reducedMotion ? 'none' : `brightness(${logoIn ? 1.05 : 0.7})`,
            transition: reducedMotion
              ? 'opacity 300ms ease-out'
              : 'opacity 900ms ease-out, transform 1600ms cubic-bezier(0.16,1,0.3,1), filter 1600ms ease-out',
          }}
        >
          <SonanceLogo size="clamp(2.5rem, 11vw, 7.5rem)" glow={logoIn ? 0.5 : 0.12} hero />
        </div>
      ) : (
        <>
          {/* Breathing gold orb */}
          <div
            className="relative flex items-center justify-center mb-10 md:mb-14 pointer-events-none"
            style={{ width: bloomSize, height: bloomSize }}
          >
            <div
              className="story-orb-breathe absolute rounded-full"
              style={{
                width: orbSize,
                height: orbSize,
                animationDuration: breatheDuration,
                background: `radial-gradient(circle at 50% 48%, rgba(212,168,67,${coreAlpha}) 0%, rgba(212,168,67,${haloAlpha}) 38%, transparent 68%)`,
                filter: `blur(${8 + goldLevel * 10}px)`,
                ['--orb-opacity-min' as string]: String(0.55 + goldLevel * 0.25),
                ['--orb-opacity-max' as string]: String(0.75 + goldLevel * 0.2),
                ['--orb-scale-max' as string]: reducedMotion ? '1' : String(1 + 0.06 + goldLevel * 0.04),
              }}
            />
            {/* Inner hot core — sharper, smaller */}
            <div
              className="story-orb-breathe absolute rounded-full"
              style={{
                width: orbSize * 0.35,
                height: orbSize * 0.35,
                animationDuration: breatheDuration,
                animationDelay: reducedMotion ? '0ms' : '-0.5s',
                background: `radial-gradient(circle, rgba(232,196,106,${0.5 + goldLevel * 0.35}) 0%, transparent 70%)`,
                filter: `blur(${2 + goldLevel * 4}px)`,
                ['--orb-opacity-min' as string]: String(0.6 + goldLevel * 0.2),
                ['--orb-opacity-max' as string]: String(0.95),
                ['--orb-scale-max' as string]: reducedMotion ? '1' : '1.1',
              }}
            />
          </div>

          {/* Narrative text */}
          <div className="relative max-w-lg px-8 text-center pointer-events-none">
            <p
              key={lineIndex}
              className={`font-narrative text-xl md:text-2xl leading-relaxed text-text-primary/90 ${
                lineVisible ? 'story-line-in' : 'opacity-0'
              }`}
              style={{
                animationDuration: reducedMotion ? '0.01ms' : `${LINE_FADE_MS}ms`,
              }}
            >
              {lines[lineIndex]}
            </p>
            {!exiting && (
              <p
                className="mt-8 text-[11px] uppercase tracking-[0.35em] text-text-muted/50 animate-pulse"
                style={{ animationDuration: reducedMotion ? '0.01ms' : '2.8s' }}
              >
                {lineIndex < lines.length - 1 ? 'Click to continue' : 'Click to begin'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
