import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'gold' | 'purple' | 'ghost' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  display?: boolean // use the Cinzel display face (for headline/prestige actions)
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  gold: 'border-accent-gold/45 bg-accent-gold/12 text-accent-gold hover:bg-accent-gold/22 hover:border-accent-gold/70 active:bg-accent-gold/30',
  purple: 'border-accent-purple/45 bg-accent-purple/12 text-accent-purple hover:bg-accent-purple/22 hover:border-accent-purple/70 active:bg-accent-purple/30',
  ghost: 'border-border-light/70 bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover/60 hover:border-border-light',
  success: 'border-success/45 bg-success/12 text-success hover:bg-success/22 hover:border-success/70',
}

const SIZES: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-lg',
  lg: 'text-base px-6 py-3 gap-2.5 rounded-xl',
}

/**
 * Shared button — consistent padding, hover/active/disabled/focus states, gold/purple/ghost variants.
 * Replaces the ad-hoc per-component buttons so spacing + states are uniform across the app.
 */
export function Button({ variant = 'gold', size = 'md', display, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={[
        'inline-flex items-center justify-center border font-semibold tracking-wide select-none',
        'transition-colors duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-gold',
        'disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        display ? 'font-display' : '',
        SIZES[size],
        VARIANTS[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
