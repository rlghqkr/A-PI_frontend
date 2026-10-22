import { Pencil } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CostBreakdownBarChart } from '../../components/charts';
import { usePageMeta } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, EmptyState, ErrorState, InlineAlert, SectionCard, Skeleton, type Column } from '../../components/ui';
import { BASIS_LABEL, budgetStatus, type GroupSummary } from '../../domain/aggregate';
import { formatInt, formatKst, formatTokens, formatUsd } from '../../domain/format';
import { USAGE_ORIGIN } from '../../domain/status';
import type { UsageOrigin } from '../../domain/types';
import { useNames, useReferenceData } from '../../hooks/useReferenceData';
import { InternalFilterBar } from './InternalFilterBar';
import { InternalKpis } from './InternalKpis';
import { InternalTrendCharts } from './InternalTrendCharts';
import { MemberUsageTable } from './MemberUsageTable';
import { ProjectBudgetDrawer } from './ProjectBudgetDrawer';
import { RequestHistoryTable } from './RequestHistoryTable';
import { SubscriptionSection } from './SubscriptionSection';
import { BudgetStateBadge, BudgetUsageCell } from '../../features/shared/cells';
import { EMPTY_BY_ORIGIN, useDetailFocus, useInternalDataset, useInternalDerived, useInternalFilter, type InternalFilterState, type ProjectBudgetRow } from './useInternalData';

const groupColumns: Column<GroupSummary>[] = [
  { key: 'label', header: '구분', accessor: (r) => r.label, render: (r) => <span className="font-medium">{r.label}</span> },
  { key: 'calls', header: '호출', accessor: (r) => r.calls, align: 'right', render: (r) => formatInt(r.calls) },
  { key: 'tokens', header: 'Token (In / Out)', accessor: (r) => r.inputTokens + r.outputTokens, align: 'right', render: (r) => `${formatTokens(r.inputTokens)} / ${formatTokens(r.outputTokens)}` },
  { key: 'confirmed', header: '확정', accessor: (r) => r.confirmedUsd, align: 'right', render: (r) => formatUsd(r.confirmedUsd) },
  { key: 'estimated', header: '추정', accessor: (r) => r.estimatedUsd, align: 'right', render: (r) => <span className="text-estimated">{formatUsd(r.estimatedUsd)}</span> },
  { key: 'unknown', header: '미확인', accessor: (r) => r.unknownCount, align: 'right', render: (r) => (r.unknownCount > 0 ? <span className="text-warning">{formatInt(r.unknownCount)}건</span> : '0건') },
];

