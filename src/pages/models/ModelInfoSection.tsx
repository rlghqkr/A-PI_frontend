import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { api, type ModelPatch } from '../../api';
import { Button, CopyableId, DescriptionList, InlineAlert, Input, useToast } from '../../components/ui';
import { formatInt, formatKst } from '../../domain/format';
import type { ModelRegistry } from '../../domain/types';
import { useMutation } from '../../hooks/useAsync';
import { useReferenceData } from '../../hooks/useReferenceData';
import { CapabilityChips } from './cells';

/** 정보 섹션: 표시명·사용 목적 편집(저장/취소) + 고정 정보 */
export function ModelInfoSection({ model }: { model: ModelRegistry }) {
  const { refreshModels } = useReferenceData();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(model.display_name);
  const [purpose, setPurpose] = useState(model.purpose);
  const update = useMutation((id: string, patch: ModelPatch) => api.updateModel(id, patch));

  const dirty = displayName !== model.display_name || purpose !== model.purpose;
  const nameError = update.fieldErrors.display_name ?? (displayName.trim() ? undefined : '표시명은 비울 수 없습니다.');

  const save = async () => {
    if (!displayName.trim()) return;
    const res = await update.run(model.model_id, { display_name: displayName, purpose });
    if (!res) return;
    await refreshModels();
    setEditing(false);
    toast({ tone: 'success', title: '모델 정보를 저장했습니다.' });
  };
  const cancel = () => {
    setEditing(false);
    update.reset();
    setDisplayName(model.display_name);
    setPurpose(model.purpose);
  };

  return (
    <div className="flex flex-col gap-3">
      {editing ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-subtle p-3">
          <Input label="표시명" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} error={nameError} maxLength={80} autoFocus />
          <Input label="사용 목적" value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={200} error={update.fieldErrors.purpose} />
          {update.error && (
            <InlineAlert tone="danger" title="저장 실패">
              {update.error}
            </InlineAlert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={cancel} disabled={update.loading}>
              취소
            </Button>
            <Button size="sm" onClick={save} loading={update.loading} disabled={!dirty || !displayName.trim()} disabledReason={dirty ? '표시명을 입력하세요' : '변경 사항이 없습니다'}>
              저장
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <DescriptionList
            className="flex-1"
            items={[
              { label: '표시명', value: model.display_name },
              { label: '사용 목적', value: model.purpose || <span className="text-ink-muted">미입력</span> },
            ]}
          />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Pencil />}
            onClick={() => {
              setDisplayName(model.display_name);
              setPurpose(model.purpose);
              setEditing(true);
            }}
          >
            편집
          </Button>
        </div>
      )}
      <DescriptionList
        columns={2}
        items={[
          { label: 'Model ID', value: <CopyableId value={model.model_id} /> },
          { label: 'Provider', value: model.provider },
          { label: '지원 기능', value: <CapabilityChips caps={model.capabilities} showMissing /> },
          { label: 'Context Length', value: model.context_length === null ? '미확인' : `${formatInt(model.context_length)} tokens` },
          { label: 'Provider 고정 지원', value: model.supports_provider_pinning ? '지원' : '미지원 [검증 필요] — Simulator 에서 Provider 고정 시 비교 조건 차이로 기록' },
          { label: '등록 시각', value: `${formatKst(model.created_at)} KST` },
          { label: '최근 수정', value: `${formatKst(model.updated_at)} KST` },
        ]}
      />
    </div>
  );
}
