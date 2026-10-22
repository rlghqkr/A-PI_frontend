/**
 * 집계 규칙의 단일 구현. 화면 컴포넌트는 이 모듈만 사용한다.
 * 불변조건: 동일한 필터 입력에서 요약 합계 == 상세 합계 (같은 배열을 입력으로 쓴다).
 */
import type {
  AIRequest,
  Budget,
  BudgetState,
  DateRange,
  ExecStatus,
  Granularity,
  SimulationRun,
  SimulationStatus,
  SubscriptionCost,
} from './types';
import type { SimCostState } from './status';
import { kstDateEndIso, kstDateStartIso, kstWeekStart, toKstDate, toKstMonth } from './format';

export interface UsageSummary {
  calls: number;
  tasks: number; // distinct task_id
  tasksUnidentified: number; // task_id 없는 호출 수 (DD-17)
  success: number;
  failed: number;
  timeout: number;
  cancelled: number;
  pending: number;
  running: number;
  /** 성공 ÷ (성공+실패+Timeout) ×100, 분모 0이면 null */
  successRate: number | null;
  inputTokens: number;
  outputTokens: number;
  confirmedUsd: number;
  estimatedUsd: number;
  /** 확정+추정 (추정 포함 합계) */
  totalIncludingEstimatedUsd: number;
  /** cost_status ESTIMATED 인 호출 수 (금액이 0 이어도 '추정 포함' 라벨 판단에 사용) */
  estimatedCount: number;
  unknownCount: number;
}

export function emptySummary(): UsageSummary {
  return {
    calls: 0,
    tasks: 0,
    tasksUnidentified: 0,
    success: 0,
    failed: 0,
    timeout: 0,
    cancelled: 0,
    pending: 0,
    running: 0,
    successRate: null,
    inputTokens: 0,
    outputTokens: 0,
    confirmedUsd: 0,
    estimatedUsd: 0,
    totalIncludingEstimatedUsd: 0,
    estimatedCount: 0,
    unknownCount: 0,
  };
}

export function summarize(requests: readonly AIRequest[]): UsageSummary {
  const s = emptySummary();
  const tasks = new Set<string>();
  for (const r of requests) {
    s.calls++;
    if (r.task_id) tasks.add(r.task_id);
    else s.tasksUnidentified++;
    switch (r.status) {
      case 'SUCCESS':
        s.success++;
        break;
      case 'FAILED':
        s.failed++;
        break;
      case 'TIMEOUT':
        s.timeout++;
        break;
      case 'CANCELLED':
        s.cancelled++;
        break;
      case 'PENDING':
        s.pending++;
        break;
      case 'RUNNING':
        s.running++;
        break;
    }
    s.inputTokens += r.input_tokens ?? 0;
    s.outputTokens += r.output_tokens ?? 0;
    addCost(s, r);
  }
  s.tasks = tasks.size;
  const denom = s.success + s.failed + s.timeout;
  s.successRate = denom === 0 ? null : (s.success / denom) * 100;
  s.totalIncludingEstimatedUsd = round6(s.confirmedUsd + s.estimatedUsd);
  s.confirmedUsd = round6(s.confirmedUsd);
  s.estimatedUsd = round6(s.estimatedUsd);
  return s;
}

function addCost(s: UsageSummary, r: AIRequest) {
  if (r.cost_status === 'CONFIRMED' && r.cost_usd !== null) s.confirmedUsd += r.cost_usd;
  else if (r.cost_status === 'ESTIMATED' && r.cost_usd !== null) {
    s.estimatedUsd += r.cost_usd;
    s.estimatedCount++;
  } else s.unknownCount++; // UNKNOWN 은 금액 합산 제외, 건수만
}

export function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

// ---------- 필터 ----------

export function inRange(r: AIRequest, range: DateRange): boolean {
  const start = kstDateStartIso(range.start);
  const end = kstDateEndIso(range.end);
  return r.requested_at >= start && r.requested_at <= end;
}

