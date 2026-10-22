import { ExternalLink, RotateCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePageMeta } from '../../components/layout/AppShell';
import { Badge, Button, ErrorState, InlineAlert, SectionCard, Skeleton } from '../../components/ui';
import { formatKst } from '../../domain/format';
import { SIM_STATUS } from '../../domain/status';
import { ModelResponseGrid, ModelResultsTable, ResultSummaryBar, useSimulationDetail } from '../../features/simulation';
import { useNames, useReferenceData } from '../../hooks/useReferenceData';
import { RerunModal } from './RerunModal';
import { RunConditionsCard } from './RunConditionsCard';

const LIST_PATH = '/simulations';

export default function SimulationDetailPage() {
  const { simulationId = '' } = useParams<{ simulationId: string }>();
  const navigate = useNavigate();
  const ref = useReferenceData();
  const names = useNames();
  const { detail, loading, error, notFound, reload } = useSimulationDetail(simulationId || null);
  const [rerunOpen, setRerunOpen] = useState(false);

  const run = detail?.run ?? null;
  const inactiveModels = useMemo(() => (run ? run.model_ids.filter((id) => ref.modelById.get(id)?.status === 'INACTIVE') : []), [run, ref.modelById]);

  const breadcrumb = useMemo(() => [{ label: '시뮬레이션 결과 이력', to: LIST_PATH }, { label: simulationId }], [simulationId]);
  const title = useMemo(
    () => (
      <span className="inline-flex items-center gap-2">
        <span className="font-mono">{simulationId}</span>
        {run && (
          <Badge tone={SIM_STATUS[run.status].tone} dot>
            {SIM_STATUS[run.status].label}
          </Badge>
        )}
      </span>
    ),
    [simulationId, run],
  );
  const meta = useMemo(
    () => (run ? <span>실행 {formatKst(run.started_at)} KST · 실행자 {names.user(run.executed_by)}</span> : <span>조회 기준 KST</span>),
    [run, names],
  );
  const headerActions = useMemo(
    () => (
      <Button
        size="sm"
        leftIcon={<RotateCw />}
        onClick={() => setRerunOpen(true)}
        disabled={!run}
        disabledReason={loading ? '불러오는 중' : notFound ? 'Simulation 없음' : error ? '조회 실패' : 'Simulation 없음'}
      >
        재실행
      </Button>
    ),
    [run, loading, error, notFound],
  );
  usePageMeta({ title, breadcrumb, meta, actions: headerActions });

  if (!simulationId) {
    return <ErrorState title="Simulation ID 가 없습니다" description="목록에서 실행을 선택하세요." onRetry={() => navigate(LIST_PATH)} retryLabel="이력으로 이동" />;
  }
  if (loading && !detail) {
    return (
      <div className="flex flex-col gap-5" role="status" aria-busy="true" aria-label="시뮬레이션 상세 불러오는 중">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  if (error || !detail || !run) {
    return (
      <ErrorState
        title={notFound ? 'Simulation 을 찾을 수 없습니다' : '조회에 실패했습니다'}
        description={
          <span>
            {error ?? `${simulationId} 에 해당하는 실행 기록이 없습니다.`}{' '}
            <Link to={LIST_PATH} className="text-primary hover:underline">
              이력으로 돌아가기
            </Link>
          </span>
        }
        onRetry={reload}
      />
    );
  }

  const summaryActions = (
    <>
      <Button size="sm" variant="secondary" leftIcon={<ExternalLink />} onClick={() => navigate(`/simulator?from=${encodeURIComponent(run.simulation_id)}`)}>
        P-04에서 열기
      </Button>
      <Button size="sm" leftIcon={<RotateCw />} onClick={() => setRerunOpen(true)}>
        재실행
      </Button>
    </>
  );

  return (
    <>
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
          {ref.error} · 모델 이름이 ID 로 표시되고 현재 INACTIVE 여부를 판단할 수 없습니다.
        </InlineAlert>
      )}

      <SectionCard>
        <ResultSummaryBar detail={detail} actions={summaryActions} />
      </SectionCard>

      {inactiveModels.length > 0 && (
        <InlineAlert tone="warning" title="이 실행에는 현재 비활성화된 모델이 포함되어 있습니다. 재실행 시 교체하거나 제외해야 합니다.">
          <span className="text-xs">
            현재 INACTIVE: {inactiveModels.map((id) => names.model(id)).join(', ')} · 과거 결과는 그대로 보존되며 읽기 전용입니다.
          </span>
        </InlineAlert>
      )}

      {run.rerun_of && (
        <InlineAlert tone="info">
          이 실행은{' '}
          <Link to={`/simulations/${encodeURIComponent(run.rerun_of)}`} className="font-mono text-primary hover:underline">
            {run.rerun_of}
          </Link>{' '}
          의 재실행입니다. 원본 기록은 변경되지 않았습니다.
        </InlineAlert>
      )}

      <RunConditionsCard run={run} />

      <SectionCard title="모델별 결과 비교" description="실행 상태와 비용 상태는 별도 항목입니다. 실패·Timeout 행도 표시되며, Request ID 를 클릭하면 공통 호출 상세를 엽니다." padded={false}>
        <div className="p-3">
          <ModelResultsTable detail={detail} />
        </div>
      </SectionCard>

      <SectionCard title="모델별 응답" description="응답 원문은 가공하지 않습니다. [전체 응답 보기] 로 원문 전체를 확인할 수 있습니다.">
        <ModelResponseGrid detail={detail} />
      </SectionCard>

      <RerunModal open={rerunOpen} simulationId={run.simulation_id} onClose={() => setRerunOpen(false)} />
    </>
  );
}
