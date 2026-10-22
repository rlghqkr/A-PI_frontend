import { FlaskConical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, CopyableId, DataTable, type Column } from '../../components/ui';
import type { ModelRegistry } from '../../domain/types';
import { capabilityCount } from './capabilities';
import { CapabilityChips, LastTestCell, ModelStatusBadge, PriceCell, PriceEffectiveCell } from './cells';

const CAP = 10;

export interface ModelsTableProps {
  rows: ModelRegistry[];
  loading: boolean;
  onOpenDetail: (modelId: string) => void;
  onOpenTest: (modelId: string) => void;
  onRegister: () => void;
  /** 필터가 적용되어 결과가 0건인지 (안내 문구 분기) */
  filtered: boolean;
}

export function ModelsTable({ rows, loading, onOpenDetail, onOpenTest, onRegister, filtered }: ModelsTableProps) {
  const [showAll, setShowAll] = useState(false);

  const columns = useMemo<Column<ModelRegistry>[]>(
    () => [
      {
        key: 'display_name',
        header: '표시명',
        accessor: (m) => m.display_name,
        render: (m) => (
          <button type="button" onClick={() => onOpenDetail(m.model_id)} className="font-medium text-primary hover:underline">
            {m.display_name}
          </button>
        ),
      },
      {
        key: 'model_id',
        header: 'Model ID',
        accessor: (m) => m.model_id,
        render: (m) => <CopyableId value={m.model_id} short />,
      },
      { key: 'provider', header: 'Provider', accessor: (m) => m.provider },
      {
        key: 'capabilities',
        header: '지원 기능',
        accessor: (m) => capabilityCount(m.capabilities),
        render: (m) => <CapabilityChips caps={m.capabilities} />,
      },
      {
        key: 'input_price',
        header: 'Input $/1M',
        align: 'right',
        accessor: (m) => m.pricing?.input_per_1m_usd ?? null,
        render: (m) => <PriceCell pricing={m.pricing} kind="input" />,
      },
      {
        key: 'output_price',
        header: 'Output $/1M',
        align: 'right',
        accessor: (m) => m.pricing?.output_per_1m_usd ?? null,
        render: (m) => <PriceCell pricing={m.pricing} kind="output" />,
      },
      {
        key: 'effective_at',
        header: '가격 기준 시각',
        accessor: (m) => m.pricing?.effective_at ?? null,
        render: (m) => <PriceEffectiveCell pricing={m.pricing} />,
      },
      {
        key: 'status',
        header: '상태',
        accessor: (m) => m.status,
        render: (m) => <ModelStatusBadge status={m.status} />,
      },
      {
        key: 'last_test',
        header: '마지막 테스트',
        accessor: (m) => m.last_test?.tested_at ?? null,
        render: (m) => <LastTestCell test={m.last_test} />,
      },
      {
        key: 'action',
        header: '액션',
        sortable: false,
        align: 'center',
        accessor: () => null,
        render: (m) => (
          <Button size="sm" variant="secondary" leftIcon={<FlaskConical />} onClick={() => onOpenTest(m.model_id)}>
            테스트
          </Button>
        ),
      },
    ],
    [onOpenDetail, onOpenTest],
  );

  const capped = !showAll && rows.length > CAP;
  const visibleRows = capped ? rows.slice(0, CAP) : rows;

  return (
    <div className="flex flex-col gap-2">
      <DataTable
        columns={columns}
        rows={visibleRows}
        rowKey={(m) => m.model_id}
        defaultSort={{ key: 'display_name', dir: 'asc' }}
        pagination={showAll}
        pageSize={showAll ? 20 : undefined}
        pageSizeOptions={showAll ? [10, 20, 50] : undefined}
        loading={loading}
        emptyTitle={filtered ? '조건에 맞는 모델이 없습니다' : '등록된 모델이 없습니다'}
        emptyDescription={filtered ? '검색어·Provider·상태 필터를 변경해 보세요.' : 'OpenRouter 카탈로그에서 모델을 검색해 TESTING 상태로 등록하세요.'}
        emptyAction={
          filtered ? undefined : (
            <Button size="sm" onClick={onRegister}>
              신규 모델 등록
            </Button>
          )
        }
        caption="등록 모델 목록"
      />
      {!loading && rows.length > CAP && (
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span>{capped ? `상위 ${CAP}개 표시 · 전체 ${rows.length}개` : `전체 ${rows.length}개`}</span>
          <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
            {capped ? '전체보기' : '간략히 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
