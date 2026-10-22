import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface StatProps {
  label: ReactNode
  value: ReactNode
  mono?: boolean
  className?: string
}

/** Compact label / value row for drawers and detail panels. */
export function Stat({ label, value, mono, className }: StatProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-1.5', className)}>
      <dt className="shrink-0 text-xs text-ink-muted">{label}</dt>
      <dd className={cn('min-w-0 text-right text-sm text-ink break-all', mono && 'font-mono text-xs')}>{value ?? '-'}</dd>
    </div>
  )
}

export interface DescriptionListItem {
  label: ReactNode
  value: ReactNode
  mono?: boolean
}

export interface DescriptionListProps {
  items: DescriptionListItem[]
  columns?: 1 | 2
  className?: string
}

export function DescriptionList({ items, columns = 1, className }: DescriptionListProps) {
  return (
    <dl className={cn('grid gap-x-6', columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1', className)}>
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0 md:[&:nth-last-child(2)]:border-b-0">
          <dt className="text-xs text-ink-muted">{item.label}</dt>
          <dd className={cn('text-sm text-ink break-words', item.mono && 'font-mono text-xs')}>{item.value ?? '-'}</dd>
        </div>
      ))}
    </dl>
  )
}
