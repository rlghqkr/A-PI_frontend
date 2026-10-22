/**
 * P-04 설정 상태 모델 + 실행 전 검증(Preflight). 순수 함수만 둔다.
 */
import type { SimulationInput } from '../../api';
import { parseSchema } from '../../domain/validation';
import type { ModelRegistry, Scenario, SimulationRun } from '../../domain/types';

export const MIN_MODELS = 2;
export const MAX_MODELS = 4;
export const CUSTOM_SCENARIO = '';

export interface ImageInput {
  /** 파일명 (input_image_ref 로 전송) */
  name: string;
  /** URL.createObjectURL 미리보기. 복원된 설정은 원본 접근 불가 → null */
  previewUrl: string | null;
}

export interface SimConfig {
  scenarioId: string; // '' = Custom Prompt
  prompt: string;
  inputText: string;
  image: ImageInput | null;
  modelIds: string[];
  temperature: number;
  maxTokens: number | null;
  timeoutSec: number | null;
  providerPinned: boolean;
  fallbackEnabled: boolean;
  jsonMode: boolean;
  schema: string;
}

export const DEFAULT_CONFIG: SimConfig = {
  scenarioId: CUSTOM_SCENARIO,
  prompt: '',
  inputText: '',
  image: null,
  modelIds: [],
  temperature: 0.7,
  maxTokens: 1024,
  timeoutSec: 30,
  providerPinned: true,
  fallbackEnabled: false,
  jsonMode: false,
  schema: '',
};

/** 시나리오 선택 시 템플릿·JSON 기본값 채움 (Prompt 는 이후 편집 가능) */
export function applyScenario(cfg: SimConfig, scenario: Scenario | undefined): SimConfig {
  if (!scenario) return { ...cfg, scenarioId: CUSTOM_SCENARIO };
  return {
    ...cfg,
    scenarioId: scenario.scenario_id,
    prompt: scenario.prompt_template,
    jsonMode: scenario.default_json,
    schema: scenario.default_schema ?? '',
  };
}

export interface RestoreOutcome {
  config: SimConfig;
  /** ACTIVE 가 아니어서 선택에서 제외된 모델 ID */
  droppedModelIds: string[];
}

/**
 * 재실행: 원본 실행 조건 복원. 현재 ACTIVE 가 아닌 모델은 선택에서 제외.
 * `modelIdsOverride` 가 있으면(P-05 재실행 모달의 `?models=` 선택) 원본 model_ids 대신 그 목록을 복원한다.
 */
export function restoreFromRun(run: SimulationRun, modelById: Map<string, ModelRegistry>, modelIdsOverride?: readonly string[] | null): RestoreOutcome {
  const dropped: string[] = [];
  const kept: string[] = [];
  const sourceIds = modelIdsOverride && modelIdsOverride.length > 0 ? modelIdsOverride : run.model_ids;
  for (const id of sourceIds) {
    const m = modelById.get(id);
    if (m && m.status === 'ACTIVE') kept.push(id);
    else dropped.push(id);
  }
  return {
    config: {
      scenarioId: run.scenario_id ?? CUSTOM_SCENARIO,
      prompt: run.prompt,
      inputText: run.input_text,
      image: run.input_image_ref ? { name: run.input_image_ref, previewUrl: null } : null,
      modelIds: kept,
      temperature: run.execution_config.temperature,
      maxTokens: run.execution_config.max_tokens,
      timeoutSec: run.execution_config.timeout_sec,
      providerPinned: run.routing_policy.provider_pinned,
      fallbackEnabled: run.routing_policy.fallback_enabled,
      jsonMode: run.json_mode,
      schema: run.json_schema ?? '',
    },
    droppedModelIds: dropped,
  };
}

export function toSimulationInput(cfg: SimConfig, executedBy: string, rerunOf: string | null): SimulationInput {
  return {
    scenario_id: cfg.scenarioId || null,
    prompt: cfg.prompt,
    input_text: cfg.inputText,
    input_image_ref: cfg.image?.name ?? null,
    model_ids: [...cfg.modelIds],
    execution_config: { temperature: cfg.temperature, max_tokens: cfg.maxTokens ?? 0, timeout_sec: cfg.timeoutSec ?? 0 },
    routing_policy: { provider_pinned: cfg.providerPinned, fallback_enabled: cfg.fallbackEnabled, requested_provider: null },
    json_mode: cfg.jsonMode,
    json_schema: cfg.jsonMode && cfg.schema.trim() ? cfg.schema : null,
    executed_by: executedBy,
    rerun_of: rerunOf,
  };
}

// ---------- Preflight ----------

export type CheckState = 'pass' | 'fail' | 'warn';

export interface PreflightCheck {
  id: string;
  label: string;
  state: CheckState;
  /** 실패·경고 사유 */
  detail?: string;
  /** true 면 실행 차단 */
  blocking: boolean;
}

export interface PreflightResult {
  checks: PreflightCheck[];
  canRun: boolean;
  /** 첫 번째 차단 사유 (버튼 disabledReason) */
  blockingReason: string | null;
  /** 이미지 미지원으로 걸린 모델 표시명 */
  imageUnsupported: string[];
}

