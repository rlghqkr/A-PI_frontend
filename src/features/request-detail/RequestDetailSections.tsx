/**
 * F-05 공통 호출 상세 Drawer 의 섹션 컴포넌트.
 * 식별 / 출처 / 모델 / 시각 / 결과 / 비용 / 검증.
 */
import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, CopyableId, DescriptionList, type DescriptionListItem } from '../../components/ui';
import { formatKst, formatMs, formatTokens, formatUsd } from '../../domain/format';
import { CALL_PURPOSE, COST_SOURCE, ERROR_TYPE, JSON_CHECK, SCHEMA_CHECK } from '../../domain/status';
import type { AIRequest, SimulationResult } from '../../domain/types';
import { useNames } from '../../hooks/useReferenceData';
import { CostStatusBadge, ExecStatusBadge } from '../shared/cells';
import { OriginBadge } from '../shared/origin';

export function Section({ title, children, description }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <header className="border-b border-border bg-subtle px-4 py-2">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-[11px] text-ink-muted">{description}</p>}
      </header>
      <div className="px-4 py-1">{children}</div>
    </section>
  );
}

const OWNER_TYPE_LABEL: Record<AIRequest['owner_type'], string> = { CUSTOMER: '고객', INTERNAL: '내부', POC: 'PoC' };

const muted = (text: string) => <span className="text-ink-muted">{text}</span>;

export function IdentitySection({ request, onNavigate }: { request: AIRequest; onNavigate: (id: string) => void }) {
  const navigate = useNavigate();
  const items: DescriptionListItem[] = [
    { label: 'Request ID', value: <CopyableId value={request.request_id} />, mono: true },
    {
      label: 'Simulation ID',
      value: request.simulation_id ? (
        <CopyableId value={request.simulation_id} link={`/simulations/${encodeURIComponent(request.simulation_id)}`} />
      ) : (
        muted('-')
      ),
      mono: true,
    },
    { label: 'Task ID', value: request.task_id ? <CopyableId value={request.task_id} /> : muted('작업 미식별'), mono: true },
    { label: '시도 번호 (attempt_no)', value: `${request.attempt_no}회차` },
    {
      label: '재시도 원 요청 (parent_request_id)',
      value: request.parent_request_id ? (
        <button
          type="button"
          onClick={() => onNavigate(request.parent_request_id as string)}
          className="font-mono text-xs text-primary hover:underline"
          title="원 요청 상세로 이동"
        >
          {request.parent_request_id}
        </button>
      ) : (
        muted('없음 (원 요청)')
      ),
    },
  ];
  return (
    <Section title="식별">
      <DescriptionList items={items} columns={2} />
      {request.simulation_id && (
        <div className="pb-3 pt-1">
          <Button variant="secondary" size="sm" rightIcon={<ExternalLink />} onClick={() => navigate(`/simulations/${encodeURIComponent(request.simulation_id!)}`)}>
            시뮬레이션 상세 보기
          </Button>
        </div>
      )}
    </Section>
  );
}

export function OriginSection({ request }: { request: AIRequest }) {
  const names = useNames();
  const items: DescriptionListItem[] = [
    { label: '호출 출처 (usage_origin)', value: <OriginBadge origin={request.usage_origin} size="md" /> },
    { label: '소유 유형 (owner_type)', value: OWNER_TYPE_LABEL[request.owner_type] },
    { label: 'API Key (표시명)', value: names.key(request.key_id), mono: false },
    { label: '고객', value: names.customer(request.customer_id) },
    { label: '프로젝트', value: names.project(request.project_id) },
    { label: '구성원', value: names.user(request.user_id) },
    { label: '서비스', value: names.service(request.service_id) },
    { label: '호출 목적 (call_purpose)', value: CALL_PURPOSE[request.call_purpose] },
  ];
  return (
    <Section title="출처" description="API Key 원문은 표시하지 않습니다. 귀속 정보가 없으면 미분류로 표시합니다.">
      <DescriptionList items={items} columns={2} />
    </Section>
  );
}

function modelLine(name: string, id: string) {
  return (
    <span className="flex flex-col">
      <span>{name}</span>
      {name !== id && <span className="font-mono text-[11px] text-ink-muted">{id}</span>}
    </span>
  );
}

export function ModelSection({ request }: { request: AIRequest }) {
  const names = useNames();
  const rp = request.routing_policy;
  const ec = request.execution_config;
  const unknown = <span className="text-warning">미확인</span>;
  const items: DescriptionListItem[] = [
    { label: '요청 모델', value: modelLine(names.model(request.requested_model), request.requested_model) },
    { label: '실제 모델', value: request.actual_model ? modelLine(names.model(request.actual_model), request.actual_model) : unknown },
    { label: '요청 Provider', value: request.requested_provider ?? muted('지정 안 함') },
    { label: '실제 Provider', value: request.actual_provider ?? unknown },
    {
      label: 'Provider 고정',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone={rp.provider_pinned ? 'info' : 'neutral'} size="sm">
            {rp.provider_pinned ? '고정' : '고정 안 함'}
          </Badge>
          {rp.requested_provider && <span className="text-xs text-ink-muted">({rp.requested_provider})</span>}
        </span>
      ),
    },
    {
      label: 'Fallback',
      value: (
        <Badge tone={rp.fallback_enabled ? 'warning' : 'neutral'} size="sm">
          {rp.fallback_enabled ? '허용' : '비활성'}
        </Badge>
      ),
    },
    {
      label: '실행 파라미터',
      value: (
        <span className="tnum text-xs">
          Temperature {ec.temperature} · Max Tokens {formatTokens(ec.max_tokens)} · Timeout {ec.timeout_sec}s
        </span>
      ),
    },
    { label: '입력 Hash', value: request.input_hash ?? muted('-'), mono: true },
  ];
  return (
    <Section title="모델">
      <DescriptionList items={items} columns={2} />
      {request.actual_model !== null && request.actual_model !== request.requested_model && (
        <p className="pb-2 text-[11px] text-warning">요청 모델과 실제 실행 모델이 다릅니다 (Fallback 또는 라우팅).</p>
      )}
    </Section>
  );
}

