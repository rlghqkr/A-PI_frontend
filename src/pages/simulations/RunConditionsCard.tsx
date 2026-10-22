import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, CopyableId, SectionCard } from '../../components/ui';
import { formatKst } from '../../domain/format';
import type { SimulationRun } from '../../domain/types';
import { useNames } from '../../hooks/useReferenceData';

function Row({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : undefined}>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

function Pre({ text }: { text: string | null }) {
  if (!text) return <span className="text-ink-muted">-</span>;
  return <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-subtle p-3 font-mono text-xs leading-5 text-ink">{text}</pre>;
}

/** 실행 조건 카드 (읽기 전용). 과거 실행 기록은 변경하지 않는다. */
export function RunConditionsCard({ run }: { run: SimulationRun }) {
  const names = useNames();
  const cfg = run.execution_config;
  const rp = run.routing_policy;
  return (
    <SectionCard title="실행 조건" description="실행 당시 저장된 설정입니다. 읽기 전용이며 재실행 시 새 Simulation 으로 복원됩니다.">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Row label="시나리오">{names.scenario(run.scenario_id)}</Row>
        <Row label="실행자">
          {names.user(run.executed_by)} <span className="text-xs text-ink-muted">· {formatKst(run.started_at)}</span>
        </Row>
        <Row label="Prompt" full>
          <Pre text={run.prompt} />
        </Row>
        <Row label="입력 텍스트" full>
          <Pre text={run.input_text} />
        </Row>
        <Row label="이미지 참조">{run.input_image_ref ? <span className="font-mono text-xs">{run.input_image_ref}</span> : <span className="text-ink-muted">없음</span>}</Row>
        <Row label="입력 Hash">
          <CopyableId value={run.input_hash} />
        </Row>
        <Row label="파라미터">
          <span className="tnum">
            Temperature {cfg.temperature} · Max Tokens {cfg.max_tokens} · Timeout {cfg.timeout_sec}초
          </span>
        </Row>
        <Row label="Provider 정책">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Badge tone={rp.provider_pinned ? 'primary' : 'neutral'} size="sm">
              Provider 고정 {rp.provider_pinned ? 'ON' : 'OFF'}
            </Badge>
            <Badge tone={rp.fallback_enabled ? 'warning' : 'neutral'} size="sm">
              Fallback {rp.fallback_enabled ? 'ON' : 'OFF'}
            </Badge>
            {rp.requested_provider && <span className="text-xs text-ink-muted">요청 Provider {rp.requested_provider}</span>}
          </span>
        </Row>
        <Row label="JSON 모드">
          <Badge tone={run.json_mode ? 'primary' : 'neutral'} size="sm">
            {run.json_mode ? 'JSON 출력 요구' : 'OFF'}
          </Badge>
        </Row>
        <Row label="원본 입력 접근">
          <Badge tone={run.input_available ? 'success' : 'danger'} size="sm">
            {run.input_available ? '가능' : '불가 (재실행 불가)'}
          </Badge>
        </Row>
        {run.json_schema && (
          <Row label="JSON Schema" full>
            <Pre text={run.json_schema} />
          </Row>
        )}
        <Row label="재실행 원본">
          {run.rerun_of ? (
            <Link to={`/simulations/${encodeURIComponent(run.rerun_of)}`} className="font-mono text-xs text-primary hover:underline">
              {run.rerun_of}
            </Link>
          ) : (
            <span className="text-ink-muted">없음 (원본 실행)</span>
          )}
        </Row>
        <Row label="프로젝트">{names.project(run.project_id)}</Row>
      </dl>
    </SectionCard>
  );
}
