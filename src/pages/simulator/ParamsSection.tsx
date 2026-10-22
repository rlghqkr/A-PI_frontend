import { useId } from 'react';
import { NumberInput, Textarea, Toggle } from '../../components/ui';
import { parseSchema } from '../../domain/validation';
import type { SimConfig } from './simulatorConfig';

export interface ParamsSectionProps {
  config: SimConfig;
  onPatch: (patch: Partial<SimConfig>) => void;
  disabled?: boolean;
}

/** 실행 파라미터 + Provider 정책 + 출력 검증 */
export function ParamsSection({ config, onPatch, disabled }: ParamsSectionProps) {
  const tempId = useId();
  const schemaParsed = config.jsonMode ? parseSchema(config.schema) : { ok: true as const, schema: null };
  const tempInvalid = !(config.temperature >= 0 && config.temperature <= 2);
  return (
    <>
      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-medium text-ink-secondary">실행 파라미터</h3>
        <div className="flex flex-col gap-1">
          <label htmlFor={tempId} className="text-[13px] font-medium text-ink-secondary">
            Temperature
          </label>
          <div className="flex items-center gap-3">
            <input
              id={tempId}
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={Number.isFinite(config.temperature) ? config.temperature : 0}
              disabled={disabled}
              onChange={(e) => onPatch({ temperature: Number(e.target.value) })}
              className="h-2 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed"
            />
            <NumberInput
              aria-label="Temperature 값"
              value={Number.isFinite(config.temperature) ? config.temperature : null}
              min={0}
              max={2}
              step={0.1}
              disabled={disabled}
              onChange={(v) => onPatch({ temperature: v ?? Number.NaN })}
              error={tempInvalid ? '0~2' : undefined}
              containerClassName="w-24"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Max Tokens" value={config.maxTokens} min={1} step={1} disabled={disabled} onChange={(v) => onPatch({ maxTokens: v })} error={config.maxTokens !== null && config.maxTokens < 1 ? '1 이상' : undefined} />
          <NumberInput label="Timeout" suffix="초" value={config.timeoutSec} min={1} step={1} disabled={disabled} onChange={(v) => onPatch({ timeoutSec: v })} error={config.timeoutSec !== null && config.timeoutSec < 1 ? '1 이상' : undefined} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-medium text-ink-secondary">Provider 정책</h3>
        <Toggle label="Provider 고정" description="요청 Provider 로 라우팅 고정. 미지원 모델은 결과에 조건 차이로 기록" checked={config.providerPinned} disabled={disabled} onChange={(v) => onPatch({ providerPinned: v })} />
        <Toggle label="Fallback 허용" description="Benchmark 비교에서는 비활성화 권장 (대체 모델로 자동 전환 시 비교 조건이 달라짐)" checked={config.fallbackEnabled} disabled={disabled} onChange={(v) => onPatch({ fallbackEnabled: v })} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-medium text-ink-secondary">출력 검증</h3>
        <Toggle label="JSON 출력 요구" description="응답을 JSON 으로 파싱 검증. Schema 가 있으면 필수 필드·타입도 검사" checked={config.jsonMode} disabled={disabled} onChange={(v) => onPatch({ jsonMode: v })} />
        {config.jsonMode && (
          <Textarea
            label="JSON Schema"
            mono
            rows={8}
            value={config.schema}
            disabled={disabled}
            placeholder='{"type":"object","required":["title"],"properties":{"title":{"type":"string"}}}'
            onChange={(e) => onPatch({ schema: e.target.value })}
            hint={schemaParsed.ok ? (schemaParsed.schema ? '유효한 Schema. 응답 후 클라이언트에서 검증합니다.' : '비워두면 JSON 파싱만 검증합니다.') : undefined}
            error={schemaParsed.ok ? undefined : schemaParsed.error}
          />
        )}
      </section>
    </>
  );
}
