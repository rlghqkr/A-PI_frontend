import { useMemo, useState } from 'react';
import { Button, Chip, DataTable, SectionCard, type Column } from '../../components/ui';
import { summarize } from '../../domain/aggregate';
import { formatInt, formatKst, formatTokens, formatUsd } from '../../domain/format';
import type { AIRequest } from '../../domain/types';
import { useNames } from '../../hooks/useReferenceData';
import { CostCell, ExecStatusBadge, ModelCell, RequestIdCell, TokensCell } from '../../features/shared/cells';
import { OriginBadge } from '../../features/shared/origin';
import type { DetailFocus } from './useInternalData';

export interface RequestHistoryTableProps {
  requests: AIRequest[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  focus: DetailFocus;
  onFocusChange: (f: DetailFocus) => void;
  /** 비용 미확인만 보기 (KPI 클릭으로도 적용됨) */
  unknownOnly: boolean;
  onUnknownOnlyChange: (v: boolean) => void;
  /** 프로젝트 상세에서는 프로젝트 컬럼 생략 */
  hideProject?: boolean;
}

const RECENT = 20;
const FOCUS_LABEL: Record<DetailFocus, string> = { all: '전체', 'user-unclassified': '구성원 미식별', 'project-unclassified': '프로젝트 미식별' };

/** 상세 API 사용 이력. 실패·Timeout 행도 모두 표시. 최근 20건 ↔ 전체보기(페이지네이션) */
export function RequestHistoryTable({ requests, loading, error, onRetry, focus, onFocusChange, unknownOnly, onUnknownOnlyChange, hideProject }: RequestHistoryTableProps) {
  const names = useNames();
  const [showAllToggle, setShowAllToggle] = useState(false);
  const setUnknownOnly = onUnknownOnlyChange;
  // 미분류 필터가 적용되면 전체 목록으로 전환
  const showAll = showAllToggle || focus !== 'all';

  const filtered = useMemo(() => {
    let rows = requests;
    if (focus === 'user-unclassified') rows = rows.filter((r) => r.user_id === null);
    else if (focus === 'project-unclassified') rows = rows.filter((r) => r.project_id === null);
    if (unknownOnly) rows = rows.filter((r) => r.cost_status === 'UNKNOWN');
    return [...rows].sort((a, b) => (a.requested_at < b.requested_at ? 1 : -1));
  }, [requests, focus, unknownOnly]);
  const visible = showAll ? filtered : filtered.slice(0, RECENT);
  const totals = useMemo(() => summarize(filtered), [filtered]);

  const columns = useMemo<Column<AIRequest>[]>(
    () => [
      { key: 'time', header: '시각 (KST)', accessor: (r) => r.requested_at, render: (r) => <span className="tnum text-xs">{formatKst(r.requested_at)}</span> },
      { key: 'origin', header: '출처', accessor: (r) => r.usage_origin, render: (r) => <OriginBadge origin={r.usage_origin} short /> },
      ...(hideProject
        ? []
        : [
            {
              key: 'project',
              header: '프로젝트',
              accessor: (r: AIRequest) => r.project_id,
              render: (r: AIRequest) => (r.project_id ? names.project(r.project_id) : <span className="text-warning">미분류</span>),
            } satisfies Column<AIRequest>,
          ]),
      { key: 'user', header: '구성원', accessor: (r) => r.user_id, render: (r) => (r.user_id ? names.user(r.user_id) : <span className="text-warning">미분류</span>) },
      { key: 'model', header: '모델', accessor: (r) => names.model(r.requested_model), render: (r) => <ModelCell requested={r.requested_model} actual={r.actual_model} status={r.status} /> },
      { key: 'tokens', header: 'Token (In / Out)', accessor: (r) => (r.input_tokens ?? 0) + (r.output_tokens ?? 0), align: 'right', render: (r) => <TokensCell input={r.input_tokens} output={r.output_tokens} /> },
      { key: 'cost', header: '비용', accessor: (r) => (r.cost_status === 'UNKNOWN' ? null : r.cost_usd), align: 'right', render: (r) => <CostCell cost_usd={r.cost_usd} cost_status={r.cost_status} /> },
      { key: 'status', header: '실행 상태', accessor: (r) => r.status, render: (r) => <ExecStatusBadge status={r.status} /> },
      { key: 'id', header: 'Request ID', accessor: (r) => r.request_id, render: (r) => <RequestIdCell id={r.request_id} short={false} /> },
    ],
    [names, hideProject],
  );
  const colSpanBeforeTokens = hideProject ? 4 : 5;

  return (
    <SectionCard
      id="internal-detail-table"
      title="상세 API 사용 이력"
      description={`${showAll ? `전체 ${formatInt(filtered.length)}건` : `최근 ${Math.min(RECENT, filtered.length)}건 / 전체 ${formatInt(filtered.length)}건`} · 실패·Timeout 호출 포함 · 비활성 모델의 과거 이력 유지`}
      actions={
        <>
          {focus !== 'all' && (
            <Chip tone="warning" title="미분류 필터 적용 중">
              {FOCUS_LABEL[focus]}만 표시
            </Chip>
          )}
          <Button size="sm" variant={unknownOnly ? 'primary' : 'secondary'} onClick={() => setUnknownOnly(!unknownOnly)} aria-pressed={unknownOnly}>
            비용 미확인만
          </Button>
          {focus !== 'all' && (
            <Button size="sm" variant="ghost" onClick={() => onFocusChange('all')}>
              필터 해제
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setShowAllToggle(!showAll)} aria-pressed={showAll} disabled={focus !== 'all'} disabledReason="미분류 필터 적용 중에는 전체 목록을 표시합니다">
            {showAll ? '최근 20건만' : '전체보기'}
          </Button>
        </>
      }
    >
      <DataTable
        key={showAll ? 'all' : 'recent'}
        columns={columns}
        rows={visible}
        rowKey={(r) => r.request_id}
        pagination={showAll}
        pageSize={showAll ? 50 : undefined}
        pageSizeOptions={showAll ? [20, 50, 100] : undefined}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyTitle={focus === 'all' && !unknownOnly ? '조회 결과가 없습니다' : '조건에 맞는 호출이 없습니다'}
        emptyDescription={focus === 'all' && !unknownOnly ? '기간·출처·프로젝트 필터를 변경한 뒤 다시 조회하세요.' : '필터를 해제하면 전체 이력을 볼 수 있습니다.'}
        emptyAction={
          focus !== 'all' || unknownOnly ? (
            <Button size="sm" variant="secondary" onClick={() => { onFocusChange('all'); setUnknownOnly(false); }}>
              필터 해제
            </Button>
          ) : undefined
        }
        caption="상세 API 사용 이력"
        footer={
          <tr>
            <td className="px-3 py-2.5" colSpan={colSpanBeforeTokens}>
              합계 (필터된 {formatInt(totals.calls)}건{!showAll && filtered.length > RECENT ? ', 표시 외 행 포함' : ''})
            </td>
            <td className="px-3 py-2.5 text-right tnum">
              {formatTokens(totals.inputTokens)} / {formatTokens(totals.outputTokens)}
            </td>
            <td className="px-3 py-2.5 text-right tnum">
              확정 {formatUsd(totals.confirmedUsd)} · 추정 {formatUsd(totals.estimatedUsd)}
              {totals.estimatedUsd > 0 && ' (추정 포함 ' + formatUsd(totals.totalIncludingEstimatedUsd) + ')'}
              {totals.unknownCount > 0 && <span className="ml-1 text-warning">· 미확인 {formatInt(totals.unknownCount)}건</span>}
            </td>
            <td className="px-3 py-2.5" colSpan={2}>
              성공 {formatInt(totals.success)} · 실패 {formatInt(totals.failed)} · Timeout {formatInt(totals.timeout)}
            </td>
          </tr>
        }
      />
    </SectionCard>
  );
}
