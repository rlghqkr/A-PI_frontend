import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { IconButton } from './IconButton'

export interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
  pageSize?: number
  pageSizeOptions?: number[]
  onPageSizeChange?: (size: number) => void
  total?: number
  className?: string
}

export function Pagination({ page, pageCount, onChange, pageSize, pageSizeOptions, onPageSizeChange, total, className }: PaginationProps) {
  const safeCount = Math.max(1, pageCount)
  const current = Math.min(Math.max(1, page), safeCount)
  const windowSize = 5
  let start = Math.max(1, current - Math.floor(windowSize / 2))
  const end = Math.min(safeCount, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <nav aria-label="페이지 탐색" className={cn('flex flex-wrap items-center justify-between gap-3 text-xs text-ink-secondary', className)}>
      <div className="flex items-center gap-3">
        {total !== undefined && <span className="tnum">총 {total.toLocaleString('ko-KR')}건</span>}
        {pageSizeOptions && onPageSizeChange && pageSize !== undefined && (
          <label className="flex items-center gap-1.5">
            <span>페이지당</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-sm border border-border-strong bg-surface px-1.5 text-xs"
              aria-label="페이지당 표시 건수"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}건
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-1">
        <IconButton size="sm" label="첫 페이지" icon={<ChevronsLeft />} disabled={current <= 1} onClick={() => onChange(1)} />
        <IconButton size="sm" label="이전 페이지" icon={<ChevronLeft />} disabled={current <= 1} onClick={() => onChange(current - 1)} />
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            aria-current={p === current ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={cn(
              'tnum inline-flex size-7 items-center justify-center rounded-sm text-xs transition-colors',
              p === current ? 'bg-primary font-semibold text-ink-inverse' : 'text-ink-secondary hover:bg-neutral-bg',
            )}
          >
            {p}
          </button>
        ))}
        <IconButton size="sm" label="다음 페이지" icon={<ChevronRight />} disabled={current >= safeCount} onClick={() => onChange(current + 1)} />
        <IconButton size="sm" label="마지막 페이지" icon={<ChevronsRight />} disabled={current >= safeCount} onClick={() => onChange(safeCount)} />
      </div>
    </nav>
  )
}
