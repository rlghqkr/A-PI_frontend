import { History } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, CURRENT_ADMIN } from '../../api';
import { usePageMeta } from '../../components/layout/AppShell';
import { Button, ErrorState, InlineAlert, Skeleton, useToast } from '../../components/ui';
import { isSimulationFinished, useSimulationDetail } from '../../features/simulation';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { useReferenceData } from '../../hooks/useReferenceData';
import { useUrlState } from '../../hooks/useUrlState';
import { SimulatorConfigPanel } from './SimulatorConfigPanel';
import { SimulatorResults } from './SimulatorResults';
import { DEFAULT_CONFIG, restoreFromRun, runPreflight, toSimulationInput, type SimConfig } from './simulatorConfig';

/** `run=1`: P-05 재실행 모달에서 넘어온 경우 설정 복원 후 검증을 통과하면 자동 실행 (spec P-05 item 4) */
const URL_DEFAULTS = { sim: '', from: '', models: '', run: '' };

export default function SimulatorPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const ref = useReferenceData();
  const [url, setUrl] = useUrlState(URL_DEFAULTS);
  const simId = url.sim || null;
  const fromId = url.from || null;
  /** P-05 재실행 모달이 넘긴 최종 모델 목록 (`?models=a,b,c`). 없으면 원본 run.model_ids 를 사용. */
  const modelsParam = url.models;
  const overrideModelIds = useMemo(
    () => (modelsParam ? modelsParam.split(',').map((s) => s.trim()).filter(Boolean) : null),
    [modelsParam],
  );

  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [droppedModels, setDroppedModels] = useState<string[]>([]);
  const restoredFor = useRef<string | null>(null);

  // ----- 헤더 -----
  const breadcrumb = useMemo(() => [{ label: 'Multi-LLM Simulator' }], []);
  const meta = useMemo(() => <span>실행 출처 SIMULATION · 프로젝트 Patron PoC · 시각 KST</span>, []);
  const actions = useMemo(
    () => (
      <Button variant="secondary" size="sm" leftIcon={<History />} onClick={() => navigate('/simulations')}>
        실행 이력
      </Button>
    ),
    [navigate],
  );
  usePageMeta({ title: 'Multi-LLM Simulator', breadcrumb, meta, actions });

  // ----- 재실행 복원 (?from=) -----
  const source = useAsync(() => (fromId ? api.getSimulation(fromId) : Promise.resolve(null)), [fromId], { enabled: Boolean(fromId) });
  useEffect(() => {
    if (!fromId || !source.data || ref.loading) return;
    if (source.data.run.simulation_id !== fromId) return; // 이전 원본의 데이터(keepPrevious) 무시
    if (restoredFor.current === fromId) return;
    restoredFor.current = fromId;
    const { config: restored, droppedModelIds } = restoreFromRun(source.data.run, ref.modelById, overrideModelIds);
    setConfig(restored);
    setDroppedModels(droppedModelIds);
  }, [fromId, source.data, ref.loading, ref.modelById, overrideModelIds]);
  useEffect(() => {
    if (!fromId) {
      restoredFor.current = null;
      setDroppedModels([]);
    }
  }, [fromId]);
  const sourceRun = fromId && source.data && source.data.run.simulation_id === fromId ? source.data.run : null;
  // loadedAt 이 없으면 아직 조회가 시작되지 않은 렌더(비활성 → 활성 전환 직후)이므로 '없음' 으로 판정하지 않는다
  const sourceNotFound = Boolean(fromId) && !source.loading && !source.error && source.loadedAt !== null && source.data === null;

  // ----- 실행 전 검증 -----
  const scenario = ref.scenarioById.get(config.scenarioId);
  const preflight = useMemo(
    () => runPreflight(config, { scenario, modelById: ref.modelById, rerunInputAvailable: sourceRun ? sourceRun.input_available : null }),
    [config, scenario, ref.modelById, sourceRun],
  );

  // ----- 실행 / 취소 -----
  const start = useMutation((input: Parameters<typeof api.startSimulation>[0]) => api.startSimulation(input));
  const cancel = useMutation((id: string) => api.cancelSimulation(id));
  const observedRunning = useRef<string | null>(null);

  const onRun = useCallback(async () => {
    const run = await start.run(toSimulationInput(config, CURRENT_ADMIN.user_id, fromId));
    if (!run) return;
    observedRunning.current = run.simulation_id;
    setUrl({ sim: run.simulation_id, from: '', models: '', run: '' });
    toast({ tone: 'info', title: `${run.simulation_id} 실행 시작`, description: `${run.model_ids.length}개 모델 병렬 실행 중` });
  }, [start, config, fromId, setUrl, toast]);

  const onCancel = useCallback(async () => {
    if (!simId) return;
    const res = await cancel.run(simId);
    if (!res) return; // 실패: cancel.error 를 아래 InlineAlert 로 표시
    toast({ tone: 'warning', title: '실행 취소됨', description: `진행 중이던 호출 ${res.cancelled}건이 CANCELLED 로 기록됩니다.` });
  }, [cancel, simId, toast]);

  // ----- P-05 재실행: 복원 후 자동 실행 (?run=1) -----
  const autoRun = url.run === '1';
  const autoRanFor = useRef<string | null>(null);
  useEffect(() => {
    if (!autoRun || !fromId || simId || !sourceRunReady(restoredFor.current, fromId)) return;
    if (autoRanFor.current === fromId) return;
    if (!preflight.canRun) {
      autoRanFor.current = fromId;
      setUrl({ run: '' });
      toast({ tone: 'warning', title: '자동 실행을 건너뛰었습니다', description: preflight.blockingReason ?? '실행 전 검증을 통과하지 못했습니다. 설정을 확인한 뒤 직접 실행하세요.' });
      return;
    }
    autoRanFor.current = fromId;
    setUrl({ run: '' });
    void onRun();
  }, [autoRun, fromId, simId, preflight, onRun, setUrl, toast]);

  // ----- 결과 구독 -----
  const sim = useSimulationDetail(simId);
  useEffect(() => {
    const d = sim.detail;
    if (!d) return;
    if (!isSimulationFinished(d.run.status)) {
      observedRunning.current = d.run.simulation_id;
      return;
    }
    if (observedRunning.current !== d.run.simulation_id) return; // 새로고침으로 들어온 완료 결과는 토스트 생략
    observedRunning.current = null;
    toast({
      tone: 'success',
      title: `${d.run.simulation_id} 저장됨`,
      description: '실행 조건과 모델별 결과가 이력에 기록되었습니다.',
      actionLabel: '이력에서 보기',
      onAction: () => navigate(`/simulations/${d.run.simulation_id}`),
    });
  }, [sim.detail, toast, navigate]);

  const running = sim.detail ? !isSimulationFinished(sim.detail.run.status) : false;

  const onReset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setDroppedModels([]);
    restoredFor.current = null;
    setUrl({ sim: '', from: '', models: '', run: '' });
  }, [setUrl]);

  if (ref.error) return <ErrorState title="기준 정보를 불러오지 못했습니다" description={ref.error} onRetry={ref.reload} />;

  return (
    <div className="flex flex-col gap-4">
      {fromId && source.loading && <Skeleton className="h-12 w-full" />}
      {fromId && source.error && <ErrorState compact title="원본 Simulation 을 불러오지 못했습니다" description={source.error} onRetry={source.reload} />}
      {sourceNotFound && (
        <InlineAlert tone="danger" title={`${fromId} 을(를) 찾을 수 없습니다`} action={<Button variant="secondary" size="sm" onClick={onReset}>새 설정으로 시작</Button>}>
          재실행 원본이 삭제되었거나 ID 가 잘못되었습니다.
        </InlineAlert>
      )}
      {fromId && sourceRun && (
        <InlineAlert tone="info" title={`${fromId} 설정을 복원했습니다.`}>
          현재 ACTIVE 모델 기준으로 재검증합니다. 기존 기록은 변경되지 않습니다.
          {droppedModels.length > 0 && (
            <span className="mt-1 block text-warning">
              선택에서 제외된 모델 (현재 ACTIVE 아님 또는 미등록): {droppedModels.map((id) => ref.modelById.get(id)?.display_name ?? id).join(', ')} — 모델을 다시 선택하세요.
            </span>
          )}
          {!sourceRun.input_available && <span className="mt-1 block text-danger">원본 입력에 접근할 수 없어 재실행할 수 없습니다.</span>}
        </InlineAlert>
      )}
      {cancel.error && (
        <InlineAlert tone="danger" title="실행 취소에 실패했습니다" action={<Button variant="ghost" size="sm" onClick={cancel.reset}>닫기</Button>}>
          {cancel.error}
        </InlineAlert>
      )}
      {start.error && (
        <InlineAlert tone="danger" title="실행을 시작하지 못했습니다" action={<Button variant="ghost" size="sm" onClick={start.reset}>닫기</Button>}>
          {start.error}
          {Object.keys(start.fieldErrors).length > 0 && (
            <ul className="mt-1 list-disc pl-4">
              {Object.entries(start.fieldErrors).map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          )}
        </InlineAlert>
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:w-[420px] xl:max-h-[calc(100vh-88px)] xl:overflow-y-auto">
          {ref.loading ? (
            <Skeleton className="h-[640px] w-full" />
          ) : (
            <SimulatorConfigPanel
              config={config}
              onChange={setConfig}
              scenarios={ref.scenarios}
              scenarioById={ref.scenarioById}
              models={ref.models}
              preflight={preflight}
              running={running}
              starting={start.loading}
              onRun={onRun}
              onReset={onReset}
              rerunOf={sourceRun ? fromId : null}
            />
          )}
        </aside>
        <section className="min-w-0 flex-1" aria-label="실행 결과">
          <SimulatorResults simulationId={simId} detail={sim.detail} loading={sim.loading} error={sim.error} onRetry={sim.reload} onCancel={onCancel} cancelling={cancel.loading} />
        </section>
      </div>
    </div>
  );
}

/** 복원 effect 가 해당 원본에 대해 이미 config 를 적용했는지 */
function sourceRunReady(restoredFor: string | null, fromId: string): boolean {
  return restoredFor === fromId;
}
