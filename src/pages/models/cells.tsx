/** P-03 전용 표시 셀. 포맷·상태 매핑은 domain 에서만 가져온다. */
import { Badge, Chip } from '../../components/ui';
import { formatKst, formatUsd } from '../../domain/format';
import { EXEC_STATUS, MODEL_STATUS } from '../../domain/status';
import type { ModelCapabilities, ModelPricing, ModelStatus, ModelTestResult } from '../../domain/types';
import { CAPABILITY_LABELS } from './capabilities';

export function CapabilityChips({ caps, showMissing }: { caps: ModelCapabilities; showMissing?: boolean }) {
  const items = CAPABILITY_LABELS.filter((c) => showMissing || caps[c.key]);
  if (items.length === 0) return <span className="text-xs text-ink-muted">-</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {items.map((c) => (
        <Chip key={c.key} tone={caps[c.key] ? 'primary' : 'neutral'} title={caps[c.key] ? `${c.label} 지원` : `${c.label} 미지원`}>
          {caps[c.key] ? c.label : `${c.label} 미지원`}
        </Chip>
      ))}
    </span>
  );
}

export function PriceCell({ pricing, kind }: { pricing: ModelPricing | null; kind: 'input' | 'output' }) {
  if (!pricing) {
    return (
      <Badge tone="warning" size="sm">
        가격 미확인
      </Badge>
    );
  }
  const v = kind === 'input' ? pricing.input_per_1m_usd : pricing.output_per_1m_usd;
  return <span className="tnum">{formatUsd(v, { precision: 2 })}</span>;
}

export function PriceEffectiveCell({ pricing }: { pricing: ModelPricing | null }) {
  if (!pricing) return <span className="text-xs text-ink-muted">-</span>;
  return (
    <span className="tnum text-xs" title={`확인 시각: ${formatKst(pricing.checked_at)} (KST)`}>
      {formatKst(pricing.effective_at, { seconds: false })}
    </span>
  );
}

export function ModelStatusBadge({ status }: { status: ModelStatus }) {
  const s = MODEL_STATUS[status];
  return (
    <Badge tone={s.tone} dot title={s.description}>
      {s.label}
    </Badge>
  );
}

export function TestResultBadge({ test, size = 'md' }: { test: ModelTestResult | null; size?: 'sm' | 'md' }) {
  if (!test) {
    return (
      <Badge tone="neutral" size={size}>
        미실행
      </Badge>
    );
  }
  const s = EXEC_STATUS[test.result];
  return (
    <Badge tone={s.tone} size={size} dot>
      {s.label}
    </Badge>
  );
}

export function LastTestCell({ test }: { test: ModelTestResult | null }) {
  return (
    <span className="inline-flex items-center gap-2">
      <TestResultBadge test={test} size="sm" />
      {test && <span className="tnum text-xs text-ink-secondary">{formatKst(test.tested_at, { seconds: false })}</span>}
    </span>
  );
}
