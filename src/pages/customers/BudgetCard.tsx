import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, ProgressBar, SectionCard, Select, Skeleton, Stat } from '../../components/ui';
import { BASIS_LABEL, type BudgetStatus } from '../../domain/aggregate';
import { formatInt, formatKst, formatPct, formatUsd } from '../../domain/format';
import type { Budget } from '../../domain/types';
import { BudgetDrawer } from './BudgetDrawer';
import { BudgetStateBadge } from '../../features/shared/cells';

export interface BudgetCardProps {
  customerId: string;
  customerName: string;
  months: string[];
  month: string;
  onMonthChange: (m: string) => void;
  budget: Budget | null;
  budgets: readonly Budget[] | null;
  status: BudgetStatus;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSaved: () => void;
}

export function BudgetCard({ customerId, customerName, months, month, onMonthChange, budget, budgets, status, loading, error, onRetry, onSaved }: BudgetCardProps) {
  const [open, setOpen] = useState(false);
  const tone = status.state === 'EXCEEDED' ? 'danger' : status.state === 'WARNING' ? 'warning' : 'success';

  return (
    <SectionCard
      title="월 예산"
      description="고객 단위 월 예산(USD). 사용액은 현재 조회 조건으로 필터된 해당 월(KST) 호출의 확정·추정 비용이며, 미확인 비용은 포함되지 않습니다."
      actions={
        <>
          <Select aria-label="예산 월" value={month} onChange={onMonthChange} options={months.map((m) => ({ value: m, label: m }))} containerClassName="w-[130px]" />
          <Button size="sm" variant={budget ? 'secondary' : 'primary'} leftIcon={budget ? <Pencil /> : <Plus />} onClick={() => setOpen(true)} disabled={loading}>
            {budget ? '수정' : '등록'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 text-sm text-danger">
          <span>예산 조회 실패: {error}</span>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <BudgetStateBadge state={status.state} />
            <span className="text-xs text-ink-muted">{BASIS_LABEL[status.basis]}</span>
            {status.unknownCount > 0 && <span className="text-xs text-warning">비용 미확인 {formatInt(status.unknownCount)}건 제외</span>}
            {budget && <span className="text-xs text-ink-muted">최종 수정 {formatKst(budget.updated_at, { seconds: false })}</span>}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 md:grid-cols-4">
            <Stat label={`예산 (${month})`} value={status.amountUsd === null ? <span className="text-ink-muted">미설정</span> : formatUsd(status.amountUsd)} />
            <Stat
              label="사용액"
              value={
                <span>
                  {formatUsd(status.spentUsd)}
                  {status.basis === 'INCLUDING_ESTIMATED' && <span className="ml-1 text-xs text-estimated">(추정 포함)</span>}
                </span>
              }
            />
            <Stat label="잔여" value={status.remainingUsd === null ? '-' : <span className={status.remainingUsd < 0 ? 'text-danger' : undefined}>{formatUsd(status.remainingUsd)}</span>} />
            <Stat label="경고 기준" value={status.warningPct === null ? '-' : `${status.warningPct}%`} />
          </dl>
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs text-ink-secondary">사용률</span>
            <ProgressBar value={status.pct} tone={tone} showValue={false} className="flex-1" />
            {status.pct !== null && (
              <span className="tnum text-sm font-semibold text-ink">
                {formatPct(status.pct)} <span className="text-xs font-normal text-ink-muted">· {BASIS_LABEL[status.basis]}</span>
              </span>
            )}
          </div>
          {status.pct === null && <p className="text-xs text-ink-muted">예산이 설정되지 않아 사용률을 계산할 수 없습니다. [등록] 으로 월 예산을 설정하세요.</p>}
          <p className="text-xs text-ink-muted">
            확정 기준 {formatUsd(status.spentConfirmedUsd)} · 추정 포함 {formatUsd(status.spentIncludingEstimatedUsd)}
          </p>
        </div>
      )}
      <BudgetDrawer open={open} onClose={() => setOpen(false)} customerId={customerId} customerName={customerName} month={month} existing={budget} budgets={budgets} onSaved={onSaved} />
    </SectionCard>
  );
}
