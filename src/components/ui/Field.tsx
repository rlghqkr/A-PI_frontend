import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface FieldProps {
  id: string
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}

/** Shared label / hint / error wrapper for form controls. */
export function Field({ id, label, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn('flex shrink-0 flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-ink-secondary">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const controlClass =
  'h-9 w-full rounded-md border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-muted'

export function controlBorder(error: unknown): string {
  return error ? 'border-danger' : 'border-border-strong'
}