export function TimingSection({ request }: { request: AIRequest }) {
  const items: DescriptionListItem[] = [
    { label: '요청 시각 (KST)', value: formatKst(request.requested_at) },
    { label: '완료 시각 (KST)', value: request.completed_at ? formatKst(request.completed_at) : muted('미완료') },
    { label: '응답 시간 (latency)', value: formatMs(request.latency_ms) },
  ];
  return (
    <Section title="시각">
      <DescriptionList items={items} columns={2} />
    </Section>
  );
}

export function ResultSection({ request }: { request: AIRequest }) {
  const items: DescriptionListItem[] = [
    { label: '실행 상태', value: <ExecStatusBadge status={request.status} size="md" /> },
    {
      label: '오류 유형',
      value: request.error_type ? <span className="text-danger">{ERROR_TYPE[request.error_type]}</span> : muted('없음'),
    },
    { label: 'Input Token', value: <span className="tnum">{formatTokens(request.input_tokens)}</span> },
    { label: 'Output Token', value: <span className="tnum">{formatTokens(request.output_tokens)}</span> },
  ];
  if (request.reasoning_tokens !== undefined && request.reasoning_tokens !== null) {
    items.push({ label: 'Reasoning Token [검증 필요]', value: <span className="tnum">{formatTokens(request.reasoning_tokens)}</span> });
  }
  if (request.cached_tokens !== undefined && request.cached_tokens !== null) {
    items.push({ label: 'Cached Token [검증 필요]', value: <span className="tnum">{formatTokens(request.cached_tokens)}</span> });
  }
  return (
    <Section title="결과">
      <DescriptionList items={items} columns={2} />
      {request.error_message && (
        <pre className="mb-3 mt-1 whitespace-pre-wrap break-words rounded-md border border-danger/30 bg-danger-bg px-3 py-2 font-mono text-xs text-danger">
          {request.error_message}
        </pre>
      )}
    </Section>
  );
}

export function CostSection({ request }: { request: AIRequest }) {
  const unknown = request.cost_status === 'UNKNOWN' || request.cost_usd === null;
  const items: DescriptionListItem[] = [
    {
      label: '비용 (USD)',
      value: (
        <span className="inline-flex items-center gap-2">
          <span className={unknown ? 'font-medium text-warning' : 'tnum text-base font-semibold text-ink'}>
            {unknown ? '미확인' : formatUsd(request.cost_usd, { precision: 4 })}
          </span>
          <CostStatusBadge status={request.cost_status} size="md" />
        </span>
      ),
    },
    { label: '비용 출처 (cost_source)', value: COST_SOURCE[request.cost_source] },
    { label: '가격 기준 (price_reference)', value: request.price_reference ?? muted('-'), mono: true },
    { label: '대조 시각 (reconciled_at)', value: request.reconciled_at ? formatKst(request.reconciled_at) : muted('대조 전') },
    { label: 'External Generation ID', value: request.external_generation_id ? <CopyableId value={request.external_generation_id} /> : muted('-'), mono: true },
  ];
  return (
    <Section
      title="비용"
      description={unknown ? '비용이 확인되지 않은 호출입니다. 합계에서 금액은 제외되고 건수만 집계됩니다.' : undefined}
    >
      <DescriptionList items={items} columns={2} />
    </Section>
  );
}

export function ValidationSection({ result }: { result: SimulationResult }) {
  const json = JSON_CHECK[result.json_check];
  const schema = SCHEMA_CHECK[result.schema_check];
  const items: DescriptionListItem[] = [
    {
      label: 'JSON 검증',
      value: (
        <Badge tone={json.tone} size="md">
          {json.label}
        </Badge>
      ),
    },
    {
      label: 'Schema 검증',
      value: (
        <Badge tone={schema.tone} size="md">
          {schema.label}
        </Badge>
      ),
    },
    { label: '필수 필드 누락', value: result.missing_fields.length ? <span className="font-mono text-xs text-danger">{result.missing_fields.join(', ')}</span> : muted('없음') },
    { label: '비교 조건 차이', value: result.condition_notes.length ? result.condition_notes.join(' / ') : muted('없음') },
  ];
  return (
    <Section title="검증 (시뮬레이션 결과)">
      <DescriptionList items={items} columns={2} />
    </Section>
  );
}
