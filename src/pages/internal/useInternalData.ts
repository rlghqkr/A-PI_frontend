/**
 * P-02 조회 상태(URL) + 데이터 로딩 + 파생 집계.
 * 모든 KPI/차트/테이블은 여기서 반환하는 동일한 `requests` 배열에서 파생된다.
 */
import { useCallback, useMemo, useState } from 'react';
import { api } from '../../api';
import {
  budgetStatus,
  groupSummaries,
  isValidRange,
  monthsInRange,
  round6,
  subscriptionTotal,
  subscriptionsByMonth,
  summarize,
  trend,
  type BudgetStatus,
  type GroupSummary,
  type UsageSummary,
} from '../../domain/aggregate';
import { addDays, todayKst, toKstMonth } from '../../domain/format';
import type { AIRequest, Budget, DateRange, Granularity, SubscriptionCost, UsageOrigin } from '../../domain/types';
import { useAsync } from '../../hooks/useAsync';
import { useUrlState } from '../../hooks/useUrlState';
import { scrollToSection } from '../../lib/scrollToSection';

export const INTERNAL_ORIGINS: UsageOrigin[] = ['INTERNAL_DEVELOPMENT', 'SIMULATION', 'SYSTEM_TEST'];
export type InternalOrigin = 'INTERNAL_DEVELOPMENT' | 'SIMULATION' | 'SYSTEM_TEST';

export function isInternalOrigin(v: string): v is InternalOrigin {
  return (INTERNAL_ORIGINS as string[]).includes(v);
}

export interface InternalFilterState extends Record<string, string> {
  project: string;
  user: string;
  model: string;
  origin: string; // '' | InternalOrigin
  start: string;
  end: string;
  g: string; // Granularity
}

export function defaultInternalFilter(): InternalFilterState {
  const end = todayKst();
  return { project: '', user: '', model: '', origin: '', start: addDays(end, -29), end, g: 'day' };
}

export function toGranularity(v: string): Granularity {
  return v === 'week' || v === 'month' ? v : 'day';
}

export const UNCLASSIFIED = '__none__';

/** URL 과 동기화된 적용(applied) 필터 */
export function useInternalFilter(lockedProject?: string) {
  const defaults = useMemo(() => {
    const d = defaultInternalFilter();
    return lockedProject ? { ...d, project: lockedProject } : d;
  }, [lockedProject]);
  const [state, set] = useUrlState<InternalFilterState>(defaults);
  const applied = useMemo(() => (lockedProject ? { ...state, project: lockedProject } : state), [state, lockedProject]);
  const range = useMemo<DateRange>(() => ({ start: applied.start, end: applied.end }), [applied.start, applied.end]);
  const rangeError = isValidRange(range);
  const granularity = toGranularity(applied.g);
  return { applied, set, defaults, range, rangeError, granularity };
}

export interface InternalDataset {
  requests: AIRequest[];
  budgets: Budget[];
  subscriptions: SubscriptionCost[];
}

export function useInternalDataset(applied: InternalFilterState, range: DateRange, enabled: boolean) {
  return useAsync<InternalDataset>(
    async () => {
      const origins: UsageOrigin[] = isInternalOrigin(applied.origin) ? [applied.origin] : INTERNAL_ORIGINS;
      const [requests, budgets, subscriptions] = await Promise.all([
        api.queryRequests({
          origins,
          range,
          project_id: applied.project || null,
          user_id: applied.user || null,
          model_id: applied.model || null,
        }),
        api.listBudgets(),
        api.listSubscriptions(),
      ]);
      return { requests, budgets, subscriptions };
    },
    [applied.origin, applied.project, applied.user, applied.model, range.start, range.end],
    { enabled },
  );
}

export interface OriginCost {
  /** 확정+추정 합계 (추정 포함 시 hasEstimated=true) */
  usd: number;
  hasEstimated: boolean;
}

export const EMPTY_BY_ORIGIN: Record<InternalOrigin, OriginCost> = {
  INTERNAL_DEVELOPMENT: { usd: 0, hasEstimated: false },
  SIMULATION: { usd: 0, hasEstimated: false },
  SYSTEM_TEST: { usd: 0, hasEstimated: false },
};

