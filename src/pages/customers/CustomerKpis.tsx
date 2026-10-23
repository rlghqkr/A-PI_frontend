import { AlertTriangle, ChevronRight } from 'lucide-react';
import { KpiCard, Skeleton } from '../../components/ui';
import { cn } from '../../lib/cn';
import type { UsageSummary } from '../../domain/aggregate';
import { formatInt, formatPct, formatTokens, formatUsd } from '../../domain/format';

export interface CustomerKpisProps {
  summary: UsageSummary;
  loading: boolean;
  /** 고객 상세에서는 고객 수 KPI 대신 서비스 수 표시 */
  customerCountLabel?: string;
  customerCount: number;
  unknownFilterActive: boolean;
  onToggleUnknownFilter: () => void;
}

export function CustomerKpis({ summary, loading, customerCountLabel = '고객 수', customerCount, unknownFilterActive, onToggleUnknownFilter }: CustomerKpisProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9" aria-busy="true" aria-label="요약 지표 불러오는 중">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[96px]" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9">
      <KpiCard label={customerCountLabel} value={formatInt(customerCount)} unit="개" />
      <KpiCard
        label="작업 건수"
        value={formatInt(summary.tasks)}
        unit="건"
        hint="distinct task_id 기준"
        sub={summary.tasksUnidentified > 0 ? `작업 미식별 ${formatInt(summary.tasksUnidentified)}건` : undefined}
      />
      <KpiCard label="API 호출 수" value={formatInt(summary.calls)} unit="건" />
      <KpiCard
        label="성공률"
        value={formatPct(summary.successRate)}
        hint="성공 ÷ (성공+실패+Timeout). 대기·실행 중·취소 제외"
        tone={summary.successRate !== null && summary.successRate < 90 ? 'warning' : undefined}
        sub={`성공 ${formatInt(summary.success)} · 실패 ${formatInt(summary.failed)} · Timeout ${formatInt(summary.timeout)}`}
      />
      <KpiCard label="Input Token" value={formatTokens(summary.inputTokens)} />
      <KpiCard label="Output Token" value={formatTokens(summary.outputTokens)} />
      <KpiCard label="확정 API 비용" value={formatUsd(summary.confirmedUsd)} tone="success" hint="API 응답·대조로 확정된 비용 합계 (USD)" />
      <KpiCard
        label="추정 API 비용"
        value={formatUsd(summary.estimatedUsd)}
        tone="estimated"
        hint="Token × 단가로 추정한 비용 합계. 미확인 건은 금액에 포함되지 않음"
        sub={summary.unknownCount > 0 ? <span className="text-warning">미확인 {formatInt(summary.unknownCount)}건 제외</span> : undefined}
      />
      <KpiCard
        label="비용 미확인 건수"
        value={formatInt(summary.unknownCount)}
        unit="건"
        tone={summary.unknownCount > 0 ? 'warning' : undefined}
        icon={summary.unknownCount > 0 ? <AlertTriangle className="text-warning" /> : undefined}
        hint="실패·Timeout 등으로 비용을 확인하지 못한 호출. 금액은 0이 아닌 '미확인'이며 비용 합계에서 제외"
        className={summary.unknownCount > 0 ? 'border-warning/40 bg-warning-bg/60' : undefined}
        sub={
          summary.unknownCount > 0 || unknownFilterActive ? (
            <span className={cn('inline-flex items-center gap-0.5 text-warning', unknownFilterActive && 'font-semibold underline')}>
              {unknownFilterActive ? '이력에서 보는 중 · 눌러서 해제' : '눌러서 호출 이력 보기'}
              {!unknownFilterActive && <ChevronRight className="size-3.5" aria-hidden="true" />}
            </span>
          ) : (
            '모든 호출 비용 확인됨'
          )
        }
        onClick={summary.unknownCount > 0 || unknownFilterActive ? onToggleUnknownFilter : undefined}
      />
    </div>
  );
}
