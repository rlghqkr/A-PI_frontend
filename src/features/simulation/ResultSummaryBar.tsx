import { useMemo, type ReactNode } from 'react';
import { Badge, CopyableId, KpiCard } from '../../components/ui';
import type { SimulationDetail } from '../../api';
import { formatInt, formatMs, formatUsd } from '../../domain/format';
import { SIM_COST_STATE, SIM_STATUS } from '../../domain/status';
import { summarizeSimulation } from './simulationSummary';

export interface ResultSummaryBarProps {
  detail: SimulationDetail;
  /** 우측 액션 슬롯 (재실행, 이력에서 보기, 실행 취소 등) */
  actions?: ReactNode;
  className?: string;
}

/** 실행 요약 바 — P-04 결과 상단과 P-05 상세에서 동일하게 사용 */
export function ResultSummaryBar({ detail, actions, className }: ResultSummaryBarProps) {
  const s = useMemo(() => summarizeSimulation(detail), [detail]);
  const status = SIM_STATUS[s.status];
  const costState = SIM_COST_STATE[s.costState];
  const running = s.status === 'RUNNING' || s.status === 'PENDING';
  // 합산 가능한 금액이 하나도 없으면(전부 미확인/실행 중) 금액을 $0 로 표시하지 않고 '미확인' (P-05 TotalCostCell 과 동일 규칙)
  const hasAmount = detail.requests.length - s.unknownCount > 0;
  const money = (v: number) => (hasAmount ? formatUsd(v, { precision: 4 }) : <span className="text-warning">{formatUsd(null)}</span>);
  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <CopyableId value={detail.run.simulation_id} className="text-sm font-semibold" />
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          <Badge tone={costState.tone} title="시뮬레이션 단위 비용 확인 상태">
            비용 {costState.label}
          </Badge>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="실행 모델 수" value={formatInt(s.modelCount)} unit="개" sub={running ? `${s.running}개 실행 중` : undefined} />
        <KpiCard
          label="성공 / 실패·Timeout"
          value={
            <span>
              <span className="text-success">{s.success}</span>
              <span className="text-ink-muted"> / </span>
              <span className={s.failedOrTimeout > 0 ? 'text-danger' : undefined}>{s.failedOrTimeout}</span>
            </span>
          }
          sub={`실패 ${s.failed} · Timeout ${s.timeout}${s.cancelled ? ` · 취소 ${s.cancelled}` : ''}`}
        />
        <KpiCard label="확정 비용" value={money(s.confirmedUsd)} tone={hasAmount ? 'success' : 'warning'} sub={hasAmount ? undefined : running ? '실행 중 — 확인 중' : '확인된 비용 없음'} hint="API 응답 또는 대조 조회로 확정된 비용 합계. 합산 가능한 금액이 없으면 '미확인'" />
        <KpiCard
          label="추정 비용"
          value={money(s.estimatedUsd)}
          tone={hasAmount ? 'estimated' : 'warning'}
          sub={hasAmount ? `추정 포함 합계 ${formatUsd(s.totalIncludingEstimatedUsd, { precision: 4 })}` : `추정 포함 합계 ${formatUsd(null)}`}
          hint="Token × 단가로 추정한 비용. 확정 비용과 합산 시 '추정 포함'으로 표기. 합산 가능한 금액이 없으면 '미확인'"
        />
        <KpiCard
          label="비용 미확인"
          value={formatInt(s.unknownCount)}
          unit="건"
          tone={s.unknownCount > 0 ? 'warning' : undefined}
          sub={s.unknownCount > 0 ? '합계에서 제외됨' : '없음'}
          hint="실패·Timeout·취소 또는 대조 전 호출. 금액은 0이 아니라 '미확인'"
        />
        <KpiCard label="전체 실행시간" value={s.durationMs === null ? (running ? '진행 중' : '-') : formatMs(s.durationMs)} sub={detail.run.completed_at ? '시작 → 마지막 모델 종료' : undefined} />
      </div>
    </div>
  );
}
