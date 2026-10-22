import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { Field, controlBorder } from './Field'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  showCount?: boolean
  mono?: boolean
  containerClassName?: string
}

export function Textarea({
  id,
  label,
  hint,
  error,
  showCount,
  mono,
  maxLength,
  className,
  containerClassName,
  required,
  value,
  rows = 4,
  ...rest
}: TextareaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const length = typeof value === 'string' ? value.length : Array.isArray(value) ? value.join('').length : 0
  const counter = showCount ? (
    <span className="tnum text-xs text-ink-muted">
      {length.toLocaleString('ko-KR')}
      {maxLength ? ` / ${maxLength.toLocaleString('ko-KR')}` : ''}
    </span>
  ) : null
  return (
    <Field
      id={inputId}
      label={label}
      hint={
        counter ? (
          <span className="flex items-center justify-between gap-2">
            <span>{hint}</span>
            {counter}
          </span>
        ) : (
          hint
        )
      }
      error={error}
      required={required}
      className={containerClassName}
    >
      <textarea
        id={inputId}
        rows={rows}
        maxLength={maxLength}
        required={required}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint || counter ? `${inputId}-hint` : undefined}
        className={cn(
          'w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-subtle resize-y',
          controlBorder(error),
          mono && 'font-mono text-xs leading-5',
          className,
        )}
        {...rest}
      />
    </Field>
  )
}
