import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { EmptyState } from '../ui/EmptyState'

export interface ChartFrameProps {
  title: ReactNode
  unit?: ReactNode
  description?: ReactNode
  isEmpty: boolean
  emptyDescription?: ReactNode
  height?: number
  children: ReactNode
  className?: string
}

export function ChartFrame({ title, unit, description, isEmpty, emptyDescription, height = 280, children, className }: ChartFrameProps) {
  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-ink">{title}</span>
          {description && <p className="text-xs text-ink-muted">{description}</p>}
        </div>
        {unit && <span className="text-xs text-ink-muted">{unit}</span>}
      </figcaption>
      <div style={{ height }} className="w-full">
        {isEmpty ? (
          <EmptyState compact title="표시할 데이터가 없습니다" description={emptyDescription ?? '조회 조건을 변경한 뒤 다시 조회하세요.'} />
        ) : (
          children
        )}
      </div>
    </figure>
  )
}
