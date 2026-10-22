import { Plus, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button, ErrorState, InlineAlert, Input, SectionCard, Select } from '../../components/ui';
import { usePageMeta } from '../../components/layout/AppShell';
import { MODEL_STATUS } from '../../domain/status';
import type { ModelRegistry, ModelStatus } from '../../domain/types';
import { useRequestDetail } from '../../features/request-detail/RequestDetailProvider';
import { useReferenceData } from '../../hooks/useReferenceData';
import { useUrlState } from '../../hooks/useUrlState';
import { ModelDetailDrawer } from './ModelDetailDrawer';
import { ModelsTable } from './ModelsTable';
import { RegisterModelDrawer } from './RegisterModelDrawer';

const URL_DEFAULTS = { q: '', provider: '', status: '', model: '', section: '' };

const STATUS_OPTIONS = (Object.keys(MODEL_STATUS) as ModelStatus[]).map((s) => ({ value: s, label: MODEL_STATUS[s].label }));

function isModelStatus(v: string): v is ModelStatus {
  return v in MODEL_STATUS;
}

export default function ModelsPage() {
  const ref = useReferenceData();
  const { openRequest } = useRequestDetail();
  const [url, setUrl] = useUrlState(URL_DEFAULTS);
  const [registerOpen, setRegisterOpen] = useState(false);

  const providers = useMemo(() => Array.from(new Set(ref.models.map((m) => m.provider))).sort((a, b) => a.localeCompare(b)), [ref.models]);
  const providerOptions = useMemo(() => providers.map((p) => ({ value: p, label: p })), [providers]);

  const filtered = useMemo(() => {
    const q = url.q.trim().toLowerCase();
    return ref.models.filter((m) => {
      if (q && !m.display_name.toLowerCase().includes(q) && !m.model_id.toLowerCase().includes(q)) return false;
      if (url.provider && m.provider !== url.provider) return false;
      if (url.status && m.status !== url.status) return false;
      return true;
    });
  }, [ref.models, url.q, url.provider, url.status]);

  const counts = useMemo(() => {
    const c: Record<ModelStatus, number> = { TESTING: 0, ACTIVE: 0, INACTIVE: 0 };
    for (const m of ref.models) c[m.status] += 1;
    return c;
  }, [ref.models]);

  const openDetail = useCallback((modelId: string) => setUrl({ model: modelId, section: '' }), [setUrl]);
  const openTest = useCallback((modelId: string) => setUrl({ model: modelId, section: 'test' }), [setUrl]);
  const closeDetail = useCallback(() => setUrl({ model: '', section: '' }), [setUrl]);
  const onRegistered = useCallback(
    (m: ModelRegistry) => {
      setRegisterOpen(false);
      setUrl({ model: m.model_id, section: '' });
    },
    [setUrl],
  );

  const actions = useMemo(
    () => (
      <Button leftIcon={<Plus />} onClick={() => setRegisterOpen(true)}>
        신규 모델 등록
      </Button>
    ),
    [],
  );
  const breadcrumb = useMemo(() => [{ label: 'P-03 AI 모델 관리' }], []);
  const meta = useMemo(
    () =>
      ref.loading
        ? '조회 기준 KST'
        : `조회 기준 KST · 등록 ${ref.models.length}개 (ACTIVE ${counts.ACTIVE} · TESTING ${counts.TESTING} · INACTIVE ${counts.INACTIVE})`,
    [ref.loading, ref.models.length, counts],
  );
  usePageMeta({ title: 'AI 모델 관리', breadcrumb, meta, actions });

  const isFiltered = Boolean(url.q || url.provider || url.status);

  return (
    <>
      <InlineAlert tone="info">ACTIVE 전환은 PoC Simulator 사용 가능을 의미하며 운영 AI PDP 모델을 변경하지 않습니다.</InlineAlert>

      <SectionCard
        title="등록 모델"
        description="OpenRouter 를 통해 등록한 모델 목록. INACTIVE 모델의 과거 이력은 보존됩니다."
        actions={
          <span className="text-xs text-ink-muted" aria-live="polite">
            {ref.loading ? '불러오는 중…' : `${filtered.length} / ${ref.models.length}개`}
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3" role="search" aria-label="모델 검색">
            <Input
              label="검색"
              placeholder="표시명 또는 Model ID"
              leftIcon={<Search />}
              value={url.q}
              onChange={(e) => setUrl({ q: e.target.value })}
              containerClassName="w-72"
            />
            <Select label="Provider" allowEmptyLabel="전체" options={providerOptions} value={url.provider} onChange={(v) => setUrl({ provider: v })} containerClassName="w-44" />
            <Select
              label="상태"
              allowEmptyLabel="전체"
              options={STATUS_OPTIONS}
              value={url.status}
              onChange={(v) => setUrl({ status: v === '' || isModelStatus(v) ? v : '' })}
              containerClassName="w-40"
            />
            {isFiltered && (
              <Button variant="ghost" onClick={() => setUrl({ q: '', provider: '', status: '' })}>
                필터 초기화
              </Button>
            )}
          </div>

          {ref.error && !ref.loading ? (
            <ErrorState title="모델 목록을 불러오지 못했습니다" description={ref.error} onRetry={ref.reload} />
          ) : (
            <ModelsTable
              rows={filtered}
              loading={ref.loading}
              onOpenDetail={openDetail}
              onOpenTest={openTest}
              onRegister={() => setRegisterOpen(true)}
              filtered={isFiltered}
            />
          )}
        </div>
      </SectionCard>

      <RegisterModelDrawer open={registerOpen} onClose={() => setRegisterOpen(false)} onRegistered={onRegistered} />
      <ModelDetailDrawer modelId={url.model || null} section={url.section === 'test' ? 'test' : null} onClose={closeDetail} onOpenRequest={openRequest} />
    </>
  );
}
