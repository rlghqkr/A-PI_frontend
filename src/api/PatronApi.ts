/**
 * Patron 프론트엔드 API 계약. UI 는 이 인터페이스만 의존한다.
 * 실제 백엔드가 준비되면 `HttpPatronApi` 를 구현해 `src/api/index.ts` 에서 교체한다.
 */
import type {
  AIRequest,
  APIKeyMapping,
  Budget,
  Customer,
  DateRange,
  ExecutionConfig,
  ModelRegistry,
  ModelStatus,
  OpenRouterCatalogModel,
  Project,
  RoutingPolicy,
  Scenario,
  Service,
  SimulationHistoryFilter,
  SimulationResult,
  SimulationRun,
  SubscriptionCost,
  UsageOrigin,
  User,
} from '../domain/types';

export type ApiErrorCode = 'NETWORK' | 'VALIDATION' | 'DUPLICATE' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'TIMEOUT' | 'UNKNOWN';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: Record<string, string>;
  constructor(message: string, code: ApiErrorCode = 'UNKNOWN', details?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export interface RequestQuery {
  origins?: UsageOrigin[];
  range?: DateRange;
  customer_id?: string | null;
  service_id?: string | null;
  model_id?: string | null;
  project_id?: string | null;
  user_id?: string | null;
  simulation_id?: string | null;
  /** 여러 Simulation 의 Request 를 한 번에 조회 (P-05 목록). range 와 무관하게 simulation_id 귀속 기준 */
  simulation_ids?: string[] | null;
  key_id?: string | null;
}

export interface BudgetInput {
  owner_type: Budget['owner_type'];
  owner_id: string;
  month: string;
  amount_usd: number;
  warning_pct: number;
}

export interface SubscriptionInput {
  tool_name: string;
  plan: string;
  month: string;
  amount: number;
  project_id: string | null;
  status: SubscriptionCost['status'];
  note: string;
}

export interface RegisterModelInput {
  model_id: string;
  display_name: string;
  purpose: string;
}

export interface ModelPatch {
  display_name?: string;
  purpose?: string;
}

export interface ConnectionTestOutcome {
  model: ModelRegistry;
  request: AIRequest;
}

export interface SimulationInput {
  scenario_id: string | null;
  prompt: string;
  input_text: string;
  input_image_ref: string | null;
  model_ids: string[];
  execution_config: ExecutionConfig;
  routing_policy: RoutingPolicy;
  json_mode: boolean;
  json_schema: string | null;
  executed_by: string;
  rerun_of: string | null;
}

export interface SimulationDetail {
  run: SimulationRun;
  results: SimulationResult[];
  requests: AIRequest[];
}

export type SimulationListener = (detail: SimulationDetail) => void;

export interface PatronApi {
  // 기준 정보
  listCustomers(): Promise<Customer[]>;
  listServices(): Promise<Service[]>;
  listProjects(): Promise<Project[]>;
  listUsers(): Promise<User[]>;
  listKeys(): Promise<APIKeyMapping[]>;
  listScenarios(): Promise<Scenario[]>;

  // F-05 공통 호출 이력
  queryRequests(q: RequestQuery): Promise<AIRequest[]>;
  getRequest(requestId: string): Promise<AIRequest | null>;
  /** 원 요청·재시도 체인 (시간순) */
  getRetryChain(requestId: string): Promise<AIRequest[]>;

  // 예산
  listBudgets(): Promise<Budget[]>;
  upsertBudget(input: BudgetInput): Promise<Budget>;

  // 구독료
  listSubscriptions(): Promise<SubscriptionCost[]>;
  createSubscription(input: SubscriptionInput): Promise<SubscriptionCost>;
  updateSubscription(id: string, input: SubscriptionInput): Promise<SubscriptionCost>;

  // 모델 관리
  listModels(): Promise<ModelRegistry[]>;
  getModel(modelId: string): Promise<ModelRegistry | null>;
  searchCatalog(query: string): Promise<OpenRouterCatalogModel[]>;
  registerModel(input: RegisterModelInput): Promise<ModelRegistry>;
  updateModel(modelId: string, patch: ModelPatch): Promise<ModelRegistry>;
  setModelStatus(modelId: string, status: ModelStatus): Promise<ModelRegistry>;
  runConnectionTest(modelId: string, prompt: string, executedBy: string): Promise<ConnectionTestOutcome>;

  // 시뮬레이션
  listSimulations(filter?: Partial<SimulationHistoryFilter>): Promise<SimulationRun[]>;
  getSimulation(simulationId: string): Promise<SimulationDetail | null>;
  /** 실행을 시작하고 즉시 run 을 반환. 진행 상황은 subscribeSimulation 으로 수신 */
  startSimulation(input: SimulationInput): Promise<SimulationRun>;
  /** 실행 취소. 진행 중인 호출이 없으면(이미 종료·복구 불가) ApiError(CONFLICT) 를 던진다. 반환값은 CANCELLED 로 전환된 호출 수 */
  cancelSimulation(simulationId: string): Promise<{ cancelled: number }>;
  subscribeSimulation(simulationId: string, listener: SimulationListener): () => void;
}