export function isValidRange(range: DateRange): string | null {
  if (!range.start || !range.end) return '시작일과 종료일을 입력하세요.';
  if (range.start > range.end) return '시작일이 종료일보다 늦을 수 없습니다.';
  const days = (new Date(range.end).getTime() - new Date(range.start).getTime()) / 86400000;
  if (days > 366) return '조회 기간은 최대 1년입니다.';
  return null;
}

// ---------- 그룹 집계 ----------

export interface GroupSummary<K extends string = string> extends UsageSummary {
  key: K;
  label: string;
}

export function groupSummaries<K extends string>(
  requests: readonly AIRequest[],
  keyOf: (r: AIRequest) => K,
  labelOf: (k: K) => string,
): GroupSummary<K>[] {
  const buckets = new Map<K, AIRequest[]>();
  for (const r of requests) {
    const k = keyOf(r);
    const arr = buckets.get(k);
    if (arr) arr.push(r);
    else buckets.set(k, [r]);
  }
  return [...buckets.entries()].map(([key, arr]) => ({ key, label: labelOf(key), ...summarize(arr) }));
}

export function bucketKey(iso: string, g: Granularity): string {
  const d = toKstDate(iso);
  if (g === 'day') return d;
  if (g === 'week') return kstWeekStart(d);
  return d.slice(0, 7);
}

export interface TrendPoint extends UsageSummary {
  key: string;
  label: string;
}

