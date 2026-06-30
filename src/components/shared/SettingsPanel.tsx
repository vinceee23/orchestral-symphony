import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useUiStore } from '../../store/uiStore'
import { exportSaveString, importSaveString } from '../../core/save'
import { getEra } from '../../core/eraTheme'
import type { NumberNotation } from '../../core/constants'
import { Button } from './Button'

const PRESTIGE_SKIP_KEYS = ['prestige_skip_encore', 'prestige_skip_mo', 'prestige_skip_gf']

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

export function SettingsPanel() {
  const open = useUiStore((s) => s.settingsOpen)
  const setOpen = useUiStore((s) => s.setSettingsOpen)
  const settings = useGameStore((s) => s.settings)
  const updateSettings = useGameStore((s) => s.updateSettings)
  const resetSettings = useGameStore((s) => s.resetSettings)
  const hardReset = useGameStore((s) => s.hardReset)
  const lastSaveTimestamp = useGameStore((s) => s.lastSaveTimestamp)
  // Live era so "lock theme" freezes the current look.
  const liveEra = useGameStore((s) =>
    getEra(s.lifetimeEncorePoints, s.opusCount, s.finalePoints, s.worldTourUnlocked, s.signatureCount))

  const [importText, setImportText] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [exportText, setExportText] = useState<string | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  // Live "saved Xs ago" while the panel is open (Date.now() in an effect, not during render).
  useEffect(() => {
    if (!open) return
    const update = () => setSecondsAgo(Math.max(0, Math.round((Date.now() - lastSaveTimestamp) / 1000)))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [open, lastSaveTimestamp])

  if (!open) return null

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
    if (!file) return
    file.text().then((t) => setImportText(t.trim()))
  }
  const onSaveNow = () => { useGameStore.setState({ lastSaveTimestamp: Date.now() }); flash('Saved') }
  const onReenableConfirms = () => {
    PRESTIGE_SKIP_KEYS.forEach((k) => localStorage.removeItem(k))
    flash('Prestige confirmations restored')
  }
  const onHardReset = () => {
    const answer = window.prompt('This wipes ALL progress (settings are kept). Type RESET to confirm.')
    if (answer === 'RESET') hardReset()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
      <div
        className="max-w-lg w-full max-h-[88vh] overflow-y-auto p-6 rounded-xl border border-border bg-bg-primary shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-display font-bold text-accent-gold">Settings</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-text-muted hover:text-text-primary text-xl leading-none">×</button>
        </div>

        {status && <div className="text-xs text-accent-gold bg-accent-gold/10 border border-accent-gold/30 rounded-md px-3 py-1.5">{status}</div>}

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
          <Row label="Mute all sound">
            <input type="checkbox" checked={settings.masterMuted}
              onChange={(e) => updateSettings({ masterMuted: e.target.checked })}
              className="w-4 h-4 rounded border-border accent-accent-gold" />
          </Row>
          <Row label={`SFX volume (${Math.round(settings.sfxVolume * 100)}%)`}>
            <input type="range" min={0} max={1} step={0.05} value={settings.sfxVolume}
              onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) })}
              className="accent-accent-gold w-40" />
          </Row>
          <Row label="Mute when tab unfocused">
            <input type="checkbox" checked={settings.muteOnUnfocus}
              onChange={(e) => updateSettings({ muteOnUnfocus: e.target.checked })}
              className="w-4 h-4 rounded border-border accent-accent-gold" />
          </Row>
        </Section>

        <Section title="Display">
          <Row label="Number notation">
            <select value={settings.notation}
              onChange={(e) => updateSettings({ notation: e.target.value as NumberNotation })}
              className="text-sm bg-bg-secondary border border-border rounded-md px-2 py-1 text-text-primary">
              <option value="suffix">Letters (1.50T)</option>
              <option value="scientific">Scientific (1.50e12)</option>
              <option value="engineering">Engineering (1.50e12, x3)</option>
            </select>
          </Row>
          <Row label="Reduced motion">
            <input type="checkbox" checked={settings.reducedMotion}
              onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
              className="w-4 h-4 rounded border-border accent-accent-gold" />
          </Row>
          <Row label="Frame-rate cap">
            <select value={settings.fpsCap}
              onChange={(e) => updateSettings({ fpsCap: Number(e.target.value) as 0 | 30 | 60 })}
              className="text-sm bg-bg-secondary border border-border rounded-md px-2 py-1 text-text-primary">
              <option value={0}>Uncapped</option>
              <option value={60}>60 FPS</option>
              <option value={30}>30 FPS (battery)</option>
            </select>
          </Row>
          <Row label="Lock theme to current era">
            <input type="checkbox" checked={settings.theme === 'locked'}
              onChange={(e) => updateSettings(e.target.checked ? { theme: 'locked', lockedEra: liveEra } : { theme: 'auto' })}
              className="w-4 h-4 rounded border-border accent-accent-gold" />
          </Row>
        </Section>

        <Section title="Gameplay">
          <Row label="Offline progress">
            <input type="checkbox" checked={settings.offlineEnabled}
              onChange={(e) => updateSettings({ offlineEnabled: e.target.checked })}
              className="w-4 h-4 rounded border-border accent-accent-gold" />
          </Row>
          <Row label="Prestige confirmation dialogs">
            <Button onClick={onReenableConfirms} variant="ghost" size="sm">Re-enable</Button>
          </Row>
        </Section>

        <Section title="About">
          <p className="text-sm text-text-secondary">Sonance — an orchestral idle game.</p>
          <a href="https://ko-fi.com/vinceangelolmacaraig" target="_blank" rel="noopener noreferrer"
            className="text-xs text-accent-gold hover:underline">Support the dev ☕</a>
        </Section>

        <div className="flex justify-between items-center pt-1">
          <button onClick={resetSettings} className="text-xs text-text-muted hover:text-text-secondary">Reset settings to defaults</button>
          <Button onClick={onHardReset} variant="ghost" size="sm"
            className="border-danger/30 text-danger hover:bg-danger/20 hover:border-danger/50 hover:text-danger">Hard Reset</Button>
        </div>
      </div>
    </div>
  )
}
