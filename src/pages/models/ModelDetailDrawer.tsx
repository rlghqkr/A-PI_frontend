import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { Drawer, EmptyState, ErrorState, SkeletonText } from '../../components/ui';
import { useReferenceData } from '../../hooks/useReferenceData';
import { ConnectionTestPanel } from './ConnectionTestPanel';
import { ModelInfoSection } from './ModelInfoSection';
import { ModelPricingDetails } from './ModelPricingDetails';
import { ModelStatusSection } from './ModelStatusSection';
import { ModelStatusBadge } from './cells';

export type DetailSection = 'test' | null;

export interface ModelDetailDrawerProps {
  modelId: string | null;
  /** 열릴 때 스크롤할 섹션 (행 액션 "테스트") */
  section: DetailSection;
  onClose: () => void;
  onOpenRequest: (requestId: string) => void;
}

export function ModelDetailDrawer({ modelId, section, onClose, onOpenRequest }: ModelDetailDrawerProps) {
  const ref = useReferenceData();
  const model = modelId ? ref.modelById.get(modelId) ?? null : null;
  const testRef = useRef<HTMLElement>(null);

  const hasModel = Boolean(model);
  useEffect(() => {
    if (!modelId || !hasModel || section !== 'test') return;
    const t = window.setTimeout(() => testRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
    return () => window.clearTimeout(t);
  }, [modelId, section, hasModel]);

  return (
    <Drawer
      open={modelId !== null}
      onClose={onClose}
      width="lg"
      title={model ? model.display_name : '모델 상세'}
      description={model ? `${model.provider} · ${model.model_id}` : modelId ?? undefined}
      headerExtra={model ? <ModelStatusBadge status={model.status} /> : undefined}
    >
      {ref.loading ? (
        <SkeletonText lines={8} />
      ) : ref.error ? (
        <ErrorState description={ref.error} onRetry={ref.reload} />
      ) : !model ? (
        <EmptyState title="모델을 찾을 수 없습니다" description={`${modelId ?? ''} 은(는) 등록 목록에 없습니다. 목록을 새로고침하거나 다른 모델을 선택하세요.`} />
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="정보" description="표시명·사용 목적은 편집할 수 있습니다. Model ID·Provider·기능은 카탈로그 값으로 고정됩니다.">
            <ModelInfoSection model={model} />
          </Section>
          <Section title="가격" description="USD / 1M tokens · OpenRouter 카탈로그 기준">
            <ModelPricingDetails pricing={model.pricing} />
          </Section>
          <Section ref={testRef} title="연결 테스트" description="OpenRouter 경유 호출로 Key·Provider 연결을 검증합니다.">
            <ConnectionTestPanel key={model.model_id} model={model} onOpenRequest={onOpenRequest} />
          </Section>
          <Section title="상태 관리">
            <ModelStatusSection model={model} />
          </Section>
        </div>
      )}
    </Drawer>
  );
}

function Section({ title, description, children, ref }: { title: string; description?: string; children: ReactNode; ref?: Ref<HTMLElement> }) {
  return (
    <section ref={ref} className="flex scroll-mt-4 flex-col gap-3">
      <header>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}
