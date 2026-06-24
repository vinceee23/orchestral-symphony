import { useUiStore } from '../../store/uiStore'

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded border border-border-light bg-bg-tertiary text-[11px] font-semibold text-accent-gold">
      {children}
    </kbd>
  )
}

/** Help / tutorial overlay. Toggle with H (or the ? button); close with Esc. */
export function HelpModal() {
  const open = useUiStore((s) => s.helpOpen)
  const setHelp = useUiStore((s) => s.setHelp)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setHelp(false)}>
      <div
        className="max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-accent-gold/40 bg-bg-primary p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold text-accent-gold">How to Play</h2>
          <button onClick={() => setHelp(false)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
        </div>

        <section className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <div>
            <h3 className="font-display text-accent-gold mb-1">The Orchestra</h3>
            <p>
              Your stage has seven sections — Notes through Symphonies. Each section produces the one before
              it, and Notes produce <span className="text-text-primary">Soundwaves</span>, your core currency.
              Buy a section to bring it in; the more you own, the brighter it glows.
            </p>
          </div>
          <div>
            <h3 className="font-display text-accent-gold mb-1">Every 10th Doubles</h3>
            <p>
              Each section's <span className="text-text-primary">10th purchase</span> doubles its output — watch
              the little bar under it and chase the next ×2. <span className="text-text-primary">Tempo</span>{' '}
              speeds your whole orchestra (a global multiplier).
            </p>
          </div>
          <div>
            <h3 className="font-display text-accent-gold mb-1">Encore (Prestige)</h3>
            <p>
              When growth slows, perform an <span className="text-accent-gold">Encore</span>: reset your
              orchestra for <span className="text-text-primary">Applause</span>. Your total Applause permanently
              multiplies all production — and you keep a spendable pool for Encore Upgrades. Each Encore is faster
              than the last. After eight, you've mastered the stage… and your <em>Magnum Opus</em> awaits.
            </p>
          </div>
        </section>

        <section className="mt-5">
          <h3 className="font-display text-accent-gold mb-2">Hotkeys</h3>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li><Key>1</Key>–<Key>7</Key> &nbsp;buy that section (at your current buy-amount)</li>
            <li><Key>T</Key> &nbsp;max Tempo</li>
            <li><Key>M</Key> &nbsp;max <span className="text-text-primary">everything</span> — all sections + tempo</li>
            <li><Key>H</Key> &nbsp;toggle this help &nbsp;·&nbsp; <Key>Esc</Key> close</li>
          </ul>
          <div className="mt-3 p-3 rounded-lg border border-accent-gold/30 bg-accent-gold/5">
            <p className="text-sm text-text-secondary leading-relaxed">
              <span className="text-accent-gold font-semibold">The M + H trick</span> — <em>Max + Hold</em>. Just
              <Key>hold M</Key> and your whole orchestra keeps buying max, continuously. The classic
              Antimatter Dimensions move: hold it and watch everything fill out hands-free.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
