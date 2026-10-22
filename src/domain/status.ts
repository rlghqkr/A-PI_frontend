import type {
  BudgetState,
  CostSource,
  CostStatus,
  ErrorType,
  ExecStatus,
  JsonCheck,
  ModelStatus,
  SchemaCheck,
  SimulationStatus,
  UsageOrigin,
  CallPurpose,
} from './types';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'estimated' | 'neutral' | 'primary';

export const EXEC_STATUS: Record<ExecStatus, { label: string; tone: Tone }> = {
  PENDING: { label: '대기', tone: 'neutral' },
  RUNNING: { label: '실행 중', tone: 'info' },
  SUCCESS: { label: '성공', tone: 'success' },
  FAILED: { label: '실패', tone: 'danger' },
  TIMEOUT: { label: 'Timeout', tone: 'warning' },
  CANCELLED: { label: '취소', tone: 'neutral' },
};

export const SIM_STATUS: Record<SimulationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: '대기', tone: 'neutral' },
  RUNNING: { label: '실행 중', tone: 'info' },
  SUCCESS: { label: '전체 성공', tone: 'success' },
  PARTIAL_SUCCESS: { label: '부분 성공', tone: 'warning' },
  FAILED: { label: '실패', tone: 'danger' },
  CANCELLED: { label: '취소', tone: 'neutral' },
};

export const COST_STATUS: Record<CostStatus, { label: string; tone: Tone }> = {
  CONFIRMED: { label: '확정', tone: 'success' },
  ESTIMATED: { label: '추정', tone: 'estimated' },
  UNKNOWN: { label: '미확인', tone: 'warning' },
};

/** 시뮬레이션 단위 비용 확인 상태 (DD-12) */
export type SimCostState = 'CONFIRMED' | 'INCLUDES_ESTIMATED' | 'INCLUDES_UNKNOWN' | 'IN_PROGRESS';
export const SIM_COST_STATE: Record<SimCostState, { label: string; tone: Tone }> = {
  CONFIRMED: { label: '확정', tone: 'success' },
  INCLUDES_ESTIMATED: { label: '추정 포함', tone: 'estimated' },
  INCLUDES_UNKNOWN: { label: '미확인 포함', tone: 'warning' },
  IN_PROGRESS: { label: '확인 중', tone: 'info' },
};

export const COST_SOURCE: Record<CostSource, string> = {
  API_RESPONSE: 'API 응답',
  ESTIMATED_CALC: '추정 계산(Token×단가)',
  RECONCILED: '대조 조회',
  NONE: '없음',
};

export const MODEL_STATUS: Record<ModelStatus, { label: string; tone: Tone; description: string }> = {
  TESTING: { label: 'TESTING', tone: 'info', description: '등록·검증 중. 일반 Simulator에서 선택 불가' },
  ACTIVE: { label: 'ACTIVE', tone: 'success', description: '검증 후 활성화. 일반 Simulator에서 선택 가능' },
  INACTIVE: { label: 'INACTIVE', tone: 'neutral', description: '사용 중지. 신규 실행 제외, 과거 이력 보존' },
};

export const BUDGET_STATE: Record<BudgetState, { label: string; tone: Tone }> = {
  NORMAL: { label: '정상', tone: 'success' },
  WARNING: { label: '주의', tone: 'warning' },
  EXCEEDED: { label: '초과', tone: 'danger' },
  UNSET: { label: '미설정', tone: 'neutral' },
};

export const USAGE_ORIGIN: Record<UsageOrigin, { label: string; tone: Tone; short: string }> = {
  CUSTOMER_SERVICE: { label: '고객 서비스', tone: 'primary', short: '고객' },
  INTERNAL_DEVELOPMENT: { label: '내부 개발', tone: 'info', short: '개발' },
  SIMULATION: { label: '시뮬레이션', tone: 'estimated', short: '시뮬' },
  SYSTEM_TEST: { label: '연결 테스트', tone: 'neutral', short: '테스트' },
};

export const ERROR_TYPE: Record<ErrorType, string> = {
  AUTH_ERROR: '인증 실패',
  RATE_LIMIT: '호출 제한',
  TIMEOUT_ERROR: '응답 지연',
  PROVIDER_ERROR: '외부 API 오류',
  INVALID_RESPONSE: '응답 구조 오류',
  UNSUPPORTED_INPUT: '지원하지 않는 입력',
  NETWORK_ERROR: '네트워크 오류',
  UNKNOWN_ERROR: '기타 오류',
};

export const CALL_PURPOSE: Record<CallPurpose, string> = {
  GENERATE: '생성',
  EVALUATE: '평가',
  REGENERATE: '재생성',
  EXPERIMENT: '실험',
  TEST: '테스트',
};

export const JSON_CHECK: Record<JsonCheck, { label: string; tone: Tone }> = {
  VALID: { label: 'JSON 유효', tone: 'success' },
  INVALID: { label: 'JSON 파싱 실패', tone: 'danger' },
  NOT_RUN: { label: '미실행', tone: 'neutral' },
};

export const SCHEMA_CHECK: Record<SchemaCheck, { label: string; tone: Tone }> = {
  PASS: { label: 'Schema 준수', tone: 'success' },
  FAIL: { label: 'Schema 위반', tone: 'danger' },
  NOT_APPLIED: { label: '미적용', tone: 'neutral' },
  NOT_RUN: { label: '미실행', tone: 'neutral' },
};

export const TERMINAL_EXEC: ExecStatus[] = ['SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED'];
export function isTerminal(s: ExecStatus): boolean {
  return TERMINAL_EXEC.includes(s);
}