function BudgetCard({ row, month, loading, onEdit }: { row: ProjectBudgetRow | null; month: string; loading: boolean; onEdit: () => void }) {
  if (loading && !row) return <Skeleton className="h-40" />;
  // 데이터가 없으면(조회 실패 등) 사용액을 $0 으로 꾸며 보여주지 않는다
  if (!row) return null;
  const status = row.status;
  return (
    <SectionCard
      title={`월 예산 (${month})`}
      description={`사용액은 ${month}(KST) 호출의 API 확정+추정(추정 포함). 구독료·미확인 호출·다른 달 호출은 사용률에 포함되지 않음.`}
      actions={
        <Button size="sm" variant="secondary" leftIcon={<Pencil />} onClick={onEdit}>
          {row?.budget ? '예산 수정' : '예산 등록'}
        </Button>
      }
    >
      {status.amountUsd === null ? (
        <EmptyState compact title="예산 미설정" description={`${month} 예산이 등록되지 않아 사용률을 계산할 수 없습니다. ${month} 사용액 ${formatUsd(status.spentIncludingEstimatedUsd)}${status.spentIncludingEstimatedUsd > status.spentConfirmedUsd ? ' (추정 포함)' : ''}${status.unknownCount > 0 ? ` · 미확인 ${status.unknownCount}건 제외` : ''}`} action={<Button size="sm" onClick={onEdit}>예산 등록</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-ink-secondary">월 예산</p>
            <p className="tnum text-xl font-bold">{formatUsd(status.amountUsd)}</p>
            <p className="text-xs text-ink-muted">경고 기준 {status.warningPct}%</p>
          </div>
          <div>
            <p className="text-xs text-ink-secondary">사용액 ({BASIS_LABEL[status.basis]})</p>
            <p className="tnum text-xl font-bold">{formatUsd(status.spentUsd)}</p>
            <p className="text-xs text-ink-muted">
              확정 {formatUsd(status.spentConfirmedUsd)} · 추정 포함 {formatUsd(status.spentIncludingEstimatedUsd)}
              {status.unknownCount > 0 && <span className="text-warning"> · 미확인 {status.unknownCount}건 제외</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-secondary">잔여</p>
            <p className={`tnum text-xl font-bold ${status.remainingUsd !== null && status.remainingUsd < 0 ? 'text-danger' : ''}`}>{formatUsd(status.remainingUsd)}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-ink-secondary">사용률 · 상태</p>
            <BudgetUsageCell status={status} hideState />
            <span><BudgetStateBadge state={status.state} size="md" /></span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/** P-02 프로젝트 상세 (/internal/projects/:projectId) */
export default function ProjectDetailPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const ref = useReferenceData();
  const names = useNames();
  const project = ref.projectById.get(projectId) ?? null;
  const { applied, set, defaults, range, rangeError, granularity } = useInternalFilter(projectId);
  const data = useInternalDataset(applied, range, rangeError === null && projectId !== '');
  const subscriptionApplicable = !(applied.user || applied.model || applied.origin);
  const derived = useInternalDerived(data.data, range, granularity, names, projectId, subscriptionApplicable);
  const { focus, setFocus, unknownOnly, setUnknownOnly, focusUnknown } = useDetailFocus();
  const [budgetOpen, setBudgetOpen] = useState(false);

  const projectName = project?.name ?? projectId;
  const title = useMemo(() => projectName, [projectName]);
  const breadcrumb = useMemo(() => [{ label: '내부 AI 예산 관리', to: '/internal' }, { label: projectName }], [projectName]);
  const meta = useMemo(
    () => (
      <span>
        조회 기준 KST · {applied.start} ~ {applied.end}
        {data.loadedAt && ` · 데이터 갱신 ${formatKst(data.loadedAt, { seconds: false })}`}
      </span>
    ),
    [applied.start, applied.end, data.loadedAt],
  );
  const actions = useMemo(
    () =>
      project ? (
        <span className="flex items-center gap-2 text-xs text-ink-muted">
          <Badge tone="neutral" size="sm">
            {project.kind}
          </Badge>
          <span className="font-mono">{project.project_id}</span>
          {project.owner_user_id && <span>담당 {names.user(project.owner_user_id)}</span>}
        </span>
      ) : undefined,
    [project, names],
  );
  usePageMeta({ title, breadcrumb, meta, actions });

  const onApply = useCallback((next: InternalFilterState) => set(next), [set]);
  const reload = data.reload;
  const loading = data.loading;
  const error = data.error;
  const projectRow = derived?.projectRows.find((r) => r.projectId === projectId) ?? null;
  const budgetMonth = derived?.budgetMonth ?? range.end.slice(0, 7);
  const budgetRow = useMemo<ProjectBudgetRow | null>(() => {
    if (!derived) return null;
    if (projectRow) return projectRow;
    // 기간 내 호출이 없어도 예산 카드는 표시
    const budget = data.data?.budgets.find((b) => b.owner_type === 'PROJECT' && b.owner_id === projectId && b.month === budgetMonth) ?? null;
    // 집계 규칙은 domain/aggregate 의 budgetStatus 하나만 사용한다 (이 분기에서 derived.summary 는 빈 집계)
    return { key: projectId, projectId, label: projectName, summary: derived.summary, byOrigin: EMPTY_BY_ORIGIN, subscriptionUsd: derived.subscriptionUsd, budget, status: budgetStatus(budget, derived.summary) };
  }, [derived, projectRow, data.data, projectId, budgetMonth, projectName]);

  // 재조회 실패 시 useAsync 는 이전 데이터를 유지한다 → 모든 섹션이 같은(마지막 성공) 데이터를 보도록 테이블 오류는 숨기고 상단에 안내
  const stale = Boolean(error && data.data);
  const tableError = data.data ? null : error;

  const originRows = useMemo<GroupSummary[]>(() => (derived?.byOrigin ?? []).map((g) => ({ ...g, label: USAGE_ORIGIN[g.key as UsageOrigin]?.label ?? g.key })), [derived]);
  const originChart = useMemo(() => originRows.map((g) => ({ name: g.label, confirmedUsd: g.confirmedUsd, estimatedUsd: g.estimatedUsd, unknownCount: g.unknownCount })), [originRows]);

  if (!ref.loading && !project) {
    return (
      <ErrorState
        title="프로젝트를 찾을 수 없습니다"
        description={`${projectId} 에 해당하는 프로젝트가 없습니다.`}
        onRetry={ref.reload}
        retryLabel="기준 정보 다시 불러오기"
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link to="/internal" className="text-xs text-primary hover:underline">
          ← 내부 AI 예산 관리로 돌아가기
        </Link>
        {project?.description && <p className="text-xs text-ink-muted">{project.description}</p>}
      </div>
      <InternalFilterBar applied={applied} defaults={defaults} onApply={onApply} loading={loading} hideProject />
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
          <BudgetCard row={budgetRow} month={budgetMonth} loading={loading && !derived} onEdit={() => setBudgetOpen(true)} />
          <InternalKpis derived={derived} loading={loading} onUnknownClick={focusUnknown} projectMode />
          <InternalTrendCharts derived={derived} granularity={granularity} loading={loading} />
          <SectionCard title="출처별 비용 구성" description="내부 개발 / 시뮬레이션 / 연결 테스트 — 확정·추정 분리, 미확인은 건수만">
            <div className="grid gap-5 xl:grid-cols-2">
              <CostBreakdownBarChart data={originChart} title="출처별 API 비용" />
              <DataTable columns={groupColumns} rows={originRows} rowKey={(r) => r.key} loading={loading && !derived} error={tableError} onRetry={reload} emptyTitle="조회 기간에 호출이 없습니다" caption="출처별 비용 구성" dense />
            </div>
          </SectionCard>
          <MemberUsageTable rows={derived?.byUser ?? []} loading={loading && !derived} error={tableError} onRetry={reload} />
          <SectionCard title="모델별 사용량" description="요청 모델 기준. INACTIVE 모델의 과거 이력도 유지">
            <DataTable columns={groupColumns} rows={derived?.byModel ?? []} rowKey={(r) => r.key} defaultSort={{ key: 'confirmed', dir: 'desc' }} loading={loading && !derived} error={tableError} onRetry={reload} emptyTitle="조회 기간에 호출이 없습니다" caption="모델별 사용량" />
          </SectionCard>
          <SubscriptionSection
            all={data.data?.subscriptions ?? []}
            inRange={derived?.subscriptionsInRange ?? []}
            months={derived?.subscriptionMonths ?? []}
            loading={loading && !derived}
            error={tableError}
            onRetry={reload}
            onChanged={reload}
            projectId={projectId}
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
            hideProject
          />
        </>
      )}
      <ProjectBudgetDrawer open={budgetOpen} onClose={() => setBudgetOpen(false)} projectId={projectId} projectName={projectName} month={budgetMonth} budget={budgetRow?.budget ?? null} onSaved={reload} />
    </>
  );
}
