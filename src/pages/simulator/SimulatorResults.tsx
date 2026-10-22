import { FlaskConical, History, RotateCcw, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, ErrorState, InlineAlert, SectionCard, Skeleton } from '../../components/ui';
import type { SimulationDetail } from '../../api';
import { formatKst } from '../../domain/format';
import { ModelResponseGrid, ModelResultsTable, ResultSummaryBar, isSimulationFinished } from '../../features/simulation';

export interface SimulatorResultsProps {
  simulationId: string | null;
  detail: SimulationDetail | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
  cancelling: boolean;
}

export function SimulatorResults({ simulationId, detail, loading, error, onRetry, onCancel, cancelling }: SimulatorResultsProps) {
  const navigate = useNavigate();

  if (!simulationId) {
    return (
      <SectionCard>
        <EmptyState icon={<FlaskConical aria-hidden="true" />} title="설정을 완료하고 비교 실행을 누르세요" description="좌측에서 시나리오·Prompt·모델(2~4개)을 선택하면 실행 전 검증이 통과된 뒤 비교 실행이 활성화됩니다. 실행 결과는 자동으로 이력에 저장됩니다." />
      </SectionCard>
    );
  }
  if (error) {
    return (
      <SectionCard>
        <ErrorState title="시뮬레이션 결과를 불러오지 못했습니다" description={error} onRetry={onRetry} />
      </SectionCard>
    );
  }
  if (loading || !detail) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const running = !isSimulationFinished(detail.run.status);
  const id = detail.run.simulation_id;
  return (
    <div className="flex flex-col gap-4">
      <SectionCard padded>
        <ResultSummaryBar
          detail={detail}
          actions={
            running ? (
              <Button variant="danger" size="sm" leftIcon={<Square />} loading={cancelling} onClick={onCancel}>
                실행 취소
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="sm" leftIcon={<History />} onClick={() => navigate(`/simulations/${id}`)}>
                  이력에서 보기
                </Button>
                <Button variant="secondary" size="sm" leftIcon={<RotateCcw />} onClick={() => navigate(`/simulator?from=${encodeURIComponent(id)}`)}>
                  재실행
                </Button>
              </>
            )
          }
        />
        <p className="mt-3 text-xs text-ink-muted">
          시작 {formatKst(detail.run.started_at)} KST · 실행자 {detail.run.executed_by}
          {detail.run.rerun_of && <> · 재실행 원본 <span className="font-mono">{detail.run.rerun_of}</span></>}
          {' · '}
          {running ? '실행 조건은 이미 저장되었고 모델별 결과가 도착하는 대로 기록됩니다.' : '실행 조건과 결과가 자동 저장되었습니다. 이 기록은 변경되지 않습니다.'}
        </p>
      </SectionCard>

      {running && (
        <InlineAlert tone="info" title="병렬 실행 중">
          모델별 응답이 도착하면 카드가 갱신됩니다. 실행 취소 시 진행 중인 호출은 CANCELLED 로 기록되며 Provider 측 비용은 미확인으로 남을 수 있습니다.
        </InlineAlert>
      )}

      <SectionCard title="모델별 비교" description="실패·Timeout 행도 그대로 표시합니다. 순위나 품질 점수는 제공하지 않습니다." padded={false}>
        <div className="p-4">
          <ModelResultsTable detail={detail} />
        </div>
      </SectionCard>

      <SectionCard title="모델별 응답" description="응답 원문은 가공 없이 보존됩니다. 미리보기는 8줄까지 표시됩니다.">
        <ModelResponseGrid detail={detail} />
      </SectionCard>
    </div>
  );
}
