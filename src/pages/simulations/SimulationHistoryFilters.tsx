import { useMemo, useState } from 'react';
import { DateRangeInput, FilterBar, Input, Select, type SelectOption } from '../../components/ui';
import { isValidRange } from '../../domain/aggregate';
import { MODEL_STATUS, SIM_STATUS } from '../../domain/status';
import { useReferenceData } from '../../hooks/useReferenceData';
import { SIM_STATUS_VALUES, type HistoryUrlState } from './simulationRows';

export interface SimulationHistoryFiltersProps {
  applied: HistoryUrlState;
  defaults: HistoryUrlState;
  loading?: boolean;
  onApply: (next: HistoryUrlState) => void;
}

function isDirty(a: HistoryUrlState, b: HistoryUrlState): boolean {
  return (Object.keys(a) as (keyof HistoryUrlState)[]).some((k) => a[k] !== b[k]);
}

/** 필터는 로컬 draft 로 편집하고 [조회] 를 눌러야 URL(적용 상태)에 반영된다. */
export function SimulationHistoryFilters({ applied, defaults, loading, onApply }: SimulationHistoryFiltersProps) {
  const ref = useReferenceData();
  // 적용 상태가 바뀌면(조회/초기화/뒤로가기) draft 를 다시 맞춘다 (렌더 중 파생, effect 불필요)
  const [draftState, setDraftState] = useState<{ base: HistoryUrlState; value: HistoryUrlState }>({ base: applied, value: applied });
  const draft = draftState.base === applied ? draftState.value : applied;
  const setDraft = (fn: (d: HistoryUrlState) => HistoryUrlState) => setDraftState({ base: applied, value: fn(draft) });

  const scenarioOptions = useMemo<SelectOption[]>(
    () => [...ref.scenarios.map((s) => ({ value: s.scenario_id, label: s.name })), { value: 'CUSTOM', label: 'Custom Prompt' }],
    [ref.scenarios],
  );
  const modelOptions = useMemo<SelectOption[]>(
    () =>
      [...ref.models]
        .sort((a, b) => a.display_name.localeCompare(b.display_name, 'ko'))
        .map((m) => ({ value: m.model_id, label: `${m.display_name} (${MODEL_STATUS[m.status].label})` })),
    [ref.models],
  );
  const statusOptions = useMemo<SelectOption[]>(() => SIM_STATUS_VALUES.map((s) => ({ value: s, label: SIM_STATUS[s].label })), []);

  const rangeError = isValidRange({ start: draft.start, end: draft.end });
  const pending = isDirty(draft, applied);

  return (
    <FilterBar
      onSubmit={() => {
        if (rangeError) return;
        onApply({ ...draft, sim: draft.sim.trim() });
      }}
      pending={pending}
      loading={loading}
      onReset={() => {
        setDraft(() => defaults);
        onApply(defaults);
      }}
    >
      <DateRangeInput value={{ start: draft.start, end: draft.end }} onChange={(r) => setDraft((d) => ({ ...d, start: r.start, end: r.end }))} error={rangeError} />
      <Select label="시나리오" value={draft.scenario} onChange={(v) => setDraft((d) => ({ ...d, scenario: v }))} options={scenarioOptions} allowEmptyLabel="전체" containerClassName="w-44" />
      <Select label="모델" value={draft.model} onChange={(v) => setDraft((d) => ({ ...d, model: v }))} options={modelOptions} allowEmptyLabel="전체" containerClassName="w-56" />
      <Select label="실행 상태" value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} options={statusOptions} allowEmptyLabel="전체" containerClassName="w-36" />
      <Input
        label="Simulation ID"
        value={draft.sim}
        onChange={(e) => setDraft((d) => ({ ...d, sim: e.target.value }))}
        placeholder="SIM-20260101-001"
        className="font-mono"
        containerClassName="w-52"
      />
    </FilterBar>
  );
}
