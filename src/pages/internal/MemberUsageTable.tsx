import { useMemo } from 'react';
import { Badge, DataTable, SectionCard, type Column } from '../../components/ui';
import type { GroupSummary } from '../../domain/aggregate';
import { formatInt, formatTokens, formatUsd } from '../../domain/format';
import { UNCLASSIFIED } from './useInternalData';

export interface MemberUsageTableProps {
  rows: GroupSummary[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  title?: string;
}

/** 구성원별 사용량. 구성원 미식별(user_id null) 은 "미분류" 행으로 항상 마지막에 고정 */
export function MemberUsageTable({ rows, loading, error, onRetry, title = '구성원별 사용량' }: MemberUsageTableProps) {
  const members = useMemo(() => rows.filter((r) => r.key !== UNCLASSIFIED), [rows]);
  const unclassified = useMemo(() => rows.find((r) => r.key === UNCLASSIFIED) ?? null, [rows]);
  const columns = useMemo<Column<GroupSummary>[]>(
    () => [
      { key: 'name', header: '구성원', accessor: (r) => r.label, render: (r) => <span className="font-medium">{r.label}</span> },
      { key: 'calls', header: '호출', accessor: (r) => r.calls, align: 'right', render: (r) => formatInt(r.calls) },
      { key: 'in', header: 'Input Token', accessor: (r) => r.inputTokens, align: 'right', render: (r) => formatTokens(r.inputTokens) },
      { key: 'out', header: 'Output Token', accessor: (r) => r.outputTokens, align: 'right', render: (r) => formatTokens(r.outputTokens) },
      { key: 'confirmed', header: '확정', accessor: (r) => r.confirmedUsd, align: 'right', render: (r) => formatUsd(r.confirmedUsd) },
      { key: 'estimated', header: '추정', accessor: (r) => r.estimatedUsd, align: 'right', render: (r) => <span className="text-estimated">{formatUsd(r.estimatedUsd)}</span> },
      { key: 'unknown', header: '미확인', accessor: (r) => r.unknownCount, align: 'right', render: (r) => (r.unknownCount > 0 ? <span className="text-warning">{formatInt(r.unknownCount)}건</span> : '0건') },
    ],
    [],
  );
  const cells = (r: GroupSummary) => [formatInt(r.calls), formatTokens(r.inputTokens), formatTokens(r.outputTokens), formatUsd(r.confirmedUsd), formatUsd(r.estimatedUsd), r.unknownCount > 0 ? `${formatInt(r.unknownCount)}건` : '0건'];
  return (
    <SectionCard title={title} description="구독료는 구성원에게 배분하지 않음. 구성원 미식별 호출은 '미분류' 행에 고정 표시.">
      <DataTable
        columns={columns}
        rows={members}
        rowKey={(r) => r.key}
        defaultSort={{ key: 'confirmed', dir: 'desc' }}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyTitle={unclassified ? '식별된 구성원이 없습니다' : '구성원 사용량이 없습니다'}
        emptyDescription="필터를 변경한 뒤 다시 조회하세요."
        caption={title}
        footer={
          unclassified ? (
            <tr className="border-t border-border">
              <td className="px-3 py-2.5">
                <Badge tone="warning" size="sm">
                  미분류
                </Badge>
                <span className="ml-2 text-ink-muted">구성원 미식별</span>
              </td>
              {cells(unclassified).map((v, i) => (
                <td key={i} className="px-3 py-2.5 text-right tnum">
                  {v}
                </td>
              ))}
            </tr>
          ) : undefined
        }
      />
      {unclassified && members.length === 0 && !loading && !error && (
        <p className="mt-2 text-xs text-ink-muted">
          미분류 {formatInt(unclassified.calls)}건 · 확정 {formatUsd(unclassified.confirmedUsd)} · 추정 {formatUsd(unclassified.estimatedUsd)} · 미확인 {formatInt(unclassified.unknownCount)}건
        </p>
      )}
    </SectionCard>
  );
}
