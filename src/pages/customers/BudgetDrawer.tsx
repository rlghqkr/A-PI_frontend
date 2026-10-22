import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Button, Drawer, InlineAlert, Input, NumberInput, useToast } from '../../components/ui';
import { formatUsd } from '../../domain/format';
import type { Budget } from '../../domain/types';
import { useMutation } from '../../hooks/useAsync';
import { findCustomerBudget } from './useCustomerUsageData';

export interface BudgetDrawerProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  /** 기본 선택 월 (YYYY-MM) */
  month: string;
  /** 수정 시 기존 예산 */
  existing: Budget | null;
  /** 전체 예산 목록 — 입력한 월에 이미 예산이 있는지 판단 */
  budgets: readonly Budget[] | null;
  onSaved: (budget: Budget) => void;
}

const MONTH_RE = /^\d{4}-\d{2}$/;

export function BudgetDrawer({ open, onClose, customerId, customerName, month, existing, budgets, onSaved }: BudgetDrawerProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<{ month: string; amount: number | null; warningPct: number | null }>({ month, amount: null, warningPct: 80 });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const save = useMutation(useCallback((input: Parameters<typeof api.upsertBudget>[0]) => api.upsertBudget(input), []));

  useEffect(() => {
    if (!open) return;
    setForm({ month: existing?.month ?? month, amount: existing?.amount_usd ?? null, warningPct: existing?.warning_pct ?? 80 });
    setLocalErrors({});
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing, month]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!MONTH_RE.test(form.month)) errs.month = '적용 월 형식은 YYYY-MM 입니다.';
    if (form.amount === null || !(form.amount > 0)) errs.amount_usd = '예산은 0보다 큰 USD 금액이어야 합니다.';
    if (form.warningPct === null || form.warningPct < 1 || form.warningPct > 100) errs.warning_pct = '경고 기준은 1~100% 입니다.';
    setLocalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const out = await save.run({
      owner_type: 'CUSTOMER',
      owner_id: customerId,
      month: form.month,
      amount_usd: form.amount ?? 0,
      warning_pct: form.warningPct ?? 80,
    });
    if (!out) return;
    toast({ tone: 'success', title: isEdit ? '예산이 수정되었습니다' : '예산이 등록되었습니다', description: `${customerName} · ${out.month} · ${formatUsd(out.amount_usd)}` });
    onSaved(out);
    onClose();
  };

  const errors = { ...localErrors, ...save.fieldErrors };
  // 실제 저장 대상: 입력한 월에 이미 있는 예산 (upsert 는 고객+월 기준으로 덮어쓴다)
  const targetExisting = useMemo(
    () => (existing && existing.month === form.month ? existing : findCustomerBudget(budgets, customerId, form.month)),
    [existing, budgets, customerId, form.month],
  );
  const isEdit = targetExisting !== null;
  const monthChanged = existing !== null && existing.month !== form.month;
  const monthHint = !monthChanged
    ? 'KST 월 기준 (YYYY-MM)'
    : targetExisting
      ? `${form.month} 에는 이미 예산(${formatUsd(targetExisting.amount_usd)})이 있어 저장 시 해당 월 예산이 수정됩니다.`
      : '다른 월을 입력하면 새 예산으로 등록됩니다.';
  const formId = 'budget-drawer-form';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? '월 예산 수정' : '월 예산 등록'}
      description={`${customerName} (${customerId}) · 고객 단위 월 예산 (USD). 원가 기준이며 청구액이 아닙니다.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.loading}>
            취소
          </Button>
          <Button type="submit" form={formId} loading={save.loading}>
            저장
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {save.error && !Object.keys(save.fieldErrors).length && <InlineAlert tone="danger" title="저장 실패">{save.error}</InlineAlert>}
        <Input
          label="적용 월"
          required
          type="month"
          value={form.month}
          onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
          error={errors.month}
          hint={monthHint}
          className="tnum"
        />
        <NumberInput
          label="월 예산 금액"
          required
          value={form.amount}
          onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
          min={0}
          step={0.01}
          suffix="USD"
          error={errors.amount_usd}
          placeholder="예: 500"
        />
        <NumberInput
          label="경고 기준"
          required
          value={form.warningPct}
          onChange={(v) => setForm((f) => ({ ...f, warningPct: v }))}
          min={1}
          max={100}
          step={1}
          suffix="%"
          error={errors.warning_pct}
          hint="사용률이 이 비율 이상이면 '주의', 100% 이상이면 '초과' 로 표시 (DD-02 기본 80%)"
        />
      </form>
    </Drawer>
  );
}
