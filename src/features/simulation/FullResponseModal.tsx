import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Button, Modal } from '../../components/ui';
import { formatInt } from '../../domain/format';

export interface FullResponseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 응답 원문 (가공하지 않음) */
  text: string | null;
  subtitle?: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 전체 응답 보기 — 원문 보존, monospace, 복사, 글자 수 */
export function FullResponseModal({ open, onClose, title, text, subtitle }: FullResponseModalProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);
  const close = () => {
    setCopied(false);
    onClose();
  };

  const content = text ?? '';
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={subtitle}
      size="lg"
      footer={
        <>
          <span className="mr-auto flex items-center gap-2 text-xs text-ink-muted">
            <Badge tone="neutral" size="sm">
              {formatInt(content.length)}자
            </Badge>
            <span>{formatInt(content.split('\n').length)}줄 · 원문 그대로 표시</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={copied ? <Check /> : <Copy />}
            disabled={!text}
            disabledReason="응답이 없습니다"
            onClick={async () => {
              if (await copyText(content)) setCopied(true);
            }}
          >
            {copied ? '복사됨' : '응답 복사'}
          </Button>
          <Button variant="primary" size="sm" onClick={close}>
            닫기
          </Button>
        </>
      }
    >
      {text === null ? (
        <p className="py-8 text-center text-sm text-ink-muted">응답 본문이 없습니다.</p>
      ) : (
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-subtle p-4 font-mono text-xs leading-5 text-ink">{text}</pre>
      )}
    </Modal>
  );
}
