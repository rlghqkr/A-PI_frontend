import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { UsageCostTrendChart } from '../../components/charts';
import { Badge, Button, EmptyState, ErrorState, InlineAlert, SectionCard, Skeleton } from '../../components/ui';
import { usePageMeta, type BreadcrumbItem } from '../../components/layout/AppShell';
import { monthsInRange } from '../../domain/aggregate';
import { formatKst } from '../../domain/format';
import { useReferenceData } from '../../hooks/useReferenceData';
import { BudgetCard } from './BudgetCard';
import { CostAnalysisTabs } from './CostAnalysisTabs';
import { CustomerFilterBar } from './CustomerFilterBar';
import { CustomerKpis } from './CustomerKpis';
import { RequestHistoryTable } from './RequestHistoryTable';
import { scrollToSection } from '../../lib/scrollToSection';
import { GRANULARITY_OPTIONS, useCustomerFilters, REQUEST_HISTORY_ID } from './filters';
import { customerMonthBudget, findCustomerBudget, useBudgets, useCustomerRequests } from './useCustomerUsageData';

export default function CustomerDetailPage() {
  const { customerId = '' } = useParams<{ customerId: string }>();
  const { search } = useLocation();
  const ref = useReferenceData();
  const customer = ref.customerById.get(customerId) ?? null;

  const { state, setState, applied, setCostFilter, sorts, setSort } = useCustomerFilters({ lockedCustomerId: customerId });
  const { requests, rows, summary, trendData } = useCustomerRequests(applied);
  const budgets = useBudgets();

  // 예산 월 선택: 조회 기간 내 월. 기본은 종료일의 월
  const months = useMemo(() => (applied.rangeError ? [] : monthsInRange(applied.range)), [applied.range, applied.rangeError]);
  const defaultMonth = applied.range.end.slice(0, 7);
  const [selectedMonth, setMonth] = useState<string | null>(null);
  const month = selectedMonth !== null && months.includes(selectedMonth) ? selectedMonth : defaultMonth;

  const budget = useMemo(() => findCustomerBudget(budgets.data, customerId, month), [budgets.data, customerId, month]);
  const budgetState = useMemo(() => customerMonthBudget(rows, budgets.data, customerId, month), [rows, budgets.data, customerId, month]);

  const breadcrumb = useMemo<BreadcrumbItem[]>(
    () => [
      { label: '고객 AI 사용 현황', to: `/customers${search}` },
      { label: customer?.name ?? customerId },
    ],
    [search, customer?.name, customerId],
  );
  const meta = useMemo(
    () => (
      <span>
        원가 조회 화면 — 청구액 아님 · 조회 기준 KST
        {requests.loadedAt && ` · 데이터 갱신 ${formatKst(requests.loadedAt, { seconds: false })}`}
      </span>
    ),
    [requests.loadedAt],
  );
  usePageMeta({ title: customer ? `${customer.name} 사용 현황` : '고객 상세', breadcrumb, meta });

  const serviceCount = useMemo(() => new Set(rows.map((r) => r.service_id)).size, [rows]);
  const reloadRequests = requests.reload;
  const reloadBudgets = budgets.reload;
  const reload = useCallback(() => {
    reloadRequests();
    reloadBudgets();
  }, [reloadRequests, reloadBudgets]);
  const toggleUnknown = useCallback(() => {
    const turningOn = applied.costFilter !== 'UNKNOWN';
    setCostFilter(turningOn ? 'UNKNOWN' : null);
    if (turningOn) scrollToSection(REQUEST_HISTORY_ID);
  }, [applied.costFilter, setCostFilter]);
  const unitLabel = GRANULARITY_OPTIONS.find((g) => g.value === applied.granularity)?.label ?? '일';

  if (ref.loading) return <Skeleton className="h-40 w-full" />;
  if (ref.error) {
    return (
      <SectionCard>
        <ErrorState title="기준 데이터 조회 실패" description={ref.error} onRetry={ref.reload} />
      </SectionCard>
    );
  }
  if (!customer) {
    return (
      <SectionCard>
        <EmptyState
          title="고객을 찾을 수 없습니다"
          description={`고객 ID "${customerId}" 에 해당하는 고객이 없습니다. 목록에서 고객을 선택하세요.`}
          action={
            <Link to="/customers">
              <Button variant="secondary" size="sm" leftIcon={<ArrowLeft />}>
                고객 목록으로
              </Button>
            </Link>
          }
        />
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-ink">{customer.name}</h2>
              <span className="font-mono text-xs text-ink-muted">{customer.customer_id}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-ink-secondary">서비스</span>
              {customer.service_ids.map((sid) => (
                <Badge key={sid} tone="primary" size="sm">
                  {ref.serviceById.get(sid)?.name ?? sid}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink-muted">원가 조회 화면 — 청구액 아님</p>
        </div>
      </SectionCard>

      <CustomerFilterBar applied={state} onApply={(next) => setState(next)} loading={requests.loading} lockedCustomerId={customerId} />

      {applied.rangeError ? (
        <InlineAlert tone="danger" title="조회 기간이 올바르지 않습니다">
          {applied.rangeError} 기간을 수정한 뒤 [조회]를 눌러주세요.
        </InlineAlert>
      ) : requests.error ? (
        <SectionCard>
          <ErrorState title="고객 사용 현황 조회에 실패했습니다" description={requests.error} onRetry={reload} />
        </SectionCard>
      ) : (
        <>
          <BudgetCard
            customerId={customerId}
            customerName={customer.name}
            months={months}
            month={month}
            onMonthChange={setMonth}
            budget={budget}
            budgets={budgets.data}
            status={budgetState}
            loading={budgets.loading || requests.loading}
            error={budgets.error}
            onRetry={budgets.reload}
            onSaved={budgets.reload}
          />

          <CustomerKpis
            summary={summary}
            loading={requests.loading}
            customerCountLabel="서비스 수"
            customerCount={serviceCount}
            unknownFilterActive={applied.costFilter === 'UNKNOWN'}
            onToggleUnknownFilter={toggleUnknown}
          />

          <SectionCard title="사용량 · 비용 추이" description="작업 건수(좌축 막대)와 확정·추정 비용(우축 선). 미확인 비용은 선 그래프에 포함되지 않습니다.">
            {requests.loading ? (
              <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label="추이 차트 불러오는 중">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-[280px] w-full" />
              </div>
            ) : (
              <UsageCostTrendChart data={trendData} unitLabel={unitLabel} title={`${unitLabel}별 추이`} />
            )}
          </SectionCard>

          <CostAnalysisTabs
            rows={rows}
            loading={requests.loading}
            error={requests.error}
            onRetry={reload}
            tabs={['service', 'model']}
            sort={sorts.analysisSort}
            onSortChange={(s) => setSort('analysisSort', s)}
          />

          <RequestHistoryTable
            rows={rows}
            loading={requests.loading}
            error={requests.error}
            onRetry={reload}
            unknownOnly={applied.costFilter === 'UNKNOWN'}
            onClearUnknownFilter={() => setCostFilter(null)}
            hideCustomer
            sort={sorts.historySort}
            onSortChange={(s) => setSort('historySort', s)}
          />
        </>
      )}
    </>
  );
}
