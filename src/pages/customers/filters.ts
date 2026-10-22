/**
 * P-01 조회 조건 (URL query 유지). 목록/상세 화면이 같은 키를 사용해 이동 후에도 보존된다.
 */
import { useCallback, useMemo } from 'react';
import { presetRange, type SortState } from '../../components/ui';
import { isValidRange } from '../../domain/aggregate';
import type { DateRange, Granularity } from '../../domain/types';
import { useUrlState } from '../../hooks/useUrlState';

export interface CustomerFilterState extends Record<string, string> {
  customer: string;
  service: string;
  model: string;
  start: string;
  end: string;
  granularity: string;
  /** 상세 이력 테이블 비용 상태 필터 ('' | 'UNKNOWN') */
  cost: string;
  /** 테이블 정렬 유지 ("key:asc|desc", 빈 문자열이면 기본 정렬) */
  usageSort: string;
  analysisSort: string;
  historySort: string;
}

export type SortableTable = 'usageSort' | 'analysisSort' | 'historySort';

export function parseSort(v: string): SortState | undefined {
  const i = v.lastIndexOf(':');
  if (i <= 0) return undefined;
  const key = v.slice(0, i);
  const dir = v.slice(i + 1);
  return dir === 'asc' || dir === 'desc' ? { key, dir } : undefined;
}

export function serializeSort(s: SortState): string {
  return `${s.key}:${s.dir}`;
}

const DEFAULT_RANGE = presetRange(30);

export const FILTER_DEFAULTS: CustomerFilterState = {
  customer: '',
  service: '',
  model: '',
  start: DEFAULT_RANGE.start,
  end: DEFAULT_RANGE.end,
  granularity: 'day',
  cost: '',
  usageSort: '',
  analysisSort: '',
  historySort: '',
};

export const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
];

export function toGranularity(v: string): Granularity {
  return v === 'week' || v === 'month' ? v : 'day';
}

export interface AppliedFilters {
  customerId: string | null;
  serviceId: string | null;
  modelId: string | null;
  range: DateRange;
  rangeError: string | null;
  granularity: Granularity;
  costFilter: 'UNKNOWN' | null;
}

export function useCustomerFilters(opts?: { lockedCustomerId?: string }) {
  const [state, setState] = useUrlState<CustomerFilterState>(FILTER_DEFAULTS);
  const applied = useMemo<AppliedFilters>(() => {
    const range = { start: state.start, end: state.end };
    return {
      customerId: opts?.lockedCustomerId ?? (state.customer || null),
      serviceId: state.service || null,
      modelId: state.model || null,
      range,
      rangeError: isValidRange(range),
      granularity: toGranularity(state.granularity),
      costFilter: state.cost === 'UNKNOWN' ? 'UNKNOWN' : null,
    };
  }, [state, opts?.lockedCustomerId]);
  const setCostFilter = useCallback((v: 'UNKNOWN' | null) => setState({ cost: v ?? '' }), [setState]);
  /** 테이블별 정렬 상태 (URL 유지). 값이 없으면 undefined → 테이블 기본 정렬 */
  const sorts = useMemo(
    () => ({ usageSort: parseSort(state.usageSort), analysisSort: parseSort(state.analysisSort), historySort: parseSort(state.historySort) }),
    [state.usageSort, state.analysisSort, state.historySort],
  );
  const setSort = useCallback((table: SortableTable, s: SortState) => setState({ [table]: serializeSort(s) } as Partial<CustomerFilterState>), [setState]);
  return { state, setState, applied, setCostFilter, sorts, setSort };
}