export interface ProjectBudgetRow {
  key: string; // project_id or UNCLASSIFIED
  projectId: string | null;
  label: string;
  /** 조회 기간 전체 집계 */
  summary: UsageSummary;
  byOrigin: Record<InternalOrigin, OriginCost>;
  subscriptionUsd: number;
  budget: Budget | null;
  /** 예산 월(budgetMonth, KST) 호출만 기준으로 계산한 예산 상태 — 조회 기간이 여러 달에 걸쳐도 다른 달 사용액을 섞지 않는다 */
  status: BudgetStatus;
}

export interface InternalDerived {
  summary: UsageSummary;
  confirmedCount: number;
  estimatedCount: number;
  /** 구독료는 프로젝트 단위로만 귀속된다. 구성원·모델·출처 필터가 적용되면 해당 없음(false) */
  subscriptionApplicable: boolean;
  subscriptionUsd: number;
  subscriptionMonths: string[];
  totalManagedUsd: number;
  unclassifiedUser: UsageSummary;
  unclassifiedProject: UsageSummary;
  trendPoints: ReturnType<typeof trend>;
  monthly: { month: string; apiUsd: number; subscriptionUsd: number }[];
  byUser: GroupSummary[];
  byModel: GroupSummary[];
  byOrigin: GroupSummary[];
  projectRows: ProjectBudgetRow[];
  subscriptionsInRange: SubscriptionCost[];
  budgetMonth: string;
}

/** 프로젝트 필터가 있으면 그 프로젝트(ACTIVE)만, 없으면 전체(미배분 포함) */
function subsForProject(subs: readonly SubscriptionCost[], range: DateRange, projectId: string | null | undefined): number {
  return projectId ? subscriptionTotal(subs, range, projectId) : subscriptionTotal(subs, range);
}

