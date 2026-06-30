import { useUiStore } from '../../store/uiStore'
import { Button } from './Button'
import { ModalShell } from './ModalShell'

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded border border-border-light bg-bg-tertiary text-xs font-semibold text-accent-gold tabular-nums">
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
    <ModalShell
      onClose={() => setHelp(false)}
      label="How to Play"
      panelClassName="max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-xl border border-accent-gold/40 bg-bg-primary p-6 md:p-8 shadow-2xl space-y-6"
    >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-display font-semibold text-accent-gold">How to Play</h2>
          <Button onClick={() => setHelp(false)} variant="ghost" size="sm" aria-label="Close help">
            Close
          </Button>
        </div>

        <section className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-base font-display text-accent-gold">The Orchestra</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Your stage has seven sections — Notes through Symphonies. Each section produces the one before
              it, and Notes produce <span className="text-text-primary">Soundwaves</span>, your core currency.
              Buy a section to bring it in; the more you own, the brighter it glows.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-display text-accent-gold">Every 10th Doubles</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Each section's <span className="text-text-primary">10th purchase</span> doubles its output — watch
              the little bar under it and chase the next ×2. <span className="text-text-primary">Tempo</span>{' '}
              speeds your whole orchestra (a global multiplier).
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-display text-accent-gold">Costs Climb</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Prices rise as you buy: every purchase of a section costs a little more, and the cost takes a{' '}
              <span className="text-text-primary">bigger jump every 10th buy</span>. So each ×2 you chase is
              also each section's steepest price — that tension (cheaper output now vs. a doubling later) is the
              core decision, and what eventually pushes you toward an Encore.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-display text-accent-gold">Encore (Prestige)</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              When growth slows, perform an <span className="text-accent-gold">Encore</span>: reset your
              orchestra for <span className="text-text-primary">Applause</span>. Your total Applause permanently
              multiplies all production — and you keep a spendable pool for Encore upgrades. Each Encore is faster
              than the last. After eight, you've mastered the stage… and your <em>Magnum Opus</em> awaits.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-display text-accent-gold">Hotkeys</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li><Key>1</Key>–<Key>7</Key> &nbsp;buy that section (at your current buy-amount)</li>
            <li><Key>T</Key> &nbsp;max Tempo</li>
            <li><Key>M</Key> &nbsp;max <span className="text-text-primary">everything</span> — all sections + tempo</li>
            <li><Key>H</Key> &nbsp;toggle this help &nbsp;·&nbsp; <Key>Esc</Key> close</li>
          </ul>
          <p className="text-xs text-text-muted">Hold any buy key to repeat it continuously.</p>
        </section>
    </ModalShell>
  )
}
