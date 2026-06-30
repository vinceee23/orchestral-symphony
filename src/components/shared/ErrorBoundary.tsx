import { Component, type ErrorInfo, type ReactNode } from 'react'
import { exportSaveString, SAVE_KEY } from '../../core/save'

// A render throw anywhere used to white-screen the whole trial with no recovery. This catches it and
// gives the player an escape hatch: copy their save, reload, or hard-reset — so a bad state on one
// tab never strands them with a blank page.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; copied: boolean }> {
  state = { error: null as Error | null, copied: false }

  static getDerivedStateFromError(error: Error) {
    return { error, copied: false }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Sonance] render error caught by boundary:', error, info.componentStack)
  }

  private copySave = async () => {
    try {
      await navigator.clipboard.writeText(exportSaveString())
      this.setState({ copied: true })
    } catch {
      this.setState({ copied: false })
    }
  }

  private hardReset = () => {
    try { localStorage.removeItem(SAVE_KEY) } catch { /* noop */ }
    location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-bg-primary p-6 text-center">
        <div className="max-w-md">
          <div className="text-3xl mb-3">{'\u{1F3BC}'}</div>
          <h1 className="font-display text-xl text-accent-gold mb-2">The music stopped.</h1>
          <p className="text-sm text-text-secondary mb-5">
            Something went wrong. Your progress is safe in your browser — copy your save first, then reload.
            If it keeps happening, a hard reset starts a fresh game.
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={this.copySave} className="rounded-md border border-accent-gold/50 px-4 py-2 text-sm text-accent-gold hover:bg-accent-gold/10">
              {this.state.copied ? 'Save copied ✓' : 'Copy my save'}
            </button>
            <button onClick={() => location.reload()} className="rounded-md border border-border-light px-4 py-2 text-sm text-text-primary hover:bg-bg-hover">
              Reload
            </button>
            <button onClick={this.hardReset} className="rounded-md px-4 py-2 text-xs text-text-muted hover:text-danger">
              Hard reset (deletes progress)
            </button>
          </div>
        </div>
      </div>
    )
  }
}
