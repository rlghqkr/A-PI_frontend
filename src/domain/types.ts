/**
 * Patron 프론트엔드 도메인 타입.
 * 기준: "기능 요구사항 및 공통 데이터 계약 v1.2" §3 + "화면설계 기준서 v1.4" §3.
 * 논리 데이터 계약을 표현한 것이며, 실제 DB 컬럼 확정을 의미하지 않는다.
 */

export type UsageOrigin =
  | 'CUSTOMER_SERVICE'
  | 'INTERNAL_DEVELOPMENT'
  | 'SIMULATION'
  | 'SYSTEM_TEST';

export type OwnerType = 'CUSTOMER' | 'INTERNAL' | 'POC';

export type ExecStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'TIMEOUT'
  | 'CANCELLED';

export type SimulationStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export type ErrorType =
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'TIMEOUT_ERROR'
  | 'PROVIDER_ERROR'
  | 'INVALID_RESPONSE'
  | 'UNSUPPORTED_INPUT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export type CostStatus = 'CONFIRMED' | 'ESTIMATED' | 'UNKNOWN';

/** 비용 확인 출처 */
export type CostSource = 'API_RESPONSE' | 'ESTIMATED_CALC' | 'RECONCILED' | 'NONE';

export type ModelStatus = 'TESTING' | 'ACTIVE' | 'INACTIVE';

export type BudgetState = 'NORMAL' | 'WARNING' | 'EXCEEDED' | 'UNSET';

export type JsonCheck = 'VALID' | 'INVALID' | 'NOT_RUN';
export type SchemaCheck = 'PASS' | 'FAIL' | 'NOT_APPLIED' | 'NOT_RUN';

export type CallPurpose = 'GENERATE' | 'EVALUATE' | 'REGENERATE' | 'EXPERIMENT' | 'TEST';

export type Environment = 'DEV' | 'TEST' | 'PROD';

export type Granularity = 'day' | 'week' | 'month';

// ---------- 식별 엔터티 ----------

export interface Customer {
  customer_id: string;
  name: string;
  service_ids: string[];
  created_at: string;
}

export type ProjectKind = 'INTERNAL' | 'POC' | 'TEST';

export interface Project {
  project_id: string;
  name: string;
  kind: ProjectKind;
  description?: string;
  owner_user_id?: string;
}

export interface User {
  user_id: string;
  name: string;
  team?: string;
}

export interface Service {
  service_id: string;
  name: string;
  /** 고객 서비스는 customer 귀속, 내부 서비스는 null */
  customer_id: string | null;
}

/** API Key 매핑 — 원문은 절대 포함하지 않는다. */
export interface APIKeyMapping {
  key_id: string;
  openrouter_key_ref: string; // 외부 식별자(마스킹된 참조), 원문 아님
  display_name: string;
  owner_type: OwnerType;
  customer_id: string | null;
  project_id: string | null;
  environment: Environment;
  created_at: string;
  active: boolean;
  monthly_limit_usd: number | null;
  limit_reset_rule: string | null;
  last_used_at: string | null;
  last_synced_at: string | null;
}

// ---------- 모델 ----------

export interface ModelCapabilities {
  text: boolean;
  image: boolean;
  json: boolean;
  tools: boolean;
}

export interface ModelPricing {
  input_per_1m_usd: number;
  output_per_1m_usd: number;
  currency: 'USD';
  /** 가격 기준(적용) 시각 */
  effective_at: string;
  /** 가격 확인(조회) 시각 */
  checked_at: string;
}

export interface ModelTestResult {
  result: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  error_type: ErrorType | null;
  error_message: string | null;
  tested_at: string;
  latency_ms: number | null;
  request_id: string;
}

export interface ModelRegistry {
  model_id: string; // OpenRouter model id (e.g. openai/gpt-4o)
  display_name: string;
  provider: string;
  purpose: string;
  capabilities: ModelCapabilities;
  context_length: number | null;
  pricing: ModelPricing | null; // null = 가격 미확인
  status: ModelStatus;
  last_test: ModelTestResult | null;
  /** Provider 고정 지원 여부 ([검증 필요] 항목, Mock 값) */
  supports_provider_pinning: boolean;
  created_at: string;
  updated_at: string;
}

/** OpenRouter 카탈로그(외부) 모델 정보 — 등록 여부와 무관 */
export interface OpenRouterCatalogModel {
  model_id: string;
  name: string;
  provider: string;
  capabilities: ModelCapabilities;
  context_length: number | null;
  pricing: ModelPricing | null;
  supports_provider_pinning: boolean;
}

