import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  icon: ReactNode
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'secondary' | 'primary'
}

const variantClass = {
  ghost: 'bg-transparent text-ink-secondary hover:bg-neutral-bg hover:text-ink',
  secondary: 'bg-surface text-ink border border-border-strong hover:bg-subtle',
  primary: 'bg-primary text-ink-inverse hover:bg-primary-hover',
}

export function IconButton({ label, icon, size = 'md', variant = 'ghost', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'size-7 [&>svg]:size-4' : 'size-9 [&>svg]:size-[18px]',
        variantClass[variant],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
}
