/**
 * P-05 전용 셀. 공통 셀(CostCell/RequestIdCell/SimulationIdCell)은 features/shared/cells.tsx 를 사용한다.
 * 여기에는 P-05 에만 필요한 "시뮬레이션 총 비용" 과 "모델 칩" 만 둔다.
 */
import { Badge, Chip, Tooltip } from '../../components/ui';
import { formatUsd } from '../../domain/format';
import { MODEL_STATUS } from '../../domain/status';
import type { ModelRegistry } from '../../domain/types';
import type { UsageSummary } from '../../domain/aggregate';

/**
 * 시뮬레이션 총 비용: 확정+추정 합계. 추정이 있으면 "추정 포함" 라벨, 미확인 건수는 별도 표기.
 * 합산 가능한 금액이 하나도 없으면(전부 미확인/호출 없음) 금액 대신 "미확인" — 절대 $0 로 표시하지 않는다.
 */
export function TotalCostCell({ summary }: { summary: Pick<UsageSummary, 'confirmedUsd' | 'estimatedUsd' | 'totalIncludingEstimatedUsd' | 'estimatedCount' | 'unknownCount' | 'calls'> }) {
  const hasAmount = summary.calls - summary.unknownCount > 0;
  return (
    <div className="flex flex-col items-end gap-0.5 tnum">
      {hasAmount ? (
        <span className="inline-flex items-center gap-1.5">
          <span>{formatUsd(summary.totalIncludingEstimatedUsd)}</span>
          {summary.estimatedCount > 0 && (
            <Badge tone="estimated" size="sm" title={`확정 ${formatUsd(summary.confirmedUsd)} + 추정 ${formatUsd(summary.estimatedUsd)}`}>
              추정 포함
            </Badge>
          )}
        </span>
      ) : (
        <span className="text-warning">{formatUsd(null)}</span>
      )}
      {summary.unknownCount > 0 && <span className="text-[11px] text-warning">미확인 {summary.unknownCount}건</span>}
    </div>
  );
}

/** 모델 수 + 표시명 칩. 현재 INACTIVE 인 모델은 표시 */
export function ModelChips({ modelIds, modelById }: { modelIds: readonly string[]; modelById: ReadonlyMap<string, ModelRegistry> }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-xs font-medium tnum">{modelIds.length}개</span>
      {modelIds.map((id) => {
        const m = modelById.get(id);
        const inactive = m?.status === 'INACTIVE';
        const chip = (
          <Chip tone={inactive ? 'neutral' : 'primary'} title={id}>
            {m?.display_name ?? id}
            {inactive && <span className="ml-1 text-[10px] opacity-80">현재 {MODEL_STATUS.INACTIVE.label}</span>}
          </Chip>
        );
        return inactive ? (
          <Tooltip key={id} content="현재 비활성화된 모델입니다. 과거 결과는 보존됩니다.">
            {chip}
          </Tooltip>
        ) : (
          <span key={id}>{chip}</span>
        );
      })}
    </div>
  );
}
