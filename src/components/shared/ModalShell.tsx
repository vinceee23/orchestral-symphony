import { useEffect, useRef, type ReactNode } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface ModalShellProps {
  onClose: () => void
  /** Accessible name for the dialog. */
  label: string
  /** Classes for the inner panel (the box). */
  panelClassName?: string
  children: ReactNode
}

/**
 * Accessible modal wrapper: backdrop-click + Esc to close, role=dialog/aria-modal, focus moves into the
 * panel on open and is restored to the trigger on close, and Tab is trapped inside. Replaces the
 * hand-rolled backdrop divs so every dialog behaves the same for keyboard + screen-reader users.
 */
export function ModalShell({ onClose, label, panelClassName = '', children }: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab' && panel) {
        const f = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('disabled'))
        if (f.length === 0) { e.preventDefault(); return }
        const firstEl = f[0]
        const lastEl = f[f.length - 1]
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      prevFocus.current?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 md:p-6" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
