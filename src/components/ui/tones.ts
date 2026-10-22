export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'estimated' | 'neutral' | 'primary'

export const toneBg: Record<Tone, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  estimated: 'bg-estimated-bg text-estimated',
  neutral: 'bg-neutral-bg text-neutral',
  primary: 'bg-primary-soft text-primary',
}

export const toneText: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  estimated: 'text-estimated',
  neutral: 'text-neutral',
  primary: 'text-primary',
}

export const toneDot: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  estimated: 'bg-estimated',
  neutral: 'bg-neutral',
  primary: 'bg-primary',
}

export const toneSolid: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  estimated: 'bg-estimated',
  neutral: 'bg-neutral',
  primary: 'bg-primary',
}
