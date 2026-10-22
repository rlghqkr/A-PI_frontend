import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RequestDetailDrawer } from './RequestDetailDrawer';

interface RequestDetailCtx {
  /** 공통 호출 상세 Drawer 열기 (URL `?request=` 로 유지) */
  openRequest: (requestId: string) => void;
  closeRequest: () => void;
  currentRequestId: string | null;
}

const Ctx = createContext<RequestDetailCtx | null>(null);

export const REQUEST_PARAM = 'request';

export function RequestDetailProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const currentRequestId = params.get(REQUEST_PARAM);
  // 함수형 업데이트로 params 에 의존하지 않아 콜백 identity 가 안정적이다 (Drawer 의 overlay effect 가 매 이동마다 재실행되지 않음)
  const openRequest = useCallback(
    (id: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(REQUEST_PARAM, id);
          return next;
        },
        { replace: false },
      );
    },
    [setParams],
  );
  const closeRequest = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(REQUEST_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [setParams]);
  const value = useMemo(() => ({ openRequest, closeRequest, currentRequestId }), [openRequest, closeRequest, currentRequestId]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <RequestDetailDrawer requestId={currentRequestId} onClose={closeRequest} onNavigate={openRequest} />
    </Ctx.Provider>
  );
}

export function useRequestDetail(): RequestDetailCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRequestDetail must be used within RequestDetailProvider');
  return v;
}
