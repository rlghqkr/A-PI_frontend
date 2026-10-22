import { Badge } from '../../components/ui';
import type { SimulationRun } from '../../domain/types';

/** 재실행 Modal 상단: 복원될 설정 요약 (읽기 전용) */
export function RerunSettingsSummary({ run, scenarioName }: { run: SimulationRun; scenarioName: string }) {
  const items: { label: string; value: string }[] = [
    { label: '시나리오', value: scenarioName },
    { label: 'Temperature', value: String(run.execution_config.temperature) },
    { label: 'Max Tokens', value: String(run.execution_config.max_tokens) },
    { label: 'Timeout', value: `${run.execution_config.timeout_sec}초` },
    { label: 'Provider 고정', value: run.routing_policy.provider_pinned ? 'ON' : 'OFF' },
    { label: 'Fallback', value: run.routing_policy.fallback_enabled ? 'ON' : 'OFF' },
    { label: 'JSON 모드', value: run.json_mode ? `ON${run.json_schema ? ' · Schema 적용' : ''}` : 'OFF' },
    { label: '이미지 입력', value: run.input_image_ref ?? '없음' },
  ];
  return (
    <section className="rounded-md border border-border bg-subtle p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">복원되는 설정</h3>
        <Badge tone={run.input_available ? 'success' : 'danger'} size="sm">
          {run.input_available ? '원본 입력 접근 가능' : '원본 입력 없음'}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col">
            <dt className="text-ink-muted">{it.label}</dt>
            <dd className="truncate font-medium text-ink tnum" title={it.value}>
              {it.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 line-clamp-2 text-xs text-ink-secondary" title={run.prompt}>
        <span className="text-ink-muted">Prompt · </span>
        {run.prompt}
      </p>
    </section>
  );
}
