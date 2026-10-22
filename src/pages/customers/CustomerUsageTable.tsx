import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, DataTable, SectionCard, type Column, type SortState } from '../../components/ui';
import type { BudgetStatus, UsageSummary } from '../../domain/aggregate';
import { formatInt, formatPct, formatUsd } from '../../domain/format';
import type { AIRequest, Budget } from '../../domain/types';
import { useNames } from '../../hooks/useReferenceData';
import { BudgetStateBadge, BudgetUsageCell } from '../../features/shared/cells';
import { buildCustomerServiceRows } from './useCustomerUsageData';

export interface CustomerServiceRow extends UsageSummary {
  key: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  budget: BudgetStatus;
}

export interface CustomerUsageTableProps {
  rows: readonly AIRequest[];
  budgets: readonly Budget[] | null;
  /** 예산 산정 월 (YYYY-MM) — 조회 종료일의 월 */
  month: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  cap?: number;
  /** 정렬 유지 (URL) */
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
}

export function CustomerUsageTable({ rows, budgets, month, loading, error, onRetry, cap = 20, sort, onSortChange }: CustomerUsageTableProps) {
  const names = useNames();
  const { search } = useLocation();
  const [showAll, setShowAll] = useState(false);
  const data = useMemo(() => buildCustomerServiceRows(rows, budgets, month, names), [rows, budgets, month, names]);
  // 상위 N 선별 기준은 기본 정렬 컬럼(확정 비용)과 동일하게 둔다. 전체보기에서는 모든 행을 정렬·페이지 처리한다.
  const sortedCapped = useMemo(() => (showAll ? data : [...data].sort((a, b) => b.confirmedUsd - a.confirmedUsd).slice(0, cap)), [data, showAll, cap]);
  const capped = !showAll && data.length > cap;

  const columns = useMemo<Column<CustomerServiceRow>[]>(
    () => [
      {
        key: 'customerName',
        header: '고객명',
        accessor: (r) => r.customerName,
        render: (r) =>
          r.customerId ? (
            <Link to={{ pathname: `/customers/${r.customerId}`, search }} className="font-medium text-primary hover:underline">
              {r.customerName}
            </Link>
          ) : (
            <span className="text-ink-muted">미분류</span>
          ),
      },
      { key: 'serviceName', header: '서비스', accessor: (r) => r.serviceName },
      { key: 'tasks', header: '작업 건수', accessor: (r) => r.tasks, align: 'right', render: (r) => formatInt(r.tasks) },
      { key: 'calls', header: 'API 호출 수', accessor: (r) => r.calls, align: 'right', render: (r) => formatInt(r.calls) },
      { key: 'successRate', header: '성공률', accessor: (r) => r.successRate, align: 'right', render: (r) => formatPct(r.successRate) },
      { key: 'confirmedUsd', header: '확정', accessor: (r) => r.confirmedUsd, align: 'right', render: (r) => formatUsd(r.confirmedUsd) },
      { key: 'estimatedUsd', header: '추정', accessor: (r) => r.estimatedUsd, align: 'right', render: (r) => <span className="text-estimated">{formatUsd(r.estimatedUsd)}</span> },
      {
        key: 'unknownCount',
        header: '미확인',
        accessor: (r) => r.unknownCount,
        align: 'right',
        render: (r) => (r.unknownCount > 0 ? <span className="text-warning">{formatInt(r.unknownCount)}건</span> : '0건'),
      },
      {
        key: 'budgetAmount',
        header: `월 예산 (${month})`,
        accessor: (r) => r.budget.amountUsd,
        align: 'right',
        render: (r) => (r.budget.amountUsd === null ? <span className="text-ink-muted">미설정</span> : formatUsd(r.budget.amountUsd)),
      },
      { key: 'budgetPct', header: '사용률', accessor: (r) => r.budget.pct, render: (r) => <BudgetUsageCell status={r.budget} hideState /> },
      { key: 'budgetState', header: '상태', accessor: (r) => r.budget.state, render: (r) => <BudgetStateBadge state={r.budget.state} /> },
    ],
    [month, search],
  );

  return (
    <SectionCard
      title="고객별 사용 현황"
      description={`고객×서비스 단위${capped ? ` · 확정 비용 상위 ${cap}개 표시 (전체 ${formatInt(data.length)}개, 정렬은 표시된 행 안에서만 적용)` : ''}. 월 예산·사용률은 고객 단위이며, 현재 조회 조건으로 필터된 호출 중 ${month}(KST) 호출만 집계합니다. 미확인 비용은 사용액에 포함되지 않습니다.`}
      actions={
        data.length > cap && (
          <Button variant="secondary" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? `상위 ${cap}개만 보기` : `전체보기 (${formatInt(data.length)})`}
          </Button>
        )
      }
    >
      <DataTable
        columns={columns}
        rows={sortedCapped}
        rowKey={(r) => r.key}
        loading={loading}
        error={error}
        onRetry={onRetry}
        sort={sort}
        onSortChange={onSortChange}
        defaultSort={{ key: 'confirmedUsd', dir: 'desc' }}
        pagination={showAll}
        pageSize={showAll ? 50 : undefined}
        pageSizeOptions={showAll ? [20, 50, 100] : undefined}
        emptyTitle="조회 결과 없음"
        emptyDescription="기간을 넓히거나 고객·서비스 조건을 변경한 뒤 조회하세요."
        caption="고객별 사용 현황"
      />
    </SectionCard>
  );
}
