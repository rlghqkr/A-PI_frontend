/**
 * 시뮬레이션 결과 표·카드 전용 셀.
 * 비용·실행 상태·Request ID 셀은 features/shared/cells.tsx 의 공통 구현(CostCell/ExecStatusBadge/RequestIdCell)을 사용한다.
 */
import { Badge } from '../../components/ui';
import { MODEL_STATUS } from '../../domain/status';
import type { ModelStatus } from '../../domain/types';

/** 실행 당시 모델 상태 vs 현재 등록 상태. 다를 때만 "현재 X" 배지 추가 */
export function ModelStatusDiff({ atRun, current }: { atRun: ModelStatus; current: ModelStatus | null }) {
  const run = MODEL_STATUS[atRun];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={run.tone} size="sm" title={`실행 당시 ${run.label}`}>
        당시 {run.label}
      </Badge>
      {current === null && (
        <Badge tone="neutral" size="sm" title="현재 등록 목록에 없음">
          현재 미등록
        </Badge>
      )}
      {current !== null && current !== atRun && (
        <Badge tone={MODEL_STATUS[current].tone} size="sm" title={MODEL_STATUS[current].description}>
          현재 {MODEL_STATUS[current].label}
        </Badge>
      )}
    </span>
  );
}
