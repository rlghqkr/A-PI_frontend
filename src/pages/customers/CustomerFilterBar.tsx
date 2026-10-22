import { useEffect, useMemo, useState } from 'react';
import { DateRangeInput, FilterBar, Select, presetRange } from '../../components/ui';
import { isValidRange } from '../../domain/aggregate';
import { useReferenceData } from '../../hooks/useReferenceData';
import { FILTER_DEFAULTS, GRANULARITY_OPTIONS, type CustomerFilterState } from './filters';

export interface CustomerFilterBarProps {
  applied: CustomerFilterState;
  onApply: (next: Partial<CustomerFilterState>) => void;
  loading?: boolean;
  /** 고객 상세 화면: 고객 Select 숨김, 서비스는 해당 고객으로 제한 */
  lockedCustomerId?: string;
}

type Draft = Pick<CustomerFilterState, 'customer' | 'service' | 'model' | 'start' | 'end' | 'granularity'>;

function pick(s: CustomerFilterState): Draft {
  return { customer: s.customer, service: s.service, model: s.model, start: s.start, end: s.end, granularity: s.granularity };
}

export function CustomerFilterBar({ applied, onApply, loading, lockedCustomerId }: CustomerFilterBarProps) {
  const { customers, services, models } = useReferenceData();
  const [draft, setDraft] = useState<Draft>(() => pick(applied));

  // URL(적용 상태)이 외부에서 바뀌면(뒤로가기 등) 초안을 동기화
  const appliedKey = JSON.stringify(pick(applied));
  useEffect(() => {
    setDraft(pick(applied));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKey]);

  const customerId = lockedCustomerId ?? draft.customer;
  const serviceOptions = useMemo(
    () =>
      services
        .filter((s) => s.customer_id !== null && (!customerId || s.customer_id === customerId))
        .map((s) => ({ value: s.service_id, label: customerId ? s.name : `${s.name} (${customers.find((c) => c.customer_id === s.customer_id)?.name ?? s.customer_id})` })),
    [services, customers, customerId],
  );
  const modelOptions = useMemo(
    () => models.map((m) => ({ value: m.model_id, label: m.status === 'INACTIVE' ? `${m.display_name} (INACTIVE)` : m.display_name })),
    [models],
  );

  const rangeError = isValidRange({ start: draft.start, end: draft.end });
  const pending = JSON.stringify(draft) !== appliedKey;

  const submit = () => {
    if (rangeError) return;
    onApply({ ...draft, cost: '' });
  };
  const reset = () => {
    const d = pick({ ...FILTER_DEFAULTS, ...presetRange(30) });
    setDraft(d);
    onApply({ ...d, cost: '' });
  };

  return (
    <FilterBar onSubmit={submit} pending={pending} loading={loading} onReset={reset}>
      {!lockedCustomerId && (
        <Select
          label="고객"
          value={draft.customer}
          onChange={(v) => setDraft((d) => ({ ...d, customer: v, service: '' }))}
          allowEmptyLabel="전체 고객"
          options={customers.map((c) => ({ value: c.customer_id, label: c.name }))}
          containerClassName="w-[160px]"
        />
      )}
      <Select
        label="서비스"
        value={draft.service}
        onChange={(v) => setDraft((d) => ({ ...d, service: v }))}
        allowEmptyLabel="전체 서비스"
        options={serviceOptions}
        containerClassName="w-[200px]"
      />
      <Select
        label="모델"
        value={draft.model}
        onChange={(v) => setDraft((d) => ({ ...d, model: v }))}
        allowEmptyLabel="전체 모델"
        options={modelOptions}
        containerClassName="w-[200px]"
      />
      <DateRangeInput
        value={{ start: draft.start, end: draft.end }}
        onChange={(r) => setDraft((d) => ({ ...d, start: r.start, end: r.end }))}
        error={rangeError ?? undefined}
      />
      <Select
        label="집계 단위"
        value={draft.granularity}
        onChange={(v) => setDraft((d) => ({ ...d, granularity: v }))}
        options={GRANULARITY_OPTIONS}
        containerClassName="w-[100px]"
      />
    </FilterBar>
  );
}
