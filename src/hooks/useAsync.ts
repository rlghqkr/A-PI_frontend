import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { ApiError } from '../api';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** 마지막으로 성공한 시각 (ISO) */
  loadedAt: string | null;
  reload: () => void;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * 비동기 조회 훅. deps 가 바뀌면 재조회. 늦게 도착한 이전 응답은 무시한다.
 * `enabled=false` 면 조회하지 않는다 (예: 필터 검증 실패).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList, opts?: { enabled?: boolean; keepPrevious?: boolean }): AsyncState<T> {
  const enabled = opts?.enabled ?? true;
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null; loadedAt: string | null }>({ data: null, loading: enabled, error: null, loadedAt: null });
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const my = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null, data: opts?.keepPrevious === false ? null : s.data }));
    fnRef
      .current()
      .then((data) => {
        if (my !== seq.current) return;
        setState({ data, loading: false, error: null, loadedAt: new Date().toISOString() });
      })
      .catch((e: unknown) => {
        if (my !== seq.current) return;
        setState((s) => ({ ...s, loading: false, error: errorMessage(e) }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** 저장/실행 등 명령형 비동기 작업 */
export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setLoading(true);
      setError(null);
      setFieldErrors({});
      try {
        return await fn(...args);
      } catch (e) {
        setError(errorMessage(e));
        if (e instanceof ApiError && e.details) setFieldErrors(e.details);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );
  const reset = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);
  return { run, loading, error, fieldErrors, reset };
}
