import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabledReason?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  block?: boolean
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-ink-inverse hover:bg-primary-hover border border-transparent shadow-sm',
  secondary: 'bg-surface text-ink border border-border-strong hover:bg-subtle',
  ghost: 'bg-transparent text-ink-secondary hover:bg-neutral-bg border border-transparent',
  danger: 'bg-danger text-ink-inverse hover:opacity-90 border border-transparent',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-sm',
  md: 'h-9 px-4 text-sm gap-2 rounded-md',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  disabledReason,
  leftIcon,
  rightIcon,
  block,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || loading
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      title={isDisabled && disabledReason ? disabledReason : rest.title}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0 [&>svg]:size-4">{leftIcon}</span>
      )}
      {children}
      {rightIcon && <span className="inline-flex shrink-0 [&>svg]:size-4">{rightIcon}</span>}
    </button>
  )
}
