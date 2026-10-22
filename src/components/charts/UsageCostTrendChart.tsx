import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame } from './ChartFrame'
import { axisTick, chartColors, formatCount, formatUsd, tooltipStyle } from './chartTheme'

export interface UsageCostTrendPoint {
  label: string
  tasks: number
  calls: number
  confirmedUsd: number
  estimatedUsd: number
}

export interface UsageCostTrendChartProps {
  data: UsageCostTrendPoint[]
  unitLabel: string
  title?: string
  height?: number
}

export function UsageCostTrendChart({ data, unitLabel, title = '사용량 · 비용 추이', height }: UsageCostTrendChartProps) {
  return (
    <ChartFrame title={title} unit={`집계 단위: ${unitLabel} · 비용 USD`} isEmpty={data.length === 0} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
          <YAxis
            yAxisId="left"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            label={{ value: '작업 건수', angle: -90, position: 'insideLeft', fontSize: 11, fill: chartColors.axis }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
            label={{ value: '비용 (USD)', angle: 90, position: 'insideRight', fontSize: 11, fill: chartColors.axis }}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(value, name) => {
              const n = typeof value === 'number' ? value : Number(value)
              if (name === '작업 건수' || name === 'API 호출 수') return [formatCount(n), name]
              return [formatUsd(n), name]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="tasks" name="작업 건수" fill={chartColors.sky} radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Line yAxisId="right" type="monotone" dataKey="confirmedUsd" name="확정 비용" stroke={chartColors.primary} strokeWidth={2} dot={false} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="estimatedUsd"
            name="추정 비용"
            stroke={chartColors.estimated}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