/** 기간 내 모든 버킷을 0으로 채운 추이 (빈 날짜도 표시) */
export function trend(requests: readonly AIRequest[], range: DateRange, g: Granularity): TrendPoint[] {
  const map = new Map<string, AIRequest[]>();
  for (const r of requests) {
    const k = bucketKey(r.requested_at, g);
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  const keys = allBuckets(range, g);
  for (const k of map.keys()) if (!keys.includes(k)) keys.push(k);
  keys.sort();
  return keys.map((key) => ({ key, label: g === 'month' ? key : key.slice(5), ...summarize(map.get(key) ?? []) }));
}

function allBuckets(range: DateRange, g: Granularity): string[] {
  const out: string[] = [];
  const cur = new Date(`${range.start}T00:00:00+09:00`);
  const end = new Date(`${range.end}T00:00:00+09:00`);
  const seen = new Set<string>();
  while (cur <= end) {
    const k = bucketKey(cur.toISOString(), g);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

// ---------- 예산 ----------

export interface BudgetStatus {
  state: BudgetState;
  amountUsd: number | null;
  spentUsd: number; // basis 기준 사용액
  spentConfirmedUsd: number;
  spentIncludingEstimatedUsd: number;
  pct: number | null;
  remainingUsd: number | null;
  /** 사용률 산정 기준 (DD-03) */
  basis: 'CONFIRMED' | 'INCLUDING_ESTIMATED';
  warningPct: number | null;
  unknownCount: number;
}

export function budgetStatus(budget: Budget | null | undefined, usage: Pick<UsageSummary, 'confirmedUsd' | 'estimatedUsd' | 'unknownCount'>): BudgetStatus {
  const includesEstimated = usage.estimatedUsd > 0;
  const spentIncl = round6(usage.confirmedUsd + usage.estimatedUsd);
  const basis: BudgetStatus['basis'] = includesEstimated ? 'INCLUDING_ESTIMATED' : 'CONFIRMED';
  const spent = basis === 'CONFIRMED' ? usage.confirmedUsd : spentIncl;
  if (!budget || budget.amount_usd <= 0) {
    return {
      state: 'UNSET',
      amountUsd: null,
      spentUsd: spent,
      spentConfirmedUsd: usage.confirmedUsd,
      spentIncludingEstimatedUsd: spentIncl,
      pct: null,
      remainingUsd: null,
      basis,
      warningPct: null,
      unknownCount: usage.unknownCount,
    };
  }
  const pct = (spent / budget.amount_usd) * 100;
  let state: BudgetState = 'NORMAL';
  if (pct >= 100) state = 'EXCEEDED';
  else if (pct >= budget.warning_pct) state = 'WARNING';
  return {
    state,
    amountUsd: budget.amount_usd,
    spentUsd: spent,
    spentConfirmedUsd: usage.confirmedUsd,
    spentIncludingEstimatedUsd: spentIncl,
    pct,
    remainingUsd: round6(budget.amount_usd - spent),
    basis,
    warningPct: budget.warning_pct,
    unknownCount: usage.unknownCount,
  };
}

export const BASIS_LABEL: Record<BudgetStatus['basis'], string> = {
  CONFIRMED: '확정 기준',
  INCLUDING_ESTIMATED: '추정 포함 기준',
};

// ---------- 구독료 ----------

export function monthsInRange(range: DateRange): string[] {
  const out: string[] = [];
  let m = range.start.slice(0, 7);
  const end = range.end.slice(0, 7);
  while (m <= end) {
    out.push(m);
    const [y, mo] = m.split('-').map(Number);
    const next = new Date(Date.UTC(y, mo, 1));
    m = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return out;
}

/** 적용 월이 기간에 포함되는 ACTIVE 구독료 합계. 중복 합산 없음(구독 1건 = 1회). */
export function subscriptionTotal(subs: readonly SubscriptionCost[], range: DateRange, projectId?: string | null): number {
  const months = new Set(monthsInRange(range));
  let total = 0;
  for (const s of subs) {
    if (s.status !== 'ACTIVE') continue;
    if (!months.has(s.month)) continue;
    if (projectId !== undefined && s.project_id !== projectId) continue;
    total += s.amount;
  }
  return round6(total);
}

export function subscriptionsByMonth(subs: readonly SubscriptionCost[], range: DateRange): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of monthsInRange(range)) map.set(m, 0);
  for (const s of subs) {
    if (s.status !== 'ACTIVE' || !map.has(s.month)) continue;
    map.set(s.month, round6((map.get(s.month) ?? 0) + s.amount));
  }
  return map;
}

// ---------- 시뮬레이션 상태 ----------

/** DD-11: 모든 모델의 종료 상태가 확정된 후 전체 상태 계산 */
export function computeSimulationStatus(statuses: readonly ExecStatus[]): SimulationStatus {
  if (statuses.length === 0) return 'PENDING';
  if (statuses.some((s) => s === 'RUNNING')) return 'RUNNING';
  if (statuses.every((s) => s === 'PENDING')) return 'PENDING';
  if (statuses.some((s) => s === 'PENDING')) return 'RUNNING';
  const success = statuses.filter((s) => s === 'SUCCESS').length;
  if (success === statuses.length) return 'SUCCESS';
  if (success > 0) return 'PARTIAL_SUCCESS';
  if (statuses.every((s) => s === 'CANCELLED')) return 'CANCELLED';
  return 'FAILED';
}

/** DD-12: 시뮬레이션 단위 비용 확인 상태 */
export function simulationCostState(requests: readonly AIRequest[], run?: Pick<SimulationRun, 'status'>): SimCostState {
  if (run && (run.status === 'RUNNING' || run.status === 'PENDING')) return 'IN_PROGRESS';
  if (requests.some((r) => r.status === 'RUNNING' || r.status === 'PENDING')) return 'IN_PROGRESS';
  if (requests.some((r) => r.cost_status === 'UNKNOWN')) return 'INCLUDES_UNKNOWN';
  if (requests.some((r) => r.cost_status === 'ESTIMATED')) return 'INCLUDES_ESTIMATED';
  return 'CONFIRMED';
}

/** 추정 비용 계산 (Token × 단가 / 1M). 단가 없으면 null */
export function estimateCost(
  inputTokens: number | null,
  outputTokens: number | null,
  pricing: { input_per_1m_usd: number; output_per_1m_usd: number } | null,
): number | null {
  if (!pricing || inputTokens === null || outputTokens === null) return null;
  return round6((inputTokens * pricing.input_per_1m_usd + outputTokens * pricing.output_per_1m_usd) / 1_000_000);
}

export function sumUsd(values: readonly (number | null)[]): number {
  return round6(values.reduce<number>((a, v) => a + (v ?? 0), 0));
}

export { toKstMonth };
