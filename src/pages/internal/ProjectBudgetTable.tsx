import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Chip, DataTable, SectionCard, type Column } from '../../components/ui';
import { formatInt, formatUsd } from '../../domain/format';
import { USAGE_ORIGIN } from '../../domain/status';
import { BudgetStateBadge, BudgetUsageCell, EstimatedTotalLabel } from '../../features/shared/cells';
import { INTERNAL_ORIGINS, type InternalOrigin, type ProjectBudgetRow } from './useInternalData';

export interface ProjectBudgetTableProps {
  rows: ProjectBudgetRow[];
  budgetMonth: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function OriginChips({ row }: { row: ProjectBudgetRow }) {
  const entries = (INTERNAL_ORIGINS as InternalOrigin[]).filter((o) => row.byOrigin[o].usd > 0);
  if (entries.length === 0) return <span className="text-xs text-ink-muted">-</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {entries.map((o) => {
        const c = row.byOrigin[o];
        return (
          <Chip key={o} tone={USAGE_ORIGIN[o].tone} title={`${USAGE_ORIGIN[o].label} ${c.hasEstimated ? '(추정 포함)' : '(확정)'}`}>
            {USAGE_ORIGIN[o].short} {formatUsd(c.usd)}
            {c.hasEstimated && <span className="ml-0.5 text-estimated">(추정 포함)</span>}
          </Chip>
        );
      })}
    </span>
  );
}

export function ProjectBudgetTable({ rows, budgetMonth, loading, error, onRetry }: ProjectBudgetTableProps) {
  const columns = useMemo<Column<ProjectBudgetRow>[]>(
    () => [
      {
        key: 'name',
        header: '프로젝트명',
        accessor: (r) => r.label,
        render: (r) =>
          r.projectId ? (
            <Link to={`/internal/projects/${r.projectId}`} className="font-medium text-primary hover:underline">
              {r.label}
            </Link>
          ) : (
            <span className="text-ink-secondary" title="project_id 가 없는 호출. 어떤 프로젝트 예산에도 귀속되지 않음">
              {r.label}
            </span>
          ),
      },
      { key: 'origin', header: '출처 구성', accessor: (r) => r.summary.totalIncludingEstimatedUsd, render: (r) => <OriginChips row={r} /> },
      { key: 'confirmed', header: '확정', accessor: (r) => r.summary.confirmedUsd, align: 'right', render: (r) => formatUsd(r.summary.confirmedUsd) },
      { key: 'estimated', header: '추정', accessor: (r) => r.summary.estimatedUsd, align: 'right', render: (r) => <span className="text-estimated">{formatUsd(r.summary.estimatedUsd)}</span> },
      {
        key: 'unknown',
        header: '미확인',
        accessor: (r) => r.summary.unknownCount,
        align: 'right',
        render: (r) => (r.summary.unknownCount > 0 ? <span className="text-warning">{formatInt(r.summary.unknownCount)}건</span> : '0건'),
      },
      {
        key: 'subs',
        header: '구독료',
        accessor: (r) => (r.projectId ? r.subscriptionUsd : null),
        align: 'right',
        render: (r) => (r.projectId ? formatUsd(r.subscriptionUsd, { precision: 2 }) : <span className="text-ink-muted">-</span>),
      },
      {
        key: 'budget',
        header: `월 예산 (${budgetMonth})`,
        accessor: (r) => r.budget?.amount_usd ?? null,
        align: 'right',
        render: (r) => (r.projectId ? r.budget ? formatUsd(r.budget.amount_usd) : <span className="text-ink-muted">미설정</span> : <span className="text-ink-muted">-</span>),
      },
      {
        key: 'spent',
        header: '사용액',
        accessor: (r) => r.summary.totalIncludingEstimatedUsd,
        align: 'right',
        render: (r) => <EstimatedTotalLabel confirmed={r.summary.confirmedUsd} estimated={r.summary.estimatedUsd} unknownCount={0} size="sm" />,
      },
      { key: 'pct', header: '사용률', accessor: (r) => r.status.pct, width: 180, render: (r) => (r.projectId ? <BudgetUsageCell status={r.status} hideState /> : <span className="text-xs text-ink-muted">해당 없음</span>) },
      { key: 'state', header: '상태', accessor: (r) => r.status.state, render: (r) => (r.projectId ? <BudgetStateBadge state={r.status.state} /> : <span className="text-xs text-ink-muted">-</span>) },
    ],
    [budgetMonth],
  );
  return (
    <SectionCard
      title="프로젝트별 예산 현황"
      description={`확정·추정·사용액은 조회 기간 전체 합계. 월 예산·사용률·상태는 ${budgetMonth}(KST) 호출만 기준으로 계산하며 구독료·미확인 건은 포함되지 않음.`}
    >
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.key} loading={loading} error={error} onRetry={onRetry} emptyTitle="조회 기간에 내부 호출이 없습니다" emptyDescription="기간 또는 출처 필터를 변경한 뒤 다시 조회하세요." caption="프로젝트별 예산 현황" />
    </SectionCard>
  );
}
