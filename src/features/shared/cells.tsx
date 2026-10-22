/**
 * 테이블 셀 공통 렌더 헬퍼 (모든 페이지에서 재사용).
 *
 * 데이터 정책:
 * - 비용 null(UNKNOWN) 은 "미확인" 으로 표시하고 절대 $0 로 표시하지 않는다.
 * - 실행 상태(EXEC_STATUS)와 비용 상태(COST_STATUS)는 별도 배지.
 * - 예산 미설정은 "미설정" (0% 아님). 사용률 옆에 basis 라벨(확정 기준/추정 포함 기준).
 * - 확정+추정 합계는 반드시 "추정 포함" 레이블과 함께 표시.
 *
 * 모든 포맷은 `src/domain/format.ts`, 상태 라벨은 `src/domain/status.ts` 를 사용한다.
 */
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, CopyableId, ProgressBar } from '../../components/ui';
import { copyText } from '../../lib/copyText';
import { BASIS_LABEL, type BudgetStatus } from '../../domain/aggregate';
import { formatPct, formatTokens, formatUsd, shortId } from '../../domain/format';
import { BUDGET_STATE, COST_STATUS, EXEC_STATUS } from '../../domain/status';
import type { CostStatus, ExecStatus } from '../../domain/types';
import { useNames } from '../../hooks/useReferenceData';
import { useRequestDetail } from '../request-detail/RequestDetailProvider';

// ---------- 상태 배지 ----------

export interface ExecStatusBadgeProps {
  status: ExecStatus;
  size?: 'sm' | 'md';
}

/** 실행 상태 배지 (PENDING/RUNNING/SUCCESS/FAILED/TIMEOUT/CANCELLED) */
export function ExecStatusBadge({ status, size = 'sm' }: ExecStatusBadgeProps) {
  const meta = EXEC_STATUS[status];
  return (
    <Badge tone={meta.tone} size={size} dot>
      {meta.label}
    </Badge>
  );
}

export interface CostStatusBadgeProps {
  status: CostStatus;
  size?: 'sm' | 'md';
}

/** 비용 상태 배지 (확정/추정/미확인) */
export function CostStatusBadge({ status, size = 'sm' }: CostStatusBadgeProps) {
  const meta = COST_STATUS[status];
  return (
    <Badge tone={meta.tone} size={size}>
      {meta.label}
    </Badge>
  );
}

// ---------- 비용 ----------

export interface CostCellProps {
  /** null = 미확인. 0 으로 대체하지 않는다. */
  cost_usd: number | null;
  cost_status: CostStatus;
  /** 상태 배지를 숨김 (비용 상태 컬럼이 별도로 있을 때) */
  hideBadge?: boolean;
}

/** 금액 + 작은 비용 상태 배지. UNKNOWN 이면 "미확인" 텍스트만. 우측 정렬 컬럼에서 사용. */
export function CostCell({ cost_usd, cost_status, hideBadge }: CostCellProps) {
  const unknown = cost_status === 'UNKNOWN' || cost_usd === null;
  return (
    <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
      <span className={unknown ? 'text-xs text-warning' : 'tnum text-sm text-ink'}>{unknown ? '미확인' : formatUsd(cost_usd)}</span>
      {!hideBadge && !unknown && <CostStatusBadge status={cost_status} />}
    </span>
  );
}

export interface EstimatedTotalLabelProps {
  confirmed: number;
  estimated: number;
  unknownCount: number;
  /** 구독료 등 추가 금액(확정 성격). 총 관리 비용 표시 시 사용 */
  extra?: number;
  /** 금액 크기 */
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
}

/**
 * 확정+추정 합계 라벨. 추정이 있으면 "$X (추정 포함)", 미확인 건수가 있으면 "미확인 N건" 안내.
 * UNKNOWN 은 금액에 포함하지 않는다.
 */
