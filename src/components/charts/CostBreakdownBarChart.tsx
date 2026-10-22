import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame } from './ChartFrame'
import { axisTick, chartColors, formatUsd, tooltipStyle } from './chartTheme'

export interface CostBreakdownPoint {
  name: string
  confirmedUsd: number
  estimatedUsd: number
  unknownCount: number
}

export interface CostBreakdownBarChartProps {
  data: CostBreakdownPoint[]
  title?: string
  height?: number
}

export function CostBreakdownBarChart({ data, title = '비용 분석', height }: CostBreakdownBarChartProps) {
  const h = height ?? Math.max(160, Math.min(400, data.length * 40 + 60))
  return (
    <ChartFrame title={title} unit="확정 + 추정 비용 (USD) · 미확인 건수는 금액에 포함되지 않음" isEmpty={data.length === 0} height={h}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.grid} horizontal={false} />
          <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
          <YAxis type="category" dataKey="name" width={120} tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip
            {...tooltipStyle}
            formatter={(value, name, item) => {
              const n = typeof value === 'number' ? value : Number(value)
              const payload = item.payload as CostBreakdownPoint | undefined
              const suffix = name === '추정 비용' && payload && payload.unknownCount > 0 ? ` · 미확인 ${payload.unknownCount}건` : ''
              return [`${formatUsd(n)}${suffix}`, name]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="confirmedUsd" name="확정 비용" stackId="cost" fill={chartColors.primary} maxBarSize={22} />
          <Bar dataKey="estimatedUsd" name="추정 비용" stackId="cost" fill={chartColors.estimated} maxBarSize={22} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
