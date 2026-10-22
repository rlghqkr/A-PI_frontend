/** 재시도 체인 목록 — 원 요청부터 시간순. 현재 요청 강조, 클릭 시 해당 요청으로 이동. */
import { CornerDownRight } from 'lucide-react';
import { formatKst, formatUsd } from '../../domain/format';
import type { AIRequest } from '../../domain/types';
import { CostStatusBadge, ExecStatusBadge } from '../shared/cells';
import { Section } from './RequestDetailSections';

export interface RetryChainListProps {
  chain: AIRequest[];
  currentId: string;
  onNavigate: (id: string) => void;
}

export function RetryChainList({ chain, currentId, onNavigate }: RetryChainListProps) {
  const sorted = [...chain].sort((a, b) => a.attempt_no - b.attempt_no || a.requested_at.localeCompare(b.requested_at));
  return (
    <Section title={`재시도 체인 (${sorted.length}건)`} description={sorted.length <= 1 ? '재시도 없이 단일 호출입니다.' : '원 요청부터 시간순입니다. 항목을 클릭하면 해당 호출 상세로 이동합니다.'}>
      <ol className="divide-y divide-border py-1">
        {sorted.map((r) => {
          const current = r.request_id === currentId;
          const unknown = r.cost_status === 'UNKNOWN' || r.cost_usd === null;
          const rowClass = 'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ' + (current ? 'bg-primary-soft' : 'hover:bg-subtle');
          const body = (
            <>
                <span className="flex w-16 shrink-0 items-center gap-1 text-xs font-medium text-ink">
                  {r.parent_request_id && <CornerDownRight className="size-3.5 text-ink-muted" aria-hidden="true" />}
                  {r.attempt_no}회차
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs text-ink">{r.request_id}</span>
                  <span className="block text-[11px] text-ink-muted">{formatKst(r.requested_at)}</span>
                </span>
                <ExecStatusBadge status={r.status} />
                <span className="inline-flex w-28 items-center justify-end gap-1.5">
                  <span className={unknown ? 'text-xs text-warning' : 'tnum text-xs text-ink'}>{unknown ? '미확인' : formatUsd(r.cost_usd)}</span>
                  {!unknown && <CostStatusBadge status={r.cost_status} />}
                </span>
                {current && <span className="shrink-0 text-[11px] font-medium text-primary">현재</span>}
            </>
          );
          // 현재 행은 disabled 버튼이 아니라 비대화형 요소로 두어 키보드/스크린리더가 순서대로 읽을 수 있게 한다
          return (
            <li key={r.request_id}>
              {current ? (
                <div aria-current="true" className={rowClass}>
                  {body}
                </div>
              ) : (
                <button type="button" onClick={() => onNavigate(r.request_id)} className={rowClass}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
