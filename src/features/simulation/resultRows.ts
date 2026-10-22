/** results + requests + 현재 모델 등록 정보를 모델 단위 행으로 결합 (표·카드 공용) */
import type { SimulationDetail } from '../../api';
import type { AIRequest, ModelRegistry, SimulationResult } from '../../domain/types';

export interface ModelResultRow {
  result: SimulationResult;
  request: AIRequest;
  /** 현재 등록 정보 (미등록이면 undefined) */
  model: ModelRegistry | undefined;
}

export function joinResults(detail: SimulationDetail, modelById: Map<string, ModelRegistry>): ModelResultRow[] {
  const reqById = new Map(detail.requests.map((r) => [r.request_id, r]));
  const rows: ModelResultRow[] = [];
  for (const result of detail.results) {
    const request = reqById.get(result.request_id);
    if (!request) continue;
    rows.push({ result, request, model: modelById.get(result.model_id) });
  }
  return rows;
}

/** Provider 요청 → 실제 (실제가 null 이면 미확인) */
export function providerLabel(request: Pick<AIRequest, 'requested_provider' | 'actual_provider'>): string {
  const req = request.requested_provider ?? '-';
  const act = request.actual_provider ?? '미확인';
  return req === act ? req : `${req} → ${act}`;
}
