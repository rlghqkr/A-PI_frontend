import { ExternalLink, RotateCw } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, DataTable, type Column } from '../../components/ui';
import { formatKst, formatMs } from '../../domain/format';
import { SIM_COST_STATE, SIM_STATUS } from '../../domain/status';
import type { ModelRegistry } from '../../domain/types';
import { useNames } from '../../hooks/useReferenceData';
import { SimulationIdCell } from '../../features/shared/cells';
import { ModelChips, TotalCostCell } from './SimCells';
import { SimulationRequestRows } from './SimulationRequestRows';
import type { SimulationRow } from './simulationRows';

export interface SimulationTableProps {
  rows: SimulationRow[];
  modelById: ReadonlyMap<string, ModelRegistry>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRerun: (row: SimulationRow) => void;
  /** 필터가 적용된 상태인지 (빈 상태 안내 문구용) */
  filtered: boolean;
  onResetFilters: () => void;
}

export function SimulationTable({ rows, modelById, loading, error, onRetry, onRerun, filtered, onResetFilters }: SimulationTableProps) {
  const names = useNames();
  const navigate = useNavigate();

  const columns = useMemo<Column<SimulationRow>[]>(
    () => [
      { key: 'started_at', header: '실행 시각 (KST)', accessor: (r) => r.run.started_at, render: (r) => <span className="tnum">{formatKst(r.run.started_at)}</span>, width: 170 },
      { key: 'simulation_id', header: 'Simulation ID', accessor: (r) => r.run.simulation_id, render: (r) => <SimulationIdCell id={r.run.simulation_id} />, mono: true },
      { key: 'scenario', header: '시나리오', accessor: (r) => names.scenario(r.run.scenario_id) },
      {
        key: 'models',
        header: '모델',
        accessor: (r) => r.run.model_ids.length,
        render: (r) => <ModelChips modelIds={r.run.model_ids} modelById={modelById} />,
      },
      {
        key: 'status',
        header: '전체 상태',
        accessor: (r) => r.run.status,
        render: (r) => <Badge tone={SIM_STATUS[r.run.status].tone}>{SIM_STATUS[r.run.status].label}</Badge>,
      },
      {
        key: 'cost_state',
        header: '비용 상태',
        accessor: (r) => r.costState,
        render: (r) => <Badge tone={SIM_COST_STATE[r.costState].tone}>{SIM_COST_STATE[r.costState].label}</Badge>,
      },
      {
        key: 'total_cost',
        header: '총 비용',
        align: 'right',
        accessor: (r) => (r.summary.calls - r.summary.unknownCount > 0 ? r.summary.totalIncludingEstimatedUsd : null),
        render: (r) => <TotalCostCell summary={r.summary} />,
      },
      { key: 'duration', header: '실행시간', align: 'right', accessor: (r) => r.durationMs, render: (r) => <span className="tnum">{formatMs(r.durationMs)}</span> },
      {
        key: 'rerun_of',
        header: '재실행 관계',
        accessor: (r) => r.run.rerun_of,
        render: (r) =>
          r.run.rerun_of ? (
            <span className="text-xs">
              재실행 of{' '}
              <Link to={`/simulations/${encodeURIComponent(r.run.rerun_of)}`} className="font-mono text-primary hover:underline">
                {r.run.rerun_of}
              </Link>
            </span>
          ) : (
            <span className="text-ink-muted">-</span>
          ),
      },
      {
        key: 'actions',
        header: '액션',
        sortable: false,
        accessor: () => null,
        render: (r) => (
          <span className="flex items-center gap-1">
            <Button size="sm" variant="ghost" leftIcon={<ExternalLink />} onClick={() => navigate(`/simulations/${r.run.simulation_id}`)}>
              상세
            </Button>
            <Button size="sm" variant="secondary" leftIcon={<RotateCw />} onClick={() => onRerun(r)}>
              재실행
            </Button>
          </span>
        ),
      },
    ],
    [names, modelById, navigate, onRerun],
  );

  return (
    <DataTable<SimulationRow>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.run.simulation_id}
      defaultSort={{ key: 'started_at', dir: 'desc' }}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      loading={loading}
      error={error}
      onRetry={onRetry}
      expandable={{ render: (r) => <SimulationRequestRows row={r} modelById={modelById} /> }}
      emptyTitle="조회 결과가 없습니다"
      emptyDescription={filtered ? '조회 기간이나 필터를 변경해 보세요. Simulator(P-04)에서 새 비교 실행을 만들 수도 있습니다.' : '아직 실행된 시뮬레이션이 없습니다. Simulator(P-04)에서 비교 실행을 시작하세요.'}
      emptyAction={
        <span className="flex items-center gap-2">
          {filtered && (
            <Button size="sm" variant="secondary" onClick={onResetFilters}>
              필터 초기화
            </Button>
          )}
          <Button size="sm" onClick={() => navigate('/simulator')}>
            Simulator 열기
          </Button>
        </span>
      }
      caption="시뮬레이션 결과 이력"
    />
  );
}
