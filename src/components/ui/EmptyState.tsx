import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ title, description, action, icon, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-6' : 'gap-3 py-12', className)}
    >
      <span className="flex size-10 items-center justify-center rounded-pill bg-neutral-bg text-ink-muted [&>svg]:size-5">
        {icon ?? <Inbox aria-hidden="true" />}
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mt-1 max-w-md text-xs text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
