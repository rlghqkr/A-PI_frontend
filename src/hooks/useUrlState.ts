import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * URL query 와 동기화된 상태. 화면 간 이동 후 돌아와도 필터·정렬이 유지된다.
 * 값이 기본값과 같으면 URL 에서 제거한다.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T): [T, (patch: Partial<T>, opts?: { replace?: boolean }) => void] {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => {
    const out = { ...defaults } as Record<string, string>;
    for (const k of Object.keys(defaults)) {
      const v = params.get(k);
      if (v !== null) out[k] = v;
    }
    return out as T;
  }, [params, defaults]);

  const set = useCallback(
    (patch: Partial<T>, opts?: { replace?: boolean }) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === defaults[k]) next.delete(k);
        else next.set(k, String(v));
      }
      setParams(next, { replace: opts?.replace ?? true });
    },
    [params, setParams, defaults],
  );
  return [state, set];
}