export function EstimatedTotalLabel({ confirmed, estimated, unknownCount, extra = 0, size = 'md', align = 'right' }: EstimatedTotalLabelProps) {
  const total = confirmed + estimated + extra;
  const includesEstimated = estimated > 0;
  const sizeClass = size === 'lg' ? 'text-2xl font-bold' : size === 'sm' ? 'text-sm font-medium' : 'text-base font-semibold';
  return (
    <span className={`inline-flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className={`tnum text-ink ${sizeClass}`}>{formatUsd(total)}</span>
        {includesEstimated && (
          <Badge tone="estimated" size="sm">
            추정 포함
          </Badge>
        )}
      </span>
      {unknownCount > 0 && <span className="text-[11px] text-warning">비용 미확인 {unknownCount}건 제외</span>}
    </span>
  );
}

// ---------- 모델 ----------

export interface ModelCellProps {
  /** requested_model (OpenRouter model id) */
  requested: string;
  /** actual_model. null = 실제 모델 미확인 */
  actual: string | null;
  /** 모델 id 도 함께 캡션 표시 */
  showId?: boolean;
  /** 실행 상태. 종료되지 않은 호출(PENDING/RUNNING/CANCELLED)은 실제 모델이 아직 없는 것이 정상이므로 경고 톤을 쓰지 않는다 */
  status?: ExecStatus;
}

const NON_TERMINAL: ReadonlySet<ExecStatus> = new Set<ExecStatus>(['PENDING', 'RUNNING', 'CANCELLED']);

/** 요청 모델 표시명 + 실제 모델이 다르거나 미확인이면 캡션 */
export function ModelCell({ requested, actual, showId, status }: ModelCellProps) {
  const names = useNames();
  const differs = actual !== null && actual !== requested;
  const inFlight = status !== undefined && NON_TERMINAL.has(status);
  return (
    <span className="inline-flex min-w-0 flex-col leading-tight">
      <span className="truncate text-sm text-ink" title={requested}>
        {names.model(requested)}
      </span>
      {showId && <span className="truncate font-mono text-[11px] text-ink-muted">{requested}</span>}
      {actual === null && (inFlight ? <span className="text-[11px] text-ink-muted">실제 미정</span> : <span className="text-[11px] text-warning">실제 미확인</span>)}
      {differs && (
        <span className="truncate text-[11px] text-ink-muted" title={actual}>
          실제: {names.model(actual)}
        </span>
      )}
    </span>
  );
}

// ---------- 토큰 ----------

export interface TokensCellProps {
  input: number | null;
  output: number | null;
}

/** "Input / Output" 토큰을 한 셀에 표시 (우측 정렬) */
export function TokensCell({ input, output }: TokensCellProps) {
  return (
    <span className="tnum inline-flex items-baseline gap-1 whitespace-nowrap text-sm text-ink">
      <span title="Input Token">{formatTokens(input)}</span>
      <span className="text-ink-muted">/</span>
      <span title="Output Token">{formatTokens(output)}</span>
    </span>
  );
}

// ---------- ID ----------

export interface RequestIdCellProps {
  id: string;
  short?: boolean;
}

/** Request ID: 클릭 시 공통 호출 상세 Drawer 열기 + 복사 버튼 */
export function RequestIdCell({ id, short = true }: RequestIdCellProps) {
  const { openRequest } = useRequestDetail();
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openRequest(id);
        }}
        title={`${id} 상세 보기`}
        className="font-mono text-xs text-primary hover:underline"
      >
        {short ? shortId(id) : id}
      </button>
      <CopyButton value={id} />
    </span>
  );
}

export interface SimulationIdCellProps {
  id: string | null;
  short?: boolean;
}

/** Simulation ID: `/simulations/:id` 링크 + 복사. null 이면 "-" */
export function SimulationIdCell({ id, short = false }: SimulationIdCellProps) {
  if (!id) return <span className="text-xs text-ink-muted">-</span>;
  return <CopyableId value={id} short={short} link={`/simulations/${encodeURIComponent(id)}`} />;
}

// ---------- 예산 ----------

export interface BudgetUsageCellProps {
  status: BudgetStatus;
  /** 상태 배지를 숨김 (상태 컬럼이 별도로 있을 때) */
  hideState?: boolean;
}

/**
 * 예산 사용률: ProgressBar + % + basis 라벨 + 상태 배지.
 * UNSET 이면 "미설정" (0% 아님).
 */
export function BudgetUsageCell({ status, hideState }: BudgetUsageCellProps) {
  if (status.state === 'UNSET' || status.pct === null) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-ink-muted">미설정</span>
        {!hideState && <BudgetStateBadge state="UNSET" />}
      </span>
    );
  }
  const tone = BUDGET_STATE[status.state].tone;
  const confirmedPct = status.amountUsd ? (status.spentConfirmedUsd / status.amountUsd) * 100 : null;
  return (
    <span className="inline-flex min-w-[160px] flex-col gap-0.5">
      <span className="flex items-center gap-2">
        <ProgressBar value={status.pct} tone={tone} showValue={false} className="flex-1" label="예산 사용률" />
        <span className="tnum w-14 shrink-0 text-right text-xs font-medium text-ink">{formatPct(status.pct, 1)}</span>
        {!hideState && <BudgetStateBadge state={status.state} />}
      </span>
      <span
        className="text-[11px] text-ink-muted"
        title={status.basis === 'INCLUDING_ESTIMATED' && confirmedPct !== null ? `확정 기준 ${formatPct(confirmedPct, 1)}` : undefined}
      >
        {BASIS_LABEL[status.basis]}
        {status.unknownCount > 0 && ` · 미확인 ${status.unknownCount}건 제외`}
      </span>
    </span>
  );
}

export function BudgetStateBadge({ state, size = 'sm' }: { state: BudgetStatus['state']; size?: 'sm' | 'md' }) {
  const meta = BUDGET_STATE[state];
  return (
    <Badge tone={meta.tone} size={size} dot>
      {meta.label}
    </Badge>
  );
}

// ---------- 유틸 ----------

/** 작은 복사 버튼 (ID 텍스트가 버튼/링크인 셀에서 CopyableId 대신 사용). 복사 로직·피드백은 CopyableId 와 동일 */
export function CopyButton({ value }: { value: string }) {
  const [result, setResult] = useState<'copied' | 'failed' | null>(null);
  useEffect(() => {
    if (!result) return;
    const t = window.setTimeout(() => setResult(null), 1500);
    return () => window.clearTimeout(t);
  }, [result]);
  const copied = result === 'copied';
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label={copied ? '복사됨' : `${value} 복사`}
        onClick={async (e) => {
          e.stopPropagation();
          setResult((await copyText(value)) ? 'copied' : 'failed');
        }}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-neutral-bg hover:text-ink"
      >
        {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      </button>
      {result && (
        <span className={copied ? 'text-[11px] text-success' : 'text-[11px] text-danger'} role="status">
          {copied ? '복사됨' : '복사 실패'}
        </span>
      )}
    </span>
  );
}
