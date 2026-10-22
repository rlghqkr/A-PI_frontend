import { ChevronDown } from 'lucide-react'
import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { Field, controlBorder, controlClass } from './Field'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'size'> {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  placeholder?: string
  /** When set, an empty-value option with this label is prepended (e.g. "전체"). */
  allowEmptyLabel?: string
  containerClassName?: string
}

export function Select({
  id,
  options,
  value,
  onChange,
  label,
  hint,
  error,
  placeholder,
  allowEmptyLabel,
  className,
  containerClassName,
  required,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <Field id={selectId} label={label} hint={hint} error={error} required={required} className={containerClassName}>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          className={cn(controlClass, controlBorder(error), 'min-w-[7rem] appearance-none pr-9', className)}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {allowEmptyLabel !== undefined && <option value="">{allowEmptyLabel}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
      </div>
    </Field>
  )
}
