import { ArrowRight, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { Badge, Button, ErrorState, InlineAlert, Modal, Select, SkeletonText, useToast, type SelectOption } from '../../components/ui';
import { MODEL_STATUS } from '../../domain/status';
import type { SimulationDetail } from '../../api';
import type { ModelRegistry, ModelStatus } from '../../domain/types';
import { useAsync } from '../../hooks/useAsync';
import { useNames, useReferenceData } from '../../hooks/useReferenceData';
import { RerunSettingsSummary } from './RerunSettingsSummary';
import { EXCLUDE, MAX_MODELS, MIN_MODELS, buildRerunUrl } from './simulationRows';

export interface RerunModalProps {
  open: boolean;
  simulationId: string | null;
  onClose: () => void;
}


interface ModelPlan {
  modelId: string;
  /** 실행 당시 기록(model_status_at_run). 스냅샷이 없으면 null — 현재 상태로 꾸며내지 않는다 */
  atRun: ModelStatus | null;
  current: ModelStatus | null; // null = 레지스트리에 없음
  registry: ModelRegistry | null;
}

/** 재실행 확인 Modal: 복원 설정 요약 + 모델별 현재 상태 검증 + 교체/제외 선택 */
export function RerunModal({ open, simulationId, onClose }: RerunModalProps) {
  const ref = useReferenceData();
  const names = useNames();
  const navigate = useNavigate();
  const { toast } = useToast();
  const state = useAsync<SimulationDetail | null>(() => (simulationId ? api.getSimulation(simulationId) : Promise.resolve(null)), [simulationId], {
    enabled: open && simulationId !== null,
    keepPrevious: false,
  });
  const detail = state.data;

  const plans = useMemo<ModelPlan[]>(() => {
    if (!detail) return [];
    return detail.run.model_ids.map((modelId) => {
      const registry = ref.modelById.get(modelId) ?? null;
      const atRun = detail.results.find((r) => r.model_id === modelId)?.model_status_at_run ?? null;
      return { modelId, atRun, current: registry?.status ?? null, registry };
    });
  }, [detail, ref.modelById]);

  // 비활성(ACTIVE 아님) 모델별 선택: 교체 모델 ID 또는 EXCLUDE
  // Modal 이 열린 대상(simulationId)별로 선택을 유지하고, 다른 대상/재오픈 시에는 초기화 (렌더 중 파생)
  const choiceKey = open ? simulationId : null;
  const [choiceState, setChoiceState] = useState<{ key: string | null; map: Record<string, string> }>({ key: choiceKey, map: {} });
  const choices = useMemo(() => (choiceState.key === choiceKey ? choiceState.map : {}), [choiceState, choiceKey]);
  const setChoices = (fn: (c: Record<string, string>) => Record<string, string>) => setChoiceState({ key: choiceKey, map: fn(choices) });

  const finalModelIds = useMemo(() => {
    const out: string[] = [];
    for (const p of plans) {
      const pick = p.current === 'ACTIVE' ? p.modelId : (choices[p.modelId] ?? EXCLUDE);
      if (pick !== EXCLUDE && !out.includes(pick)) out.push(pick);
    }
    return out;
  }, [plans, choices]);

  const activeModels = useMemo(() => ref.models.filter((m) => m.status === 'ACTIVE'), [ref.models]);

  const blockReason = useMemo(() => {
    if (!detail) return null;
    if (detail.run.input_available === false) return '원본 입력이 없어 재실행할 수 없습니다.';
    if (finalModelIds.length < MIN_MODELS) return `비교 실행에는 최소 ${MIN_MODELS}개 모델이 필요합니다. (현재 ${finalModelIds.length}개) 비활성 모델을 ACTIVE 모델로 교체하세요.`;
    if (finalModelIds.length > MAX_MODELS) return `비교 실행은 최대 ${MAX_MODELS}개 모델까지 가능합니다. (현재 ${finalModelIds.length}개)`;
    return null;
  }, [detail, finalModelIds]);

  const confirm = () => {
    if (!detail || blockReason) return;
    const target = buildRerunUrl(detail.run.simulation_id, finalModelIds);
    // 복원은 P-04 에서 비동기로 진행된다 — 완료형이 아닌 진행형 문구 (정책 13)
    toast({ title: `${detail.run.simulation_id} 설정을 복원합니다`, description: `모델 ${finalModelIds.length}개로 P-04 로 이동해 검증을 통과하면 자동 실행합니다.`, tone: 'info' });
    onClose();
    navigate(target);
  };

  const optionsFor = (p: ModelPlan): SelectOption[] => {
    const chosen = new Set(finalModelIds.filter((id) => id !== choices[p.modelId]));
    return [
      { value: EXCLUDE, label: '제외' },
      ...activeModels.map((m) => ({ value: m.model_id, label: `${m.display_name} (${m.provider})`, disabled: chosen.has(m.model_id) })),
    ];
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="재실행 — 새 Simulation 으로 실행"
      description={simulationId ?? undefined}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button leftIcon={<Play />} onClick={confirm} disabled={!detail || !!blockReason} disabledReason={blockReason ?? '불러오는 중'}>
            새 Simulation으로 실행
          </Button>
        </>
      }
    >
      {state.loading ? (
        <SkeletonText lines={6} />
      ) : state.error ? (
        <ErrorState compact description={state.error} onRetry={state.reload} />
      ) : !detail ? (
        <ErrorState compact title="Simulation 을 찾을 수 없습니다" description={simulationId ?? undefined} />
      ) : (
        <div className="flex flex-col gap-4">
          {ref.error && (
            <InlineAlert
              tone="danger"
              title="기준 데이터(모델 목록)를 불러오지 못했습니다"
              action={
                <Button size="sm" variant="secondary" onClick={ref.reload}>
                  재시도
                </Button>
              }
            >
              {ref.error} · 모델의 현재 상태를 검증할 수 없어 교체 목록이 비어 있습니다.
            </InlineAlert>
          )}
          <RerunSettingsSummary run={detail.run} scenarioName={names.scenario(detail.run.scenario_id)} />

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink">모델 검증 (당시 상태 → 현재 상태)</h3>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {plans.map((p) => {
                const isActive = p.current === 'ACTIVE';
                const choice = choices[p.modelId] ?? EXCLUDE;
                return (
                  <li key={p.modelId} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{p.registry?.display_name ?? p.modelId}</span>
                      <span className="font-mono text-[11px] text-ink-muted">{p.modelId}</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5">
                      {p.atRun ? (
                        <Badge tone={MODEL_STATUS[p.atRun].tone} size="sm">
                          당시 {MODEL_STATUS[p.atRun].label}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="sm" title="실행 당시 모델 상태 스냅샷이 없습니다">
                          당시 기록 없음
                        </Badge>
                      )}
                      <ArrowRight className="size-3.5 text-ink-muted" aria-hidden="true" />
                      {p.current ? (
                        <Badge tone={MODEL_STATUS[p.current].tone} size="sm">
                          현재 {MODEL_STATUS[p.current].label}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="sm">
                          미등록
                        </Badge>
                      )}
                    </span>
                    {isActive ? (
                      <span className="w-56 text-xs text-success">유지</span>
                    ) : (
                      <Select
                        aria-label={`${p.registry?.display_name ?? p.modelId} 교체 모델`}
                        value={choice}
                        onChange={(v) => setChoices((c) => ({ ...c, [p.modelId]: v }))}
                        options={optionsFor(p)}
                        containerClassName="w-56"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-ink-secondary">
              결과 모델 수: <strong className="tnum">{finalModelIds.length}</strong>개 (최소 {MIN_MODELS} · 최대 {MAX_MODELS})
              {finalModelIds.length > 0 && <span className="ml-2 text-ink-muted">{finalModelIds.map((id) => names.model(id)).join(', ')}</span>}
            </p>
          </section>

          {blockReason && (
            <InlineAlert tone="danger" title="재실행할 수 없습니다">
              {blockReason}
            </InlineAlert>
          )}

          <p className="text-xs text-ink-muted">
            기존 Simulation 기록은 변경되지 않으며 새 Simulation ID 와 Request ID 가 생성됩니다. 재실행에는 새로운 API 호출 비용이 발생합니다.
          </p>
        </div>
      )}
    </Modal>
  );
}
