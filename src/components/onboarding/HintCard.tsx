import type { OnboardingHintDefinition } from './hints'

interface HintCardProps {
  hint: OnboardingHintDefinition
  onDismiss: () => void
}

export function HintCard({ hint, onDismiss }: HintCardProps) {
  return (
    <div className="animate-fade-in rounded-lg border border-accent-gold/35 bg-bg-primary/80 px-3.5 py-3 shadow-lg shadow-accent-gold/10 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent-gold shadow-[0_0_10px_rgba(212,168,67,0.75)]" />
        <p className="min-w-0 flex-1 text-sm leading-snug text-text-secondary">
          {hint.text}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md border border-accent-gold/30 bg-accent-gold/10 px-2.5 py-1 text-[11px] font-semibold text-accent-gold transition-colors hover:border-accent-gold/60 hover:bg-accent-gold/20"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
