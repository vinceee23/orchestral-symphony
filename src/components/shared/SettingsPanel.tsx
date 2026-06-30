import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { exportSaveString, importSaveString } from '../../core/save'
import { getEra } from '../../core/eraTheme'
import type { NumberNotation } from '../../core/constants'
import { Button } from './Button'

const PRESTIGE_SKIP_KEYS = ['prestige_skip_encore', 'prestige_skip_mo', 'prestige_skip_gf']
const confirmsEnabled = () => !PRESTIGE_SKIP_KEYS.some((k) => localStorage.getItem(k))

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-sm text-text-secondary">{label}</span>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary/40 p-4 space-y-3">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (b: boolean) => void }) => (
  <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
    className="w-4 h-4 rounded border-border accent-accent-gold" />
)

/** Live FPS readout so the frame-rate cap is verifiable (it's otherwise invisible — production is delta-based). */
function useFps(): number {
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  const last = useRef(0)
  useEffect(() => {
    let raf = 0
    const loop = (t: number) => {
      if (!last.current) last.current = t
      frames.current++
      if (t - last.current >= 500) {
        setFps(Math.round((frames.current * 1000) / (t - last.current)))
        frames.current = 0
        last.current = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

export function SettingsPanel() {
  const settings = useGameStore((s) => s.settings)
  const updateSettings = useGameStore((s) => s.updateSettings)
  const resetSettings = useGameStore((s) => s.resetSettings)
  const hardReset = useGameStore((s) => s.hardReset)
  const lastSaveTimestamp = useGameStore((s) => s.lastSaveTimestamp)
  const liveEra = useGameStore((s) =>
    getEra(s.lifetimeEncorePoints, s.opusCount, s.finalePoints, s.worldTourUnlocked, s.signatureCount))

  const [importText, setImportText] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [exportText, setExportText] = useState<string | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [confirms, setConfirms] = useState(confirmsEnabled)
  const [resetArmed, setResetArmed] = useState(false)
  const [resetText, setResetText] = useState('')
  const fps = useFps()

  useEffect(() => {
    const update = () => setSecondsAgo(Math.max(0, Math.round((Date.now() - lastSaveTimestamp) / 1000)))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [lastSaveTimestamp])

  const flash = (msg: string) => { setStatus(msg); setTimeout(() => setStatus(null), 2500) }
  const onExport = () => setExportText(exportSaveString())
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(exportText ?? exportSaveString()); flash('Copied to clipboard') }
    catch { flash('Copy failed — select the text manually') }
  }
  const onDownload = () => {
    const blob = new Blob([exportSaveString()], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sonance-save.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
  const onImport = () => {
    if (!importText.trim()) return
    if (!window.confirm('Import will OVERWRITE your current save and reload. Continue?')) return
    if (importSaveString(importText)) window.location.reload()
    else flash('Invalid save string — nothing changed')
  }
  const onLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) file.text().then((t) => setImportText(t.trim()))
  }
  const onSaveNow = () => { useGameStore.setState({ lastSaveTimestamp: Date.now() }); flash('Saved') }
  const toggleConfirms = (on: boolean) => {
    if (on) PRESTIGE_SKIP_KEYS.forEach((k) => localStorage.removeItem(k))
    else PRESTIGE_SKIP_KEYS.forEach((k) => localStorage.setItem(k, '1'))
    setConfirms(on)
  }
  const doHardReset = () => {
    if (resetText !== 'RESET') return
    hardReset()
    setResetArmed(false)
    setResetText('')
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-5">
      <header className="flex justify-between items-baseline">
        <h1 className="text-2xl font-display font-semibold text-text-primary">Settings</h1>
        {status && <span className="text-xs text-accent-gold">{status}</span>}
      </header>

      <Section title="Save">
        <Row label={`Last saved ${secondsAgo}s ago`}>
          <Button onClick={onSaveNow} variant="ghost" size="sm">Save Now</Button>
        </Row>
        <div className="flex gap-2">
          <Button onClick={onExport} variant="ghost" size="sm" className="flex-1">Show export string</Button>
          <Button onClick={onDownload} variant="ghost" size="sm" className="flex-1">Download .txt</Button>
        </div>
        {exportText && (
          <div className="space-y-2">
            <textarea readOnly value={exportText} rows={3}
              className="w-full text-[11px] font-mono bg-bg-secondary/60 border border-border rounded-md p-2 text-text-secondary" />
            <Button onClick={onCopy} variant="ghost" size="sm">Copy</Button>
          </div>
        )}
        <div className="space-y-2 pt-1">
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={3}
            placeholder="Paste a save string to import…"
            className="w-full text-[11px] font-mono bg-bg-secondary/60 border border-border rounded-md p-2 text-text-secondary" />
          <div className="flex gap-2 items-center">
            <Button onClick={onImport} variant="gold" size="sm">Import</Button>
            <label className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
              load from file…
              <input type="file" accept=".txt,text/plain" onChange={onLoadFile} className="hidden" />
            </label>
          </div>
        </div>
      </Section>

      <Section title="Audio">
        <Row label="Mute all sound"><Toggle checked={settings.masterMuted} onChange={(b) => updateSettings({ masterMuted: b })} /></Row>
        <Row label={`SFX volume (${Math.round(settings.sfxVolume * 100)}%)`}>
          <input type="range" min={0} max={1} step={0.05} value={settings.sfxVolume}
            onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) })} className="accent-accent-gold w-40" />
        </Row>
        <Row label="Mute when tab unfocused"><Toggle checked={settings.muteOnUnfocus} onChange={(b) => updateSettings({ muteOnUnfocus: b })} /></Row>
      </Section>

      <Section title="Display">
        <Row label="Number notation">
          <select value={settings.notation} onChange={(e) => updateSettings({ notation: e.target.value as NumberNotation })}
            className="text-sm bg-bg-secondary border border-border rounded-md px-2 py-1 text-text-primary">
            <option value="suffix">Letters (1.5T)</option>
            <option value="scientific">Scientific (1.50e12)</option>
            <option value="engineering">Engineering (x3)</option>
          </select>
        </Row>
        <Row label="Reduced motion"><Toggle checked={settings.reducedMotion} onChange={(b) => updateSettings({ reducedMotion: b })} /></Row>
        <Row label={`Frame-rate cap — now: ${fps} FPS`}>
          <select value={settings.fpsCap} onChange={(e) => updateSettings({ fpsCap: Number(e.target.value) as 0 | 30 | 60 })}
            className="text-sm bg-bg-secondary border border-border rounded-md px-2 py-1 text-text-primary">
            <option value={0}>Uncapped</option>
            <option value={60}>60 FPS</option>
            <option value={30}>30 FPS (battery)</option>
          </select>
        </Row>
        <Row label="Lock theme to current era">
          <Toggle checked={settings.theme === 'locked'}
            onChange={(b) => updateSettings(b ? { theme: 'locked', lockedEra: liveEra } : { theme: 'auto' })} />
        </Row>
      </Section>

      <Section title="Gameplay">
        <Row label="Offline progress"><Toggle checked={settings.offlineEnabled} onChange={(b) => updateSettings({ offlineEnabled: b })} /></Row>
        <Row label="Show prestige confirmation dialogs"><Toggle checked={confirms} onChange={toggleConfirms} /></Row>
      </Section>

      <Section title="About">
        <p className="text-sm text-text-secondary">Sonance — an orchestral idle game.</p>
        <a href="https://ko-fi.com/vinceangelolmacaraig" target="_blank" rel="noopener noreferrer"
          className="text-xs text-accent-gold hover:underline">Support the dev ☕</a>
      </Section>

      <div className="flex justify-between items-center">
        <button onClick={resetSettings} className="text-xs text-text-muted hover:text-text-secondary">Reset settings to defaults</button>
        <Button onClick={() => setResetArmed(true)} variant="ghost" size="sm"
          className="border-danger/30 text-danger hover:bg-danger/20 hover:border-danger/50 hover:text-danger">Hard Reset</Button>
      </div>

      {resetArmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setResetArmed(false)}>
          <div className="max-w-sm w-full p-6 rounded-xl border border-danger/40 bg-bg-primary shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-display font-bold text-danger">Hard Reset</h3>
            <p className="text-sm text-text-secondary">This wipes <strong>all progress</strong> (your settings are kept). This cannot be undone — export a save first if you want a backup. Type <strong className="text-text-primary">RESET</strong> to confirm.</p>
            <input value={resetText} onChange={(e) => setResetText(e.target.value)} autoFocus
              className="w-full bg-bg-secondary border border-border rounded-md px-3 py-2 text-sm text-text-primary" placeholder="RESET" />
            <div className="flex gap-3">
              <Button onClick={() => { setResetArmed(false); setResetText('') }} variant="ghost" size="md" className="flex-1">Cancel</Button>
              <Button onClick={doHardReset} variant="ghost" size="md" disabled={resetText !== 'RESET'}
                className="flex-1 border-danger/40 text-danger hover:bg-danger/20 hover:text-danger">Wipe everything</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
