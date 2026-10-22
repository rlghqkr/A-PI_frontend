/**
 * P-05 목록용 파생 행. 집계는 domain/aggregate 의 summarize / simulationCostState 만 사용한다.
 * (요약 KPI 와 테이블이 같은 요청 배열에서 파생되도록 run ↔ requests 를 한 번만 묶는다)
 */
import { simulationCostState, summarize, type UsageSummary } from '../../domain/aggregate';
import type { SimCostState } from '../../domain/status';
import type { AIRequest, SimulationRun, SimulationStatus } from '../../domain/types';
import { addDays, todayKst } from '../../domain/format';

export interface SimulationRow {
  run: SimulationRun;
  /** 이 실행에 귀속된 Request (simulation_id 기준) */
  requests: AIRequest[];
  summary: UsageSummary;
  costState: SimCostState;
  /** started_at → completed_at (ms). 미완료면 null */
  durationMs: number | null;
}

export function groupRequestsBySimulation(requests: readonly AIRequest[]): Map<string, AIRequest[]> {
  const map = new Map<string, AIRequest[]>();
  for (const r of requests) {
    if (!r.simulation_id) continue;
    const arr = map.get(r.simulation_id);
    if (arr) arr.push(r);
    else map.set(r.simulation_id, [r]);
  }
  return map;
}

export function durationOf(run: Pick<SimulationRun, 'started_at' | 'completed_at'>): number | null {
  if (!run.completed_at) return null;
  const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
  return Number.isNaN(ms) || ms < 0 ? null : ms;
}

/** 종료된 실행인데 귀속 Request 가 하나도 없으면 비용을 알 수 없다 → '확정' 이 아니라 '미확인 포함' 으로 둔다 (정책 1·2) */
export function rowCostState(reqs: readonly AIRequest[], run: SimulationRun): SimCostState {
  const finished = run.status !== 'RUNNING' && run.status !== 'PENDING';
  if (finished && reqs.length === 0) return 'INCLUDES_UNKNOWN';
  return simulationCostState(reqs, run);
}

export function buildSimulationRows(runs: readonly SimulationRun[], requests: readonly AIRequest[]): SimulationRow[] {
  const grouped = groupRequestsBySimulation(requests);
  return runs.map((run) => {
    const reqs = grouped.get(run.simulation_id) ?? [];
    return {
      run,
      requests: reqs,
      summary: summarize(reqs),
      costState: rowCostState(reqs, run),
      durationMs: durationOf(run),
    };
  });
}

/** 기본 조회 기간: 최근 30일 (DD-01), KST 기준 */
export function defaultRange(): { start: string; end: string } {
  const end = todayKst();
  return { start: addDays(end, -29), end };
}

export const SIM_STATUS_VALUES: SimulationStatus[] = ['PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED'];

export function isSimulationStatus(v: string): v is SimulationStatus {
  return (SIM_STATUS_VALUES as string[]).includes(v);
}

/** 목록 필터 URL 상태 (모두 문자열) */
export interface HistoryUrlState extends Record<string, string> {
  start: string;
  end: string;
  scenario: string;
  model: string;
  status: string;
  sim: string;
}

export function sortRequestsByModelOrder(requests: readonly AIRequest[], modelIds: readonly string[]): AIRequest[] {
  const order = new Map(modelIds.map((id, i) => [id, i]));
  return [...requests].sort((a, b) => (order.get(a.requested_model) ?? 99) - (order.get(b.requested_model) ?? 99));
}

// ---------- 재실행 ----------

/** 교체 Select 의 "제외" 값 */
export const EXCLUDE = '__EXCLUDE__';
export const MIN_MODELS = 2;
export const MAX_MODELS = 4;

/** P-04 가 `from` 으로 설정을 복원하고, `models` 가 있으면 모델 목록을 덮어쓴 뒤 `run=1` 이면 검증 통과 시 자동 실행한다 (spec P-05 item 4) */
export function buildRerunUrl(simulationId: string, modelIds: readonly string[]): string {
  return `/simulator?from=${encodeURIComponent(simulationId)}&models=${modelIds.map(encodeURIComponent).join(',')}&run=1`;
}
