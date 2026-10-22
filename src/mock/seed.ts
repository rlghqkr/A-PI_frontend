/**
 * 공통 Seed/Mock 데이터셋. 모든 화면은 이 하나의 데이터셋에서 파생된 값을 사용한다.
 * - 결정적 생성(seed 고정) → 요약/상세 합계 비교가 재현 가능
 * - 날짜는 "오늘(KST)" 기준 상대 생성 (최근 75일)
 */
import type {
  AIRequest,
  APIKeyMapping,
  Budget,
  Customer,
  ErrorType,
  ExecStatus,
  ModelRegistry,
  OpenRouterCatalogModel,
  Project,
  Service,
  SimulationResult,
  SimulationRun,
  SubscriptionCost,
  User,
} from '../domain/types';
import { Rng } from './rng';
import { addDays, hashString, toKstDate, toKstMonth, todayKst } from '../domain/format';
import { computeSimulationStatus, estimateCost, round6 } from '../domain/aggregate';
import { buildResponse, longText, type ResponseKind } from './responses';
import { validateResponse } from '../domain/validation';
import { PRODUCT_SCHEMA, SUMMARY_SCHEMA } from './scenarios';

export const SEED_VERSION = 'patron-mock-v3';
const DAYS = 75;

export interface MockDataset {
  customers: Customer[];
  services: Service[];
  projects: Project[];
  users: User[];
  keys: APIKeyMapping[];
  models: ModelRegistry[];
  catalog: OpenRouterCatalogModel[];
  requests: AIRequest[];
  simulations: SimulationRun[];
  simulationResults: SimulationResult[];
  budgets: Budget[];
  subscriptions: SubscriptionCost[];
}

// ---------- 기준 정보 ----------

export const CUSTOMERS: Customer[] = [
  { customer_id: 'C-001', name: 'A전자', service_ids: ['S-PDP-A', 'S-FLIP-A'], created_at: '2026-01-10T00:00:00.000Z' },
  { customer_id: 'C-002', name: 'B리테일', service_ids: ['S-PDP-B'], created_at: '2026-03-02T00:00:00.000Z' },
  { customer_id: 'C-003', name: 'C미디어', service_ids: ['S-CHAT-C'], created_at: '2026-08-20T00:00:00.000Z' },
];

export const SERVICES: Service[] = [
  { service_id: 'S-PDP-A', name: 'AI PDP', customer_id: 'C-001' },
  { service_id: 'S-FLIP-A', name: 'FlipPage', customer_id: 'C-001' },
  { service_id: 'S-PDP-B', name: 'AI PDP', customer_id: 'C-002' },
  { service_id: 'S-CHAT-C', name: 'AI Chat', customer_id: 'C-003' },
  { service_id: 'S-INT-DEV', name: '내부 개발 도구', customer_id: null },
  { service_id: 'S-SIM', name: 'Patron Simulator', customer_id: null },
  { service_id: 'S-TEST', name: '모델 연결 테스트', customer_id: null },
];

export const PROJECTS: Project[] = [
  { project_id: 'PRJ-001', name: 'LOGBASE AI PDP 개발', kind: 'INTERNAL', description: 'AI PDP 생성 파이프라인 고도화', owner_user_id: 'U-001' },
  { project_id: 'PRJ-002', name: '고객 프로젝트 X 자동화', kind: 'INTERNAL', description: '고객사 X 콘텐츠 자동화 PoC', owner_user_id: 'U-003' },
  { project_id: 'PRJ-POC', name: 'Patron PoC', kind: 'POC', description: 'Multi-LLM Simulator 실행 전용', owner_user_id: 'U-001' },
  { project_id: 'PRJ-TEST', name: '모델 연결 테스트', kind: 'TEST', description: '모델 등록 후 연결 검증 호출', owner_user_id: 'U-002' },
];

export const USERS: User[] = [
  { user_id: 'U-001', name: '김민수', team: 'AI플랫폼팀' },
  { user_id: 'U-002', name: '이서연', team: 'AI플랫폼팀' },
  { user_id: 'U-003', name: '박지훈', team: '개발팀' },
  { user_id: 'U-004', name: '최유진', team: '데이터팀' },
];

export const KEYS: APIKeyMapping[] = [
  key('K-C001', 'A전자 운영 Key', 'CUSTOMER', 'C-001', null, 'PROD'),
  key('K-C001-DEV', 'A전자 개발 Key', 'CUSTOMER', 'C-001', null, 'DEV'),
  key('K-C002', 'B리테일 운영 Key', 'CUSTOMER', 'C-002', null, 'PROD'),
  key('K-C003', 'C미디어 운영 Key', 'CUSTOMER', 'C-003', null, 'PROD'),
  key('K-P001', 'AI PDP 개발 Key', 'INTERNAL', null, 'PRJ-001', 'DEV'),
  key('K-P002', '프로젝트 X Key', 'INTERNAL', null, 'PRJ-002', 'DEV'),
  key('K-LEGACY', '레거시 공용 Key (프로젝트 미매핑)', 'INTERNAL', null, null, 'DEV'),
  key('K-POC', 'Patron PoC Key', 'POC', null, 'PRJ-POC', 'TEST'),
  key('K-TEST', '연결 테스트 Key', 'POC', null, 'PRJ-TEST', 'TEST'),
];

function key(id: string, name: string, owner: APIKeyMapping['owner_type'], c: string | null, p: string | null, env: APIKeyMapping['environment']): APIKeyMapping {
  return {
    key_id: id,
    openrouter_key_ref: `sk-or-…${id.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-4)}`,
    display_name: name,
    owner_type: owner,
    customer_id: c,
    project_id: p,
    environment: env,
    created_at: '2026-09-01T00:00:00.000Z',
    active: true,
    monthly_limit_usd: owner === 'CUSTOMER' ? 500 : 300,
    limit_reset_rule: 'OpenRouter Key 월 한도 (Patron 예산 기간과 별도) [검증 필요]',
    last_used_at: null,
    last_synced_at: null,
  };
}

const CAP = (text: boolean, image: boolean, json: boolean, tools: boolean) => ({ text, image, json, tools });

