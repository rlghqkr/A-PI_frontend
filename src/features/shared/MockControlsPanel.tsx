import { useReducer, useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { IS_MOCK, mockControls } from '../../api';
import { Button, Toggle } from '../../components/ui';

/**
 * Mock 환경 제어 패널 (사이드바 하단). 실제 API 연동 시 제거한다.
 * - 다음 조회 1회 실패: Error 상태 검증
 * - Seed 초기화: 등록·수정·실행으로 바뀐 Mock 데이터를 기본 Seed 로 되돌림
 */
export function MockControlsPanel() {
  const [open, setOpen] = useState(false);
  // failNextQuery 는 다음 조회가 소비(false 로 되돌림)하므로 state 로 복사하지 않고 매 렌더마다 mock 에서 읽는다.
  // 패널을 열거나 포커스/마우스가 들어올 때 다시 렌더해 실제 값과 동기화한다.
  const [, sync] = useReducer((n: number) => n + 1, 0);
  if (!IS_MOCK) return null;
  const failNext = mockControls.controls.failNextQuery;
  return (
    <div className="text-xs text-white/70" onFocusCapture={sync} onMouseEnter={sync}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          sync();
        }}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-white/10"
        aria-expanded={open}
      >
        <span>Mock 환경 설정</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
      </button>
      {open && (
        <div className="mt-1 space-y-2 rounded-md bg-white/5 p-2">
          <Toggle
            checked={failNext}
            onChange={(v) => {
              mockControls.controls.failNextQuery = v;
              sync();
            }}
            label="다음 조회 1회 실패"
            description="오류 상태 검증용"
          />
          <Button
            size="sm"
            variant="secondary"
            block
            leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />}
            onClick={() => {
              mockControls.reset();
              window.location.reload();
            }}
          >
            Seed 데이터 초기화
          </Button>
        </div>
      )}
    </div>
  );
}
