import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  disabledReason?: string
  id?: string
  className?: string
}

export function Checkbox({ checked, onChange, label, description, disabled, disabledReason, id, className }: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <label
      htmlFor={inputId}
      title={disabled ? disabledReason : undefined}
      className={cn(
        'flex items-start gap-2.5 rounded-md',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className,
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border-border-strong accent-primary disabled:cursor-not-allowed"
      />
      <span className="flex flex-col">
        <span className="text-sm text-ink">{label}</span>
        {description && <span className="text-xs text-ink-muted">{description}</span>}
      </span>
    </label>
  )
}
