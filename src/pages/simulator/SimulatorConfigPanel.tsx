import { Play, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Select, Textarea, type SelectOption } from '../../components/ui';
import type { ModelRegistry, Scenario } from '../../domain/types';
import { ImageInputField } from './ImageInputField';
import { ModelPicker } from './ModelPicker';
import { ParamsSection } from './ParamsSection';
import { PreflightChecklist } from './PreflightChecklist';
import { CUSTOM_SCENARIO, applyScenario, type PreflightResult, type SimConfig } from './simulatorConfig';

export interface SimulatorConfigPanelProps {
  config: SimConfig;
  onChange: (next: SimConfig) => void;
  scenarios: Scenario[];
  scenarioById: Map<string, Scenario>;
  models: ModelRegistry[];
  preflight: PreflightResult;
  running: boolean;
  starting: boolean;
  onRun: () => void;
  onReset: () => void;
  /** 재실행 원본 ID (있으면 버튼 라벨에 표시) */
  rerunOf: string | null;
}

export function SimulatorConfigPanel({ config, onChange, scenarios, scenarioById, models, preflight, running, starting, onRun, onReset, rerunOf }: SimulatorConfigPanelProps) {
  const disabled = running || starting;
  // 초기 상태에서 필수 오류를 바로 띄우지 않는다 — 사용자가 Prompt 를 편집/이탈한 뒤부터 필드 오류 표시 (초기 상태는 실행 전 검증 목록이 안내)
  const [promptTouched, setPromptTouched] = useState(false);
  const patch = (p: Partial<SimConfig>) => onChange({ ...config, ...p });
  const scenario = scenarioById.get(config.scenarioId);
  const scenarioOptions = useMemo<SelectOption[]>(
    () => [...scenarios.map((s) => ({ value: s.scenario_id, label: s.name })), { value: '__custom', label: 'Custom Prompt' }],
    [scenarios],
  );

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">실행 설정</h2>
          <p className="text-xs text-ink-muted">ACTIVE 모델 2~4개를 같은 조건으로 병렬 실행합니다. 결과는 자동 저장됩니다.</p>
        </div>
        <Button variant="ghost" size="sm" leftIcon={<RotateCcw />} disabled={disabled} onClick={onReset}>
          초기화
        </Button>
      </div>

      <Select
        label="테스트 유형"
        value={config.scenarioId === CUSTOM_SCENARIO ? '__custom' : config.scenarioId}
        options={scenarioOptions}
        disabled={disabled}
        onChange={(v) => onChange(applyScenario(config, v === '__custom' ? undefined : scenarioById.get(v)))}
        hint={scenario ? scenario.description : '시나리오 없이 직접 Prompt 를 작성합니다.'}
      />

      <Textarea
        label="Prompt"
        required
        rows={6}
        showCount
        value={config.prompt}
        disabled={disabled}
        placeholder="모델에 전달할 지시문을 입력하세요"
        onChange={(e) => {
          setPromptTouched(true);
          patch({ prompt: e.target.value });
        }}
        onBlur={() => setPromptTouched(true)}
        hint={scenario ? '시나리오 템플릿이 채워졌습니다. 자유롭게 편집할 수 있습니다.' : undefined}
        error={promptTouched && !config.prompt.trim() ? 'Prompt 는 필수입니다.' : undefined}
      />

      <Textarea label="입력 텍스트" rows={5} showCount value={config.inputText} disabled={disabled} placeholder={scenario?.input_hint ?? '분석·생성 대상 텍스트 (선택)'} onChange={(e) => patch({ inputText: e.target.value })} hint={scenario?.input_hint} />

      <ImageInputField value={config.image} onChange={(image) => patch({ image })} disabled={disabled} unsupportedModels={preflight.imageUnsupported} hint={scenario?.requires_image ? '이 시나리오는 이미지 입력을 전제로 합니다.' : undefined} />

      <ModelPicker models={models} selected={config.modelIds} onChange={(modelIds) => patch({ modelIds })} disabled={disabled} requireImage={Boolean(config.image)} jsonMode={config.jsonMode} />

      <ParamsSection config={config} onPatch={patch} disabled={disabled} />

      <PreflightChecklist result={preflight} />

      <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-surface px-5 py-3">
        <Button block leftIcon={<Play />} loading={starting} disabled={!preflight.canRun || running} disabledReason={running ? '실행 중에는 새 비교를 시작할 수 없습니다' : (preflight.blockingReason ?? undefined)} onClick={onRun}>
          {rerunOf ? `새 Simulation 으로 실행 (원본 ${rerunOf})` : '비교 실행'}
        </Button>
        {!preflight.canRun && preflight.blockingReason && (
          <p className="mt-1.5 text-xs text-danger" role="status">
            {preflight.blockingReason}
          </p>
        )}
      </div>
    </div>
  );
}
