import { useState } from 'react';
import { api, type BudgetInput } from '../../api';
import { Button, Drawer, InlineAlert, Input, NumberInput, useToast } from '../../components/ui';
import { formatUsd } from '../../domain/format';
import type { Budget } from '../../domain/types';
import { useMutation } from '../../hooks/useAsync';

export interface ProjectBudgetDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  month: string; // YYYY-MM
  budget: Budget | null;
  onSaved: (b: Budget) => void;
}

const DEFAULT_WARNING = 80; // DD-02

/** 프로젝트 월 예산 등록/수정 Drawer (owner_type PROJECT) */
export function ProjectBudgetDrawer({ open, onClose, projectId, projectName, month, budget, onSaved }: ProjectBudgetDrawerProps) {
  // Drawer 는 닫히면 children 을 unmount 하므로 폼 상태는 내부 컴포넌트에 둔다
  const [pending, setPending] = useState(false);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={budget ? '월 예산 수정' : '월 예산 등록'}
      description={`${projectName} · 사용률은 추정이 있으면 '추정 포함 기준'으로 계산 (DD-03)`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button type="submit" form="project-budget-form" loading={pending}>
            저장
          </Button>
        </>
      }
    >
      <BudgetForm projectId={projectId} projectName={projectName} month={month} budget={budget} onPending={setPending} onSaved={onSaved} onClose={onClose} />
    </Drawer>
  );
}

interface BudgetFormProps {
  projectId: string;
  projectName: string;
  month: string;
  budget: Budget | null;
  onPending: (v: boolean) => void;
  onSaved: (b: Budget) => void;
  onClose: () => void;
}

interface BudgetFormState {
  month: string;
  amount: number | null;
  warning: number | null;
}

function BudgetForm({ projectId, projectName, month, budget, onPending, onSaved, onClose }: BudgetFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<BudgetFormState>({ month: budget?.month ?? month, amount: budget?.amount_usd ?? null, warning: budget?.warning_pct ?? DEFAULT_WARNING });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const mutation = useMutation((input: BudgetInput) => api.upsertBudget(input));
  const errors = { ...mutation.fieldErrors, ...localErrors };
  const patch = (p: Partial<BudgetFormState>) => {
    setForm((f) => ({ ...f, ...p }));
    setLocalErrors({});
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!/^\d{4}-\d{2}$/.test(form.month)) e.month = '적용 월 형식은 YYYY-MM 입니다.';
    if (form.amount === null || !(form.amount > 0)) e.amount_usd = '예산은 0보다 커야 합니다.';
    if (form.warning === null || !(form.warning >= 1 && form.warning <= 100)) e.warning_pct = '경고 기준은 1~100% 입니다.';
    if (Object.keys(e).length || form.amount === null || form.warning === null) {
      setLocalErrors(e);
      return;
    }
    onPending(true);
    const saved = await mutation.run({ owner_type: 'PROJECT', owner_id: projectId, month: form.month, amount_usd: form.amount, warning_pct: form.warning });
    onPending(false);
    if (!saved) return;
    toast({ tone: 'success', title: budget ? '예산이 수정되었습니다' : '예산이 등록되었습니다', description: `${projectName} · ${saved.month} · ${formatUsd(saved.amount_usd)} (경고 ${saved.warning_pct}%)` });
    onSaved(saved);
    onClose();
  };

  return (
    <form
      id="project-budget-form"
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
      <Input label="적용 월" required type="month" value={form.month} onChange={(e) => patch({ month: e.target.value })} error={errors.month} hint="KST 월 경계 기준. 동일 월 예산이 있으면 덮어씁니다." />
      <NumberInput label="월 예산" required value={form.amount} onChange={(v) => patch({ amount: v })} min={0} step={0.01} suffix="USD" error={errors.amount_usd} />
      <NumberInput
        label="경고 기준"
        required
        value={form.warning}
        onChange={(v) => patch({ warning: v })}
        min={1}
        max={100}
        step={1}
        suffix="%"
        error={errors.warning_pct}
        hint="사용률이 이 비율 이상이면 '주의', 100% 이상이면 '초과' (기본 80%, 정책 확정 시 교체)"
      />
    </form>
  );
}
