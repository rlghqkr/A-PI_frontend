import { CircleAlert, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  className?: string
  compact?: boolean
}

export function ErrorState({
  title = '조회에 실패했습니다',
  description,
  onRetry,
  retryLabel = '다시 시도',
  className,
  compact,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-6' : 'gap-3 py-12', className)}
    >
      <span className="flex size-10 items-center justify-center rounded-pill bg-danger-bg text-danger">
        <CircleAlert className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mt-1 max-w-md text-xs text-ink-muted">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw />} onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
