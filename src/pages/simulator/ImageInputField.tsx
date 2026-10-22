import { ImagePlus, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Button, InlineAlert } from '../../components/ui';
import type { ImageInput } from './simulatorConfig';

export interface ImageInputFieldProps {
  value: ImageInput | null;
  onChange: (next: ImageInput | null) => void;
  disabled?: boolean;
  /** 이미지 미지원 모델 표시명 (경고 표시) */
  unsupportedModels: string[];
  hint?: string;
}

/** 이미지 파일 선택 → 파일명은 input_image_ref, 미리보기는 objectURL. 원본 업로드는 Mock 범위 밖. */
export function ImageInputField({ value, onChange, disabled, unsupportedModels, hint }: ImageInputFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = value?.previewUrl ?? null;

  // objectURL 해제
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-secondary">
        이미지 입력 <span className="font-normal text-ink-muted">(선택)</span>
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onChange({ name: file.name, previewUrl: URL.createObjectURL(file) });
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="flex items-start gap-3 rounded-md border border-border bg-subtle p-2">
          {previewUrl ? (
            <img src={previewUrl} alt={value.name} className="size-16 shrink-0 rounded-sm border border-border object-cover" />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-[11px] text-ink-muted">미리보기 없음</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-ink" title={value.name}>
              {value.name}
            </p>
            <p className="text-[11px] text-ink-muted">{previewUrl ? '파일명이 input_image_ref 로 기록됩니다.' : '복원된 참조 — 원본 파일은 이 화면에서 다시 열 수 없습니다.'}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<X />} disabled={disabled} onClick={() => onChange(null)} aria-label="이미지 제거">
            제거
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" leftIcon={<ImagePlus />} disabled={disabled} onClick={() => inputRef.current?.click()}>
          이미지 선택
        </Button>
      )}
      {hint && !value && <p className="text-xs text-ink-muted">{hint}</p>}
      {value && unsupportedModels.length > 0 && (
        <InlineAlert tone="danger" title={`이미지 미지원 모델: ${unsupportedModels.join(', ')}`}>
          해당 모델은 이미지 입력을 지원하지 않습니다. 모델 선택을 변경하거나 이미지를 제거하세요.
        </InlineAlert>
      )}
    </div>
  );
}
