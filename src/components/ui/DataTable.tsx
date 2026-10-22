import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react'
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { Pagination } from './Pagination'
import { Skeleton } from './Skeleton'

export type SortDir = 'asc' | 'desc'
export interface SortState {
  key: string
  dir: SortDir
}

export interface Column<T> {
  key: string
  header: ReactNode
  accessor: (row: T) => unknown
  render?: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string | number
  sortable?: boolean
  mono?: boolean
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  sort?: SortState
  defaultSort?: SortState
  onSortChange?: (sort: SortState) => void
  pagination?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  page?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: ReactNode
  emptyDescription?: ReactNode
  emptyAction?: ReactNode
  onRowClick?: (row: T) => void
  expandable?: { render: (row: T) => ReactNode }
  footer?: ReactNode
  stickyHeader?: boolean
  maxHeight?: number | string
  highlightRow?: (row: T) => boolean
  rowClassName?: (row: T) => string | undefined
  dense?: boolean
  className?: string
  caption?: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/

function normalize(v: unknown): { kind: 'null' | 'num' | 'str'; value: number | string } {
  if (v === null || v === undefined || v === '') return { kind: 'null', value: '' }
  if (typeof v === 'number') return Number.isNaN(v) ? { kind: 'null', value: '' } : { kind: 'num', value: v }
  if (typeof v === 'boolean') return { kind: 'num', value: v ? 1 : 0 }
  if (v instanceof Date) return { kind: 'num', value: v.getTime() }
  if (typeof v === 'string') {
    if (ISO_DATE.test(v)) {
      const t = Date.parse(v)
      if (!Number.isNaN(t)) return { kind: 'num', value: t }
    }
    return { kind: 'str', value: v }
  }
  return { kind: 'str', value: String(v) }
}

export function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na.kind === 'null' && nb.kind === 'null') return 0
  if (na.kind === 'null') return 1 // nulls last regardless of direction
  if (nb.kind === 'null') return -1
  let r: number
  if (na.kind === 'num' && nb.kind === 'num') r = (na.value as number) - (nb.value as number)
  else r = String(na.value).localeCompare(String(nb.value), 'ko', { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? r : -r
}

export function sortRows<T>(rows: T[], columns: Column<T>[], sort: SortState | undefined): T[] {
  if (!sort) return rows
  const col = columns.find((c) => c.key === sort.key)
  if (!col) return rows
  return rows
    .map((row, i) => ({ row, i, v: col.accessor(row) }))
    .sort((a, b) => compareValues(a.v, b.v, sort.dir) || a.i - b.i)
    .map((x) => x.row)
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  defaultSort,
  onSortChange,
  pagination,
  pageSize: pageSizeProp,
  pageSizeOptions,
  page: pageProp,
  onPageChange,
  onPageSizeChange,
  loading,
  error,
  onRetry,
  emptyTitle = '조회 결과가 없습니다',
  emptyDescription,
  emptyAction,
  onRowClick,
  expandable,
  footer,
  stickyHeader = true,
  maxHeight,
  highlightRow,
  rowClassName,
  dense,
  className,
  caption,
}: DataTableProps<T>) {
  const [innerSort, setInnerSort] = useState<SortState | undefined>(defaultSort)
  const [innerPage, setInnerPage] = useState(1)
  const [innerPageSize, setInnerPageSize] = useState(pageSizeProp ?? pageSizeOptions?.[0] ?? 20)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const activeSort = sort ?? innerSort
  const pageSize = pageSizeProp !== undefined && onPageSizeChange ? pageSizeProp : innerPageSize
  const page = pageProp ?? innerPage

  const sorted = useMemo(() => sortRows(rows, columns, activeSort), [rows, columns, activeSort])
  const usePaging = pagination || pageSizeProp !== undefined
  const pageCount = usePaging ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const safePage = Math.min(Math.max(1, page), pageCount)
  const visible = usePaging ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize) : sorted

  const setSort = (next: SortState) => {
    if (!sort) setInnerSort(next)
    onSortChange?.(next)
  }
  const setPage = (p: number) => {
    if (pageProp === undefined) setInnerPage(p)
    onPageChange?.(p)
  }
  const setPageSize = (s: number) => {
    if (onPageSizeChange) onPageSizeChange(s)
    else setInnerPageSize(s)
    setPage(1)
  }

  const toggleSort = (col: Column<T>) => {
    if (col.sortable === false) return
    const dir: SortDir = activeSort?.key === col.key && activeSort.dir === 'asc' ? 'desc' : activeSort?.key === col.key && activeSort.dir === 'desc' ? 'asc' : 'asc'
    setSort({ key: col.key, dir })
    setPage(1)
  }

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const colSpan = columns.length + (expandable ? 1 : 0)
  const cellPad = dense ? 'px-3 py-1.5' : 'px-3 py-2.5'

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="overflow-x-auto rounded-md border border-border" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
        <table className="w-full min-w-max border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className={cn('bg-subtle text-xs text-ink-secondary', stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {expandable && <th scope="col" className="w-8 border-b border-border" />}
              {columns.map((col) => {
                const sortable = col.sortable !== false
                const active = activeSort?.key === col.key
                const align = col.align ?? 'left'
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    aria-sort={active ? (activeSort?.dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined}
                    className={cn('border-b border-border font-medium whitespace-nowrap', cellPad, col.headerClassName)}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={cn(
                          'inline-flex w-full items-center gap-1 hover:text-ink',
                          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start',
                          active && 'text-ink',
                        )}
                      >
                        <span>{col.header}</span>
                        {active ? (
                          activeSort?.dir === 'asc' ? (
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <span className={cn('block', align === 'right' && 'text-right', align === 'center' && 'text-center')}>{col.header}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border last:border-b-0">
                  {expandable && <td className={cellPad} />}
                  {columns.map((col) => (
                    <td key={col.key} className={cellPad}>
                      <Skeleton className="h-3.5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={colSpan}>
                  <ErrorState compact description={error} onRetry={onRetry} />
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>
                  <EmptyState compact title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const key = rowKey(row)
                const isExpanded = expandable ? expanded.has(key) : false
                return (
                  <Fragment key={key}>
                    <tr
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        'border-b border-border last:border-b-0 transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-subtle',
                        highlightRow?.(row) && 'bg-primary-soft/40',
                        rowClassName?.(row),
                      )}
                    >
                      {expandable && (
                        <td className={cn(cellPad, 'w-8')}>
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? '접기' : '펼치기'}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpand(key)
                            }}
                            className="inline-flex size-6 items-center justify-center rounded-sm text-ink-muted hover:bg-neutral-bg hover:text-ink"
                          >
                            {isExpanded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                          </button>
                        </td>
                      )}
                      {columns.map((col) => {
                        const align = col.align ?? 'left'
                        const raw = col.accessor(row)
                        const content = col.render ? col.render(row) : raw === null || raw === undefined ? '-' : String(raw)
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              cellPad,
                              'align-middle',
                              align === 'right' && 'text-right tnum',
                              align === 'center' && 'text-center',
                              col.mono && 'font-mono text-xs',
                              col.className,
                            )}
                          >
                            {content}
                          </td>
                        )
                      })}
                    </tr>
                    {expandable && isExpanded && (
                      <tr className="border-b border-border bg-subtle/60 last:border-b-0">
                        <td colSpan={colSpan} className="px-4 py-3">
                          {expandable.render(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
          {footer && !loading && !error && visible.length > 0 && <tfoot className="bg-subtle text-xs font-medium text-ink">{footer}</tfoot>}
        </table>
      </div>
      {usePaging && !loading && !error && sorted.length > 0 && (
        <Pagination
          page={safePage}
          pageCount={pageCount}
          onChange={setPage}
          total={sorted.length}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={pageSizeOptions ? setPageSize : undefined}
        />
      )}
    </div>
  )
}
