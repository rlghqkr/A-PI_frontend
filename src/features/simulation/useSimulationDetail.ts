import { useCallback, useEffect, useState } from 'react';
import { api, type SimulationDetail } from '../../api';
import { errorMessage } from '../../hooks/useAsync';

export interface SimulationDetailState {
  detail: SimulationDetail | null;
  loading: boolean;
  error: string | null;
  /** getSimulation 이 null 을 돌려준 경우 (오류 메시지 문자열 매칭 대신 사용) */
  notFound: boolean;
  reload: () => void;
}

/**
 * Simulation ID 를 구독한다. 실행 중이면 모델별 진행 상황이 갱신될 때마다 detail 이 바뀐다.
 * id 가 null 이면 아무것도 조회하지 않는다.
 */
export function useSimulationDetail(simulationId: string | null): SimulationDetailState {
  const [detail, setDetail] = useState<SimulationDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(simulationId));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!simulationId) {
      setDetail(null);
      setLoading(false);
      setError(null);
      setNotFound(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setDetail(null);
    const unsubscribe = api.subscribeSimulation(simulationId, (d) => {
      if (!alive) return;
      setDetail(d);
      setLoading(false);
    });
    api
      .getSimulation(simulationId)
      .then((d) => {
        if (!alive) return;
        if (!d) {
          setNotFound(true);
          setError(`시뮬레이션 ${simulationId} 을(를) 찾을 수 없습니다.`);
          setLoading(false);
          return;
        }
        setDetail((prev) => prev ?? d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(errorMessage(e));
        setLoading(false);
      });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [simulationId, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { detail, loading, error, notFound, reload };
}
