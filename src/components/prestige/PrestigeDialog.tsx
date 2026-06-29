import { useState } from 'react'
import { Button } from '../shared/Button'

export type PrestigeKind = 'encore' | 'mo' | 'gf'

export const PRESTIGE_INFO: Record<PrestigeKind, {
  title: string; color: string; border: string; bg: string; description: string[]
}> = {
  encore: {
    title: 'Encore',
    color: 'text-accent-gold',
    border: 'border-accent-gold/40',
    bg: 'bg-accent-gold/10',
    description: [
      'Take a bow and play again. An Encore resets your tiers, soundwaves, and tempo to the start.',
      'In return you earn Applause. Your total Applause permanently multiplies all production — and you keep a spendable pool to buy Encore upgrades.',
      'Each Encore is faster than the last. Keep performing to build toward your Magnum Opus.',
    ],
  },
  mo: {
    title: 'Magnum Opus',
    color: 'text-accent-purple',
    border: 'border-accent-purple/40',
    bg: 'bg-accent-purple/10',
    description: [
      'A Magnum Opus is a bigger reset. It resets everything an Encore does, plus your Applause.',
      'In return you gain an Opus Point — each one permanently multiplies your tempo (the speed of your whole orchestra).',
      'This is a powerful boost — tempo lifts everything at once.',
    ],
  },
  gf: {
    title: 'Grand Finale',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    description: [
      'The Grand Finale is the ultimate reset. It resets everything — tiers, Applause, and Opus.',
      'In return you gain a Finale Point — each gives a permanent x10 multiplier to all production.',
      'The deepest reset, for the longest game.',
    ],
  },
}

/** Concrete, scannable before-you-commit preview: what you gain, what resets, what survives. */
export interface PrestigePreview {
  gain: string
  resets: string[]
  keeps: string[]
}

interface Props {
  type: PrestigeKind
  preview?: PrestigePreview
  onConfirm: () => void
  onCancel: () => void
}

/** First-time confirmation dialog for a prestige reset (with a "don't show again" opt-out). */
export function PrestigeDialog({ type, preview, onConfirm, onCancel }: Props) {
  const [dontShow, setDontShow] = useState(false)
  const info = PRESTIGE_INFO[type]
  const confirmVariant = type === 'mo' ? 'purple' : 'gold'

  const handleConfirm = () => {
    if (dontShow) localStorage.setItem(`prestige_skip_${type}`, '1')
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className={`max-w-md w-full p-6 rounded-xl border ${info.border} ${info.bg} bg-bg-primary shadow-2xl space-y-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-lg font-display font-bold ${info.color}`}>{info.title}</h3>
        <div className="space-y-3">
          {info.description.map((line, i) => (
            <p key={i} className="text-sm text-text-secondary leading-relaxed">{line}</p>
          ))}
        </div>

        {preview && (
          <div className="rounded-lg border border-border bg-bg-primary/60 divide-y divide-border/60 text-sm">
            <div className="flex gap-2 px-3 py-2">
              <span className="text-success shrink-0">{'↑'} You gain</span>
              <span className="text-text-primary text-right flex-1 tabular-nums">{preview.gain}</span>
            </div>
            <div className="flex gap-2 px-3 py-2">
              <span className="text-danger shrink-0">{'↺'} Resets</span>
              <span className="text-text-secondary text-right flex-1">{preview.resets.join(' · ')}</span>
            </div>
            <div className="flex gap-2 px-3 py-2">
              <span className="text-text-muted shrink-0">{'✓'} You keep</span>
              <span className="text-text-secondary text-right flex-1">{preview.keeps.join(' · ')}</span>
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-accent-gold"
          />
          <span className="text-xs text-text-muted">Don't show this again</span>
        </label>
        <div className="flex gap-3 pt-1">
          <Button onClick={onCancel} variant="ghost" size="md" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant={confirmVariant} size="md" display className="flex-1">
            Confirm {info.title}
          </Button>
        </div>
      </div>
    </div>
  )
}
