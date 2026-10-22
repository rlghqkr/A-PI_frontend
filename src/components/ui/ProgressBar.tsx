import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { toneSolid, type Tone } from './tones'

export interface ProgressBarProps {
  /** 0–100 (values above 100 render a full bar); null renders "미설정". */
  value: number | null
  tone?: Tone
  label?: ReactNode
  showValue?: boolean
  className?: string
}

export function ProgressBar({ value, tone = 'primary', label, showValue = true, className }: ProgressBarProps) {
  if (value === null || Number.isNaN(value)) {
    return <span className={cn('text-xs text-ink-muted', className)}>미설정</span>
  }
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-label={typeof label === 'string' ? label : undefined}
        className="h-2 w-full min-w-[60px] overflow-hidden rounded-pill bg-neutral-bg"
      >
        <div className={cn('h-full rounded-pill transition-[width]', toneSolid[tone])} style={{ width: `${clamped}%` }} />
      </div>
      {showValue && <span className="tnum w-12 shrink-0 text-right text-xs font-medium text-ink">{Math.round(value)}%</span>}
      {label && typeof label !== 'string' && label}
    </div>
  )
}
