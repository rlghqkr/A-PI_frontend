import { useMemo, useState } from 'react';
import { DateRangeInput, FilterBar, Select } from '../../components/ui';
import { isValidRange } from '../../domain/aggregate';
import { INTERNAL_ORIGIN_OPTIONS } from '../../features/shared/origin';
import { useReferenceData } from '../../hooks/useReferenceData';
import type { InternalFilterState } from './useInternalData';

export interface InternalFilterBarProps {
  applied: InternalFilterState;
  defaults: InternalFilterState;
  onApply: (next: InternalFilterState) => void;
  loading?: boolean;
  /** 프로젝트 상세에서는 프로젝트 필터를 숨긴다 */
  hideProject?: boolean;
}

const GRANULARITY_OPTIONS = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
];

function same(a: InternalFilterState, b: InternalFilterState): boolean {
  return (Object.keys(a) as (keyof InternalFilterState)[]).every((k) => a[k] === b[k]);
}

/** 초안(draft) 편집 → "조회" 로 적용. 적용 전 변경은 "적용 대기" 표시 */
export function InternalFilterBar({ applied, defaults, onApply, loading, hideProject }: InternalFilterBarProps) {
  const ref = useReferenceData();
  const [draft, setDraft] = useState<InternalFilterState>(applied);
  // 적용 상태가 바뀌면(조회/초기화/뒤로가기) 초안을 동기화 — 렌더 중 이전 props 비교 패턴
  const [prevApplied, setPrevApplied] = useState(applied);
  if (prevApplied !== applied) {
    setPrevApplied(applied);
    setDraft(applied);
  }

  const rangeError = isValidRange({ start: draft.start, end: draft.end });
  const pending = !same(draft, applied);

  const projectOptions = useMemo(() => ref.projects.map((p) => ({ value: p.project_id, label: p.name })), [ref.projects]);
  const userOptions = useMemo(() => ref.users.map((u) => ({ value: u.user_id, label: u.team ? `${u.name} · ${u.team}` : u.name })), [ref.users]);
  const modelOptions = useMemo(() => ref.models.map((m) => ({ value: m.model_id, label: m.status === 'INACTIVE' ? `${m.display_name} (INACTIVE)` : m.display_name })), [ref.models]);

  const patch = (p: Partial<InternalFilterState>) => setDraft((d) => ({ ...d, ...p }) as InternalFilterState);

  return (
    <FilterBar
      onSubmit={() => {
        if (rangeError) return;
        onApply(draft);
      }}
      onReset={() => {
        setDraft(defaults);
        onApply(defaults);
      }}
      pending={pending}
      loading={loading}
    >
      {!hideProject && <Select label="프로젝트" value={draft.project} onChange={(v) => patch({ project: v })} options={projectOptions} allowEmptyLabel="전체" containerClassName="w-[200px]" />}
      <Select label="구성원" value={draft.user} onChange={(v) => patch({ user: v })} options={userOptions} allowEmptyLabel="전체" containerClassName="w-[180px]" />
      <Select label="모델" value={draft.model} onChange={(v) => patch({ model: v })} options={modelOptions} allowEmptyLabel="전체" containerClassName="w-[200px]" />
      <Select label="호출 출처" value={draft.origin} onChange={(v) => patch({ origin: v })} options={INTERNAL_ORIGIN_OPTIONS} allowEmptyLabel="전체" containerClassName="w-[150px]" />
      <DateRangeInput value={{ start: draft.start, end: draft.end }} onChange={(r) => patch({ start: r.start, end: r.end })} error={rangeError ?? undefined} />
      <Select label="집계 단위" value={draft.g} onChange={(v) => patch({ g: v })} options={GRANULARITY_OPTIONS} containerClassName="w-[100px]" />
    </FilterBar>
  );
}