export function useInternalDerived(
  data: InternalDataset | null,
  range: DateRange,
  granularity: Granularity,
  names: { project: (id: string | null | undefined) => string; user: (id: string | null | undefined) => string; model: (id: string | null | undefined) => string },
  projectFilter: string,
  /** 구성원·모델·출처 필터가 없을 때만 true. false 면 구독료 KPI 는 '해당 없음' 이고 총 관리 비용에서 제외 */
  subscriptionApplicable = true,
): InternalDerived | null {
  return useMemo(() => {
    if (!data) return null;
    const { requests, budgets, subscriptions } = data;
    const summary = summarize(requests);
    const confirmedCount = requests.filter((r) => r.cost_status === 'CONFIRMED' && r.cost_usd !== null).length;
    const estimatedCount = requests.filter((r) => r.cost_status === 'ESTIMATED' && r.cost_usd !== null).length;
    const months = monthsInRange(range);
    const subscriptionUsd = subscriptionApplicable ? subsForProject(subscriptions, range, projectFilter || null) : 0;
    const subsInRangeAll = subscriptions.filter((s) => months.includes(s.month));
    const subscriptionsInRange = projectFilter ? subsInRangeAll.filter((s) => s.project_id === projectFilter) : subsInRangeAll;
    const unclassifiedUser = summarize(requests.filter((r) => r.user_id === null));
    const unclassifiedProject = summarize(requests.filter((r) => r.project_id === null));
    const trendPoints = trend(requests, range, granularity);
    const apiByMonth = new Map<string, number>();
    for (const m of months) apiByMonth.set(m, 0);
    for (const r of requests) {
      if (r.cost_usd === null || r.cost_status === 'UNKNOWN') continue;
      const m = toKstMonth(r.requested_at);
      apiByMonth.set(m, (apiByMonth.get(m) ?? 0) + r.cost_usd);
    }
    const subByMonth = subscriptionsByMonth(projectFilter ? subscriptions.filter((s) => s.project_id === projectFilter) : subscriptions, range);
    const monthly = months.map((month) => ({ month, apiUsd: round6(apiByMonth.get(month) ?? 0), subscriptionUsd: subByMonth.get(month) ?? 0 }));

    const byUser = groupSummaries(requests, (r) => r.user_id ?? UNCLASSIFIED, (k) => (k === UNCLASSIFIED ? '미분류' : names.user(k)));
    const byModel = groupSummaries(requests, (r) => r.requested_model, (k) => names.model(k));
    const byOrigin = groupSummaries(requests, (r) => r.usage_origin, (k) => k);

    const budgetMonth = range.end.slice(0, 7);
    const projectRows: ProjectBudgetRow[] = groupSummaries(requests, (r) => r.project_id ?? UNCLASSIFIED, (k) => (k === UNCLASSIFIED ? '미분류(프로젝트)' : names.project(k))).map((g) => {
      const projectId = g.key === UNCLASSIFIED ? null : g.key;
      const rows = requests.filter((r) => (r.project_id ?? UNCLASSIFIED) === g.key);
      const byOriginMap: Record<InternalOrigin, OriginCost> = {
        INTERNAL_DEVELOPMENT: { usd: 0, hasEstimated: false },
        SIMULATION: { usd: 0, hasEstimated: false },
        SYSTEM_TEST: { usd: 0, hasEstimated: false },
      };
      for (const r of rows) {
        if (r.cost_usd === null || r.cost_status === 'UNKNOWN' || r.usage_origin === 'CUSTOMER_SERVICE') continue;
        const o = byOriginMap[r.usage_origin];
        o.usd = round6(o.usd + r.cost_usd);
        if (r.cost_status === 'ESTIMATED') o.hasEstimated = true;
      }
      const budget = projectId ? budgets.find((b) => b.owner_type === 'PROJECT' && b.owner_id === projectId && b.month === budgetMonth) ?? null : null;
      // 사용률은 예산 월(KST)에 속한 호출만 기준 (조회 기간이 여러 달이어도 다른 달 사용액을 합산하지 않음)
      const budgetUsage = summarize(rows.filter((r) => toKstMonth(r.requested_at) === budgetMonth));
      return {
        key: g.key,
        projectId,
        label: g.label,
        summary: g,
        byOrigin: byOriginMap,
        subscriptionUsd: projectId ? subscriptionTotal(subscriptions, range, projectId) : 0,
        budget,
        status: budgetStatus(budget, budgetUsage),
      };
    });
    projectRows.sort((a, b) => (a.projectId === null ? 1 : b.projectId === null ? -1 : b.status.spentIncludingEstimatedUsd - a.status.spentIncludingEstimatedUsd));

    return {
      summary,
      confirmedCount,
      estimatedCount,
      subscriptionApplicable,
      subscriptionUsd,
      subscriptionMonths: months,
      totalManagedUsd: round6(summary.confirmedUsd + summary.estimatedUsd + subscriptionUsd),
      unclassifiedUser,
      unclassifiedProject,
      trendPoints,
      monthly,
      byUser,
      byModel,
      byOrigin,
      projectRows,
      subscriptionsInRange,
      budgetMonth,
    };
  }, [data, range, granularity, names, projectFilter, subscriptionApplicable]);
}

export type DetailFocus = 'all' | 'user-unclassified' | 'project-unclassified';

function scrollToDetailTable() {
  scrollToSection('internal-detail-table');
}

/** 상세 테이블 필터(미분류 보기 · 비용 미확인만) 상태. KPI 클릭이 실제로 필터를 적용할 수 있도록 페이지 레벨에 둔다 */
export function useDetailFocus() {
  const [focus, setFocus] = useState<DetailFocus>('all');
  const [unknownOnly, setUnknownOnly] = useState(false);
  const focusDetail = useCallback((f: DetailFocus) => {
    setFocus(f);
    scrollToDetailTable();
  }, []);
  /** '비용 미확인 호출' KPI 클릭: 상세 이력에 미확인 필터를 적용하고 이동 */
  const focusUnknown = useCallback(() => {
    setUnknownOnly(true);
    scrollToDetailTable();
  }, []);
  return { focus, focusDetail, setFocus, unknownOnly, setUnknownOnly, focusUnknown };
}
