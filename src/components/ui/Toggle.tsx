import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  id?: string
  className?: string
}

export function Toggle({ checked, onChange, label, description, disabled, id, className }: ToggleProps) {
  const autoId = useId()
  const toggleId = id ?? autoId
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex flex-col">
        <label htmlFor={toggleId} className="text-sm font-medium text-ink cursor-pointer">
          {label}
        </label>
        {description && <span className="text-xs text-ink-muted">{description}</span>}
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-pill transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-border-strong',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-4 rounded-pill bg-surface shadow-sm transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