export interface PreflightContext {
  scenario: Scenario | undefined;
  modelById: Map<string, ModelRegistry>;
  /** 재실행 원본의 input_available (원본 없으면 null) */
  rerunInputAvailable: boolean | null;
}

export function runPreflight(cfg: SimConfig, ctx: PreflightContext): PreflightResult {
  const checks: PreflightCheck[] = [];
  const selected = cfg.modelIds.map((id) => ctx.modelById.get(id)).filter((m): m is ModelRegistry => Boolean(m));

  // 1. 모델 수
  const n = cfg.modelIds.length;
  const inactiveSelected = selected.filter((m) => m.status !== 'ACTIVE');
  if (n < MIN_MODELS || n > MAX_MODELS) {
    checks.push({ id: 'models', label: `모델 ${MIN_MODELS}~${MAX_MODELS}개 선택`, state: 'fail', detail: `현재 ${n}개 선택됨`, blocking: true });
  } else if (inactiveSelected.length) {
    checks.push({ id: 'models', label: `모델 ${MIN_MODELS}~${MAX_MODELS}개 선택`, state: 'fail', detail: `ACTIVE 가 아닌 모델: ${inactiveSelected.map((m) => m.display_name).join(', ')}`, blocking: true });
  } else {
    checks.push({ id: 'models', label: `모델 ${MIN_MODELS}~${MAX_MODELS}개 선택`, state: 'pass', detail: `${n}개 선택됨`, blocking: true });
  }

  // 2. Prompt
  const promptOk = cfg.prompt.trim().length > 0;
  checks.push({ id: 'prompt', label: 'Prompt 입력', state: promptOk ? 'pass' : 'fail', detail: promptOk ? undefined : 'Prompt 가 비어 있습니다', blocking: true });

  // 3. 이미지 입력 지원
  const imageUnsupported = cfg.image ? selected.filter((m) => !m.capabilities.image).map((m) => m.display_name) : [];
  if (cfg.image) {
    checks.push({
      id: 'image',
      label: '이미지 입력 지원',
      state: imageUnsupported.length ? 'fail' : 'pass',
      detail: imageUnsupported.length ? `이미지 미지원 모델: ${imageUnsupported.join(', ')}` : `선택 모델 모두 이미지 입력 지원`,
      blocking: true,
    });
  } else if (ctx.scenario?.requires_image) {
    checks.push({ id: 'image', label: '이미지 입력 지원', state: 'warn', detail: '이 시나리오는 이미지 입력을 전제로 합니다. 이미지 없이 실행하면 텍스트만 전달됩니다.', blocking: false });
  } else {
    checks.push({ id: 'image', label: '이미지 입력 지원', state: 'pass', detail: '이미지 입력 없음', blocking: true });
  }

  // 4. Schema 유효
  if (cfg.jsonMode) {
    const parsed = parseSchema(cfg.schema);
    checks.push({
      id: 'schema',
      label: 'JSON Schema 유효',
      state: parsed.ok ? 'pass' : 'fail',
      detail: parsed.ok ? (parsed.schema ? 'Schema 검증 적용' : 'Schema 없음 (JSON 파싱만 검증)') : parsed.error,
      blocking: true,
    });
  } else {
    checks.push({ id: 'schema', label: 'JSON Schema 유효', state: 'pass', detail: 'JSON 출력 요구 꺼짐 (미적용)', blocking: true });
  }

  // 5. JSON 모드 미지원 모델 (경고, 차단 아님 — DD-07)
  const jsonUnsupported = cfg.jsonMode ? selected.filter((m) => !m.capabilities.json).map((m) => m.display_name) : [];
  if (cfg.jsonMode) {
    checks.push({
      id: 'json',
      label: 'JSON 모드 지원',
      state: jsonUnsupported.length ? 'warn' : 'pass',
      detail: jsonUnsupported.length ? `JSON 모드 미지원: ${jsonUnsupported.join(', ')} — Prompt 지시만으로 실행되며 결과 카드에 조건 차이로 기록됩니다` : undefined,
      blocking: false,
    });
  }

  // 6. 파라미터
  const paramErrors: string[] = [];
  if (!(cfg.temperature >= 0 && cfg.temperature <= 2)) paramErrors.push('Temperature 0~2');
  if (cfg.maxTokens === null || cfg.maxTokens < 1) paramErrors.push('Max Tokens ≥ 1');
  if (cfg.timeoutSec === null || cfg.timeoutSec < 1) paramErrors.push('Timeout ≥ 1초');
  checks.push({ id: 'params', label: '실행 파라미터', state: paramErrors.length ? 'fail' : 'pass', detail: paramErrors.length ? `확인 필요: ${paramErrors.join(', ')}` : undefined, blocking: true });

  // 7. 재실행 원본 입력
  if (ctx.rerunInputAvailable === false) {
    checks.push({ id: 'rerun', label: '원본 입력 접근', state: 'fail', detail: '원본 입력에 접근할 수 없어 재실행할 수 없습니다', blocking: true });
  }

  const firstBlock = checks.find((c) => c.blocking && c.state === 'fail');
  return {
    checks,
    canRun: !firstBlock,
    blockingReason: firstBlock ? `${firstBlock.label}: ${firstBlock.detail ?? '조건 미충족'}` : null,
    imageUnsupported,
  };
}
