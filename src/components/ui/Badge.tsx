import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { toneBg, toneDot, type Tone } from './tones'

export interface BadgeProps {
  tone?: Tone
  children: ReactNode
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
  title?: string
}

export function Badge({ tone = 'neutral', children, size = 'md', dot, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill font-medium',
        size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs',
        toneBg[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn('size-1.5 rounded-pill', toneDot[tone])} />}
      {children}
    </span>
  )
}
