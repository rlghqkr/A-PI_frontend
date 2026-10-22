import { RotateCcw, Search } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export interface FilterBarProps {
  children: ReactNode
  onSubmit: () => void
  submitLabel?: string
  pending?: boolean
  loading?: boolean
  onReset?: () => void
  className?: string
  extra?: ReactNode
}

export function FilterBar({ children, onSubmit, submitLabel = '조회', pending, loading, onReset, className, extra }: FilterBarProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }
  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="조회 조건"
      className={cn('flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm', className)}
    >
      <div className="flex min-w-[16rem] flex-1 flex-wrap items-end gap-3">{children}</div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {extra}
          {onReset && (
            <Button type="button" variant="ghost" leftIcon={<RotateCcw />} onClick={onReset}>
              초기화
            </Button>
          )}
          <Button type="submit" leftIcon={<Search />} loading={loading}>
            {submitLabel}
          </Button>
        </div>
        {pending && (
          <span className="text-[11px] text-warning" role="status">
            변경사항 적용 대기 — {submitLabel}를 눌러 반영하세요
          </span>
        )}
      </div>
    </form>
  )
}
