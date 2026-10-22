export const chartColors = {
  primary: '#1d4ed8',
  estimated: '#6d28d9',
  success: '#16a34a',
  sky: '#0ea5e9',
  amber: '#f59e0b',
  grid: '#e2e8f0',
  axis: '#64748b',
  series: ['#1d4ed8', '#0ea5e9', '#7c3aed', '#16a34a', '#f59e0b'],
} as const

export function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

export function formatCount(value: number): string {
  return value.toLocaleString('ko-KR')
}

export const axisTick = { fontSize: 11, fill: chartColors.axis }
export const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(15,23,42,.08)' },
  labelStyle: { color: '#0f172a', fontWeight: 600, marginBottom: 4 },
}