// ---------- 호출 이력 (AIRequest) ----------

export interface ExecutionConfig {
  temperature: number;
  max_tokens: number;
  timeout_sec: number;
}

export interface RoutingPolicy {
  provider_pinned: boolean;
  fallback_enabled: boolean;
  requested_provider: string | null;
}

export interface AIRequest {
  // A. 식별 및 귀속
  request_id: string;
  task_id: string | null;
  simulation_id: string | null;
  key_id: string;
  usage_origin: UsageOrigin;
  owner_type: OwnerType;
  customer_id: string | null;
  project_id: string | null;
  user_id: string | null;
  service_id: string;
  call_purpose: CallPurpose;
  attempt_no: number;
  parent_request_id: string | null;
  // B. 모델 및 실행 조건
  requested_model: string;
  requested_provider: string | null;
  actual_model: string | null;
  actual_provider: string | null;
  routing_policy: RoutingPolicy;
  execution_config: ExecutionConfig;
  input_reference: string | null;
  input_hash: string | null;
  // C. 결과 및 비용
  requested_at: string; // UTC ISO
  completed_at: string | null;
  status: ExecStatus;
  error_type: ErrorType | null;
  error_message: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens?: number | null; // [검증 필요] API-04
  cached_tokens?: number | null; // [검증 필요] API-04
  cost_usd: number | null; // UNKNOWN 이면 null (0이 아님)
  cost_status: CostStatus;
  cost_source: CostSource;
  price_reference: string | null;
  latency_ms: number | null;
  external_generation_id: string | null;
  reconciled_at: string | null;
}

// ---------- 시뮬레이션 ----------

export interface Scenario {
  scenario_id: string;
  name: string;
  description: string;
  prompt_template: string;
  input_hint: string;
  requires_image: boolean;
  default_json: boolean;
  default_schema: string | null;
}

export interface SimulationRun {
  simulation_id: string;
  scenario_id: string | null; // null = Custom Prompt
  prompt: string;
  input_text: string;
  input_image_ref: string | null; // 이미지 참조(이름), 원본은 별도
  input_available: boolean; // 원본 입력 접근 가능 여부 (재실행 조건)
  input_hash: string;
  model_ids: string[];
  execution_config: ExecutionConfig;
  routing_policy: RoutingPolicy;
  json_mode: boolean;
  json_schema: string | null;
  status: SimulationStatus;
  started_at: string;
  completed_at: string | null;
  executed_by: string;
  project_id: string; // PoC 프로젝트
  rerun_of: string | null; // 재실행 원본 Simulation ID
}

export interface SimulationResult {
  simulation_id: string;
  request_id: string;
  model_id: string;
  /** 모델 상태 스냅샷(실행 당시) */
  model_status_at_run: ModelStatus;
  response_text: string | null;
  json_check: JsonCheck;
  schema_check: SchemaCheck;
  missing_fields: string[];
  /** 비교 조건 차이(예: Provider 고정 미지원) */
  condition_notes: string[];
}

// ---------- 예산 / 구독료 ----------

export interface Budget {
  budget_id: string;
  owner_type: 'CUSTOMER' | 'PROJECT';
  owner_id: string;
  month: string; // YYYY-MM (KST)
  amount_usd: number;
  warning_pct: number; // 예: 80
  created_at: string;
  updated_at: string;
}

export interface SubscriptionCost {
  subscription_id: string;
  tool_name: string;
  plan: string;
  month: string; // 적용 월 YYYY-MM
  amount: number;
  currency: 'USD';
  project_id: string | null; // null = 미배분
  status: 'ACTIVE' | 'CANCELLED';
  note: string;
  created_at: string;
  updated_at: string;
}

// ---------- 조회 필터 ----------

export interface DateRange {
  start: string; // YYYY-MM-DD (KST)
  end: string; // YYYY-MM-DD (KST)
}

export interface CustomerUsageFilter extends DateRange {
  customer_id: string | null;
  service_id: string | null;
  model_id: string | null;
  granularity: Granularity;
}

export interface InternalUsageFilter extends DateRange {
  project_id: string | null;
  user_id: string | null;
  model_id: string | null;
  usage_origin: Exclude<UsageOrigin, 'CUSTOMER_SERVICE'> | null;
  granularity: Granularity;
}

export interface SimulationHistoryFilter extends DateRange {
  scenario_id: string | null;
  model_id: string | null;
  status: SimulationStatus | null;
  simulation_id: string;
}
