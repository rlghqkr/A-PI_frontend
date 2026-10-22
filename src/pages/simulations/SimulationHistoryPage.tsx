import { FlaskConical } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { usePageMeta } from '../../components/layout/AppShell';
import { Button, InlineAlert, KpiCard } from '../../components/ui';
import { isValidRange, summarize } from '../../domain/aggregate';
import { formatKst, formatUsd } from '../../domain/format';
import type { SimulationHistoryFilter } from '../../domain/types';
import { useAsync } from '../../hooks/useAsync';
import { useReferenceData } from '../../hooks/useReferenceData';
import { useUrlState } from '../../hooks/useUrlState';
import { RerunModal } from './RerunModal';
import { SimulationHistoryFilters } from './SimulationHistoryFilters';
import { SimulationTable } from './SimulationTable';
import { buildSimulationRows, defaultRange, isSimulationStatus, type HistoryUrlState, type SimulationRow } from './simulationRows';

export default function SimulationHistoryPage() {
  const navigate = useNavigate();
  const ref = useReferenceData();
  const defaults = useMemo<HistoryUrlState>(() => ({ ...defaultRange(), scenario: '', model: '', status: '', sim: '' }), []);
  const [applied, setApplied] = useUrlState<HistoryUrlState>(defaults);
  const [rerunTarget, setRerunTarget] = useState<string | null>(null);

  const rangeError = isValidRange({ start: applied.start, end: applied.end });
  const filter = useMemo<Partial<SimulationHistoryFilter>>(
    () => ({
      start: applied.start,
      end: applied.end,
      scenario_id: applied.scenario || null,
      model_id: applied.model || null,
      status: isSimulationStatus(applied.status) ? applied.status : null,
      simulation_id: applied.sim,
    }),
    [applied],
  );

  // 목록을 먼저 조회하고, 목록에 있는 Simulation 의 Request 를 simulation_id 귀속 기준으로 한 번에 조회한다
  // (기간으로 Request 를 자르면 자정을 넘긴 실행의 Request 가 빠져 비용이 틀어진다)
  const runsState = useAsync(() => api.listSimulations(filter), [filter], { enabled: !rangeError });
  const runIdsKey = useMemo(() => (runsState.data ?? []).map((r) => r.simulation_id).join(','), [runsState.data]);
  const requestsState = useAsync(() => api.queryRequests({ origins: ['SIMULATION'], simulation_ids: runIdsKey ? runIdsKey.split(',') : [] }), [runIdsKey], {
    enabled: !rangeError && runsState.data !== null,
  });

  const rows = useMemo<SimulationRow[]>(() => buildSimulationRows(runsState.data ?? [], requestsState.data ?? []), [runsState.data, requestsState.data]);
  // 요약 KPI 는 테이블과 동일한 행(= 동일한 요청 배열)에서 파생
  const allRequests = useMemo(() => rows.flatMap((r) => r.requests), [rows]);
  const total = useMemo(() => summarize(allRequests), [allRequests]);
  const statusCount = useMemo(() => {
    const c = { success: 0, partial: 0, failed: 0, other: 0 };
    for (const r of rows) {
      if (r.run.status === 'SUCCESS') c.success++;
      else if (r.run.status === 'PARTIAL_SUCCESS') c.partial++;
      else if (r.run.status === 'FAILED') c.failed++;
      else c.other++;
    }
    return c;
  }, [rows]);

  const loading = runsState.loading || requestsState.loading;
  const error = runsState.error ?? requestsState.error;
  const reloadRuns = runsState.reload;
  const reloadRequests = requestsState.reload;
  const reload = useCallback(() => {
    reloadRuns();
    reloadRequests();
  }, [reloadRuns, reloadRequests]);

  const filtered = applied.scenario !== '' || applied.model !== '' || applied.status !== '' || applied.sim !== '' || applied.start !== defaults.start || applied.end !== defaults.end;
  const onApply = useCallback((next: HistoryUrlState) => setApplied(next), [setApplied]);
  const onReset = useCallback(() => setApplied(defaults), [setApplied, defaults]);
  const onRerun = useCallback((row: SimulationRow) => setRerunTarget(row.run.simulation_id), []);

  const meta = useMemo(
    () => (
      <span>
        조회 기준 KST · {applied.start} ~ {applied.end}
        {runsState.loadedAt && ` · 갱신 ${formatKst(runsState.loadedAt, { seconds: false })}`}
      </span>
    ),
    [applied.start, applied.end, runsState.loadedAt],
  );
  const actions = useMemo(
    () => (
      <Button size="sm" leftIcon={<FlaskConical />} onClick={() => navigate('/simulator')}>
        새 비교 실행
      </Button>
    ),
    [navigate],
  );
  const breadcrumb = useMemo(() => [{ label: '시뮬레이션 결과 이력' }], []);
  usePageMeta({ title: '시뮬레이션 결과 이력', breadcrumb, meta, actions });

  const unknownNote = total.unknownCount > 0 ? `비용 미확인 ${total.unknownCount}건 제외` : undefined;

  return (
    <>
      <SimulationHistoryFilters applied={applied} defaults={defaults} loading={loading} onApply={onApply} />

      {ref.error && (
        <InlineAlert
          tone="danger"
          title="기준 데이터(모델·시나리오)를 불러오지 못했습니다"
          action={
            <Button size="sm" variant="secondary" onClick={ref.reload}>
              재시도
            </Button>
          }
        >
          {ref.error} · 모델·시나리오 이름이 ID 로 표시되고 현재 INACTIVE 여부를 판단할 수 없습니다.
        </InlineAlert>
      )}

      {rangeError ? (
        <InlineAlert tone="warning" title="조회 기간이 올바르지 않습니다">
          {rangeError}
        </InlineAlert>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="실행 수" value={loading ? '…' : rows.length} unit="건" sub={`전체 성공 ${statusCount.success} · 부분 성공 ${statusCount.partial} · 실패 ${statusCount.failed}${statusCount.other ? ` · 기타 ${statusCount.other}` : ''}`} />
          <KpiCard label="API 호출 수" value={loading ? '…' : total.calls} unit="건" sub={`성공 ${total.success} · 실패 ${total.failed} · Timeout ${total.timeout}`} />
          <KpiCard label="확정 API 비용" value={loading ? '…' : formatUsd(total.confirmedUsd)} tone="success" sub={unknownNote} hint="cost_status CONFIRMED 인 호출만 합산" />
          <KpiCard
            label="추정 API 비용"
            value={loading ? '…' : formatUsd(total.estimatedUsd)}
            tone="estimated"
            sub={
              <span className="flex flex-col">
                <span>추정 포함 합계 {formatUsd(total.totalIncludingEstimatedUsd)}</span>
                {total.unknownCount > 0 && <span className="text-warning">비용 미확인 {total.unknownCount}건 (합산 제외)</span>}
              </span>
            }
            hint="cost_status ESTIMATED 인 호출만 합산. 미확인(UNKNOWN)은 금액에 포함하지 않음"
          />
        </div>
      )}

      <SimulationTable
        rows={rows}
        modelById={ref.modelById}
        loading={loading && !rangeError}
        error={rangeError ? null : error}
        onRetry={reload}
        onRerun={onRerun}
        filtered={filtered}
        onResetFilters={onReset}
      />

      <RerunModal open={rerunTarget !== null} simulationId={rerunTarget} onClose={() => setRerunTarget(null)} />
    </>
  );
}
