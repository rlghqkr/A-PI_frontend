import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { copyText } from '../../lib/copyText'

export interface CopyableIdProps {
  value: string
  short?: boolean
  mono?: boolean
  link?: string
  className?: string
}

export function truncateMiddle(value: string, max = 18): string {
  if (value.length <= max) return value
  const head = Math.ceil((max - 1) / 2)
  const tail = Math.floor((max - 1) / 2)
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`
}

export function CopyableId({ value, short, mono = true, link, className }: CopyableIdProps) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  const text = short ? truncateMiddle(value) : value
  const textClass = cn('break-all', mono && 'font-mono text-xs', link && 'text-primary hover:underline')

  return (
    <span className={cn('inline-flex items-center gap-1', className)} title={value}>
      {link ? (
        <Link to={link} className={textClass}>
          {text}
        </Link>
      ) : (
        <span className={textClass}>{text}</span>
      )}
      <button
        type="button"
        aria-label={copied ? '복사됨' : `${value} 복사`}
        onClick={async (e) => {
          e.stopPropagation()
          if (await copyText(value)) setCopied(true)
        }}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-neutral-bg hover:text-ink"
      >
        {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      </button>
      {copied && (
        <span className="text-[11px] text-success" role="status">
          복사됨
        </span>
      )}
    </span>
  )
}