function price(i: number, o: number, effective = '2026-09-15T00:00:00.000Z', checked = '2026-10-20T01:00:00.000Z') {
  return { input_per_1m_usd: i, output_per_1m_usd: o, currency: 'USD' as const, effective_at: effective, checked_at: checked };
}

export const CATALOG: OpenRouterCatalogModel[] = [
  { model_id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', capabilities: CAP(true, true, true, true), context_length: 128000, pricing: price(2.5, 10), supports_provider_pinning: true },
  { model_id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', capabilities: CAP(true, true, true, true), context_length: 128000, pricing: price(0.15, 0.6), supports_provider_pinning: true },
  { model_id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', capabilities: CAP(true, true, true, true), context_length: 1047576, pricing: price(2, 8), supports_provider_pinning: true },
  { model_id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', capabilities: CAP(true, true, true, true), context_length: 200000, pricing: price(3, 15), supports_provider_pinning: true },
  { model_id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', capabilities: CAP(true, true, true, true), context_length: 200000, pricing: price(3, 15), supports_provider_pinning: true },
  { model_id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', capabilities: CAP(true, true, true, false), context_length: 200000, pricing: price(0.25, 1.25), supports_provider_pinning: true },
  { model_id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', capabilities: CAP(true, true, true, false), context_length: 2000000, pricing: price(1.25, 5), supports_provider_pinning: false },
  { model_id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', capabilities: CAP(true, true, true, true), context_length: 1048576, pricing: price(0.1, 0.4), supports_provider_pinning: false },
  { model_id: 'google/gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'Google', capabilities: CAP(true, false, false, false), context_length: 32000, pricing: price(0.5, 1.5, '2026-03-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z'), supports_provider_pinning: false },
  { model_id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', provider: 'Meta', capabilities: CAP(true, false, true, false), context_length: 131072, pricing: price(0.35, 0.4), supports_provider_pinning: true },
  { model_id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', provider: 'Meta', capabilities: CAP(true, false, true, true), context_length: 131072, pricing: price(0.12, 0.3), supports_provider_pinning: true },
  { model_id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral AI', capabilities: CAP(true, false, true, true), context_length: 128000, pricing: null, supports_provider_pinning: true },
  { model_id: 'mistralai/mistral-small', name: 'Mistral Small', provider: 'Mistral AI', capabilities: CAP(true, false, true, true), context_length: 32000, pricing: price(0.2, 0.6), supports_provider_pinning: true },
  { model_id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', capabilities: CAP(true, false, true, true), context_length: 64000, pricing: price(0.14, 0.28), supports_provider_pinning: false },
  { model_id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Qwen', capabilities: CAP(true, false, true, true), context_length: 32768, pricing: price(0.35, 0.4), supports_provider_pinning: false },
  { model_id: 'cohere/command-r-plus', name: 'Command R+', provider: 'Cohere', capabilities: CAP(true, false, true, true), context_length: 128000, pricing: price(2.5, 10), supports_provider_pinning: true },
  { model_id: 'x-ai/grok-2', name: 'Grok 2', provider: 'xAI', capabilities: CAP(true, true, true, true), context_length: 131072, pricing: price(2, 10), supports_provider_pinning: true },
];

function catalogOf(id: string): OpenRouterCatalogModel {
  const m = CATALOG.find((c) => c.model_id === id);
  if (!m) throw new Error(`catalog missing ${id}`);
  return m;
}

export const MODEL_FLAVOR: Record<string, string> = {
  'openai/gpt-4o': '간결하고 구조적인 문체',
  'openai/gpt-4o-mini': '짧고 빠른 응답',
  'anthropic/claude-3.5-sonnet': '설명이 풍부한 문체',
  'google/gemini-1.5-pro': '항목 중심 서술',
  'google/gemini-1.0-pro': '단문 위주',
  'anthropic/claude-3-haiku': '요약 중심',
  'meta-llama/llama-3.1-70b-instruct': '직설적 문체',
  'mistralai/mistral-large': '격식 있는 문체',
  'deepseek/deepseek-chat': '기술적 문체',
};

// ---------- 생성 ----------

export function buildDataset(): MockDataset {
  const rng = new Rng(20261022);
  const today = todayKst();
  const startDate = addDays(today, -(DAYS - 1));

  const models = buildModels(today);
  const requests: AIRequest[] = [];
  const idCounter = { n: 0 };
  const nextReqId = (date: string) => `REQ-${date.replace(/-/g, '')}-${String(++idCounter.n).padStart(5, '0')}`;

  // --- 고객 호출 (CUSTOMER_SERVICE) ---
  const customerPlans: { customer: string; service: string; key: string; tasksPerDay: [number, number]; callsPerTask: [number, number]; models: { v: string; w: number }[]; purpose: AIRequest['call_purpose'][] }[] = [
    { customer: 'C-001', service: 'S-PDP-A', key: 'K-C001', tasksPerDay: [4, 8], callsPerTask: [3, 7], models: [{ v: 'openai/gpt-4o', w: 5 }, { v: 'anthropic/claude-3.5-sonnet', w: 3 }, { v: 'openai/gpt-4o-mini', w: 4 }], purpose: ['GENERATE', 'EVALUATE', 'REGENERATE'] },
    { customer: 'C-001', service: 'S-FLIP-A', key: 'K-C001', tasksPerDay: [2, 4], callsPerTask: [1, 2], models: [{ v: 'openai/gpt-4o-mini', w: 6 }, { v: 'google/gemini-1.5-pro', w: 2 }], purpose: ['GENERATE'] },
    { customer: 'C-002', service: 'S-PDP-B', key: 'K-C002', tasksPerDay: [3, 6], callsPerTask: [3, 6], models: [{ v: 'anthropic/claude-3.5-sonnet', w: 5 }, { v: 'openai/gpt-4o', w: 3 }, { v: 'google/gemini-1.5-pro', w: 2 }], purpose: ['GENERATE', 'EVALUATE'] },
    { customer: 'C-003', service: 'S-CHAT-C', key: 'K-C003', tasksPerDay: [0, 2], callsPerTask: [1, 3], models: [{ v: 'openai/gpt-4o-mini', w: 7 }, { v: 'anthropic/claude-3-haiku', w: 2 }], purpose: ['GENERATE'] },
  ];

  for (let d = 0; d < DAYS; d++) {
    const date = addDays(startDate, d);
    const isWeekend = [0, 6].includes(new Date(`${date}T00:00:00+09:00`).getUTCDay());
    for (const plan of customerPlans) {
      // 과거(50일 이전)에는 haiku 사용 비중 증가 → INACTIVE 모델 과거 이력 보존 검증
      const taskN = Math.max(0, Math.round(rng.int(plan.tasksPerDay[0], plan.tasksPerDay[1]) * (isWeekend ? 0.4 : 1)));
      for (let t = 0; t < taskN; t++) {
        const taskId = `TASK-${date.replace(/-/g, '')}-${rng.hex(4)}`;
        const callN = rng.int(plan.callsPerTask[0], plan.callsPerTask[1]);
        const baseMinute = rng.int(8 * 60, 21 * 60);
        for (let c = 0; c < callN; c++) {
          let modelId = rng.weighted(plan.models);
          if (d < 25 && plan.customer === 'C-001' && rng.chance(0.25)) modelId = 'anthropic/claude-3-haiku';
          const purpose = plan.purpose[Math.min(c === 0 ? 0 : rng.int(0, plan.purpose.length - 1), plan.purpose.length - 1)];
          const r = makeRequest(rng, {
            request_id: nextReqId(date),
            date,
            minute: baseMinute + c * rng.int(1, 4),
            task_id: taskId,
            key_id: plan.key,
            usage_origin: 'CUSTOMER_SERVICE',
            owner_type: 'CUSTOMER',
            customer_id: plan.customer,
            project_id: null,
            user_id: null,
            service_id: plan.service,
            call_purpose: purpose,
            model: catalogOf(modelId),
            tokenProfile: plan.service.startsWith('S-PDP') ? 'pdp' : 'light',
          });
          requests.push(r);
          // 실패 시 재시도 (별도 Request ID, parent 연결)
          if ((r.status === 'FAILED' || r.status === 'TIMEOUT') && rng.chance(0.6)) {
            const retry = makeRequest(rng, {
              request_id: nextReqId(date),
              date,
              minute: baseMinute + c * rng.int(1, 4) + 1,
              task_id: taskId,
              key_id: plan.key,
              usage_origin: 'CUSTOMER_SERVICE',
              owner_type: 'CUSTOMER',
              customer_id: plan.customer,
              project_id: null,
              user_id: null,
              service_id: plan.service,
              call_purpose: purpose,
              model: catalogOf(modelId),
              tokenProfile: plan.service.startsWith('S-PDP') ? 'pdp' : 'light',
              forceStatus: rng.chance(0.85) ? 'SUCCESS' : 'FAILED',
            });
            retry.attempt_no = r.attempt_no + 1;
            retry.parent_request_id = r.request_id;
            requests.push(retry);
          }
        }
      }
    }

    // --- 내부 개발 호출 (INTERNAL_DEVELOPMENT) ---
    const internalPlans: { project: string | null; key: string; users: (string | null)[]; perDay: [number, number]; models: { v: string; w: number }[] }[] = [
      { project: 'PRJ-001', key: 'K-P001', users: ['U-001', 'U-002', 'U-003', null], perDay: [10, 20], models: [{ v: 'openai/gpt-4o', w: 4 }, { v: 'anthropic/claude-3.5-sonnet', w: 3 }, { v: 'openai/gpt-4o-mini', w: 5 }, { v: 'google/gemini-1.5-pro', w: 1 }] },
      { project: 'PRJ-002', key: 'K-P002', users: ['U-003', 'U-004', null], perDay: [6, 12], models: [{ v: 'anthropic/claude-3.5-sonnet', w: 6 }, { v: 'openai/gpt-4o', w: 3 }] },
      { project: null, key: 'K-LEGACY', users: [null], perDay: [0, 1], models: [{ v: 'openai/gpt-4o-mini', w: 1 }] },
    ];
    for (const plan of internalPlans) {
      const n = Math.round(rng.int(plan.perDay[0], plan.perDay[1]) * (isWeekend ? 0.2 : 1));
      for (let i = 0; i < n; i++) {
        const modelId = rng.weighted(plan.models);
        const user = rng.chance(0.12) ? null : rng.pick(plan.users.filter(Boolean) as string[]);
        requests.push(
          makeRequest(rng, {
            request_id: nextReqId(date),
            date,
            minute: rng.int(9 * 60, 20 * 60),
            task_id: rng.chance(0.7) ? `DEV-${date.replace(/-/g, '')}-${rng.hex(3)}` : null,
            key_id: plan.key,
            usage_origin: 'INTERNAL_DEVELOPMENT',
            owner_type: 'INTERNAL',
            customer_id: null,
            project_id: plan.project,
            user_id: plan.project === null ? null : user,
            service_id: 'S-INT-DEV',
            call_purpose: rng.pick(['GENERATE', 'EXPERIMENT', 'EVALUATE']),
            model: catalogOf(modelId),
            tokenProfile: plan.project === 'PRJ-002' ? 'heavy' : 'dev',
          }),
        );
      }
    }
  }

  // --- 시뮬레이션 (SIMULATION) ---
  const sims = buildSimulations(rng, today, models, requests, nextReqId);

  // --- 모델 연결 테스트 (SYSTEM_TEST) ---
  for (const m of models) {
    if (!m.last_test) continue;
    const date = toKstDate(m.last_test.tested_at);
    const r = makeRequest(rng, {
      request_id: m.last_test.request_id,
      date,
      minute: 10 * 60 + rng.int(0, 300),
      task_id: null,
      key_id: 'K-TEST',
      usage_origin: 'SYSTEM_TEST',
      owner_type: 'POC',
      customer_id: null,
      project_id: 'PRJ-TEST',
      user_id: 'U-002',
      service_id: 'S-TEST',
      call_purpose: 'TEST',
      model: catalogOf(m.model_id),
      tokenProfile: 'light',
      forceStatus: m.last_test.result === 'SUCCESS' ? 'SUCCESS' : m.last_test.result === 'TIMEOUT' ? 'TIMEOUT' : 'FAILED',
      forceError: m.last_test.error_type,
    });
    r.requested_at = m.last_test.tested_at;
    r.completed_at = r.status === 'TIMEOUT' ? new Date(new Date(r.requested_at).getTime() + 30000).toISOString() : new Date(new Date(r.requested_at).getTime() + (r.latency_ms ?? 1000)).toISOString();
    requests.push(r);
  }
  // 과거 추가 테스트 호출 몇 건
  for (let i = 0; i < 6; i++) {
    const date = addDays(today, -rng.int(3, 40));
    const m = rng.pick(models.filter((x) => x.status !== 'INACTIVE'));
    requests.push(
      makeRequest(rng, {
        request_id: nextReqId(date),
        date,
        minute: rng.int(9 * 60, 18 * 60),
        task_id: null,
        key_id: 'K-TEST',
        usage_origin: 'SYSTEM_TEST',
        owner_type: 'POC',
        customer_id: null,
        project_id: 'PRJ-TEST',
        user_id: rng.pick(['U-001', 'U-002']),
        service_id: 'S-TEST',
        call_purpose: 'TEST',
        model: catalogOf(m.model_id),
        tokenProfile: 'light',
      }),
    );
  }

  requests.sort((a, b) => (a.requested_at < b.requested_at ? -1 : a.requested_at > b.requested_at ? 1 : 0));

  // --- 예산 (사용량 기준으로 목표 사용률에 맞게 산정 → 정상/주의/초과/미설정 보장) ---
  const month = today.slice(0, 7);
  const prevMonth = (() => {
    const [y, mo] = month.split('-').map(Number);
    return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
  })();
  const budgets: Budget[] = [];
  const spentFor = (pred: (r: AIRequest) => boolean, mo: string) =>
    round6(requests.filter((r) => pred(r) && toKstMonth(r.requested_at) === mo && r.cost_usd !== null && r.cost_status !== 'UNKNOWN').reduce((a, r) => a + (r.cost_usd ?? 0), 0));
  const mk = (owner_type: Budget['owner_type'], owner_id: string, mo: string, targetPct: number, pred: (r: AIRequest) => boolean, warning = 80): Budget => {
    const spent = spentFor(pred, mo);
    const amount = Math.max(1, Math.round((spent / (targetPct / 100)) * 100) / 100);
    return { budget_id: `BGT-${owner_id}-${mo}`, owner_type, owner_id, month: mo, amount_usd: amount, warning_pct: warning, created_at: `${mo}-01T00:00:00.000Z`, updated_at: `${mo}-01T00:00:00.000Z` };
  };
  const isCust = (id: string) => (r: AIRequest) => r.usage_origin === 'CUSTOMER_SERVICE' && r.customer_id === id;
  const isProj = (id: string) => (r: AIRequest) => r.usage_origin !== 'CUSTOMER_SERVICE' && r.project_id === id;
  budgets.push(mk('CUSTOMER', 'C-001', month, 45, isCust('C-001')));
  budgets.push(mk('CUSTOMER', 'C-002', month, 88, isCust('C-002')));
  budgets.push(mk('CUSTOMER', 'C-001', prevMonth, 70, isCust('C-001')));
  budgets.push(mk('CUSTOMER', 'C-002', prevMonth, 60, isCust('C-002')));
  budgets.push(mk('PROJECT', 'PRJ-001', month, 42, isProj('PRJ-001')));
  budgets.push(mk('PROJECT', 'PRJ-002', month, 118, isProj('PRJ-002'), 80));
  budgets.push(mk('PROJECT', 'PRJ-POC', month, 46, isProj('PRJ-POC'), 40));
  budgets.push(mk('PROJECT', 'PRJ-001', prevMonth, 65, isProj('PRJ-001')));
  // C-003, PRJ-TEST: 미설정

  const subscriptions: SubscriptionCost[] = [
    sub('SUB-001', 'ChatGPT Team', 'Team (5석)', month, 150, 'PRJ-001'),
    sub('SUB-002', 'Claude Team', 'Team (5석)', month, 150, 'PRJ-002'),
    sub('SUB-003', 'Cursor', 'Business (3석)', month, 120, null),
    sub('SUB-004', 'ChatGPT Team', 'Team (5석)', prevMonth, 150, 'PRJ-001'),
    sub('SUB-005', 'Claude Team', 'Team (5석)', prevMonth, 150, 'PRJ-002'),
    sub('SUB-006', 'GitHub Copilot', 'Business (3석)', prevMonth, 57, 'PRJ-001', 'CANCELLED'),
  ];

  return {
    customers: CUSTOMERS,
    services: SERVICES,
    projects: PROJECTS,
    users: USERS,
    keys: KEYS,
    models,
    catalog: CATALOG,
    requests,
    simulations: sims.runs,
    simulationResults: sims.results,
    budgets,
    subscriptions,
  };
}

function sub(id: string, tool: string, plan: string, month: string, amount: number, project: string | null, status: SubscriptionCost['status'] = 'ACTIVE'): SubscriptionCost {
  return { subscription_id: id, tool_name: tool, plan, month, amount, currency: 'USD', project_id: project, status, note: project ? '' : '귀속 프로젝트 미지정 — 미배분 유지', created_at: `${month}-01T00:00:00.000Z`, updated_at: `${month}-01T00:00:00.000Z` };
}

function buildModels(today: string): ModelRegistry[] {
  const at = (daysAgo: number, hour: number) => new Date(`${addDays(today, -daysAgo)}T${String(hour).padStart(2, '0')}:00:00+09:00`).toISOString();
  const reg = (id: string, status: ModelRegistry['status'], purpose: string, last_test: ModelRegistry['last_test'], created: string): ModelRegistry => {
    const c = catalogOf(id);
    return {
      model_id: c.model_id,
      display_name: c.name,
      provider: c.provider,
      purpose,
      capabilities: c.capabilities,
      context_length: c.context_length,
      pricing: c.pricing,
      status,
      last_test,
      supports_provider_pinning: c.supports_provider_pinning,
      created_at: created,
      updated_at: last_test?.tested_at ?? created,
    };
  };
  const ok = (daysAgo: number, hour: number, latency: number, reqId: string): ModelRegistry['last_test'] => ({ result: 'SUCCESS', error_type: null, error_message: null, tested_at: at(daysAgo, hour), latency_ms: latency, request_id: reqId });
  return [
    reg('openai/gpt-4o', 'ACTIVE', 'PDP 생성 기본 모델', ok(2, 14, 1820, 'REQ-TEST-00001'), '2026-06-01T00:00:00.000Z'),
    reg('openai/gpt-4o-mini', 'ACTIVE', '경량 생성·분류', ok(3, 10, 940, 'REQ-TEST-00002'), '2026-06-01T00:00:00.000Z'),
    reg('anthropic/claude-3.5-sonnet', 'ACTIVE', '긴 문맥 생성·평가', ok(2, 16, 2110, 'REQ-TEST-00003'), '2026-06-15T00:00:00.000Z'),
    reg('google/gemini-1.5-pro', 'ACTIVE', '이미지 분석', ok(5, 11, 2650, 'REQ-TEST-00004'), '2026-07-01T00:00:00.000Z'),
    reg('meta-llama/llama-3.1-70b-instruct', 'TESTING', '저비용 대안 검토', ok(1, 9, 1430, 'REQ-TEST-00005'), at(4, 9)),
    reg('mistralai/mistral-large', 'TESTING', '다국어 생성 검토', { result: 'FAILED', error_type: 'AUTH_ERROR', error_message: 'OpenRouter 응답 401: 해당 모델에 대한 Key 권한 없음', tested_at: at(1, 15), latency_ms: 320, request_id: 'REQ-TEST-00006' }, at(2, 15)),
    reg('deepseek/deepseek-chat', 'TESTING', '코드·기술 문서 생성 검토', null, at(0, 9)),
    reg('google/gemini-1.0-pro', 'INACTIVE', '(사용 중단) 초기 PDP 생성', { result: 'TIMEOUT', error_type: 'TIMEOUT_ERROR', error_message: '30초 내 응답 없음', tested_at: at(20, 13), latency_ms: null, request_id: 'REQ-TEST-00007' }, '2026-03-01T00:00:00.000Z'),
    reg('anthropic/claude-3-haiku', 'INACTIVE', '(사용 중단) 경량 요약', ok(40, 10, 880, 'REQ-TEST-00008'), '2026-03-01T00:00:00.000Z'),
  ];
}

type TokenProfile = 'pdp' | 'light' | 'dev' | 'heavy';
const TOKEN_RANGE: Record<TokenProfile, { in: [number, number]; out: [number, number] }> = {
  pdp: { in: [2500, 6000], out: [800, 2500] },
  light: { in: [200, 900], out: [80, 400] },
  dev: { in: [800, 4000], out: [300, 1500] },
  heavy: { in: [6000, 16000], out: [2000, 6000] },
};

interface MakeOpts {
  request_id: string;
  date: string;
  minute: number;
  task_id: string | null;
  key_id: string;
  usage_origin: AIRequest['usage_origin'];
  owner_type: AIRequest['owner_type'];
  customer_id: string | null;
  project_id: string | null;
  user_id: string | null;
  service_id: string;
  call_purpose: AIRequest['call_purpose'];
  model: OpenRouterCatalogModel;
  tokenProfile: TokenProfile;
  forceStatus?: ExecStatus;
  forceError?: ErrorType | null;
  simulation_id?: string | null;
  input_hash?: string | null;
  execution_config?: AIRequest['execution_config'];
  routing_policy?: AIRequest['routing_policy'];
}

export function makeRequest(rng: Rng, o: MakeOpts): AIRequest {
  const minute = Math.min(o.minute, 23 * 60 + 59);
  const hh = String(Math.floor(minute / 60)).padStart(2, '0');
  const mm = String(minute % 60).padStart(2, '0');
  const ss = String(rng.int(0, 59)).padStart(2, '0');
  const requestedAt = new Date(`${o.date}T${hh}:${mm}:${ss}+09:00`).toISOString();
  const status: ExecStatus = o.forceStatus ?? rng.weighted<ExecStatus>([{ v: 'SUCCESS', w: 90 }, { v: 'FAILED', w: 5 }, { v: 'TIMEOUT', w: 3 }, { v: 'CANCELLED', w: 1 }]);
  const tr = TOKEN_RANGE[o.tokenProfile];
  const inputTokens = rng.int(tr.in[0], tr.in[1]);
  let outputTokens: number | null = rng.int(tr.out[0], tr.out[1]);
  let latency: number | null = Math.round(400 + outputTokens * rng.int(2, 6) + rng.int(0, 800));
  let errorType: ErrorType | null = null;
  let errorMessage: string | null = null;
  let costStatus: AIRequest['cost_status'] = 'CONFIRMED';
  let costSource: AIRequest['cost_source'] = 'API_RESPONSE';
  let cost: number | null = null;
  let completedAt: string | null = null;
  const providerPinned = o.routing_policy?.provider_pinned ?? false;
  const actualProvider = rng.chance(0.08) ? null : o.model.provider === 'OpenAI' && !providerPinned && rng.chance(0.3) ? 'Azure' : o.model.provider;

  if (status === 'SUCCESS') {
    const roll = rng.next();
    if (roll < 0.84) {
      cost = estimateCost(inputTokens, outputTokens, o.model.pricing);
      if (cost === null) {
        costStatus = 'UNKNOWN';
        costSource = 'NONE';
      } else cost = round6(cost * (1 + (rng.next() - 0.5) * 0.02)); // API 응답값은 추정과 소폭 차이
    } else if (roll < 0.95 && o.model.pricing) {
      costStatus = 'ESTIMATED';
      costSource = 'ESTIMATED_CALC';
      cost = estimateCost(inputTokens, outputTokens, o.model.pricing);
    } else {
      costStatus = 'UNKNOWN';
      costSource = 'NONE';
      cost = null;
    }
    completedAt = new Date(new Date(requestedAt).getTime() + latency).toISOString();
  } else if (status === 'FAILED') {
    errorType = o.forceError ?? rng.weighted<ErrorType>([{ v: 'RATE_LIMIT', w: 4 }, { v: 'PROVIDER_ERROR', w: 4 }, { v: 'INVALID_RESPONSE', w: 2 }, { v: 'NETWORK_ERROR', w: 1 }, { v: 'AUTH_ERROR', w: 1 }, { v: 'UNKNOWN_ERROR', w: 1 }]);
    errorMessage = ERROR_MESSAGES[errorType];
    outputTokens = errorType === 'INVALID_RESPONSE' ? rng.int(10, 200) : 0;
    latency = rng.int(150, 2500);
    completedAt = new Date(new Date(requestedAt).getTime() + latency).toISOString();
    if (errorType === 'INVALID_RESPONSE' && o.model.pricing && rng.chance(0.7)) {
      cost = estimateCost(inputTokens, outputTokens, o.model.pricing);
      costStatus = 'CONFIRMED';
    } else {
      cost = null;
      costStatus = 'UNKNOWN';
      costSource = 'NONE';
    }
  } else if (status === 'TIMEOUT') {
    errorType = 'TIMEOUT_ERROR';
    errorMessage = `${o.execution_config?.timeout_sec ?? 30}초 내 응답 없음`;
    outputTokens = null;
    latency = null;
    completedAt = new Date(new Date(requestedAt).getTime() + (o.execution_config?.timeout_sec ?? 30) * 1000).toISOString();
    cost = null;
    costStatus = 'UNKNOWN';
    costSource = 'NONE';
  } else {
    // CANCELLED
    outputTokens = null;
    latency = null;
    completedAt = new Date(new Date(requestedAt).getTime() + rng.int(100, 3000)).toISOString();
    cost = null;
    costStatus = 'UNKNOWN';
    costSource = 'NONE';
  }

  return {
    request_id: o.request_id,
    task_id: o.task_id,
    simulation_id: o.simulation_id ?? null,
    key_id: o.key_id,
    usage_origin: o.usage_origin,
    owner_type: o.owner_type,
    customer_id: o.customer_id,
    project_id: o.project_id,
    user_id: o.user_id,
    service_id: o.service_id,
    call_purpose: o.call_purpose,
    attempt_no: 1,
    parent_request_id: null,
    requested_model: o.model.model_id,
    requested_provider: o.model.provider,
    actual_model: status === 'SUCCESS' || errorType === 'INVALID_RESPONSE' ? o.model.model_id : null,
    actual_provider: status === 'SUCCESS' ? actualProvider : null,
    routing_policy: o.routing_policy ?? { provider_pinned: false, fallback_enabled: true, requested_provider: o.model.provider },
    execution_config: o.execution_config ?? { temperature: 0.7, max_tokens: 2048, timeout_sec: 30 },
    input_reference: o.task_id ? `input://${o.task_id}` : null,
    input_hash: o.input_hash ?? hashString(o.request_id),
    requested_at: requestedAt,
    completed_at: completedAt,
    status,
    error_type: errorType,
    error_message: errorMessage,
    input_tokens: status === 'CANCELLED' ? null : inputTokens,
    output_tokens: outputTokens,
    cost_usd: cost,
    cost_status: costStatus,
    cost_source: costSource,
    price_reference: cost !== null && o.model.pricing ? `${o.model.model_id}@${o.model.pricing.effective_at.slice(0, 10)}` : null,
    latency_ms: latency,
    external_generation_id: status === 'SUCCESS' ? `gen-${rng.hex(12)}` : null,
    reconciled_at: costStatus === 'CONFIRMED' && rng.chance(0.5) ? completedAt : null,
  };
}

export const ERROR_MESSAGES: Record<ErrorType, string> = {
  AUTH_ERROR: 'OpenRouter 응답 401: 인증 실패',
  RATE_LIMIT: 'OpenRouter 응답 429: 호출 제한 초과',
  TIMEOUT_ERROR: '설정된 응답 대기시간 초과',
  PROVIDER_ERROR: 'Provider 응답 502: 일시적 오류',
  INVALID_RESPONSE: '응답 본문 구조 오류 (choices 누락)',
  UNSUPPORTED_INPUT: '모델이 지원하지 않는 입력 형식',
  NETWORK_ERROR: '네트워크 연결 실패',
  UNKNOWN_ERROR: '분류되지 않은 오류',
};

// ---------- 시뮬레이션 Seed ----------

interface SimSpec {
  daysAgo: number;
  hour: number;
  scenario: string | null;
  prompt?: string;
  input: string;
  image?: string | null;
  inputAvailable?: boolean;
  models: { id: string; status: ExecStatus; kind?: ResponseKind; error?: ErrorType; cost?: 'CONFIRMED' | 'ESTIMATED' | 'UNKNOWN'; long?: boolean }[];
  json?: boolean;
  schema?: string | null;
  pinned?: boolean;
  temperature?: number;
  by: string;
  rerunOf?: string;
}

const SAMPLE_INPUTS = {
  pdp: '네이비 린넨 셔츠\n브랜드: LOGBASE 샘플\n소재: 린넨 100%\n사이즈: S/M/L\n특징: 가벼운 착용감, 통기성, 여름용\n가격대: 5~7만원',
  review: '배송은 이틀 늦게 왔지만 제품 자체는 만족스럽습니다. 박스 포장이 꼼꼼했고 소재가 생각보다 두툼합니다. 사이즈는 정사이즈였고, 세탁 후에도 수축이 없었어요. 가격 대비 괜찮아서 색상 다른 걸로 하나 더 살 생각입니다. 다만 배송 안내 문자가 안 와서 불편했습니다.',
  unstructured: '안녕하세요, 이번 시즌 신상품 "소프트 코튼 머그 세트"를 소개드립니다. 주방용품 카테고리이며 300ml 머그 2개 구성입니다. 전자레인지 사용 가능, 식기세척기 사용 가능하며 선물 포장이 기본 제공됩니다. 1인 가구와 신혼 가정을 주요 고객으로 보고 있고 가격은 2만원대입니다.',
  analysis: '지난 2주간 AI PDP 생성 작업 수는 12% 늘었는데 API 호출 수는 38% 증가했습니다. 모델 구성은 변경하지 않았습니다. 원인을 분석해 주세요.',
};

function buildSimulations(rng: Rng, today: string, models: ModelRegistry[], requests: AIRequest[], nextReqId: (d: string) => string): { runs: SimulationRun[]; results: SimulationResult[] } {
  const specs: SimSpec[] = [
    { daysAgo: 1, hour: 14, scenario: 'SC-02', input: SAMPLE_INPUTS.pdp, models: [{ id: 'openai/gpt-4o', status: 'SUCCESS' }, { id: 'anthropic/claude-3.5-sonnet', status: 'SUCCESS', long: true }, { id: 'google/gemini-1.5-pro', status: 'SUCCESS' }], by: 'U-001', pinned: true },
    { daysAgo: 2, hour: 10, scenario: 'SC-04', input: SAMPLE_INPUTS.unstructured, json: true, schema: PRODUCT_SCHEMA, models: [{ id: 'openai/gpt-4o', status: 'SUCCESS', kind: 'json_ok' }, { id: 'anthropic/claude-3.5-sonnet', status: 'SUCCESS', kind: 'json_missing_field' }, { id: 'openai/gpt-4o-mini', status: 'SUCCESS', kind: 'json_invalid' }, { id: 'google/gemini-1.5-pro', status: 'SUCCESS', kind: 'json_ok', cost: 'ESTIMATED' }], by: 'U-002', pinned: true },
    { daysAgo: 3, hour: 16, scenario: 'SC-03', input: SAMPLE_INPUTS.review, json: true, schema: SUMMARY_SCHEMA, models: [{ id: 'openai/gpt-4o', status: 'SUCCESS', kind: 'json_ok' }, { id: 'anthropic/claude-3.5-sonnet', status: 'SUCCESS', kind: 'json_ok' }, { id: 'google/gemini-1.5-pro', status: 'TIMEOUT' }], by: 'U-001', pinned: true },
    { daysAgo: 5, hour: 11, scenario: 'SC-05', input: SAMPLE_INPUTS.analysis, models: [{ id: 'openai/gpt-4o', status: 'FAILED', error: 'RATE_LIMIT' }, { id: 'anthropic/claude-3.5-sonnet', status: 'FAILED', error: 'PROVIDER_ERROR' }], by: 'U-003', pinned: false },
    { daysAgo: 7, hour: 15, scenario: 'SC-01', input: '네이비 린넨 셔츠 (이미지 첨부)\n브랜드: LOGBASE 샘플', image: 'linen-shirt-navy.jpg', json: true, schema: PRODUCT_SCHEMA, models: [{ id: 'openai/gpt-4o', status: 'SUCCESS', kind: 'json_ok' }, { id: 'anthropic/claude-3.5-sonnet', status: 'SUCCESS', kind: 'json_ok' }, { id: 'google/gemini-1.5-pro', status: 'SUCCESS', kind: 'json_missing_field', cost: 'UNKNOWN' }], by: 'U-002', pinned: true },
    { daysAgo: 9, hour: 9, scenario: null, prompt: '다음 상품 정보를 바탕으로 SNS 광고용 짧은 문구 5개를 작성하세요. 각 문구는 15자 이내.', input: SAMPLE_INPUTS.pdp, models: [{ id: 'openai/gpt-4o-mini', status: 'SUCCESS' }, { id: 'anthropic/claude-3.5-sonnet', status: 'SUCCESS', cost: 'ESTIMATED' }], by: 'U-001', pinned: true, temperature: 1.0 },
    { daysAgo: 14, hour: 13, scenario: 'SC-02', input: SAMPLE_INPUTS.pdp, models: [{ id: 'openai/gpt-4o', status: 'SUCCESS' }, { id: 'google/gemini-1.0-pro', status: 'SUCCESS' }, { id: 'anthropic/claude-3-haiku', status: 'SUCCESS' }], by: 'U-001', pinned: false },
    { daysAgo: 21, hour: 17, scenario: 'SC-03', input: SAMPLE_INPUTS.review, inputAvailable: false, json: true, schema: SUMMARY_SCHEMA, models: [{ id: 'openai/gpt-4o', status: 'SUCCESS', kind: 'json_ok' }, { id: 'anthropic/claude-3.5-sonnet', status: 'SUCCESS', kind: 'json_ok' }], by: 'U-002', pinned: true },
    { daysAgo: 28, hour: 10, scenario: 'SC-05', input: SAMPLE_INPUTS.analysis, models: [{ id: 'openai/gpt-4o', status: 'SUCCESS' }, { id: 'anthropic/claude-3.5-sonnet', status: 'SUCCESS' }, { id: 'google/gemini-1.5-pro', status: 'FAILED', error: 'INVALID_RESPONSE' }, { id: 'openai/gpt-4o-mini', status: 'SUCCESS' }], by: 'U-003', pinned: true },
    { daysAgo: 35, hour: 11, scenario: 'SC-02', input: SAMPLE_INPUTS.pdp, models: [{ id: 'openai/gpt-4o', status: 'SUCCESS' }, { id: 'anthropic/claude-3-haiku', status: 'SUCCESS' }], by: 'U-001', pinned: true },
  ];

  const runs: SimulationRun[] = [];
  const results: SimulationResult[] = [];
  const perDay = new Map<string, number>();

  specs.forEach((spec, idx) => {
    const date = addDays(today, -spec.daysAgo);
    const seq = (perDay.get(date) ?? 0) + 1;
    perDay.set(date, seq);
    const simId = `SIM-${date.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;
    const scenario = spec.scenario ? SCENARIO_PROMPT[spec.scenario] : spec.prompt ?? '';
    const prompt = spec.prompt ?? scenario;
    const inputHash = hashString(prompt + '\n' + spec.input + (spec.image ?? ''));
    const startedAt = new Date(`${date}T${String(spec.hour).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00+09:00`).toISOString();
    const execCfg = { temperature: spec.temperature ?? 0.3, max_tokens: 1024, timeout_sec: 30 };
    const routing = { provider_pinned: spec.pinned ?? true, fallback_enabled: false, requested_provider: null };
    const statuses: ExecStatus[] = [];
    let maxEnd = startedAt;
    const modelIds: string[] = [];

    for (const m of spec.models) {
      const cat = catalogOf(m.id);
      const reg = models.find((x) => x.model_id === m.id);
      const reqId = nextReqId(date);
      const minute = spec.hour * 60 + rng.int(0, 59);
      const r = makeRequest(rng, {
        request_id: reqId,
        date,
        minute,
        task_id: null,
        key_id: 'K-POC',
        usage_origin: 'SIMULATION',
        owner_type: 'POC',
        customer_id: null,
        project_id: 'PRJ-POC',
        user_id: spec.by,
        service_id: 'S-SIM',
        call_purpose: 'EXPERIMENT',
        model: cat,
        tokenProfile: 'pdp',
        forceStatus: m.status,
        forceError: m.error ?? null,
        simulation_id: simId,
        input_hash: inputHash,
        execution_config: execCfg,
        routing_policy: { ...routing, requested_provider: cat.provider },
      });
      r.requested_at = startedAt;
      r.input_reference = spec.inputAvailable === false ? null : `sim-input://${simId}`;
      if (m.cost) {
        if (m.cost === 'UNKNOWN') {
          r.cost_usd = null;
          r.cost_status = 'UNKNOWN';
          r.cost_source = 'NONE';
          r.price_reference = null;
        } else if (r.status === 'SUCCESS' && cat.pricing) {
          r.cost_usd = estimateCost(r.input_tokens, r.output_tokens, cat.pricing);
          r.cost_status = m.cost;
          r.cost_source = m.cost === 'ESTIMATED' ? 'ESTIMATED_CALC' : 'API_RESPONSE';
        }
      }
      if (r.status === 'TIMEOUT') r.completed_at = new Date(new Date(startedAt).getTime() + execCfg.timeout_sec * 1000).toISOString();
      else r.completed_at = new Date(new Date(startedAt).getTime() + (r.latency_ms ?? 1200)).toISOString();
      if (r.completed_at > maxEnd) maxEnd = r.completed_at;
      requests.push(r);
      statuses.push(r.status);
      modelIds.push(m.id);

      const kind: ResponseKind = m.kind ?? 'ok';
      let text: string | null = null;
      if (r.status === 'SUCCESS' || (r.status === 'FAILED' && m.error === 'INVALID_RESPONSE')) {
        text = r.status === 'SUCCESS' ? buildResponse(spec.scenario, spec.json ?? false, spec.input, kind, rng, MODEL_FLAVOR[m.id] ?? '') : '{"error": "upstream returned empty choices"';
        if (m.long) text = longText(text, 4);
      }
      const v = r.status === 'SUCCESS' ? validateResponse(text, spec.json ? spec.schema ?? null : null) : { json: 'NOT_RUN' as const, schema: 'NOT_RUN' as const, missingFields: [], schemaErrors: [] };
      const notes: string[] = [];
      if (routing.provider_pinned && !cat.supports_provider_pinning) notes.push('이 모델은 Provider 고정을 지원하지 않아 라우팅이 고정되지 않았습니다.');
      if (spec.json && !cat.capabilities.json) notes.push('모델이 구조화 JSON 출력 모드를 지원하지 않아 Prompt 지시만으로 실행했습니다.');
      results.push({
        simulation_id: simId,
        request_id: reqId,
        model_id: m.id,
        model_status_at_run: reg?.status === 'INACTIVE' && spec.daysAgo > 10 ? 'ACTIVE' : reg?.status ?? 'ACTIVE',
        response_text: text,
        json_check: spec.json ? v.json : r.status === 'SUCCESS' ? 'NOT_RUN' : 'NOT_RUN',
        schema_check: spec.json && spec.schema ? v.schema : r.status === 'SUCCESS' ? 'NOT_APPLIED' : 'NOT_RUN',
        missing_fields: v.missingFields,
        condition_notes: notes,
      });
    }

    runs.push({
      simulation_id: simId,
      scenario_id: spec.scenario,
      prompt,
      input_text: spec.input,
      input_image_ref: spec.image ?? null,
      input_available: spec.inputAvailable ?? true,
      input_hash: inputHash,
      model_ids: modelIds,
      execution_config: execCfg,
      routing_policy: routing,
      json_mode: spec.json ?? false,
      json_schema: spec.json ? spec.schema ?? null : null,
      status: computeSimulationStatus(statuses),
      started_at: startedAt,
      completed_at: maxEnd,
      executed_by: spec.by,
      project_id: 'PRJ-POC',
      rerun_of: idx === 0 ? runs[runs.length - 1]?.simulation_id ?? null : null,
    });
  });
  // 첫 번째(최신) 실행을 10번째 실행의 재실행으로 연결 (재실행 관계 표시 검증)
  if (runs.length >= 10) runs[0].rerun_of = runs[9].simulation_id;
  return { runs, results };
}

const SCENARIO_PROMPT: Record<string, string> = {
  'SC-01': '당신은 커머스 상품 분석가입니다. 첨부된 상품 이미지와 입력 정보를 바탕으로 상품의 카테고리, 핵심 속성(색상·소재·형태), 타깃 고객을 JSON으로 정리하세요. 추측한 항목은 confidence를 낮게 표기하세요.',
  'SC-02': '아래 상품 정보를 바탕으로 온라인 상품 상세페이지(PDP)에 들어갈 상품 설명 2문단과 20자 이내의 마케팅 헤드라인 3개를 한국어로 작성하세요. 과장 표현과 근거 없는 효능 주장은 피하세요.',
  'SC-03': '다음 텍스트를 3문장 이내로 요약하고, 핵심 포인트 3~5개와 전반적인 감성(positive/neutral/negative)을 JSON으로 반환하세요.',
  'SC-04': '아래 비정형 텍스트에서 상품 정보를 추출하여 지정된 JSON Schema를 정확히 준수하는 JSON만 출력하세요. 설명 문장이나 마크다운 코드 블록을 포함하지 마세요.',
  'SC-05': '아래 상황을 분석하고, 가능한 원인 3가지와 각 원인의 검증 방법을 근거와 함께 제시하세요. 확실하지 않은 부분은 명확히 표시하세요.',
};
