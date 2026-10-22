/**
 * 시뮬레이션 단위 요약. 비용·상태 집계는 domain/aggregate 의 summarize / simulationCostState 를 그대로 사용한다.
 * P-04(결과 바)와 P-05(이력·상세)가 같은 함수를 쓴다.
 */
import type { SimulationDetail } from '../../api';
import { simulationCostState, summarize } from '../../domain/aggregate';
import type { SimCostState } from '../../domain/status';
import type { SimulationStatus } from '../../domain/types';

export interface SimulationSummary {
  modelCount: number;
  success: number;
  /** FAILED + TIMEOUT */
  failedOrTimeout: number;
  failed: number;
  timeout: number;
  cancelled: number;
  running: number;
  confirmedUsd: number;
  estimatedUsd: number;
  /** 확정+추정 (추정 포함) */
  totalIncludingEstimatedUsd: number;
  unknownCount: number;
  costState: SimCostState;
  /** completed_at - started_at (ms). 미완료면 null */
  durationMs: number | null;
  status: SimulationStatus;
}

export function summarizeSimulation(detail: SimulationDetail): SimulationSummary {
  const { run, requests } = detail;
  const s = summarize(requests);
  const durationMs = run.completed_at ? Math.max(0, new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) : null;
  return {
    modelCount: run.model_ids.length,
    success: s.success,
    failedOrTimeout: s.failed + s.timeout,
    failed: s.failed,
    timeout: s.timeout,
    cancelled: s.cancelled,
    running: s.running + s.pending,
    confirmedUsd: s.confirmedUsd,
    estimatedUsd: s.estimatedUsd,
    totalIncludingEstimatedUsd: s.totalIncludingEstimatedUsd,
    unknownCount: s.unknownCount,
    costState: simulationCostState(requests, run),
    durationMs,
    status: run.status,
  };
}

/** 시뮬레이션이 종료(더 이상 변하지 않음)되었는지 */
export function isSimulationFinished(status: SimulationStatus): boolean {
  return status !== 'RUNNING' && status !== 'PENDING';
}
