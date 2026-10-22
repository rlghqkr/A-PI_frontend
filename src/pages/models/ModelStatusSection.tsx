import { useState } from 'react';
import { api } from '../../api';
import { Button, ConfirmDialog, InlineAlert, useToast } from '../../components/ui';
import { formatKst } from '../../domain/format';
import { MODEL_STATUS } from '../../domain/status';
import type { ModelRegistry, ModelStatus } from '../../domain/types';
import { useMutation } from '../../hooks/useAsync';
import { useReferenceData } from '../../hooks/useReferenceData';
import { ModelStatusBadge, TestResultBadge } from './cells';

/** 상태 관리 섹션: TESTING ⇄ ACTIVE / INACTIVE 전환 */
export function ModelStatusSection({ model }: { model: ModelRegistry }) {
  const { refreshModels } = useReferenceData();
  const { toast } = useToast();
  const [confirmInactive, setConfirmInactive] = useState(false);
  const [pending, setPending] = useState<ModelStatus | null>(null);
  const setStatus = useMutation((id: string, status: ModelStatus) => api.setModelStatus(id, status));

  const canActivate = model.last_test?.result === 'SUCCESS';
  const info = MODEL_STATUS[model.status];

  const change = async (next: ModelStatus) => {
    setPending(next);
    const res = await setStatus.run(model.model_id, next);
    setPending(null);
    if (!res) return;
    await refreshModels();
    setConfirmInactive(false);
    toast({ tone: 'success', title: `${res.display_name} 상태를 ${MODEL_STATUS[next].label} 로 전환했습니다.`, description: MODEL_STATUS[next].description });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-subtle px-3 py-2.5">
        <span className="text-xs text-ink-muted">현재 상태</span>
        <ModelStatusBadge status={model.status} />
        <span className="text-xs text-ink-secondary">{info.description}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
        <span>마지막 테스트</span>
        <TestResultBadge test={model.last_test} size="sm" />
        {model.last_test && <span className="tnum">{formatKst(model.last_test.tested_at)} KST</span>}
      </div>

      {setStatus.error && !confirmInactive && (
        <InlineAlert tone="danger" title="상태 전환 실패">
          {setStatus.error}
        </InlineAlert>
      )}

      <div className="flex flex-wrap gap-2">
        {model.status !== 'ACTIVE' && (
          <Button
            onClick={() => change('ACTIVE')}
            loading={pending === 'ACTIVE'}
            disabled={!canActivate}
            disabledReason="연결 테스트 성공 후 전환 가능"
          >
            ACTIVE로 전환
          </Button>
        )}
        {model.status !== 'INACTIVE' && (
          <Button variant="danger" onClick={() => setConfirmInactive(true)} disabled={setStatus.loading}>
            INACTIVE로 전환
          </Button>
        )}
        {model.status === 'INACTIVE' && (
          <Button variant="secondary" onClick={() => change('TESTING')} loading={pending === 'TESTING'}>
            TESTING으로 되돌리기
          </Button>
        )}
      </div>
      {model.status !== 'ACTIVE' && !canActivate && (
        <p className="text-xs text-ink-muted">ACTIVE 전환은 마지막 연결 테스트가 성공한 경우에만 가능합니다. 위 연결 테스트 섹션에서 테스트를 실행하세요.</p>
      )}
      {model.status === 'INACTIVE' && (
        <p className="text-xs text-ink-muted">INACTIVE 모델의 과거 호출·시뮬레이션 이력은 보존되어 계속 조회됩니다. 재사용하려면 TESTING 으로 되돌린 뒤 연결 테스트를 다시 통과해야 합니다.</p>
      )}
      <InlineAlert tone="info">ACTIVE 전환은 PoC Simulator 사용 가능을 의미하며 운영 AI PDP 모델을 변경하지 않습니다.</InlineAlert>

      <ConfirmDialog
        open={confirmInactive}
        onCancel={() => {
          setConfirmInactive(false);
          setStatus.reset();
        }}
        onConfirm={() => change('INACTIVE')}
        title={`${model.display_name} 을(를) INACTIVE 로 전환`}
        description="과거 이력은 보존되며 신규 실행에서 제외됩니다. 운영 AI PDP 모델은 변경되지 않습니다."
        confirmLabel="INACTIVE로 전환"
        tone="danger"
        loading={pending === 'INACTIVE'}
      >
        {setStatus.error && (
          <InlineAlert tone="danger" title="상태 전환 실패">
            {setStatus.error}
          </InlineAlert>
        )}
      </ConfirmDialog>
    </div>
  );
}
