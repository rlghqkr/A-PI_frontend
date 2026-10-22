import { useMemo } from 'react';
import { Badge, Checkbox, Chip } from '../../components/ui';
import type { ModelRegistry } from '../../domain/types';
import { MAX_MODELS } from './simulatorConfig';

export interface ModelPickerProps {
  models: ModelRegistry[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** 이미지 입력이 있을 때 미지원 모델 강조 */
  requireImage?: boolean;
  /** JSON 모드일 때 미지원 모델 안내 */
  jsonMode?: boolean;
}

function capabilityChips(m: ModelRegistry) {
  const c = m.capabilities;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {c.text && <Chip>텍스트</Chip>}
      {c.image && <Chip tone="info">이미지</Chip>}
      {c.json && <Chip tone="estimated">JSON</Chip>}
      {c.tools && <Chip tone="primary">도구</Chip>}
      {!m.supports_provider_pinning && <Chip tone="warning" title="Provider 고정 미지원 — 결과 카드에 조건 차이로 기록됨">고정 미지원</Chip>}
      {!m.pricing && <Chip tone="warning" title="단가 미확인 — 추정 비용 계산 불가">가격 미확인</Chip>}
    </span>
  );
}

/** ACTIVE 모델 체크리스트 (2~4개). TESTING/INACTIVE 는 제외하고 개수만 캡션으로 안내. 정렬·추천 없음. */
export function ModelPicker({ models, selected, onChange, disabled, requireImage, jsonMode }: ModelPickerProps) {
  const { active, testing, inactive } = useMemo(() => {
    const active = models.filter((m) => m.status === 'ACTIVE');
    return {
      active,
      testing: models.filter((m) => m.status === 'TESTING').length,
      inactive: models.filter((m) => m.status === 'INACTIVE').length,
    };
  }, [models]);
  const full = selected.length >= MAX_MODELS;
  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      if (selected.includes(id) || full) return;
      onChange([...selected, id]);
    } else onChange(selected.filter((x) => x !== id));
  };

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="flex w-full items-center justify-between text-[13px] font-medium text-ink-secondary">
        <span>모델 선택 (ACTIVE)</span>
        <Badge tone={selected.length === 0 ? 'neutral' : full ? 'warning' : 'primary'} size="sm">
          {selected.length}/{MAX_MODELS}
        </Badge>
      </legend>
      {active.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-ink-muted">ACTIVE 모델이 없습니다. AI 모델 관리에서 모델을 검증 후 ACTIVE 로 전환하세요.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {active.map((m) => {
            const checked = selected.includes(m.model_id);
            const imageBlock = Boolean(requireImage) && !m.capabilities.image;
            const jsonWarn = Boolean(jsonMode) && !m.capabilities.json;
            return (
              <li key={m.model_id} className={checked ? 'bg-primary-soft/30 px-3 py-2' : 'px-3 py-2'}>
                <Checkbox
                  checked={checked}
                  onChange={(v) => toggle(m.model_id, v)}
                  disabled={disabled || (!checked && full)}
                  disabledReason={!checked && full ? `최대 ${MAX_MODELS}개까지 선택할 수 있습니다` : undefined}
                  label={
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{m.display_name}</span>
                      <span className="text-xs text-ink-muted">{m.provider}</span>
                      {imageBlock && checked && (
                        <Badge tone="danger" size="sm">
                          이미지 미지원
                        </Badge>
                      )}
                      {jsonWarn && checked && (
                        <Badge tone="warning" size="sm">
                          JSON 모드 미지원
                        </Badge>
                      )}
                    </span>
                  }
                  description={
                    <span className="flex flex-col gap-1">
                      <span className="font-mono text-[11px]">{m.model_id}</span>
                      {capabilityChips(m)}
                    </span>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
      {(testing > 0 || inactive > 0) && (
        <p className="text-xs text-ink-muted">
          제외된 모델 {testing + inactive}개 (TESTING {testing} / INACTIVE {inactive}) — ACTIVE 전환 후 선택할 수 있습니다.
        </p>
      )}
    </fieldset>
  );
}
