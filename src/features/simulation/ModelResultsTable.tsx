import { useMemo } from 'react';
import { Badge, DataTable, type Column } from '../../components/ui';
import type { SimulationDetail } from '../../api';
import { formatMs, formatTokens } from '../../domain/format';
import { ERROR_TYPE, JSON_CHECK, SCHEMA_CHECK } from '../../domain/status';
import { useReferenceData } from '../../hooks/useReferenceData';
import { CostCell, ExecStatusBadge, RequestIdCell } from '../shared/cells';
import { ModelStatusDiff } from './cells';
import { joinResults, providerLabel, type ModelResultRow } from './resultRows';

export interface ModelResultsTableProps {
  detail: SimulationDetail;
  className?: string;
}

/** 모델별 비교 표. 실패·Timeout 행도 숨기지 않는다. 순위·품질 점수 없음. */
export function ModelResultsTable({ detail, className }: ModelResultsTableProps) {
  const { modelById } = useReferenceData();
  const rows = useMemo(() => joinResults(detail, modelById), [detail, modelById]);
  const columns = useMemo<Column<ModelResultRow>[]>(
    () => [
      {
        key: 'model',
        header: '모델',
        accessor: (r) => r.model?.display_name ?? r.result.model_id,
        render: (r) => (
          <div className="flex min-w-0 flex-col">
            <span className="font-medium text-ink">{r.model?.display_name ?? r.result.model_id}</span>
            <span className="font-mono text-[11px] text-ink-muted">{r.result.model_id}</span>
            <span className="text-[11px] text-ink-secondary">Provider {providerLabel(r.request)}</span>
          </div>
        ),
      },
      { key: 'status', header: '상태', accessor: (r) => r.request.status, render: (r) => <ExecStatusBadge status={r.request.status} /> },
      { key: 'latency', header: '응답시간', accessor: (r) => r.request.latency_ms, align: 'right', render: (r) => formatMs(r.request.latency_ms) },
      { key: 'in', header: 'Input Token', accessor: (r) => r.request.input_tokens, align: 'right', render: (r) => formatTokens(r.request.input_tokens) },
      { key: 'out', header: 'Output Token', accessor: (r) => r.request.output_tokens, align: 'right', render: (r) => formatTokens(r.request.output_tokens) },
      { key: 'cost', header: '비용', accessor: (r) => r.request.cost_usd, align: 'right', render: (r) => <CostCell cost_usd={r.request.cost_usd} cost_status={r.request.cost_status} /> },
      {
        key: 'json',
        header: 'JSON 검증',
        accessor: (r) => r.result.json_check,
        render: (r) => (
          <Badge tone={JSON_CHECK[r.result.json_check].tone} size="sm">
            {JSON_CHECK[r.result.json_check].label}
          </Badge>
        ),
      },
      {
        key: 'schema',
        header: 'Schema 검증',
        accessor: (r) => r.result.schema_check,
        render: (r) => (
          <Badge tone={SCHEMA_CHECK[r.result.schema_check].tone} size="sm">
            {SCHEMA_CHECK[r.result.schema_check].label}
          </Badge>
        ),
      },
      {
        key: 'missing',
        header: '필수 필드 누락',
        accessor: (r) => r.result.missing_fields.length,
        render: (r) =>
          r.result.missing_fields.length === 0 ? (
            <span className="text-ink-muted">-</span>
          ) : (
            <span className="inline-flex flex-wrap gap-1">
              {r.result.missing_fields.map((f) => (
                <code key={f} className="rounded-sm bg-danger-bg px-1 font-mono text-[11px] text-danger">
                  {f}
                </code>
              ))}
            </span>
          ),
      },
      {
        key: 'error',
        header: '오류',
        accessor: (r) => r.request.error_type,
        render: (r) =>
          r.request.error_type ? (
            <span className="inline-flex flex-col" title={r.request.error_message ?? undefined}>
              <span className="text-danger">{ERROR_TYPE[r.request.error_type]}</span>
              {r.request.error_message && <span className="max-w-[220px] truncate text-[11px] text-ink-muted">{r.request.error_message}</span>}
            </span>
          ) : (
            <span className="text-ink-muted">-</span>
          ),
      },
      { key: 'request', header: 'Request ID', accessor: (r) => r.request.request_id, render: (r) => <RequestIdCell id={r.request.request_id} /> },
      {
        key: 'modelStatus',
        header: '모델 상태 (당시 / 현재)',
        accessor: (r) => `${r.result.model_status_at_run}/${r.model?.status ?? 'NONE'}`,
        render: (r) => <ModelStatusDiff atRun={r.result.model_status_at_run} current={r.model?.status ?? null} />,
      },
    ],
    [],
  );
  return (
    <DataTable
      className={className}
      columns={columns}
      rows={rows}
      rowKey={(r) => r.request.request_id}
      caption="모델별 비교 결과"
      emptyTitle="모델 결과가 없습니다"
      emptyDescription="실행이 시작되면 모델별 행이 표시됩니다."
    />
  );
}
