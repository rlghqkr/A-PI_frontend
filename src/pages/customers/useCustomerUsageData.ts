/**
 * P-01 데이터 조회. 요약 KPI·차트·테이블은 모두 여기서 반환한 같은 `rows` 배열에서 파생한다.
 */
import { useMemo } from 'react';
import { api } from '../../api';
import { budgetStatus, summarize, trend, type BudgetStatus, type UsageSummary } from '../../domain/aggregate';
import { toKstMonth } from '../../domain/format';
import type { AIRequest, Budget } from '../../domain/types';
import { useAsync } from '../../hooks/useAsync';
import type { useNames } from '../../hooks/useReferenceData';
import type { CustomerServiceRow } from './CustomerUsageTable';
import type { AppliedFilters } from './filters';

export function useCustomerRequests(f: AppliedFilters) {
  const enabled = f.rangeError === null;
  const requests = useAsync(
    () =>
      api.queryRequests({
        origins: ['CUSTOMER_SERVICE'],
        range: f.range,
        customer_id: f.customerId,
        service_id: f.serviceId,
        model_id: f.modelId,
      }),
    [f.range.start, f.range.end, f.customerId, f.serviceId, f.modelId],
    { enabled },
  );
  const rows = useMemo<AIRequest[]>(() => requests.data ?? [], [requests.data]);
  const summary = useMemo<UsageSummary>(() => summarize(rows), [rows]);
  const trendData = useMemo(
    () =>
      enabled
        ? trend(rows, f.range, f.granularity).map((p) => ({
            label: p.label,
            tasks: p.tasks,
            calls: p.calls,
            confirmedUsd: p.confirmedUsd,
            estimatedUsd: p.estimatedUsd,
          }))
        : [],
    [rows, f.range, f.granularity, enabled],
  );
  return { requests, rows, summary, trendData };
}

export function useBudgets() {
  return useAsync(() => api.listBudgets(), []);
}

export function findCustomerBudget(budgets: readonly Budget[] | null, customerId: string, month: string): Budget | null {
  return budgets?.find((b) => b.owner_type === 'CUSTOMER' && b.owner_id === customerId && b.month === month) ?? null;
}

/**
 * 고객의 월 예산 상태. 사용액은 전달된 rows(현재 조회 조건으로 필터된 배열) 중
 * 해당 고객·해당 월(KST) 호출만 집계한다.
 */
export function customerMonthBudget(rows: readonly AIRequest[], budgets: readonly Budget[] | null, customerId: string, month: string): BudgetStatus {
  const monthRows = rows.filter((r) => r.customer_id === customerId && toKstMonth(r.requested_at) === month);
  return budgetStatus(findCustomerBudget(budgets, customerId, month), summarize(monthRows));
}

/** DD-24: 고객×서비스 행 */
export function buildCustomerServiceRows(
  rows: readonly AIRequest[],
  budgets: readonly Budget[] | null,
  month: string,
  names: ReturnType<typeof useNames>,
): CustomerServiceRow[] {
  const buckets = new Map<string, AIRequest[]>();
  // 고객 단위 월 예산은 고객별로 한 번만 계산한다 (고객×서비스 행마다 전체 rows 를 재집계하지 않음)
  const monthRowsByCustomer = new Map<string, AIRequest[]>();
  for (const r of rows) {
    const customerId = r.customer_id ?? '';
    const k = `${customerId}|${r.service_id}`;
    const arr = buckets.get(k);
    if (arr) arr.push(r);
    else buckets.set(k, [r]);
    if (toKstMonth(r.requested_at) === month) {
      const m = monthRowsByCustomer.get(customerId);
      if (m) m.push(r);
      else monthRowsByCustomer.set(customerId, [r]);
    }
  }
  const budgetByCustomer = new Map<string, BudgetStatus>();
  const budgetFor = (customerId: string): BudgetStatus => {
    let b = budgetByCustomer.get(customerId);
    if (!b) {
      b = budgetStatus(findCustomerBudget(budgets, customerId, month), summarize(monthRowsByCustomer.get(customerId) ?? []));
      budgetByCustomer.set(customerId, b);
    }
    return b;
  };
  return [...buckets.entries()].map(([key, arr]) => {
    const customerId = arr[0].customer_id ?? '';
    const serviceId = arr[0].service_id;
    return {
      key,
      customerId,
      customerName: names.customer(customerId || null),
      serviceId,
      serviceName: names.service(serviceId),
      budget: budgetFor(customerId),
      ...summarize(arr),
    };
  });
}
