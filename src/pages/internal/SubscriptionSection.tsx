import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, DataTable, SectionCard, type Column } from '../../components/ui';
import { formatInt, formatUsd } from '../../domain/format';
import type { SubscriptionCost } from '../../domain/types';
import { useNames } from '../../hooks/useReferenceData';
import { SubscriptionDrawer } from './SubscriptionDrawer';

export interface SubscriptionSectionProps {
  /** 전체 구독료 (기간 무관) */
  all: SubscriptionCost[];
  /** 조회 기간(적용 월) + 프로젝트 필터에 해당하는 구독료 */
  inRange: SubscriptionCost[];
  months: string[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onChanged: () => void;
  /** 프로젝트 상세: 귀속 프로젝트 고정 */
  projectId?: string | null;
}

/** 구독료 관리 SectionCard: 목록 + 등록/편집 Drawer */
export function SubscriptionSection({ all, inRange, months, loading, error, onRetry, onChanged, projectId }: SubscriptionSectionProps) {
  const names = useNames();
  const [showAllPeriod, setShowAllPeriod] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; target: SubscriptionCost | null }>({ open: false, target: null });

  const rows = useMemo(() => {
    const base = showAllPeriod ? (projectId ? all.filter((s) => s.project_id === projectId) : all) : inRange;
    return [...base].sort((a, b) => (a.month === b.month ? a.tool_name.localeCompare(b.tool_name, 'ko') : a.month < b.month ? 1 : -1));
  }, [all, inRange, showAllPeriod, projectId]);
  const activeTotal = useMemo(() => rows.filter((s) => s.status === 'ACTIVE').reduce((a, s) => a + s.amount, 0), [rows]);

  const columns = useMemo<Column<SubscriptionCost>[]>(
    () => [
      {
        key: 'tool',
        header: '도구명',
        accessor: (r) => r.tool_name,
        render: (r) => (
          <button type="button" onClick={() => setDrawer({ open: true, target: r })} className="font-medium text-primary hover:underline" title="편집">
            {r.tool_name}
          </button>
        ),
      },
      { key: 'plan', header: '플랜', accessor: (r) => r.plan, render: (r) => r.plan || <span className="text-ink-muted">-</span> },
      { key: 'month', header: '적용 월', accessor: (r) => r.month, render: (r) => <span className="tnum">{r.month}</span> },
      { key: 'amount', header: '금액 (USD)', accessor: (r) => r.amount, align: 'right', render: (r) => formatUsd(r.amount) },
      {
        key: 'project',
        header: '귀속 프로젝트',
        accessor: (r) => r.project_id,
        render: (r) =>
          r.project_id ? (
            names.project(r.project_id)
          ) : (
            <Badge tone="neutral" size="sm" title="귀속 프로젝트 미지정. 전체 합계에만 반영">
              미배분
            </Badge>
          ),
      },
      {
        key: 'status',
        header: '상태',
        accessor: (r) => r.status,
        render: (r) => (
          <Badge tone={r.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" dot>
            {r.status}
          </Badge>
        ),
      },
      { key: 'note', header: '메모', accessor: (r) => r.note, render: (r) => <span className="text-xs text-ink-muted">{r.note || '-'}</span> },
    ],
    [names],
  );

  return (
    <SectionCard
      id="internal-subscriptions"
      title="구독료 관리"
      description={`${showAllPeriod ? '전체 기간' : `적용 월 ${months.join(', ')}`} · ACTIVE ${formatInt(rows.filter((s) => s.status === 'ACTIVE').length)}건 합계 ${formatUsd(activeTotal)} · API 비용과 별도 집계, 구성원 배분 없음`}
      actions={
        <>
          <Button size="sm" variant="secondary" onClick={() => setShowAllPeriod((v) => !v)} aria-pressed={showAllPeriod}>
            {showAllPeriod ? '조회 기간만 보기' : '전체 기간 보기'}
          </Button>
          <Button size="sm" leftIcon={<Plus />} onClick={() => setDrawer({ open: true, target: null })}>
            구독료 등록
          </Button>
        </>
      }
    >
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.subscription_id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyTitle="등록된 구독료가 없습니다"
        emptyDescription={showAllPeriod ? '"구독료 등록" 으로 월 구독 도구를 추가하세요.' : '조회 기간에 해당하는 적용 월 구독료가 없습니다. "전체 기간 보기" 또는 "구독료 등록" 을 이용하세요.'}
        emptyAction={
          <Button size="sm" variant="secondary" leftIcon={<Plus />} onClick={() => setDrawer({ open: true, target: null })}>
            구독료 등록
          </Button>
        }
        caption="구독료 목록"
      />
      <SubscriptionDrawer
        open={drawer.open}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        subscription={drawer.target}
        defaultMonth={months[months.length - 1] ?? ''}
        defaultProjectId={projectId ?? null}
        onSaved={onChanged}
      />
    </SectionCard>
  );
}
