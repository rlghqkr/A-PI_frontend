/**
 * Mock Adapter. 인메모리 데이터셋 + localStorage 영속(변경분 포함 스냅샷).
 * - 모든 버튼은 실제로 상태를 바꾼다 (등록/수정/테스트/실행/재실행).
 * - 비용 미확인은 null(UNKNOWN) 로 유지한다. 0 으로 바꾸지 않는다.
 * - request_id 유일성 보장 (중복 insert 무시, DD-20).
 */
import type {
  AIRequest,
  Budget,
  ExecStatus,
  ModelRegistry,
  ModelStatus,
  OpenRouterCatalogModel,
  SimulationHistoryFilter,
  SimulationRun,
  SubscriptionCost,
} from '../../domain/types';
import { ApiError } from '../PatronApi';
import type {
  BudgetInput,
  ConnectionTestOutcome,
  ModelPatch,
  PatronApi,
  RegisterModelInput,
  RequestQuery,
  SimulationDetail,
  SimulationInput,
  SimulationListener,
  SubscriptionInput,
} from '../PatronApi';
import { buildDataset, ERROR_MESSAGES, MODEL_FLAVOR, SEED_VERSION, type MockDataset } from '../../mock/seed';
import { SCENARIOS } from '../../mock/scenarios';
import { Rng } from '../../mock/rng';
import { buildResponse, type ResponseKind } from '../../mock/responses';
import { validateResponse } from '../../domain/validation';
import { computeSimulationStatus, estimateCost, inRange, round6 } from '../../domain/aggregate';
import { hashString, nowIso, todayKst } from '../../domain/format';

const STORAGE_KEY = 'patron.mock.snapshot';

export interface MockControls {
  latencyMs: number;
  /** 다음 조회 호출 1회를 실패시킨다 (Error 상태 검증용) */
  failNextQuery: boolean;
  /** 시뮬레이션 모델별 실행 시간 배율 */
  simulationSpeed: number;
}

/**
 * localStorage 스냅샷은 Seed 전체(수천 건)가 아니라 변경분만 저장한다 (quota 초과 방지).
 * Seed 호출 이력은 결정적으로 재생성되므로 런타임에 생성된 호출(연결 테스트·시뮬레이션)만 보관한다.
 */
interface Snapshot {
  version: string;
  savedAt: string;
  overlay: {
    budgets: MockDataset['budgets'];
    subscriptions: MockDataset['subscriptions'];
    models: MockDataset['models'];
    simulations: MockDataset['simulations'];
    simulationResults: MockDataset['simulationResults'];
    runtimeRequests: AIRequest[];
  };
}

export class MockPatronApi implements PatronApi {
  private data: MockDataset;
  readonly controls: MockControls = { latencyMs: 250, failNextQuery: false, simulationSpeed: 1 };
  private listeners = new Map<string, Set<SimulationListener>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>[]>();
  private cancelled = new Set<string>();
  private runtimeRng = new Rng(Date.now() % 1_000_000);
  private seq = 0;
  /** 조회 호출 횟수 (디버그) */
  queryCount = 0;

  constructor() {
    this.data = this.load();
  }

  // ---------- 영속 ----------

  /** Seed 에서 생성된 request_id 집합 — persist 시 런타임 생성분만 골라내기 위함 */
  private seedRequestIds = new Set<string>();

