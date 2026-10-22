import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type InlineAlertTone = 'info' | 'warning' | 'danger' | 'success'

export interface InlineAlertProps {
  tone?: InlineAlertTone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}

const toneClass: Record<InlineAlertTone, string> = {
  info: 'border-info/30 bg-info-bg text-info',
  warning: 'border-warning/30 bg-warning-bg text-warning',
  danger: 'border-danger/30 bg-danger-bg text-danger',
  success: 'border-success/30 bg-success-bg text-success',
}

const icons: Record<InlineAlertTone, ReactNode> = {
  info: <Info aria-hidden="true" />,
  warning: <TriangleAlert aria-hidden="true" />,
  danger: <CircleAlert aria-hidden="true" />,
  success: <CircleCheck aria-hidden="true" />,
}

export function InlineAlert({ tone = 'info', title, children, action, className }: InlineAlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm', toneClass[tone], className)}
    >
      <span className="mt-0.5 shrink-0 [&>svg]:size-4">{icons[tone]}</span>
      <div className="min-w-0 flex-1 text-ink">
        {title && <p className={cn('font-medium', toneClass[tone].split(' ').at(-1))}>{title}</p>}
        {children && <div className={cn('text-[13px] text-ink-secondary', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
