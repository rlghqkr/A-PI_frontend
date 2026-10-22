import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TabItem {
  key: string
  label: ReactNode
  count?: number
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (key: string) => void
  className?: string
  'aria-label'?: string
}

export function Tabs({ items, value, onChange, className, 'aria-label': ariaLabel }: TabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('flex gap-1 border-b border-border', className)}>
      {items.map((item) => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            className={cn(
              '-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              active ? 'border-primary font-semibold text-primary' : 'border-transparent text-ink-secondary hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('tnum rounded-pill px-1.5 text-[11px]', active ? 'bg-primary-soft text-primary' : 'bg-neutral-bg text-ink-secondary')}>
                {item.count.toLocaleString('ko-KR')}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