  private load(): MockDataset {
    const seed = buildDataset();
    this.seedRequestIds = new Set(seed.requests.map((r) => r.request_id));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const snap = JSON.parse(raw) as Snapshot;
        if (snap.version === SEED_VERSION && snap.overlay && snap.savedAt.slice(0, 10) === new Date().toISOString().slice(0, 10)) {
          const o = snap.overlay;
          const merged: MockDataset = {
            ...seed,
            budgets: o.budgets,
            subscriptions: o.subscriptions,
            models: o.models,
            simulations: o.simulations,
            simulationResults: o.simulationResults,
            requests: [...seed.requests, ...o.runtimeRequests.filter((r) => !this.seedRequestIds.has(r.request_id))],
          };
          return recoverInterruptedRuns(merged);
        }
      }
    } catch {
      /* ignore */
    }
    return seed;
  }

  private persist() {
    try {
      const snap: Snapshot = {
        version: SEED_VERSION,
        savedAt: nowIso(),
        overlay: {
          budgets: this.data.budgets,
          subscriptions: this.data.subscriptions,
          models: this.data.models,
          simulations: this.data.simulations,
          simulationResults: this.data.simulationResults,
          runtimeRequests: this.data.requests.filter((r) => !this.seedRequestIds.has(r.request_id)),
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch {
      /* quota 등 무시 */
    }
  }

  /** Mock 데이터 초기화 (Seed 재생성) */
  reset() {
    for (const timers of this.timers.values()) timers.forEach(clearTimeout);
    this.timers.clear();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    this.data = buildDataset();
    this.seedRequestIds = new Set(this.data.requests.map((r) => r.request_id));
  }

  private async delay<T>(value: T, isQuery = true): Promise<T> {
    if (isQuery) {
      this.queryCount++;
      if (this.controls.failNextQuery) {
        this.controls.failNextQuery = false;
        await sleep(this.controls.latencyMs);
        throw new ApiError('사용량 수집 API 응답 실패 (Mock: 의도적 오류)', 'NETWORK');
      }
    }
    await sleep(this.controls.latencyMs);
    return structuredClone(value);
  }

  // ---------- 기준 정보 ----------

  listCustomers() {
    return this.delay(this.data.customers);
  }
  listServices() {
    return this.delay(this.data.services);
  }
  listProjects() {
    return this.delay(this.data.projects);
  }
  listUsers() {
    return this.delay(this.data.users);
  }
  listKeys() {
    return this.delay(this.data.keys);
  }
  listScenarios() {
    return this.delay(SCENARIOS);
  }

  // ---------- 호출 이력 ----------

  queryRequests(q: RequestQuery) {
    const out = this.data.requests.filter((r) => {
      if (q.origins && !q.origins.includes(r.usage_origin)) return false;
      if (q.range && !inRange(r, q.range)) return false;
      if (q.customer_id && r.customer_id !== q.customer_id) return false;
      if (q.service_id && r.service_id !== q.service_id) return false;
      if (q.model_id && r.requested_model !== q.model_id) return false;
      if (q.project_id && r.project_id !== q.project_id) return false;
      if (q.user_id && r.user_id !== q.user_id) return false;
      if (q.simulation_id && r.simulation_id !== q.simulation_id) return false;
      if (q.simulation_ids && !(r.simulation_id && q.simulation_ids.includes(r.simulation_id))) return false;
      if (q.key_id && r.key_id !== q.key_id) return false;
      return true;
    });
    return this.delay(out);
  }

  getRequest(requestId: string) {
    return this.delay(this.data.requests.find((r) => r.request_id === requestId) ?? null);
  }

  getRetryChain(requestId: string) {
    const byId = new Map(this.data.requests.map((r) => [r.request_id, r]));
    let root = byId.get(requestId);
    if (!root) return this.delay([] as AIRequest[]);
    while (root.parent_request_id && byId.has(root.parent_request_id)) root = byId.get(root.parent_request_id)!;
    const chain: AIRequest[] = [root];
    let cur: AIRequest | undefined = root;
    while (cur) {
      const next = this.data.requests.find((r) => r.parent_request_id === cur!.request_id);
      if (!next) break;
      chain.push(next);
      cur = next;
    }
    return this.delay(chain);
  }

  private insertRequest(r: AIRequest) {
    if (this.data.requests.some((x) => x.request_id === r.request_id)) return; // 중복 전달 방지
    this.data.requests.push(r);
  }

  // ---------- 예산 ----------

  listBudgets() {
    return this.delay(this.data.budgets);
  }

  async upsertBudget(input: BudgetInput) {
    validateBudget(input);
    await sleep(this.controls.latencyMs);
    const existing = this.data.budgets.find((b) => b.owner_type === input.owner_type && b.owner_id === input.owner_id && b.month === input.month);
    const now = nowIso();
    let out: Budget;
    if (existing) {
      existing.amount_usd = input.amount_usd;
      existing.warning_pct = input.warning_pct;
      existing.updated_at = now;
      out = existing;
    } else {
      out = { budget_id: `BGT-${input.owner_id}-${input.month}`, ...input, created_at: now, updated_at: now };
      this.data.budgets.push(out);
    }
    this.persist();
    return structuredClone(out);
  }

  // ---------- 구독료 ----------

  listSubscriptions() {
    return this.delay(this.data.subscriptions);
  }

  async createSubscription(input: SubscriptionInput) {
    validateSubscription(input);
    await sleep(this.controls.latencyMs);
    const now = nowIso();
    const s: SubscriptionCost = { subscription_id: `SUB-${String(this.data.subscriptions.length + 1).padStart(3, '0')}-${this.runtimeRng.hex(3)}`, ...input, currency: 'USD', created_at: now, updated_at: now };
    this.data.subscriptions.push(s);
    this.persist();
    return structuredClone(s);
  }

  async updateSubscription(id: string, input: SubscriptionInput) {
    validateSubscription(input);
    await sleep(this.controls.latencyMs);
    const s = this.data.subscriptions.find((x) => x.subscription_id === id);
    if (!s) throw new ApiError('구독료 항목을 찾을 수 없습니다.', 'NOT_FOUND');
    Object.assign(s, input, { updated_at: nowIso() });
    this.persist();
    return structuredClone(s);
  }

  // ---------- 모델 ----------

  listModels() {
    return this.delay(this.data.models);
  }
  getModel(modelId: string) {
    return this.delay(this.data.models.find((m) => m.model_id === modelId) ?? null);
  }

  searchCatalog(query: string) {
    const q = query.trim().toLowerCase();
    const out = this.data.catalog.filter((m) => !q || m.model_id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
    return this.delay(out);
  }

  async registerModel(input: RegisterModelInput) {
    await sleep(this.controls.latencyMs);
    const id = input.model_id.trim();
    if (!id) throw new ApiError('Model ID 를 입력하세요.', 'VALIDATION', { model_id: '필수 항목' });
    if (!input.display_name.trim()) throw new ApiError('표시 이름을 입력하세요.', 'VALIDATION', { display_name: '필수 항목' });
    if (this.data.models.some((m) => m.model_id.toLowerCase() === id.toLowerCase())) {
      throw new ApiError(`이미 등록된 Model ID 입니다: ${id}`, 'DUPLICATE', { model_id: '중복 Model ID' });
    }
    const cat: OpenRouterCatalogModel | undefined = this.data.catalog.find((c) => c.model_id === id);
    if (!cat) throw new ApiError('OpenRouter 카탈로그에서 해당 Model ID 를 찾을 수 없습니다.', 'NOT_FOUND', { model_id: '카탈로그에 없음' });
    const now = nowIso();
    const m: ModelRegistry = {
      model_id: cat.model_id,
      display_name: input.display_name.trim(),
      provider: cat.provider,
      purpose: input.purpose.trim(),
      capabilities: cat.capabilities,
      context_length: cat.context_length,
      pricing: cat.pricing,
      status: 'TESTING',
      last_test: null,
      supports_provider_pinning: cat.supports_provider_pinning,
      created_at: now,
      updated_at: now,
    };
    this.data.models.push(m);
    this.persist();
    return structuredClone(m);
  }

  async updateModel(modelId: string, patch: ModelPatch) {
    await sleep(this.controls.latencyMs);
    const m = this.mustModel(modelId);
    if (patch.display_name !== undefined) {
      if (!patch.display_name.trim()) throw new ApiError('표시 이름은 비울 수 없습니다.', 'VALIDATION', { display_name: '필수 항목' });
      m.display_name = patch.display_name.trim();
    }
    if (patch.purpose !== undefined) m.purpose = patch.purpose.trim();
    m.updated_at = nowIso();
    this.persist();
    return structuredClone(m);
  }

  async setModelStatus(modelId: string, status: ModelStatus) {
    await sleep(this.controls.latencyMs);
    const m = this.mustModel(modelId);
    if (status === 'ACTIVE' && m.last_test?.result !== 'SUCCESS') {
      throw new ApiError('연결 테스트에 성공한 모델만 ACTIVE 로 전환할 수 있습니다.', 'CONFLICT');
    }
    m.status = status;
    m.updated_at = nowIso();
    this.persist();
    return structuredClone(m);
  }

  async runConnectionTest(modelId: string, prompt: string, executedBy: string): Promise<ConnectionTestOutcome> {
    const m = this.mustModel(modelId);
    if (!prompt.trim()) throw new ApiError('테스트 Prompt 를 입력하세요.', 'VALIDATION', { prompt: '필수 항목' });
    const rng = this.runtimeRng;
    const requestedAt = nowIso();
    // 모델별 결정적 경향: mistral-large 는 인증 실패, gemini-1.0-pro 는 Timeout, 그 외 90% 성공
    let status: ExecStatus = 'SUCCESS';
    if (m.model_id === 'mistralai/mistral-large') status = 'FAILED';
    else if (m.model_id === 'google/gemini-1.0-pro') status = 'TIMEOUT';
    else status = rng.weighted<ExecStatus>([{ v: 'SUCCESS', w: 90 }, { v: 'FAILED', w: 7 }, { v: 'TIMEOUT', w: 3 }]);
    const latency = status === 'SUCCESS' ? rng.int(600, 2800) : status === 'FAILED' ? rng.int(200, 900) : null;
    await sleep(Math.min(latency ?? 3000, 3000) / this.controls.simulationSpeed);
    const inputTokens = Math.max(8, Math.round(prompt.length / 3));
    const outputTokens = status === 'SUCCESS' ? rng.int(20, 80) : status === 'FAILED' ? 0 : null;
    const errorType = status === 'FAILED' ? (m.model_id === 'mistralai/mistral-large' ? 'AUTH_ERROR' : rng.pick(['RATE_LIMIT', 'PROVIDER_ERROR'] as const)) : status === 'TIMEOUT' ? 'TIMEOUT_ERROR' : null;
    const cost = status === 'SUCCESS' ? estimateCost(inputTokens, outputTokens, m.pricing) : null;
    const request: AIRequest = {
      request_id: this.newRequestId(),
      task_id: null,
      simulation_id: null,
      key_id: 'K-TEST',
      usage_origin: 'SYSTEM_TEST',
      owner_type: 'POC',
      customer_id: null,
      project_id: 'PRJ-TEST',
      user_id: executedBy,
      service_id: 'S-TEST',
      call_purpose: 'TEST',
      attempt_no: 1,
      parent_request_id: null,
      requested_model: m.model_id,
      requested_provider: m.provider,
      actual_model: status === 'SUCCESS' ? m.model_id : null,
      actual_provider: status === 'SUCCESS' ? m.provider : null,
      routing_policy: { provider_pinned: m.supports_provider_pinning, fallback_enabled: false, requested_provider: m.provider },
      execution_config: { temperature: 0, max_tokens: 128, timeout_sec: 30 },
      input_reference: null,
      input_hash: hashString(prompt),
      requested_at: requestedAt,
      completed_at: new Date(new Date(requestedAt).getTime() + (latency ?? 30000)).toISOString(),
      status,
      error_type: errorType,
      error_message: errorType ? ERROR_MESSAGES[errorType] : null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      cost_status: status === 'SUCCESS' ? (cost === null ? 'UNKNOWN' : 'CONFIRMED') : 'UNKNOWN',
      cost_source: status === 'SUCCESS' && cost !== null ? 'API_RESPONSE' : 'NONE',
      price_reference: cost !== null && m.pricing ? `${m.model_id}@${m.pricing.effective_at.slice(0, 10)}` : null,
      latency_ms: latency,
      external_generation_id: status === 'SUCCESS' ? `gen-${rng.hex(12)}` : null,
      reconciled_at: null,
    };
    this.insertRequest(request);
    m.last_test = {
      result: status === 'SUCCESS' ? 'SUCCESS' : status === 'TIMEOUT' ? 'TIMEOUT' : 'FAILED',
      error_type: errorType,
      error_message: request.error_message,
      tested_at: requestedAt,
      latency_ms: latency,
      request_id: request.request_id,
    };
    m.updated_at = nowIso();
    this.persist();
    return { model: structuredClone(m), request: structuredClone(request) };
  }

  private mustModel(modelId: string): ModelRegistry {
    const m = this.data.models.find((x) => x.model_id === modelId);
    if (!m) throw new ApiError('등록되지 않은 모델입니다.', 'NOT_FOUND');
    return m;
  }

  // ---------- 시뮬레이션 ----------

  listSimulations(filter?: Partial<SimulationHistoryFilter>) {
    let runs = [...this.data.simulations];
    if (filter) {
      if (filter.start && filter.end) runs = runs.filter((r) => inRange({ requested_at: r.started_at } as AIRequest, { start: filter.start!, end: filter.end! }));
      if (filter.scenario_id) runs = runs.filter((r) => (filter.scenario_id === 'CUSTOM' ? r.scenario_id === null : r.scenario_id === filter.scenario_id));
      if (filter.model_id) runs = runs.filter((r) => r.model_ids.includes(filter.model_id!));
      if (filter.status) runs = runs.filter((r) => r.status === filter.status);
      if (filter.simulation_id) {
        const q = filter.simulation_id.trim().toLowerCase();
        runs = runs.filter((r) => r.simulation_id.toLowerCase().includes(q));
      }
    }
    runs.sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
    return this.delay(runs);
  }

  getSimulation(simulationId: string) {
    return this.delay(this.detailOf(simulationId));
  }

  private detailOf(simulationId: string): SimulationDetail | null {
    const run = this.data.simulations.find((r) => r.simulation_id === simulationId);
    if (!run) return null;
    return {
      run,
      results: this.data.simulationResults.filter((r) => r.simulation_id === simulationId),
      requests: this.data.requests.filter((r) => r.simulation_id === simulationId),
    };
  }

  subscribeSimulation(simulationId: string, listener: SimulationListener) {
    let set = this.listeners.get(simulationId);
    if (!set) {
      set = new Set();
      this.listeners.set(simulationId, set);
    }
    set.add(listener);
    const d = this.detailOf(simulationId);
    if (d) listener(structuredClone(d));
    return () => {
      set!.delete(listener);
    };
  }

  private emit(simulationId: string) {
    const d = this.detailOf(simulationId);
    if (!d) return;
    for (const l of this.listeners.get(simulationId) ?? []) l(structuredClone(d));
  }

  async startSimulation(input: SimulationInput): Promise<SimulationRun> {
    // 실행 전 검증 (서버 측 재검증)
    const errors: Record<string, string> = {};
    if (!input.prompt.trim()) errors.prompt = 'Prompt 는 필수입니다.';
    if (input.model_ids.length < 2 || input.model_ids.length > 4) errors.model_ids = '비교 모델은 2~4개를 선택해야 합니다.';
    const models = input.model_ids.map((id) => this.data.models.find((m) => m.model_id === id));
    if (models.some((m) => !m)) errors.model_ids = '등록되지 않은 모델이 포함되어 있습니다.';
    const regs = models.filter(Boolean) as ModelRegistry[];
    const notActive = regs.filter((m) => m.status !== 'ACTIVE');
    if (notActive.length) errors.model_ids = `ACTIVE 모델만 실행할 수 있습니다: ${notActive.map((m) => m.display_name).join(', ')}`;
    if (input.input_image_ref) {
      const noImg = regs.filter((m) => !m.capabilities.image);
      if (noImg.length) errors.input_image_ref = `이미지 입력을 지원하지 않는 모델: ${noImg.map((m) => m.display_name).join(', ')}`;
    }
    if (input.json_schema) {
      try {
        JSON.parse(input.json_schema);
      } catch {
        errors.json_schema = 'JSON Schema 가 유효한 JSON 이 아닙니다.';
      }
    }
    if (Object.keys(errors).length) throw new ApiError('실행 조건을 확인하세요.', 'VALIDATION', errors);
    await sleep(this.controls.latencyMs);

    const today = todayKst();
    const seq = this.data.simulations.filter((s) => s.simulation_id.startsWith(`SIM-${today.replace(/-/g, '')}`)).length + 1;
    const simId = `SIM-${today.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;
    const startedAt = nowIso();
    const inputHash = hashString(input.prompt + '\n' + input.input_text + (input.input_image_ref ?? ''));
    const run: SimulationRun = {
      simulation_id: simId,
      scenario_id: input.scenario_id,
      prompt: input.prompt,
      input_text: input.input_text,
      input_image_ref: input.input_image_ref,
      input_available: true,
      input_hash: inputHash,
      model_ids: [...input.model_ids],
      execution_config: { ...input.execution_config },
      routing_policy: { ...input.routing_policy },
      json_mode: input.json_mode,
      json_schema: input.json_mode ? input.json_schema : null,
      status: 'RUNNING',
      started_at: startedAt,
      completed_at: null,
      executed_by: input.executed_by,
      project_id: 'PRJ-POC',
      rerun_of: input.rerun_of,
    };
    this.data.simulations.push(run);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const rng = this.runtimeRng;
    for (const m of regs) {
      const reqId = this.newRequestId();
      const req: AIRequest = {
        request_id: reqId,
        task_id: null,
        simulation_id: simId,
        key_id: 'K-POC',
        usage_origin: 'SIMULATION',
        owner_type: 'POC',
        customer_id: null,
        project_id: 'PRJ-POC',
        user_id: input.executed_by,
        service_id: 'S-SIM',
        call_purpose: 'EXPERIMENT',
        attempt_no: 1,
        parent_request_id: null,
        requested_model: m.model_id,
        requested_provider: m.provider,
        actual_model: null,
        actual_provider: null,
        routing_policy: { ...input.routing_policy, requested_provider: m.provider },
        execution_config: { ...input.execution_config },
        input_reference: `sim-input://${simId}`,
        input_hash: inputHash,
        requested_at: startedAt,
        completed_at: null,
        status: 'RUNNING',
        error_type: null,
        error_message: null,
        input_tokens: null,
        output_tokens: null,
        cost_usd: null,
        cost_status: 'UNKNOWN',
        cost_source: 'NONE',
        price_reference: null,
        latency_ms: null,
        external_generation_id: null,
        reconciled_at: null,
      };
      this.insertRequest(req);
      const notes: string[] = [];
      if (input.routing_policy.provider_pinned && !m.supports_provider_pinning) notes.push('이 모델은 Provider 고정을 지원하지 않아 라우팅이 고정되지 않았습니다.');
      if (input.json_mode && !m.capabilities.json) notes.push('모델이 구조화 JSON 출력 모드를 지원하지 않아 Prompt 지시만으로 실행했습니다.');
      this.data.simulationResults.push({
        simulation_id: simId,
        request_id: reqId,
        model_id: m.model_id,
        model_status_at_run: m.status,
        response_text: null,
        json_check: 'NOT_RUN',
        schema_check: 'NOT_RUN',
        missing_fields: [],
        condition_notes: notes,
      });

      // 결과 결정: gemini-1.5-pro 는 15% Timeout 경향, 그 외 8% 실패
      const outcome: ExecStatus = rng.weighted<ExecStatus>([
        { v: 'SUCCESS', w: m.model_id.includes('gemini') ? 80 : 90 },
        { v: 'FAILED', w: 6 },
        { v: 'TIMEOUT', w: m.model_id.includes('gemini') ? 14 : 4 },
      ]);
      const latency = outcome === 'TIMEOUT' ? input.execution_config.timeout_sec * 1000 : rng.int(900, 4200);
      const wait = Math.min(latency, outcome === 'TIMEOUT' ? 6000 : 4500) / this.controls.simulationSpeed;
      timers.push(
        setTimeout(() => {
          this.finishModel(simId, reqId, m, input, outcome, latency, rng);
        }, wait),
      );
    }
    this.timers.set(simId, timers);
    this.persist();
    this.emit(simId);
    return structuredClone(run);
  }

  private finishModel(simId: string, reqId: string, m: ModelRegistry, input: SimulationInput, outcome: ExecStatus, latency: number, rng: Rng) {
    const req = this.data.requests.find((r) => r.request_id === reqId);
    const res = this.data.simulationResults.find((r) => r.request_id === reqId);
    const run = this.data.simulations.find((r) => r.simulation_id === simId);
    if (!req || !res || !run) return;
    if (this.cancelled.has(simId)) outcome = 'CANCELLED';
    const now = nowIso();
    req.completed_at = now;
    req.status = outcome;
    const inputTokens = Math.max(20, Math.round((input.prompt.length + input.input_text.length) / 2.5)) + (input.input_image_ref ? 850 : 0);
    if (outcome === 'SUCCESS') {
      const kind: ResponseKind = input.json_mode ? rng.weighted<ResponseKind>([{ v: 'json_ok', w: 70 }, { v: 'json_missing_field', w: 20 }, { v: 'json_invalid', w: 10 }]) : 'ok';
      const text = buildResponse(input.scenario_id, input.json_mode, input.input_text, kind, rng, MODEL_FLAVOR[m.model_id] ?? m.display_name);
      const outputTokens = Math.max(10, Math.round(text.length / 2.2));
      req.input_tokens = inputTokens;
      req.output_tokens = outputTokens;
      req.latency_ms = latency;
      req.actual_model = m.model_id;
      req.actual_provider = m.provider;
      req.external_generation_id = `gen-${rng.hex(12)}`;
      const cost = estimateCost(inputTokens, outputTokens, m.pricing);
      const roll = rng.next();
      if (cost === null || roll > 0.93) {
        req.cost_usd = null;
        req.cost_status = 'UNKNOWN';
        req.cost_source = 'NONE';
      } else if (roll > 0.8) {
        req.cost_usd = cost;
        req.cost_status = 'ESTIMATED';
        req.cost_source = 'ESTIMATED_CALC';
        req.price_reference = `${m.model_id}@${m.pricing!.effective_at.slice(0, 10)}`;
      } else {
        req.cost_usd = round6(cost * (1 + (rng.next() - 0.5) * 0.02));
        req.cost_status = 'CONFIRMED';
        req.cost_source = 'API_RESPONSE';
        req.price_reference = `${m.model_id}@${m.pricing!.effective_at.slice(0, 10)}`;
      }
      res.response_text = text;
      const v = validateResponse(text, input.json_mode ? input.json_schema : null);
      res.json_check = input.json_mode ? v.json : 'NOT_RUN';
      res.schema_check = input.json_mode && input.json_schema ? v.schema : 'NOT_APPLIED';
      res.missing_fields = v.missingFields;
    } else if (outcome === 'FAILED') {
      const et = rng.pick(['RATE_LIMIT', 'PROVIDER_ERROR', 'INVALID_RESPONSE'] as const);
      req.error_type = et;
      req.error_message = ERROR_MESSAGES[et];
      req.input_tokens = inputTokens;
      req.output_tokens = 0;
      req.latency_ms = Math.min(latency, 1500);
      req.cost_usd = null;
      req.cost_status = 'UNKNOWN';
      req.cost_source = 'NONE';
      res.json_check = 'NOT_RUN';
      res.schema_check = 'NOT_RUN';
    } else if (outcome === 'TIMEOUT') {
      req.error_type = 'TIMEOUT_ERROR';
      req.error_message = `${input.execution_config.timeout_sec}초 내 응답 없음`;
      req.input_tokens = inputTokens;
      req.output_tokens = null;
      req.latency_ms = null;
      req.cost_usd = null;
      req.cost_status = 'UNKNOWN';
      req.cost_source = 'NONE';
      res.json_check = 'NOT_RUN';
      res.schema_check = 'NOT_RUN';
    } else {
      req.error_type = null;
      req.error_message = '사용자 취소 (Provider 측 처리 중단 여부는 미확인, 비용 발생 가능)';
      req.cost_usd = null;
      req.cost_status = 'UNKNOWN';
      req.cost_source = 'NONE';
    }
    const statuses = this.data.requests.filter((r) => r.simulation_id === simId).map((r) => r.status);
    run.status = computeSimulationStatus(statuses);
    if (run.status !== 'RUNNING' && run.status !== 'PENDING') {
      run.completed_at = now;
      this.timers.delete(simId);
      this.cancelled.delete(simId);
    }
    this.persist();
    this.emit(simId);
  }

  async cancelSimulation(simulationId: string): Promise<{ cancelled: number }> {
    const timers = this.timers.get(simulationId);
    const run = this.data.simulations.find((r) => r.simulation_id === simulationId);
    if (!run) throw new ApiError(`시뮬레이션 ${simulationId} 을(를) 찾을 수 없습니다.`, 'NOT_FOUND');
    if (!timers) throw new ApiError('진행 중인 호출이 없어 취소할 수 없습니다. 이미 종료되었거나 페이지 재로드로 실행이 중단된 Simulation 입니다.', 'CONFLICT');
    this.cancelled.add(simulationId);
    timers.forEach(clearTimeout);
    const pending = this.data.requests.filter((r) => r.simulation_id === simulationId && (r.status === 'RUNNING' || r.status === 'PENDING'));
    for (const req of pending) {
      const m = this.data.models.find((x) => x.model_id === req.requested_model)!;
      this.finishModel(simulationId, req.request_id, m, this.inputOf(run), 'CANCELLED', 0, this.runtimeRng);
    }
    return { cancelled: pending.length };
  }

  private inputOf(run: SimulationRun): SimulationInput {
    return {
      scenario_id: run.scenario_id,
      prompt: run.prompt,
      input_text: run.input_text,
      input_image_ref: run.input_image_ref,
      model_ids: run.model_ids,
      execution_config: run.execution_config,
      routing_policy: run.routing_policy,
      json_mode: run.json_mode,
      json_schema: run.json_schema,
      executed_by: run.executed_by,
      rerun_of: run.rerun_of,
    };
  }

  private newRequestId(): string {
    const d = todayKst().replace(/-/g, '');
    this.seq++;
    return `REQ-${d}-R${String(Date.now() % 100000).padStart(5, '0')}${String(this.seq).padStart(2, '0')}`;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function validateBudget(input: BudgetInput) {
  const errors: Record<string, string> = {};
  if (!/^\d{4}-\d{2}$/.test(input.month)) errors.month = '적용 월 형식은 YYYY-MM 입니다.';
  if (!(input.amount_usd > 0)) errors.amount_usd = '예산은 0보다 커야 합니다.';
  if (!(input.warning_pct >= 1 && input.warning_pct <= 100)) errors.warning_pct = '경고 기준은 1~100% 입니다.';
  if (Object.keys(errors).length) throw new ApiError('입력값을 확인하세요.', 'VALIDATION', errors);
}

function validateSubscription(input: SubscriptionInput) {
  const errors: Record<string, string> = {};
  if (!input.tool_name.trim()) errors.tool_name = '도구명은 필수입니다.';
  if (!/^\d{4}-\d{2}$/.test(input.month)) errors.month = '적용 월 형식은 YYYY-MM 입니다.';
  if (!(input.amount >= 0)) errors.amount = '금액은 0 이상이어야 합니다.';
  if (Object.keys(errors).length) throw new ApiError('입력값을 확인하세요.', 'VALIDATION', errors);
}

/**
 * 스냅샷 복원 시 RUNNING/PENDING 으로 남은 시뮬레이션 호출은 타이머가 사라져 영원히 끝나지 않는다.
 * 페이지 재로드로 중단된 실행은 TIMEOUT(비용 UNKNOWN, DD-09) 으로 종료 처리하고 run 상태를 재계산한다.
 */
function recoverInterruptedRuns(data: MockDataset): MockDataset {
  const now = nowIso();
  const touched = new Set<string>();
  for (const req of data.requests) {
    if (req.status !== 'RUNNING' && req.status !== 'PENDING') continue;
    if (!req.simulation_id) continue;
    touched.add(req.simulation_id);
    req.status = 'TIMEOUT';
    req.completed_at = now;
    req.error_type = 'TIMEOUT_ERROR';
    req.error_message = '페이지 재로드로 실행이 중단되어 응답을 받지 못함 (Provider 측 비용 발생 가능)';
    req.latency_ms = null;
    req.cost_usd = null;
    req.cost_status = 'UNKNOWN';
    req.cost_source = 'NONE';
    const res = data.simulationResults.find((r) => r.request_id === req.request_id);
    if (res) {
      res.json_check = 'NOT_RUN';
      res.schema_check = 'NOT_RUN';
    }
  }
  for (const run of data.simulations) {
    if (!touched.has(run.simulation_id) && run.status !== 'RUNNING' && run.status !== 'PENDING') continue;
    const statuses = data.requests.filter((r) => r.simulation_id === run.simulation_id).map((r) => r.status);
    run.status = statuses.length ? computeSimulationStatus(statuses) : 'FAILED';
    if (run.status !== 'RUNNING' && run.status !== 'PENDING' && !run.completed_at) run.completed_at = now;
  }
  return data;
}
