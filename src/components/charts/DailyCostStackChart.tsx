import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFrame } from './ChartFrame'
import { axisTick, chartColors, formatUsd, tooltipStyle } from './chartTheme'

export interface DailyCostPoint {
  label: string
  confirmedUsd: number
  estimatedUsd: number
  /** 집계 단위가 월일 때만: 적용 월 구독료 (스택에 포함되지 않는 별도 시리즈) */
  subscriptionUsd?: number
}

export interface DailyCostStackChartProps {
  data: DailyCostPoint[]
  title?: string
  unitLabel?: string
  height?: number
  /** 구독료 시리즈 표시 (월 단위) */
  withSubscription?: boolean
}

export function DailyCostStackChart({ data, title = 'API 비용 추이', unitLabel = '일', height, withSubscription = false }: DailyCostStackChartProps) {
  return (
    <ChartFrame title={title} unit={`집계 단위: ${unitLabel} · USD${withSubscription ? ' · 구독료는 별도 막대(스택 미포함)' : ' (구독료 미포함)'}`} isEmpty={data.length === 0} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
          <Tooltip {...tooltipStyle} formatter={(value, name) => [formatUsd(typeof value === 'number' ? value : Number(value)), name]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="confirmedUsd" name="확정 비용" stackId="c" fill={chartColors.primary} maxBarSize={28} />
          <Bar dataKey="estimatedUsd" name="추정 비용" stackId="c" fill={chartColors.estimated} maxBarSize={28} radius={[3, 3, 0, 0]} />
          {withSubscription && <Bar dataKey="subscriptionUsd" name="구독료 (적용 월)" stackId="s" fill={chartColors.success} maxBarSize={28} radius={[3, 3, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
