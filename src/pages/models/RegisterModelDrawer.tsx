import { ArrowLeft, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../../api';
import { Badge, Button, Drawer, EmptyState, ErrorState, InlineAlert, Input, Skeleton, useToast } from '../../components/ui';
import { formatInt } from '../../domain/format';
import type { ModelRegistry, OpenRouterCatalogModel } from '../../domain/types';
import type { RegisterModelInput } from '../../api';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { useReferenceData } from '../../hooks/useReferenceData';
import { CapabilityChips, PriceCell } from './cells';
import { ModelPricingDetails } from './ModelPricingDetails';
import { useDebounce } from './useDebounce';

export interface RegisterModelDrawerProps {
  open: boolean;
  onClose: () => void;
  onRegistered: (model: ModelRegistry) => void;
}

export function RegisterModelDrawer({ open, onClose, onRegistered }: RegisterModelDrawerProps) {
  const { models, refreshModels } = useReferenceData();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<OpenRouterCatalogModel | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [purpose, setPurpose] = useState('');

  const registeredIds = useMemo(() => new Set(models.map((m) => m.model_id.toLowerCase())), [models]);
  const debouncedQuery = useDebounce(query, 300);
  const catalog = useAsync(() => api.searchCatalog(debouncedQuery), [debouncedQuery], { enabled: open });

  const register = useMutation((input: RegisterModelInput) => api.registerModel(input));

  useEffect(() => {
    if (!open) {
      setStep(1);
      setQuery('');
      setSelected(null);
      setDisplayName('');
      setPurpose('');
      register.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = useCallback((m: OpenRouterCatalogModel) => {
    setSelected(m);
    setDisplayName(m.name);
    setPurpose('');
    setStep(2);
  }, []);

  const alreadyRegistered = selected ? registeredIds.has(selected.model_id.toLowerCase()) : false;
  const nameError = register.fieldErrors.display_name ?? (displayName.trim() ? undefined : '표시명을 입력하세요.');

  const submit = async () => {
    if (!selected || alreadyRegistered || !displayName.trim()) return;
    const created = await register.run({ model_id: selected.model_id, display_name: displayName, purpose });
    if (!created) return;
    await refreshModels();
    toast({ tone: 'success', title: `${created.display_name} 을(를) TESTING 상태로 등록했습니다.`, description: '연결 테스트 성공 후 ACTIVE 로 전환할 수 있습니다.' });
    onRegistered(created);
  };

  const footer =
    step === 1 ? (
      <Button variant="secondary" onClick={onClose}>
        취소
      </Button>
    ) : (
      <>
        <Button variant="ghost" leftIcon={<ArrowLeft />} onClick={() => setStep(1)} disabled={register.loading}>
          이전
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={register.loading}>
          취소
        </Button>
        <Button
          onClick={submit}
          loading={register.loading}
          disabled={alreadyRegistered || !displayName.trim()}
          disabledReason={alreadyRegistered ? '이미 등록된 Model ID 입니다' : '표시명을 입력하세요'}
        >
          TESTING으로 등록
        </Button>
      </>
    );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="신규 모델 등록"
      description={step === 1 ? 'Step 1 / 2 · OpenRouter 카탈로그에서 모델을 검색해 선택하세요' : 'Step 2 / 2 · 모델 정보를 확인하고 TESTING 상태로 등록합니다'}
      width="lg"
      footer={footer}
    >
      {step === 1 ? (
        <CatalogStep
          query={query}
          onQueryChange={setQuery}
          items={catalog.data ?? []}
          loading={catalog.loading}
          error={catalog.error}
          onRetry={catalog.reload}
          registeredIds={registeredIds}
          onPick={pick}
        />
      ) : (
        selected && (
          <ReviewStep
            model={selected}
            alreadyRegistered={alreadyRegistered}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            nameError={nameError}
            purpose={purpose}
            onPurposeChange={setPurpose}
            submitError={register.error}
            modelIdError={register.fieldErrors.model_id}
          />
        )
      )}
    </Drawer>
  );
}

interface CatalogStepProps {
  query: string;
  onQueryChange: (q: string) => void;
  items: OpenRouterCatalogModel[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  registeredIds: Set<string>;
  onPick: (m: OpenRouterCatalogModel) => void;
}

function CatalogStep({ query, onQueryChange, items, loading, error, onRetry, registeredIds, onPick }: CatalogStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <Input
        label="카탈로그 검색"
        placeholder="모델명, Model ID, Provider 로 검색"
        leftIcon={<Search />}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        autoFocus
        hint="이미 등록된 모델은 선택할 수 없습니다. 등록 시 상태는 TESTING 으로 시작합니다."
      />
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState compact title="카탈로그 조회에 실패했습니다" description={error} onRetry={onRetry} />
      ) : items.length === 0 ? (
        <EmptyState compact title="검색 결과가 없습니다" description="다른 검색어로 다시 시도하세요. OpenRouter Model ID 전체(예: openai/gpt-4o)로도 검색할 수 있습니다." />
      ) : (
        <ul className="flex flex-col gap-2" aria-label="카탈로그 검색 결과">
          {items.map((m) => {
            const registered = registeredIds.has(m.model_id.toLowerCase());
            return (
              <li key={m.model_id}>
                <button
                  type="button"
                  disabled={registered}
                  onClick={() => onPick(m)}
                  title={registered ? '이미 등록된 모델입니다' : `${m.name} 선택`}
                  className="flex w-full flex-col gap-1.5 rounded-md border border-border bg-surface p-3 text-left transition-colors hover:border-primary hover:bg-primary-soft/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-surface"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">{m.name}</span>
                      <span className="shrink-0 text-xs text-ink-muted">{m.provider}</span>
                    </span>
                    {registered && (
                      <Badge tone="neutral" size="sm">
                        등록됨
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-xs text-ink-secondary break-all">{m.model_id}</span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CapabilityChips caps={m.capabilities} />
                    <span className="tnum text-xs text-ink-secondary">
                      In <PriceCell pricing={m.pricing} kind="input" /> · Out <PriceCell pricing={m.pricing} kind="output" />
                      {m.context_length !== null && <span className="ml-2 text-ink-muted">ctx {formatInt(m.context_length)}</span>}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface ReviewStepProps {
  model: OpenRouterCatalogModel;
  alreadyRegistered: boolean;
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  nameError?: string;
  purpose: string;
  onPurposeChange: (v: string) => void;
  submitError: string | null;
  modelIdError?: string;
}

function ReviewStep({ model, alreadyRegistered, displayName, onDisplayNameChange, nameError, purpose, onPurposeChange, submitError, modelIdError }: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-5">
      {alreadyRegistered && (
        <InlineAlert tone="danger" title="중복 Model ID">
          <span className="font-mono">{model.model_id}</span> 은(는) 이미 등록되어 있습니다. Step 1 로 돌아가 다른 모델을 선택하세요.
        </InlineAlert>
      )}
      {!alreadyRegistered && submitError && (
        <InlineAlert tone="danger" title="등록 실패">
          {submitError}
          {modelIdError && <span className="ml-1 text-ink-muted">({modelIdError})</span>}
        </InlineAlert>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">선택 모델</h3>
        <dl className="divide-y divide-border rounded-md border border-border px-3">
          <Row label="Provider" value={model.provider} />
          <Row label="Model ID" value={<span className="font-mono text-xs break-all">{model.model_id}</span>} />
          <Row label="카탈로그 이름" value={model.name} />
          <Row label="지원 기능" value={<CapabilityChips caps={model.capabilities} showMissing />} />
          <Row label="Context Length" value={model.context_length === null ? '미확인' : `${formatInt(model.context_length)} tokens`} />
          <Row label="Provider 고정" value={model.supports_provider_pinning ? '지원' : '미지원 [검증 필요]'} />
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">가격</h3>
        <ModelPricingDetails pricing={model.pricing} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink">등록 정보</h3>
        <Input label="표시명" required value={displayName} onChange={(e) => onDisplayNameChange(e.target.value)} error={nameError} maxLength={80} />
        <Input label="사용 목적" value={purpose} onChange={(e) => onPurposeChange(e.target.value)} placeholder="예: PDP 생성 대안 모델 검토" maxLength={200} hint="선택 입력. 목록·상세에서 참고용으로 표시됩니다." />
      </section>

      <InlineAlert tone="info">등록 직후 상태는 TESTING 입니다. 상세 Drawer 에서 연결 테스트를 실행하고 성공하면 ACTIVE 로 전환할 수 있습니다.</InlineAlert>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-ink">{value}</dd>
    </div>
  );
}
