import { Badge } from '../../components/ui';
import { formatMs, formatTokens } from '../../domain/format';
import { ERROR_TYPE, EXEC_STATUS, MODEL_STATUS } from '../../domain/status';
import type { AIRequest, ModelRegistry } from '../../domain/types';
import { CostCell, RequestIdCell } from '../../features/shared/cells';
import { sortRequestsByModelOrder, type SimulationRow } from './simulationRows';

export interface SimulationRequestRowsProps {
  row: SimulationRow;
  modelById: ReadonlyMap<string, ModelRegistry>;
}

/** 행 확장 영역: 모델별 Request 미니 행 (2~4건). 실패/Timeout 도 숨기지 않는다. */
export function SimulationRequestRows({ row, modelById }: SimulationRequestRowsProps) {
  const requests = sortRequestsByModelOrder(row.requests, row.run.model_ids);
  if (requests.length === 0) {
    return <p className="text-xs text-ink-muted">이 실행에 귀속된 Request 가 조회 기간 내에 없습니다. 상세 페이지에서 확인하세요.</p>;
  }
  return (
    <table className="w-full text-xs">
      <caption className="sr-only">{row.run.simulation_id} 모델별 Request</caption>
      <thead className="text-ink-muted">
        <tr>
          <th scope="col" className="px-2 py-1 text-left font-medium">모델</th>
          <th scope="col" className="px-2 py-1 text-left font-medium">실행 상태</th>
          <th scope="col" className="px-2 py-1 text-right font-medium">응답시간</th>
          <th scope="col" className="px-2 py-1 text-right font-medium">Input</th>
          <th scope="col" className="px-2 py-1 text-right font-medium">Output</th>
          <th scope="col" className="px-2 py-1 text-right font-medium">비용</th>
          <th scope="col" className="px-2 py-1 text-left font-medium">Request ID</th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r: AIRequest) => {
          const model = modelById.get(r.requested_model);
          const exec = EXEC_STATUS[r.status];
          return (
            <tr key={r.request_id} className="border-t border-border/60">
              <td className="px-2 py-1.5">
                <span className="flex items-center gap-1.5">
                  <span>{model?.display_name ?? r.requested_model}</span>
                  {model?.status === 'INACTIVE' && (
                    <Badge tone="neutral" size="sm">
                      현재 {MODEL_STATUS.INACTIVE.label}
                    </Badge>
                  )}
                  {r.actual_model && r.actual_model !== r.requested_model && <span className="text-ink-muted">→ {r.actual_model}</span>}
                </span>
              </td>
              <td className="px-2 py-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Badge tone={exec.tone} size="sm">
                    {exec.label}
                  </Badge>
                  {r.error_type && <span className="text-danger">{ERROR_TYPE[r.error_type]}</span>}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tnum">{formatMs(r.latency_ms)}</td>
              <td className="px-2 py-1.5 text-right tnum">{formatTokens(r.input_tokens)}</td>
              <td className="px-2 py-1.5 text-right tnum">{formatTokens(r.output_tokens)}</td>
              <td className="px-2 py-1.5 text-right">
                <CostCell cost_usd={r.cost_usd} cost_status={r.cost_status} />
              </td>
              <td className="px-2 py-1.5">
                <RequestIdCell id={r.request_id} short={false} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
