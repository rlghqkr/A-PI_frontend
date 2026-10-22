import { LoaderCircle, Maximize2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Chip, InlineAlert, Skeleton } from '../../components/ui';
import type { SimulationDetail } from '../../api';
import { formatMs, formatTokens } from '../../domain/format';
import { ERROR_TYPE, JSON_CHECK, SCHEMA_CHECK } from '../../domain/status';
import type { AIRequest, ModelRegistry, SimulationResult } from '../../domain/types';
import { useReferenceData } from '../../hooks/useReferenceData';
import { cn } from '../../lib/cn';
import { CostCell, ExecStatusBadge, RequestIdCell } from '../shared/cells';
import { ModelStatusDiff } from './cells';
import { FullResponseModal } from './FullResponseModal';
import { joinResults, providerLabel } from './resultRows';

export interface ModelResponseCardProps {
  result: SimulationResult;
  request: AIRequest;
  /** 현재 등록 정보. 미등록(삭제)이면 undefined */
  model: ModelRegistry | undefined;
  className?: string;
}

/** 모델별 응답 카드 (동일 높이 그리드용 h-full). 순위·점수 표시 없음. */
export function ModelResponseCard({ result, request, model, className }: ModelResponseCardProps) {
  const [open, setOpen] = useState(false);
  const displayName = model?.display_name ?? result.model_id;
  const running = request.status === 'RUNNING' || request.status === 'PENDING';
  const errored = request.status === 'FAILED' || request.status === 'TIMEOUT' || request.status === 'CANCELLED';
  const json = JSON_CHECK[result.json_check];
  const schema = SCHEMA_CHECK[result.schema_check];

  return (
    <article className={cn('flex h-full min-w-0 flex-col rounded-lg border border-border bg-surface shadow-sm', className)} aria-busy={running || undefined}>
      <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink" title={result.model_id}>
            {displayName}
          </h3>
          <p className="truncate text-[11px] text-ink-secondary" title="Provider 요청 → 실제">
            Provider {providerLabel(request)}
          </p>
        </div>
        <ExecStatusBadge status={request.status} />
      </header>

      <dl className="grid grid-cols-3 gap-x-2 gap-y-1 border-b border-border bg-subtle px-4 py-2 text-xs tnum">
        <div>
          <dt className="text-[11px] text-ink-muted">응답시간</dt>
          <dd className="text-ink">{running ? '…' : formatMs(request.latency_ms)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-muted">Token (In / Out)</dt>
          <dd className="text-ink">
            {running ? '…' : `${formatTokens(request.input_tokens)} / ${formatTokens(request.output_tokens)}`}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-muted">비용</dt>
          <dd className="flex items-center gap-1 text-ink">
            {running ? '…' : <CostCell cost_usd={request.cost_usd} cost_status={request.cost_status} />}
          </dd>
        </div>
      </dl>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
        {running ? (
          <div className="flex flex-1 flex-col gap-2" role="status">
            <span className="inline-flex items-center gap-2 text-xs text-info">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> 응답 대기 중
            </span>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ) : (
          <>
            {errored && (
              <div className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs" role="alert">
                <p className="font-medium text-danger">{request.error_type ? ERROR_TYPE[request.error_type] : '실행 중단'}</p>
                {request.error_message && <p className="mt-0.5 text-ink-secondary">{request.error_message}</p>}
              </div>
            )}
            {result.response_text !== null ? (
              <pre className="line-clamp-8 whitespace-pre-wrap break-words font-sans text-[13px] leading-5 text-ink">{result.response_text}</pre>
            ) : (
              !errored && <p className="text-xs text-ink-muted">응답 본문이 없습니다.</p>
            )}
          </>
        )}

        {!running && (
          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            {result.json_check !== 'NOT_RUN' && (
              <Badge tone={json.tone} size="sm">
                {json.label}
              </Badge>
            )}
            {result.schema_check !== 'NOT_RUN' && result.schema_check !== 'NOT_APPLIED' && (
              <Badge tone={schema.tone} size="sm">
                {schema.label}
              </Badge>
            )}
            {result.missing_fields.length > 0 && (
              <Chip tone="danger" title={result.missing_fields.join(', ')}>
                누락 {result.missing_fields.length}: {result.missing_fields.join(', ')}
              </Chip>
            )}
          </div>
        )}

        {result.condition_notes.length > 0 && (
          <InlineAlert tone="warning" title="비교 조건 차이">
            <ul className="list-disc pl-4">
              {result.condition_notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </InlineAlert>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <RequestIdCell id={request.request_id} />
          <ModelStatusDiff atRun={result.model_status_at_run} current={model?.status ?? null} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Maximize2 />}
          disabled={result.response_text === null}
          disabledReason="응답 본문이 없습니다"
          onClick={() => setOpen(true)}
        >
          전체 응답 보기
        </Button>
      </footer>
      <FullResponseModal open={open} onClose={() => setOpen(false)} title={`${displayName} 전체 응답`} subtitle={`${result.model_id} · ${request.request_id}`} text={result.response_text} />
    </article>
  );
}

export interface ModelResponseGridProps {
  detail: SimulationDetail;
  className?: string;
}

/** 2~4열 반응형 동일 높이 그리드 */
export function ModelResponseGrid({ detail, className }: ModelResponseGridProps) {
  const { modelById } = useReferenceData();
  const rows = useMemo(() => joinResults(detail, modelById), [detail, modelById]);
  const cols = Math.min(4, Math.max(2, rows.length));
  const colClass = cols === 2 ? 'xl:grid-cols-2' : cols === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4';
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', colClass, className)}>
      {rows.map((r) => (
        <ModelResponseCard key={r.request.request_id} result={r.result} request={r.request} model={r.model} />
      ))}
    </div>
  );
}
