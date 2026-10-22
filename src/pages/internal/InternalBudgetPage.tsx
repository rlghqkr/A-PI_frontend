import { useCallback, useMemo } from 'react';
import { usePageMeta } from '../../components/layout/AppShell';
import { Button, ErrorState, InlineAlert } from '../../components/ui';
import { formatKst } from '../../domain/format';
import { useNames } from '../../hooks/useReferenceData';
import { InternalFilterBar } from './InternalFilterBar';
import { InternalKpis } from './InternalKpis';
import { InternalTrendCharts } from './InternalTrendCharts';
import { MemberUsageTable } from './MemberUsageTable';
import { ProjectBudgetTable } from './ProjectBudgetTable';
import { RequestHistoryTable } from './RequestHistoryTable';
import { SubscriptionSection } from './SubscriptionSection';
import { UnclassifiedAlert } from './UnclassifiedAlert';
import { useDetailFocus, useInternalDataset, useInternalDerived, useInternalFilter, type InternalFilterState } from './useInternalData';

/** P-02 내부 AI 예산 관리 (/internal) */
export default function InternalBudgetPage() {
  const names = useNames();
  const { applied, set, defaults, range, rangeError, granularity } = useInternalFilter();
  const data = useInternalDataset(applied, range, rangeError === null);
  const subscriptionApplicable = !(applied.user || applied.model || applied.origin);
  const derived = useInternalDerived(data.data, range, granularity, names, applied.project, subscriptionApplicable);
  const { focus, focusDetail, setFocus, unknownOnly, setUnknownOnly, focusUnknown } = useDetailFocus();

  const title = useMemo(() => '내부 AI 예산 관리', []);
  const breadcrumb = useMemo(() => [{ label: 'P-02 내부 AI 예산 관리' }], []);
  const meta = useMemo(
    () => (
      <span>
        조회 기준 KST · {applied.start} ~ {applied.end}
        {data.loadedAt && ` · 데이터 갱신 ${formatKst(data.loadedAt, { seconds: false })}`}
      </span>
    ),
    [applied.start, applied.end, data.loadedAt],
  );
  usePageMeta({ title, breadcrumb, meta });

  const onApply = useCallback((next: InternalFilterState) => set(next), [set]);
  const reload = data.reload;
  const scrollToUnclassified = useCallback(() => focusDetail(derived && derived.unclassifiedUser.calls > 0 ? 'user-unclassified' : 'project-unclassified'), [focusDetail, derived]);

  const loading = data.loading;
  const error = data.error;
  // 재조회 실패 시 useAsync 는 이전 데이터를 유지한다 → KPI·차트·테이블이 모두 같은(마지막 성공) 데이터를 보도록 테이블 오류는 숨기고 상단에 안내
  const stale = Boolean(error && data.data);
  const tableError = data.data ? null : error;

  return (
    <>
      <InternalFilterBar applied={applied} defaults={defaults} onApply={onApply} loading={loading} />
      {rangeError && <ErrorState title="조회 기간이 올바르지 않습니다" description={rangeError} />}
      {!rangeError && error && !data.data && <ErrorState description={error} onRetry={reload} />}
      {!rangeError && stale && (
        <InlineAlert
          tone="danger"
          title="재조회에 실패해 마지막 성공 조회 기준으로 표시 중입니다"
          action={
            <Button size="sm" variant="secondary" onClick={reload}>
              다시 시도
            </Button>
          }
        >
          {error}
          {data.loadedAt && ` · 마지막 성공 조회 ${formatKst(data.loadedAt, { seconds: false })} KST`}
        </InlineAlert>
      )}
      {!rangeError && (
        <>
          <InternalKpis derived={derived} loading={loading} onUnknownClick={focusUnknown} onUnclassifiedClick={scrollToUnclassified} />
          {derived && <UnclassifiedAlert user={derived.unclassifiedUser} project={derived.unclassifiedProject} onShow={focusDetail} />}
          <InternalTrendCharts derived={derived} granularity={granularity} loading={loading} />
          <ProjectBudgetTable rows={derived?.projectRows ?? []} budgetMonth={derived?.budgetMonth ?? range.end.slice(0, 7)} loading={loading && !derived} error={tableError} onRetry={reload} />
          <MemberUsageTable rows={derived?.byUser ?? []} loading={loading && !derived} error={tableError} onRetry={reload} />
          <SubscriptionSection
            all={data.data?.subscriptions ?? []}
            inRange={derived?.subscriptionsInRange ?? []}
            months={derived?.subscriptionMonths ?? []}
            loading={loading && !derived}
            error={tableError}
            onRetry={reload}
            onChanged={reload}
            projectId={applied.project || null}
          />
          <RequestHistoryTable
            requests={data.data?.requests ?? []}
            loading={loading && !derived}
            error={tableError}
            onRetry={reload}
            focus={focus}
            onFocusChange={setFocus}
            unknownOnly={unknownOnly}
            onUnknownOnlyChange={setUnknownOnly}
          />
        </>
      )}
    </>
  );
}
