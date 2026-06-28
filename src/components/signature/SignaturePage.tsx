import type { SignatureDomain } from '../../store/types'
import { useGameStore } from '../../store/gameStore'
import { formatNumber } from '../../core/format'
import {
  SIGNATURE_BUDGET,
  SIGNATURE_DOMAINS,
  ZERO_SIGNATURE_ALLOCATION,
  getSignatureEffects,
  getSignatureEfficiency,
} from '../../core/signature'
import { getActiveChallengeModifiers, getChallengeById } from '../../core/challenges'
import { Button } from '../shared/Button'

const DOMAIN_LABELS: Record<SignatureDomain, { label: string; lever: string }> = {
  percussion: { label: 'Percussion', lever: 'Tempo' },
  strings: { label: 'Strings', lever: 'Crescendo' },
  brass: { label: 'Brass', lever: 'Production' },
  woodwinds: { label: 'Woodwinds', lever: 'Cost' },
  harmony: { label: 'Harmony', lever: 'Breadth' },
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function effectReadout(domain: SignatureDomain, alloc: Record<SignatureDomain, number>, signatureCount: number): string {
  const effects = getSignatureEffects(alloc, getSignatureEfficiency(signatureCount))
  switch (domain) {
    case 'percussion':
      return `+${formatNumber(effects.tempoBonus * 100, 1)}% tempo`
    case 'strings':
      return `+${formatNumber(effects.crescendoBonus, 2)} crescendo ceiling`
    case 'brass':
      return `x${formatNumber(effects.prodMult, 2)} domain production`
    case 'woodwinds':
      return `-${formatNumber((1 - effects.costMult) * 100, 1)}% tier costs`
    case 'harmony':
      return `x${formatNumber(effects.harmonyMult, 2)} evenness synergy`
  }
}

function isRunFloor(producedThisRun: { lte: (n: number) => boolean }, peakSoundwaves: { lte: (n: number) => boolean }): boolean {
  return producedThisRun.lte(0) && peakSoundwaves.lte(0)
}

export function SignaturePage() {
  const signatureAllocation = useGameStore((s) => s.signatureAllocation)
  const signatureCount = useGameStore((s) => s.signatureCount)
  const peakDomainAlignment = useGameStore((s) => s.peakDomainAlignment)
  const signatureUnlocked = useGameStore((s) => s.signatureUnlocked)
  const circuitComplete = useGameStore((s) => s.circuitComplete)
  const producedThisRun = useGameStore((s) => s.producedThisRun)
  const peakSoundwaves = useGameStore((s) => s.peakSoundwaves)
  const activeChallenge = useGameStore((s) => s.activeChallenge)
  const keepChallenges = useGameStore((s) => s.keepChallenges)
  const performSignature = useGameStore((s) => s.performSignature)
  const setSignatureAllocation = useGameStore((s) => s.setSignatureAllocation)

  const allocation = { ...ZERO_SIGNATURE_ALLOCATION, ...signatureAllocation }
  const spent = SIGNATURE_DOMAINS.reduce((sum, domain) => sum + allocation[domain], 0)
  const remaining = Math.max(0, SIGNATURE_BUDGET - spent)
  const activeCh = activeChallenge ? getChallengeById(activeChallenge.challengeId) ?? null : null
  const prestigeBlocked = getActiveChallengeModifiers(activeCh).noPrestige
  const canEdit = signatureUnlocked && !activeChallenge && isRunFloor(producedThisRun, peakSoundwaves)
  const canPerform = signatureUnlocked && circuitComplete && !prestigeBlocked
  const efficiency = getSignatureEfficiency(signatureCount)
  const effects = getSignatureEffects(allocation, efficiency)

  const updateDomain = (domain: SignatureDomain, value: number) => {
    if (!canEdit) return
    const current = allocation[domain]
    const spentElsewhere = spent - current
    const nextValue = Math.max(0, Math.min(1, SIGNATURE_BUDGET - spentElsewhere, value))
    setSignatureAllocation({
      ...allocation,
      [domain]: Math.round(nextValue * 100) / 100,
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-display font-semibold text-amber-400 tracking-wide">Signature</h1>
        <p className="text-sm text-text-muted mt-2">Align your voice across instrument domains before each new climb.</p>
      </header>

      <section className="rounded-xl border border-amber-500/30 bg-bg-secondary/40 p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-amber-400">Identity budget</h2>
            <p className="text-sm text-text-secondary leading-relaxed mt-1">
              Spend a fixed budget across the five domains. Raising one domain leaves less room for the others,
              and the allocation can only be changed at the run floor after a Signature reset.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-display font-semibold text-amber-400 tabular-nums">{pct(remaining)}</div>
            <div className="text-xs text-text-muted uppercase tracking-wider">remaining</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border border-border bg-bg-primary/50 p-3">
            <div className="text-xs text-text-muted uppercase tracking-wider">Ascensions</div>
            <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">{signatureCount}</div>
          </div>
          <div className="rounded-lg border border-border bg-bg-primary/50 p-3">
            <div className="text-xs text-text-muted uppercase tracking-wider">Efficiency</div>
            <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">x{formatNumber(efficiency, 2)}</div>
          </div>
          <div className="rounded-lg border border-border bg-bg-primary/50 p-3">
            <div className="text-xs text-text-muted uppercase tracking-wider">Domain</div>
            <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">x{formatNumber(effects.prodMult.times(effects.harmonyMult), 2)}</div>
          </div>
          <div className="rounded-lg border border-border bg-bg-primary/50 p-3">
            <div className="text-xs text-text-muted uppercase tracking-wider">Tempo</div>
            <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">+{formatNumber(effects.tempoBonus * 100, 1)}%</div>
          </div>
          <div className="rounded-lg border border-border bg-bg-primary/50 p-3">
            <div className="text-xs text-text-muted uppercase tracking-wider">Costs</div>
            <div className="text-lg font-display font-semibold text-text-primary tabular-nums mt-1">-{formatNumber((1 - effects.costMult) * 100, 1)}%</div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Domain allocation</h2>
          <span className="text-xs text-text-muted tabular-nums">
            {pct(spent)} spent / {pct(SIGNATURE_BUDGET)}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SIGNATURE_DOMAINS.map((domain) => {
            const current = allocation[domain]
            const max = Math.min(1, current + remaining)
            const peak = peakDomainAlignment[domain] ?? 0
            return (
              <div key={domain} className="rounded-lg border border-border bg-bg-secondary/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{DOMAIN_LABELS[domain].label}</div>
                    <div className="text-xs text-text-muted">{DOMAIN_LABELS[domain].lever}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-display font-semibold text-amber-400 tabular-nums">{pct(current)}</div>
                    <div className="text-[11px] text-text-muted tabular-nums">peak {pct(peak)}</div>
                  </div>
                </div>
                <div className="text-sm text-text-secondary tabular-nums">{effectReadout(domain, allocation, signatureCount)}</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={max}
                    step={0.01}
                    value={current}
                    disabled={!canEdit}
                    onChange={(e) => updateDomain(domain, Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                  <input
                    type="number"
                    min={0}
                    max={max}
                    step={0.01}
                    value={current.toFixed(2)}
                    disabled={!canEdit}
                    onChange={(e) => updateDomain(domain, Number(e.target.value))}
                    className="w-20 rounded-md border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary tabular-nums disabled:opacity-45"
                  />
                </div>
              </div>
            )
          })}
        </div>
        {!canEdit && (
          <p className="text-xs text-text-muted text-center">
            Allocation edits open only at the run floor; perform Signature to begin a fresh climb.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-amber-500/25 bg-bg-secondary/40 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-amber-400">Perform Signature</h2>
            <p className="text-sm text-text-secondary leading-relaxed mt-1">
              Commit the identity layer, reset the climb below it, then choose the voice for the next run.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-display font-semibold text-amber-400 tabular-nums">{signatureCount + 1}</div>
            <div className="text-xs text-text-muted uppercase tracking-wider">next count</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border bg-bg-primary/50 p-4">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Resets</div>
            <p className="text-text-secondary leading-relaxed">
              Soundwaves, tiers, tempo, Encore, Magnum Opus, records, Acclaim, venues, components,
              and {keepChallenges ? 'active climb challenge progress' : 'completed challenge clears'}.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-primary/50 p-4">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Keeps</div>
            <p className="text-text-secondary leading-relaxed">
              Signature allocation, peak alignment, Signature count, best challenge times, story beats,
              achievements, and lifetime Encore count.
            </p>
          </div>
        </div>

        <Button
          onClick={performSignature}
          disabled={!canPerform}
          variant="gold"
          size="lg"
          display
          className="w-full"
        >
          {canPerform
            ? 'Perform Signature'
            : prestigeBlocked
              ? 'Prestige blocked by challenge'
              : 'Complete the World Stage circuit'}
        </Button>
      </section>
    </div>
  )
}
