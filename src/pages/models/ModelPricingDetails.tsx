import { Badge, DescriptionList, InlineAlert } from '../../components/ui';
import { formatKst, formatUsd } from '../../domain/format';
import type { ModelPricing } from '../../domain/types';

/** 가격 섹션 (등록 Step 2 · 상세 Drawer 공용). pricing null = 가격 미확인 상태. */
export function ModelPricingDetails({ pricing }: { pricing: ModelPricing | null }) {
  if (!pricing) {
    return (
      <div className="flex flex-col gap-2">
        <Badge tone="warning">가격 미확인</Badge>
        <InlineAlert tone="warning" title="단가 정보가 없습니다">
          이 모델의 호출 비용은 API 응답에 비용이 포함될 때만 확정되며, 그 외에는 "미확인"으로 기록됩니다. 추정 비용(Token×단가)은 계산되지 않습니다.
        </InlineAlert>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <DescriptionList
        columns={2}
        items={[
          { label: 'Input (1M tokens)', value: <span className="tnum">{formatUsd(pricing.input_per_1m_usd, { precision: 2 })}</span> },
          { label: 'Output (1M tokens)', value: <span className="tnum">{formatUsd(pricing.output_per_1m_usd, { precision: 2 })}</span> },
          { label: '통화', value: pricing.currency },
          { label: '가격 기준(적용) 시각', value: `${formatKst(pricing.effective_at)} KST` },
          { label: '가격 확인(조회) 시각', value: `${formatKst(pricing.checked_at)} KST` },
        ]}
      />
      <p className="text-xs text-ink-muted">단가가 갱신되어도 과거에 확정된 호출 비용은 재계산되지 않습니다. 추정 비용은 호출 시점의 단가(price_reference)를 기준으로 합니다.</p>
    </div>
  );
}
