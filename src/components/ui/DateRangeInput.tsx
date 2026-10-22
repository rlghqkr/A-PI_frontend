import { useId, type ReactNode } from 'react'
import { addDays, todayKst } from '../../domain/format'
import { cn } from '../../lib/cn'
import { Field, controlBorder, controlClass } from './Field'

export interface DateRange {
  start: string
  end: string
}

export interface DateRangeInputProps {
  id?: string
  value: DateRange
  onChange: (value: DateRange) => void
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  presets?: boolean
  min?: string
  max?: string
  className?: string
}

/** Build a KST-date range ending today (KST) spanning `days` days (inclusive). */
export function presetRange(days: number, today: string = todayKst()): DateRange {
  return { start: addDays(today, -(days - 1)), end: today }
}

const PRESETS: { days: number; label: string }[] = [
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: 90, label: '90일' },
]

export function DateRangeInput({ id, value, onChange, label = '기간', hint, error, presets = true, min, max, className }: DateRangeInputProps) {
  const autoId = useId()
  const baseId = id ?? autoId
  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.days)
    return r.start === value.start && r.end === value.end
  })
  return (
    <Field id={`${baseId}-start`} label={label} hint={hint} error={error} className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`${baseId}-start`}
          type="date"
          value={value.start}
          min={min}
          max={value.end || max}
          aria-label="시작일"
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
          className={cn(controlClass, controlBorder(error), 'tnum flex-none')}
          style={{ width: 150 }}
        />
        <span className="text-ink-muted" aria-hidden="true">
          ~
        </span>
        <input
          id={`${baseId}-end`}
          type="date"
          value={value.end}
          min={value.start || min}
          max={max}
          aria-label="종료일"
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
          className={cn(controlClass, controlBorder(error), 'tnum flex-none')}
          style={{ width: 150 }}
        />
        {presets && (
          <div className="flex items-center gap-1" role="group" aria-label="기간 프리셋">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => onChange(presetRange(p.days))}
                aria-pressed={activePreset?.days === p.days}
                className={cn(
                  'h-9 rounded-md border px-2.5 text-[13px] transition-colors',
                  activePreset?.days === p.days
                    ? 'border-primary bg-primary-soft text-primary font-medium'
                    : 'border-border-strong bg-surface text-ink-secondary hover:bg-subtle',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  )
}
