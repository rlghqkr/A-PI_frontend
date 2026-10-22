import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export interface ToastOptions {
  title: ReactNode
  description?: ReactNode
  tone?: ToastTone
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

interface ToastItem extends ToastOptions {
  id: number
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneClass: Record<ToastTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}
const toneIcon: Record<ToastTone, ReactNode> = {
  info: <Info aria-hidden="true" />,
  success: <CircleCheck aria-hidden="true" />,
  warning: <TriangleAlert aria-hidden="true" />,
  danger: <CircleAlert aria-hidden="true" />,
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    timer.current = window.setTimeout(onDismiss, item.durationMs ?? 5000)
    return () => window.clearTimeout(timer.current)
  }, [item.durationMs, onDismiss])
  const tone = item.tone ?? 'info'
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-[360px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-md"
    >
      <span className={cn('mt-0.5 shrink-0 [&>svg]:size-4', toneClass[tone])}>{toneIcon[tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{item.title}</p>
        {item.description && <p className="mt-0.5 text-xs text-ink-secondary">{item.description}</p>}
        {item.actionLabel && item.onAction && (
          <button
            type="button"
            onClick={() => {
              item.onAction?.()
              onDismiss()
            }}
            className="mt-1.5 text-xs font-medium text-primary hover:underline"
          >
            {item.actionLabel}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="알림 닫기"
        onClick={onDismiss}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-neutral-bg hover:text-ink"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), [])
  const toast = useCallback((opts: ToastOptions) => {
    seq.current += 1
    setItems((prev) => [...prev, { ...opts, id: seq.current }].slice(-5))
  }, [])
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])
  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
