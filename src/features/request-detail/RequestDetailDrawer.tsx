/**
 * F-05 공통 호출 상세 Drawer. `RequestDetailProvider` 가 `?request=REQ-ID` 로 열고 닫는다.
 * 데이터: api.getRequest + api.getRetryChain (+ 시뮬레이션 호출이면 api.getSimulation 으로 검증 결과).
 */
import { useCallback, useMemo } from 'react';
import { api } from '../../api';
import { Button, Drawer, EmptyState, ErrorState, InlineAlert, Skeleton } from '../../components/ui';
import { formatKst } from '../../domain/format';
import type { AIRequest, SimulationResult } from '../../domain/types';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { CostStatusBadge, ExecStatusBadge } from '../shared/cells';
import { OriginBadge } from '../shared/origin';
import { CostSection, IdentitySection, ModelSection, OriginSection, ResultSection, TimingSection, ValidationSection } from './RequestDetailSections';
import { RetryChainList } from './RetryChainList';

export interface RequestDetailDrawerProps {
  /** null 이면 닫힘 */
  requestId: string | null;
  onClose: () => void;
  /** 체인/원 요청 등 다른 Request ID 로 이동 */
  onNavigate: (id: string) => void;
}

interface Loaded {
  request: AIRequest | null;
  chain: AIRequest[];
  /** 시뮬레이션 결과(검증). 조회 실패 시 error 에 사유 */
  simResult: SimulationResult | null;
  simError: string | null;
}

async function load(requestId: string): Promise<Loaded> {
  const [request, chain] = await Promise.all([api.getRequest(requestId), api.getRetryChain(requestId)]);
  if (!request) return { request: null, chain: [], simResult: null, simError: null };
  let simResult: SimulationResult | null = null;
  let simError: string | null = null;
  if (request.simulation_id) {
    try {
      const detail = await api.getSimulation(request.simulation_id);
      simResult = detail?.results.find((r) => r.request_id === requestId) ?? null;
    } catch (e) {
      simError = errorMessage(e);
    }
  }
  return { request, chain, simResult, simError };
}

export function RequestDetailDrawer({ requestId, onClose, onNavigate }: RequestDetailDrawerProps) {
  const open = requestId !== null;
  const state = useAsync(() => load(requestId as string), [requestId], { enabled: open, keepPrevious: false });
  const request = state.data?.request ?? null;

  const headerExtra = useMemo(() => {
    if (!request) return undefined;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <OriginBadge origin={request.usage_origin} />
        <ExecStatusBadge status={request.status} />
        <CostStatusBadge status={request.cost_status} />
        <span className="text-[11px] text-ink-muted">요청 {formatKst(request.requested_at)} KST</span>
      </div>
    );
  }, [request]);

  const goParent = useCallback(() => {
    if (request?.parent_request_id) onNavigate(request.parent_request_id);
  }, [request, onNavigate]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={<span className="font-mono text-sm">{requestId ?? ''}</span>}
      description="공통 호출 상세 · 시각은 KST 기준"
      headerExtra={headerExtra}
      footer={
        <>
          {request?.parent_request_id && (
            <Button variant="secondary" size="sm" onClick={goParent}>
              재시도 원 요청 보기
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            닫기
          </Button>
        </>
      }
    >
      {state.loading && <DrawerSkeleton />}
      {!state.loading && state.error && (
        <ErrorState title="호출 상세를 불러오지 못했습니다" description={state.error} onRetry={state.reload} />
      )}
      {!state.loading && !state.error && state.data && !request && (
        <EmptyState
          title="호출을 찾을 수 없습니다"
          description={`Request ID "${requestId}" 에 해당하는 호출 이력이 없습니다. ID 를 확인하거나 목록에서 다시 선택하세요.`}
          action={
            <Button variant="secondary" size="sm" onClick={onClose}>
              닫기
            </Button>
          }
        />
      )}
      {!state.loading && !state.error && request && state.data && (
        <div className="flex flex-col gap-3">
          <IdentitySection request={request} onNavigate={onNavigate} />
          <OriginSection request={request} />
          <ModelSection request={request} />
          <TimingSection request={request} />
          <ResultSection request={request} />
          <CostSection request={request} />
          {state.data.simResult && <ValidationSection result={state.data.simResult} />}
          {state.data.simError && (
            <InlineAlert tone="warning" title="검증 결과를 불러오지 못했습니다">
              {state.data.simError}
            </InlineAlert>
          )}
          {request.simulation_id && !state.data.simResult && !state.data.simError && (
            <InlineAlert tone="warning" title="검증 결과를 찾을 수 없습니다">
              Simulation <span className="font-mono">{request.simulation_id}</span> 에 이 Request 의 JSON/Schema 검증 결과가 기록되어 있지 않습니다.
            </InlineAlert>
          )}
          <RetryChainList chain={state.data.chain.length ? state.data.chain : [request]} currentId={request.request_id} onNavigate={onNavigate} />
        </div>
      )}
    </Drawer>
  );
}

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label="호출 상세 불러오는 중">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border">
          <Skeleton className="h-8 w-full rounded-b-none" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
