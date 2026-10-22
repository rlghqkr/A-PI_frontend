import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Field, controlBorder, controlClass } from './Field'

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'size'> {
  value: number | null
  onChange: (value: number | null) => void
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  min?: number
  max?: number
  step?: number
  suffix?: ReactNode
  containerClassName?: string
}

/** Controlled numeric input; empty string maps to null. */
export function NumberInput({
  id,
  value,
  onChange,
  label,
  hint,
  error,
  min,
  max,
  step,
  suffix,
  className,
  containerClassName,
  required,
  ...rest
}: NumberInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <div className="relative">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          required={required}
          value={value === null || Number.isNaN(value) ? '' : value}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') return onChange(null)
            const n = Number(raw)
            onChange(Number.isFinite(n) ? n : null)
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(controlClass, controlBorder(error), 'tnum', suffix && 'pr-12', className)}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-muted">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  )
}
