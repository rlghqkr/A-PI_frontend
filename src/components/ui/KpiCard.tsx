import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { toneText, type Tone } from './tones'
import { Tooltip } from './Tooltip'

export interface KpiCardProps {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  sub?: ReactNode
  tone?: Tone
  hint?: string
  icon?: ReactNode
  onClick?: () => void
  className?: string
}

export function KpiCard({ label, value, unit, sub, tone, hint, icon, onClick, className }: KpiCardProps) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-surface p-4 text-left shadow-sm',
        onClick && 'cursor-pointer transition-colors hover:border-primary hover:bg-subtle',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-ink-secondary">
          {label}
          {hint && (
            <Tooltip content={hint}>
              <Info className="size-3.5 text-ink-muted" aria-label="설명" />
            </Tooltip>
          )}
        </span>
        {icon && <span className="text-ink-muted [&>svg]:size-4">{icon}</span>}
      </div>
      <div className={cn('flex items-baseline gap-1 tnum', tone ? toneText[tone] : 'text-ink')}>
        <span className={cn('font-bold leading-8 tnum whitespace-nowrap', String(typeof value === 'string' || typeof value === 'number' ? value : '').length > 9 ? 'text-lg' : 'text-2xl')}>{value}</span>
        {unit && <span className="text-xs font-medium text-ink-muted">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-ink-muted">{sub}</div>}
    </Comp>
  )
}
