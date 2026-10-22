import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import type { PreflightResult } from './simulatorConfig';

const ICON = {
  pass: <CircleCheck className="size-4 text-success" aria-hidden="true" />,
  fail: <CircleAlert className="size-4 text-danger" aria-hidden="true" />,
  warn: <TriangleAlert className="size-4 text-warning" aria-hidden="true" />,
};
const LABEL = { pass: '통과', fail: '차단', warn: '경고' };

export function PreflightChecklist({ result }: { result: PreflightResult }) {
  const fails = result.checks.filter((c) => c.state === 'fail').length;
  const warns = result.checks.filter((c) => c.state === 'warn').length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-secondary">실행 전 검증</span>
        <span className="text-xs text-ink-muted">
          {fails > 0 ? `차단 ${fails}건` : '모두 통과'}
          {warns > 0 ? ` · 경고 ${warns}건` : ''}
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border" aria-live="polite">
        {result.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 px-3 py-2">
            <span className="mt-0.5 shrink-0">{ICON[c.state]}</span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm text-ink">
                {c.label}
                <span className="sr-only"> — {LABEL[c.state]}</span>
                {!c.blocking && c.state === 'warn' && <span className="ml-1 text-[11px] text-ink-muted">(차단 아님)</span>}
              </span>
              {c.detail && <span className={c.state === 'fail' ? 'text-xs text-danger' : c.state === 'warn' ? 'text-xs text-warning' : 'text-xs text-ink-muted'}>{c.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
