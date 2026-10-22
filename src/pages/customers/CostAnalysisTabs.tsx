import { useMemo, useState } from 'react';
import { CostBreakdownBarChart } from '../../components/charts';
import { DataTable, ErrorState, SectionCard, Skeleton, Tabs, type Column, type SortState } from '../../components/ui';
import { groupSummaries, type GroupSummary } from '../../domain/aggregate';
import { formatInt, formatPct, formatUsd } from '../../domain/format';
import type { AIRequest } from '../../domain/types';
import { useNames } from '../../hooks/useReferenceData';

export type AnalysisTab = 'customer' | 'service' | 'model';

export interface CostAnalysisTabsProps {
  rows: readonly AIRequest[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** 고객 상세에서는 고객별 탭 제외 */
  tabs?: AnalysisTab[];
  /** 정렬 유지 (URL) */
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
}

const TAB_LABEL: Record<AnalysisTab, string> = { customer: '고객별', service: '서비스별', model: '모델별' };

export function CostAnalysisTabs({ rows, loading, error, onRetry, tabs = ['customer', 'service', 'model'], sort, onSortChange }: CostAnalysisTabsProps) {
  const names = useNames();
  const [tab, setTab] = useState<AnalysisTab>(tabs[0]);
  const active = tabs.includes(tab) ? tab : tabs[0];

  const groups = useMemo<GroupSummary[]>(() => {
    const keyOf = (r: AIRequest) => (active === 'customer' ? r.customer_id ?? '' : active === 'service' ? r.service_id : r.requested_model);
    const labelOf = (k: string) => (active === 'customer' ? names.customer(k || null) : active === 'service' ? names.service(k) : names.model(k));
    return groupSummaries(rows, keyOf, labelOf).sort((a, b) => b.totalIncludingEstimatedUsd - a.totalIncludingEstimatedUsd);
  }, [rows, active, names]);

  const chartData = useMemo(
    () => groups.map((g) => ({ name: g.label, confirmedUsd: g.confirmedUsd, estimatedUsd: g.estimatedUsd, unknownCount: g.unknownCount })),
    [groups],
  );

  const columns = useMemo<Column<GroupSummary>[]>(
    () => [
      { key: 'label', header: TAB_LABEL[active], accessor: (g) => g.label },
      { key: 'calls', header: '호출', accessor: (g) => g.calls, align: 'right', render: (g) => formatInt(g.calls) },
      { key: 'successRate', header: '성공률', accessor: (g) => g.successRate, align: 'right', render: (g) => formatPct(g.successRate) },
      { key: 'confirmedUsd', header: '확정', accessor: (g) => g.confirmedUsd, align: 'right', render: (g) => formatUsd(g.confirmedUsd) },
      { key: 'estimatedUsd', header: '추정', accessor: (g) => g.estimatedUsd, align: 'right', render: (g) => <span className="text-estimated">{formatUsd(g.estimatedUsd)}</span> },
      {
        key: 'total',
        header: '합계 (추정 포함)',
        accessor: (g) => g.totalIncludingEstimatedUsd,
        align: 'right',
        render: (g) => formatUsd(g.totalIncludingEstimatedUsd),
      },
      {
        key: 'unknownCount',
        header: '미확인',
        accessor: (g) => g.unknownCount,
        align: 'right',
        render: (g) => (g.unknownCount > 0 ? <span className="text-warning">{formatInt(g.unknownCount)}건</span> : '0건'),
      },
    ],
    [active],
  );

  return (
    <SectionCard title="비용 분석" description="확정·추정 비용을 기준별로 비교합니다. 미확인 건은 금액에 포함되지 않습니다.">
      <Tabs
        aria-label="비용 분석 기준"
        items={tabs.map((t) => ({ key: t, label: TAB_LABEL[t] }))}
        value={active}
        onChange={(k) => setTab(k as AnalysisTab)}
        className="mb-4"
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label={`${TAB_LABEL[active]} 비용 차트 불러오는 중`}>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-[280px] w-full" />
          </div>
        ) : error ? (
          <ErrorState compact title={`${TAB_LABEL[active]} 비용 차트를 불러오지 못했습니다`} description={error} onRetry={onRetry} />
        ) : (
          <CostBreakdownBarChart data={chartData} title={`${TAB_LABEL[active]} 비용`} />
        )}
        <DataTable
          columns={columns}
          rows={groups}
          rowKey={(g) => g.key || '(none)'}
          loading={loading}
          error={error}
          onRetry={onRetry}
          dense
          sort={sort}
          onSortChange={onSortChange}
          defaultSort={{ key: 'total', dir: 'desc' }}
          emptyTitle="조회 결과 없음"
          emptyDescription="기간 또는 조건을 변경한 뒤 조회하세요."
          caption={`${TAB_LABEL[active]} 비용 분석`}
        />
      </div>
    </SectionCard>
  );
}
