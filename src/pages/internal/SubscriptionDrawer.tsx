import { useMemo, useState } from 'react';
import { api, type SubscriptionInput } from '../../api';
import { Button, Drawer, InlineAlert, Input, NumberInput, Select, Textarea, useToast } from '../../components/ui';
import { formatUsd } from '../../domain/format';
import type { SubscriptionCost } from '../../domain/types';
import { useMutation } from '../../hooks/useAsync';
import { useReferenceData } from '../../hooks/useReferenceData';

export interface SubscriptionDrawerProps {
  open: boolean;
  onClose: () => void;
  /** 편집 대상. null 이면 신규 등록 */
  subscription: SubscriptionCost | null;
  /** 기본 적용 월 (YYYY-MM) / 기본 귀속 프로젝트 */
  defaultMonth: string;
  defaultProjectId?: string | null;
  onSaved: (saved: SubscriptionCost) => void;
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE (집계 포함)' },
  { value: 'CANCELLED', label: 'CANCELLED (집계 제외)' },
];

/** 폼 상태. 금액은 입력 전/비운 상태를 구분하기 위해 null 허용 (빈 값을 $0 으로 저장하지 않는다) */
type SubscriptionForm = Omit<SubscriptionInput, 'amount'> & { amount: number | null };

function toForm(s: SubscriptionCost | null, month: string, projectId: string | null): SubscriptionForm {
  return s
    ? { tool_name: s.tool_name, plan: s.plan, month: s.month, amount: s.amount, project_id: s.project_id, status: s.status, note: s.note }
    : { tool_name: '', plan: '', month, amount: null, project_id: projectId, status: 'ACTIVE', note: '' };
}

function localValidate(f: SubscriptionForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.tool_name.trim()) e.tool_name = '도구명은 필수입니다.';
  if (!/^\d{4}-\d{2}$/.test(f.month)) e.month = '적용 월 형식은 YYYY-MM 입니다.';
  if (f.amount === null || Number.isNaN(f.amount)) e.amount = '금액을 입력하세요.';
  else if (!(f.amount > 0)) e.amount = '금액은 0보다 커야 합니다.';
  return e;
}

/** 구독료 등록/편집 Drawer. 통화는 USD 고정(DD-21). 귀속 프로젝트는 미배분 허용 */
export function SubscriptionDrawer({ open, onClose, subscription, defaultMonth, defaultProjectId = null, onSaved }: SubscriptionDrawerProps) {
  // Drawer 는 닫히면 children 을 unmount 하므로 폼 상태는 내부 컴포넌트에 둔다 (열 때마다 초기화)
  const [pending, setPending] = useState(false);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={subscription ? '구독료 편집' : '구독료 등록'}
      description={subscription ? `${subscription.subscription_id} · 적용 월 기준으로 집계되며 일별 배분·구성원 배분 없음` : '적용 월 기준으로 집계되며 일별 배분·구성원 배분 없음'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button type="submit" form="subscription-form" loading={pending}>
            {subscription ? '저장' : '등록'}
          </Button>
        </>
      }
    >
      <SubscriptionForm subscription={subscription} initial={toForm(subscription, defaultMonth, defaultProjectId)} onPending={setPending} onSaved={onSaved} onClose={onClose} />
    </Drawer>
  );
}

interface SubscriptionFormProps {
  subscription: SubscriptionCost | null;
  initial: SubscriptionForm;
  onPending: (v: boolean) => void;
  onSaved: (saved: SubscriptionCost) => void;
  onClose: () => void;
}

function SubscriptionForm({ subscription, initial, onPending, onSaved, onClose }: SubscriptionFormProps) {
  const ref = useReferenceData();
  const { toast } = useToast();
  const [form, setForm] = useState<SubscriptionForm>(initial);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const mutation = useMutation((input: SubscriptionInput) => (subscription ? api.updateSubscription(subscription.subscription_id, input) : api.createSubscription(input)));
  const errors = { ...mutation.fieldErrors, ...localErrors };
  const projectOptions = useMemo(() => ref.projects.map((p) => ({ value: p.project_id, label: p.name })), [ref.projects]);
  const patch = (p: Partial<SubscriptionForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setLocalErrors({});
  };

  const submit = async () => {
    const e = localValidate(form);
    if (Object.keys(e).length || form.amount === null) {
      setLocalErrors(e);
      return;
    }
    onPending(true);
    const saved = await mutation.run({ ...form, amount: form.amount, tool_name: form.tool_name.trim(), plan: form.plan.trim(), note: form.note.trim() });
    onPending(false);
    if (!saved) return;
    toast({ tone: 'success', title: subscription ? '구독료가 수정되었습니다' : '구독료가 등록되었습니다', description: `${saved.tool_name} · ${saved.month} · ${formatUsd(saved.amount)}${saved.project_id ? '' : ' · 미배분'}` });
    onSaved(saved);
    onClose();
  };

  return (
    <form
      id="subscription-form"
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {mutation.error && !Object.keys(mutation.fieldErrors).length && (
        <InlineAlert tone="danger" title="저장 실패">
          {mutation.error}
        </InlineAlert>
      )}
      <Input label="도구명" required value={form.tool_name} onChange={(e) => patch({ tool_name: e.target.value })} error={errors.tool_name} placeholder="예: ChatGPT Team" />
      <Input label="플랜 / 유형" value={form.plan} onChange={(e) => patch({ plan: e.target.value })} error={errors.plan} placeholder="예: Team 5석" />
      <Input label="적용 월" required type="month" value={form.month} onChange={(e) => patch({ month: e.target.value })} error={errors.month} hint="YYYY-MM. 해당 월의 구독료로 1회 집계" />
      <NumberInput label="금액" required value={form.amount} onChange={(v) => patch({ amount: v })} min={0} step={0.01} suffix="USD" error={errors.amount} hint="통화는 USD 고정" placeholder="예: 150" />
      <Select label="귀속 프로젝트" value={form.project_id ?? ''} onChange={(v) => patch({ project_id: v || null })} options={projectOptions} allowEmptyLabel="미배분" error={errors.project_id} hint="미배분 구독료는 프로젝트 예산에 포함되지 않고 전체 합계에만 반영" />
      <Select label="상태" value={form.status} onChange={(v) => patch({ status: v === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE' })} options={STATUS_OPTIONS} error={errors.status} hint="CANCELLED 는 합계에서 제외" />
      <Textarea label="메모" value={form.note} onChange={(e) => patch({ note: e.target.value })} rows={3} error={errors.note} />
    </form>
  );
}
