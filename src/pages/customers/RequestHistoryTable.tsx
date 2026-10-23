import { useMemo, useState } from 'react';
import { Badge, Button, DataTable, SectionCard, type Column, type SortState } from '../../components/ui';
import { summarize } from '../../domain/aggregate';
import { formatInt, formatKst, formatTokens, formatUsd, shortId } from '../../domain/format';
import { ERROR_TYPE } from '../../domain/status';
import type { AIRequest } from '../../domain/types';
import { useNames } from '../../hooks/useReferenceData';
import { CostCell, CostStatusBadge, ExecStatusBadge, ModelCell, RequestIdCell } from '../../features/shared/cells';
import { REQUEST_HISTORY_ID } from './filters';

export interface RequestHistoryTableProps {
  /** 조회 조건으로 필터된 전체 배열 (KPI 와 동일) */
  rows: readonly AIRequest[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  unknownOnly: boolean;
  onClearUnknownFilter: () => void;
  cap?: number;
  /** 고객 상세에서는 고객 컬럼 숨김 */
  hideCustomer?: boolean;
  /** 정렬 유지 (URL) */
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
}

export function RequestHistoryTable({ rows, loading, error, onRetry, unknownOnly, onClearUnknownFilter, cap = 20, hideCustomer, sort, onSortChange }: RequestHistoryTableProps) {
  const names = useNames();
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => (unknownOnly ? rows.filter((r) => r.cost_status === 'UNKNOWN') : rows), [rows, unknownOnly]);
  const totals = useMemo(() => summarize(filtered), [filtered]);
  const visibleRows = useMemo(() => {
    if (showAll) return [...filtered];
    return [...filtered].sort((a, b) => (a.requested_at < b.requested_at ? 1 : a.requested_at > b.requested_at ? -1 : 0)).slice(0, cap);
  }, [filtered, showAll, cap]);

  const columns = useMemo<Column<AIRequest>[]>(() => {
    const cols: Column<AIRequest>[] = [
      { key: 'requested_at', header: '호출시각 (KST)', accessor: (r) => r.requested_at, render: (r) => <span className="tnum whitespace-nowrap">{formatKst(r.requested_at)}</span> },
    ];
    if (!hideCustomer) cols.push({ key: 'customer', header: '고객', accessor: (r) => names.customer(r.customer_id) });
    cols.push(
      { key: 'service', header: '서비스', accessor: (r) => names.service(r.service_id) },
      {
        key: 'task_id',
        header: '작업 ID',
        accessor: (r) => r.task_id,
        mono: true,
        render: (r) => (r.task_id ? <span title={r.task_id}>{shortId(r.task_id, 14)}</span> : <span className="text-ink-muted">미식별</span>),
      },
      { key: 'model', header: '모델 (요청/실제)', accessor: (r) => names.model(r.requested_model), render: (r) => <ModelCell requested={r.requested_model} actual={r.actual_model} status={r.status} /> },
      { key: 'input_tokens', header: 'Input', accessor: (r) => r.input_tokens, align: 'right', render: (r) => formatTokens(r.input_tokens) },
      { key: 'output_tokens', header: 'Output', accessor: (r) => r.output_tokens, align: 'right', render: (r) => formatTokens(r.output_tokens) },
      { key: 'cost_usd', header: '비용', accessor: (r) => (r.cost_status === 'UNKNOWN' ? null : r.cost_usd), align: 'right', render: (r) => <CostCell cost_usd={r.cost_usd} cost_status={r.cost_status} hideBadge /> },
      { key: 'cost_status', header: '비용 상태', accessor: (r) => r.cost_status, render: (r) => <CostStatusBadge status={r.cost_status} /> },
      { key: 'status', header: '실행 상태', accessor: (r) => r.status, render: (r) => <ExecStatusBadge status={r.status} /> },
      {
        key: 'error_type',
        header: '오류 유형',
        accessor: (r) => r.error_type,
        render: (r) =>
          r.error_type ? (
            <Badge tone="danger" size="sm" title={r.error_message ?? undefined}>
              {ERROR_TYPE[r.error_type]}
            </Badge>
          ) : (
            <span className="text-ink-muted">-</span>
          ),
      },
      { key: 'request_id', header: 'Request ID', accessor: (r) => r.request_id, sortable: false, render: (r) => <RequestIdCell id={r.request_id} /> },
    );
    return cols;
  }, [names, hideCustomer]);

  const leadSpan = hideCustomer ? 4 : 5; // 호출시각..작업 ID
  const footer = (
    <tr>
      <td colSpan={leadSpan} className="px-3 py-2">
        합계 · 호출 {formatInt(totals.calls)}건{!showAll && filtered.length > cap ? ` (표시 ${cap}건, 합계는 전체 기준)` : ''}
      </td>
      <td className="px-3 py-2 text-right tnum">{formatTokens(totals.inputTokens)}</td>
      <td className="px-3 py-2 text-right tnum">{formatTokens(totals.outputTokens)}</td>
      <td className="px-3 py-2 text-right tnum whitespace-nowrap">
        확정 {formatUsd(totals.confirmedUsd)} · <span className="text-estimated">추정 {formatUsd(totals.estimatedUsd)}</span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">{totals.unknownCount > 0 ? <span className="text-warning">미확인 {formatInt(totals.unknownCount)}건</span> : '미확인 0건'}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        성공 {formatInt(totals.success)} · 실패 {formatInt(totals.failed)} · Timeout {formatInt(totals.timeout)}
      </td>
      <td colSpan={2} />
    </tr>
  );

  return (
    <SectionCard
      id={REQUEST_HISTORY_ID}
      title="상세 API 호출 이력"
      description={
        unknownOnly
          ? `비용 미확인 호출만 표시 중 (${formatInt(filtered.length)}건). 실패·Timeout 호출도 포함됩니다.`
          : `실패·Timeout 호출 포함. 기본 최근 ${cap}건 표시, 전체보기 시 페이지당 50건.`
      }
      actions={
        <>
          {unknownOnly && (
            <Button variant="ghost" size="sm" onClick={onClearUnknownFilter}>
              미확인 필터 해제
            </Button>
          )}
          {filtered.length > cap && (
            <Button variant="secondary" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? `최근 ${cap}건만 보기` : `전체보기 (${formatInt(filtered.length)})`}
            </Button>
          )}
        </>
      }
    >
      <DataTable
        columns={columns}
        rows={visibleRows}
        rowKey={(r) => r.request_id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        sort={sort}
        onSortChange={onSortChange}
        defaultSort={{ key: 'requested_at', dir: 'desc' }}
        pagination={showAll}
        pageSize={showAll ? 50 : undefined}
        pageSizeOptions={showAll ? [20, 50, 100] : undefined}
        footer={footer}
        emptyTitle={unknownOnly ? '비용 미확인 호출 없음' : '조회 결과 없음'}
        emptyDescription={unknownOnly ? '미확인 필터를 해제하면 전체 이력을 볼 수 있습니다.' : '기간을 넓히거나 조건을 변경한 뒤 조회하세요.'}
        emptyAction={
          unknownOnly ? (
            <Button variant="secondary" size="sm" onClick={onClearUnknownFilter}>
              미확인 필터 해제
            </Button>
          ) : undefined
        }
        caption="상세 API 호출 이력"
      />
    </SectionCard>
  );
}
