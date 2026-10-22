import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { toneBg, type Tone } from './tones'

export interface ChipProps {
  children: ReactNode
  tone?: Tone
  className?: string
  title?: string
}

export function Chip({ children, tone = 'neutral', className, title }: ChipProps) {
  return (
    <span
      title={title}
      className={cn('inline-flex h-5 items-center rounded-sm px-1.5 text-[11px] font-medium whitespace-nowrap', toneBg[tone], className)}
    >
      {children}
    </span>
  )
}
