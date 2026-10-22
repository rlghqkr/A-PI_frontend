import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame } from './ChartFrame'
import { axisTick, chartColors, formatUsd, tooltipStyle } from './chartTheme'

export interface MonthlyCostPoint {
  month: string
  apiUsd: number
  subscriptionUsd: number
}

export interface MonthlyCostChartProps {
  data: MonthlyCostPoint[]
  title?: string
  height?: number
}

export function MonthlyCostChart({ data, title = '월별 API 비용 · 구독료', height }: MonthlyCostChartProps) {
  return (
    <ChartFrame title={title} unit="USD · API 비용은 확정+추정(추정 포함), 구독료는 적용 월 기준" isEmpty={data.length === 0} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
          <Tooltip {...tooltipStyle} formatter={(value, name) => [formatUsd(typeof value === 'number' ? value : Number(value)), name]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="apiUsd" name="API 비용 (추정 포함)" fill={chartColors.primary} maxBarSize={32} radius={[3, 3, 0, 0]} />
          <Bar dataKey="subscriptionUsd" name="월 구독료" fill={chartColors.success} maxBarSize={32} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
