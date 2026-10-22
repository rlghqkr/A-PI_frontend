import { useCallback, useMemo } from 'react';
import { UsageCostTrendChart } from '../../components/charts';
import { ErrorState, InlineAlert, SectionCard, Skeleton } from '../../components/ui';
import { usePageMeta } from '../../components/layout/AppShell';
import { formatKst } from '../../domain/format';
import { CostAnalysisTabs } from './CostAnalysisTabs';
import { CustomerFilterBar } from './CustomerFilterBar';
import { CustomerKpis } from './CustomerKpis';
import { CustomerUsageTable } from './CustomerUsageTable';
import { RequestHistoryTable } from './RequestHistoryTable';
import { GRANULARITY_OPTIONS, useCustomerFilters } from './filters';
import { useBudgets, useCustomerRequests } from './useCustomerUsageData';

export default function CustomerUsagePage() {
  const { state, setState, applied, setCostFilter, sorts, setSort } = useCustomerFilters();
  const { requests, rows, summary, trendData } = useCustomerRequests(applied);
  const budgets = useBudgets();

  const meta = useMemo(
    () => (
      <span>
        원가 조회 화면 — 청구액 아님 · 조회 기준 KST
        {requests.loadedAt && ` · 데이터 갱신 ${formatKst(requests.loadedAt, { seconds: false })}`}
      </span>
    ),
    [requests.loadedAt],
  );
  usePageMeta({ title: '고객 AI 사용 현황', meta });

  const customerCount = useMemo(() => new Set(rows.map((r) => r.customer_id).filter((id): id is string => id !== null)).size, [rows]);
  const month = applied.range.end.slice(0, 7);
  const loading = requests.loading;
  const error = requests.error;
  const reloadRequests = requests.reload;
  const reloadBudgets = budgets.reload;
  const reload = useCallback(() => {
    reloadRequests();
    reloadBudgets();
  }, [reloadRequests, reloadBudgets]);
  const toggleUnknown = useCallback(() => setCostFilter(applied.costFilter === 'UNKNOWN' ? null : 'UNKNOWN'), [applied.costFilter, setCostFilter]);
  const unitLabel = GRANULARITY_OPTIONS.find((g) => g.value === applied.granularity)?.label ?? '일';

  return (
    <>
      <CustomerFilterBar applied={state} onApply={(next) => setState(next)} loading={loading} />

      {applied.rangeError ? (
        <InlineAlert tone="danger" title="조회 기간이 올바르지 않습니다">
          {applied.rangeError} 기간을 수정한 뒤 [조회]를 눌러주세요.
        </InlineAlert>
      ) : error ? (
        <SectionCard>
          <ErrorState title="고객 사용 현황 조회에 실패했습니다" description={error} onRetry={reload} />
        </SectionCard>
      ) : (
        <>
          <CustomerKpis
            summary={summary}
            loading={loading}
            customerCount={customerCount}
            unknownFilterActive={applied.costFilter === 'UNKNOWN'}
            onToggleUnknownFilter={toggleUnknown}
          />

          <SectionCard title="사용량 · 비용 추이" description="작업 건수(좌축 막대)와 확정·추정 비용(우축 선). 미확인 비용은 선 그래프에 포함되지 않습니다.">
            {loading ? (
              <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label="추이 차트 불러오는 중">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-[280px] w-full" />
              </div>
            ) : (
              <UsageCostTrendChart data={trendData} unitLabel={unitLabel} title={`${unitLabel}별 추이`} />
            )}
          </SectionCard>

          <CostAnalysisTabs rows={rows} loading={loading} error={error} onRetry={reload} sort={sorts.analysisSort} onSortChange={(s) => setSort('analysisSort', s)} />

          <CustomerUsageTable
            rows={rows}
            budgets={budgets.data}
            month={month}
            loading={loading || budgets.loading}
            error={budgets.error}
            onRetry={reload}
            sort={sorts.usageSort}
            onSortChange={(s) => setSort('usageSort', s)}
          />

          <RequestHistoryTable
            rows={rows}
            loading={loading}
            error={error}
            onRetry={reload}
            unknownOnly={applied.costFilter === 'UNKNOWN'}
            onClearUnknownFilter={() => setCostFilter(null)}
            sort={sorts.historySort}
            onSortChange={(s) => setSort('historySort', s)}
          />
        </>
      )}
    </>
  );
}
