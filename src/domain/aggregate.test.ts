import { describe, expect, it } from 'vitest';
import { buildDataset } from '../mock/seed';
import { budgetStatus, computeSimulationStatus, estimateCost, simulationCostState, summarize, trend } from './aggregate';
import { validateResponse } from './validation';
import { addDays, todayKst, toKstMonth } from './format';

const ds = buildDataset();

describe('데이터 정책 불변조건', () => {
  it('모든 Request ID 는 유일하다', () => {
    const ids = ds.requests.map((r) => r.request_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('비용 미확인(UNKNOWN) 은 cost_usd null 이며 0 이 아니다', () => {
    for (const r of ds.requests) {
      if (r.cost_status === 'UNKNOWN') expect(r.cost_usd).toBeNull();
      else expect(r.cost_usd).not.toBeNull();
    }
  });
  it('TIMEOUT 호출은 비용 미확인으로 유지된다', () => {
    const t = ds.requests.filter((r) => r.status === 'TIMEOUT');
    expect(t.length).toBeGreaterThan(0);
    for (const r of t) expect(r.cost_status).toBe('UNKNOWN');
  });
  it('고객 화면은 CUSTOMER_SERVICE 만, 내부 화면은 나머지 출처만 집계한다', () => {
    const cust = ds.requests.filter((r) => r.usage_origin === 'CUSTOMER_SERVICE');
    const internal = ds.requests.filter((r) => r.usage_origin !== 'CUSTOMER_SERVICE');
    expect(cust.every((r) => r.customer_id !== null && r.project_id === null)).toBe(true);
    expect(internal.every((r) => r.customer_id === null)).toBe(true);
    expect(cust.length + internal.length).toBe(ds.requests.length);
  });
  it('요약 합계 = 상세 합계 (동일 필터)', () => {
    const today = todayKst();
    const range = { start: addDays(today, -29), end: today };
    const rows = ds.requests.filter((r) => r.usage_origin === 'CUSTOMER_SERVICE' && r.customer_id === 'C-001');
    const s = summarize(rows);
    const detailConfirmed = rows.filter((r) => r.cost_status === 'CONFIRMED').reduce((a, r) => a + (r.cost_usd ?? 0), 0);
    expect(s.confirmedUsd).toBeCloseTo(detailConfirmed, 6);
    expect(s.unknownCount).toBe(rows.filter((r) => r.cost_status === 'UNKNOWN').length);
    const t = trend(rows, range, 'day');
    expect(t.reduce((a, p) => a + p.calls, 0)).toBe(rows.length);
    expect(t.reduce((a, p) => a + p.confirmedUsd, 0)).toBeCloseTo(s.confirmedUsd, 4);
  });
  it('재시도는 별도 Request ID 와 parent 연결을 가진다', () => {
    const retries = ds.requests.filter((r) => r.parent_request_id);
    expect(retries.length).toBeGreaterThan(0);
    const ids = new Set(ds.requests.map((r) => r.request_id));
    for (const r of retries) {
      expect(ids.has(r.parent_request_id!)).toBe(true);
      expect(r.attempt_no).toBeGreaterThan(1);
    }
  });
  it('Mock 최소 데이터 구성을 만족한다', () => {
    expect(ds.customers.length).toBeGreaterThanOrEqual(2);
    expect(ds.projects.filter((p) => p.kind === 'INTERNAL').length).toBeGreaterThanOrEqual(2);
    expect(ds.users.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ds.models.map((m) => m.provider)).size).toBeGreaterThanOrEqual(3);
    expect(ds.subscriptions.length).toBeGreaterThanOrEqual(2);
    for (const o of ['CUSTOMER_SERVICE', 'INTERNAL_DEVELOPMENT', 'SIMULATION', 'SYSTEM_TEST']) expect(ds.requests.some((r) => r.usage_origin === o)).toBe(true);
    for (const st of ['TESTING', 'ACTIVE', 'INACTIVE']) expect(ds.models.some((m) => m.status === st)).toBe(true);
    for (const st of ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILED']) expect(ds.simulations.some((s) => s.status === st)).toBe(true);
  });
  it('예산 상태: 정상·주의·초과·미설정이 모두 존재한다', () => {
    const month = todayKst().slice(0, 7);
    const states = new Set<string>();
    for (const p of ds.projects) {
      const b = ds.budgets.find((x) => x.owner_type === 'PROJECT' && x.owner_id === p.project_id && x.month === month) ?? null;
      const rows = ds.requests.filter((r) => r.usage_origin !== 'CUSTOMER_SERVICE' && r.project_id === p.project_id && toKstMonth(r.requested_at) === month);
      states.add(budgetStatus(b, summarize(rows)).state);
    }
    expect([...states].sort()).toEqual(['EXCEEDED', 'NORMAL', 'UNSET', 'WARNING']);
  });
});

describe('집계 함수', () => {
  it('예산 미설정은 pct null (0% 아님)', () => {
    const s = budgetStatus(null, { confirmedUsd: 10, estimatedUsd: 0, unknownCount: 0 });
    expect(s.state).toBe('UNSET');
    expect(s.pct).toBeNull();
  });
  it('추정 포함 기준을 표시한다', () => {
    const b = { budget_id: 'x', owner_type: 'PROJECT' as const, owner_id: 'p', month: '2026-10', amount_usd: 100, warning_pct: 80, created_at: '', updated_at: '' };
    expect(budgetStatus(b, { confirmedUsd: 70, estimatedUsd: 15, unknownCount: 1 })).toMatchObject({ state: 'WARNING', basis: 'INCLUDING_ESTIMATED', pct: 85 });
    expect(budgetStatus(b, { confirmedUsd: 70, estimatedUsd: 0, unknownCount: 0 })).toMatchObject({ state: 'NORMAL', basis: 'CONFIRMED', pct: 70 });
    expect(budgetStatus(b, { confirmedUsd: 120, estimatedUsd: 0, unknownCount: 0 }).state).toBe('EXCEEDED');
  });
  it('시뮬레이션 전체 상태 (DD-11)', () => {
    expect(computeSimulationStatus(['SUCCESS', 'SUCCESS'])).toBe('SUCCESS');
    expect(computeSimulationStatus(['SUCCESS', 'TIMEOUT'])).toBe('PARTIAL_SUCCESS');
    expect(computeSimulationStatus(['FAILED', 'TIMEOUT'])).toBe('FAILED');
    expect(computeSimulationStatus(['CANCELLED', 'CANCELLED'])).toBe('CANCELLED');
    expect(computeSimulationStatus(['SUCCESS', 'RUNNING'])).toBe('RUNNING');
  });
  it('시뮬레이션 비용 상태 (DD-12)', () => {
    const base = ds.requests.find((r) => r.simulation_id)!;
    const mk = (cost_status: 'CONFIRMED' | 'ESTIMATED' | 'UNKNOWN', status = 'SUCCESS' as const) => ({ ...base, cost_status, status });
    expect(simulationCostState([mk('CONFIRMED')])).toBe('CONFIRMED');
    expect(simulationCostState([mk('CONFIRMED'), mk('ESTIMATED')])).toBe('INCLUDES_ESTIMATED');
    expect(simulationCostState([mk('CONFIRMED'), mk('UNKNOWN')])).toBe('INCLUDES_UNKNOWN');
  });
  it('추정 비용 = Token × 단가 / 1M', () => {
    expect(estimateCost(1000, 500, { input_per_1m_usd: 2.5, output_per_1m_usd: 10 })).toBeCloseTo(0.0075, 6);
    expect(estimateCost(1000, 500, null)).toBeNull();
  });
});

describe('JSON / Schema 검증 분리', () => {
  const schema = JSON.stringify({ type: 'object', required: ['a', 'b'], properties: { a: { type: 'string' }, b: { type: 'number' } } });
  it('파싱 성공 + Schema 통과', () => expect(validateResponse('{"a":"x","b":1}', schema)).toMatchObject({ json: 'VALID', schema: 'PASS' }));
  it('파싱 성공 + 필수 필드 누락 → Schema 실패', () => expect(validateResponse('{"a":"x"}', schema)).toMatchObject({ json: 'VALID', schema: 'FAIL', missingFields: ['b'] }));
  it('파싱 실패', () => expect(validateResponse('{"a":', schema)).toMatchObject({ json: 'INVALID', schema: 'FAIL' }));
  it('Schema 미지정 → 미적용', () => expect(validateResponse('{"a":1}', null)).toMatchObject({ json: 'VALID', schema: 'NOT_APPLIED' }));
  it('응답 없음 → 미실행', () => expect(validateResponse(null, schema)).toMatchObject({ json: 'NOT_RUN', schema: 'NOT_RUN' }));
});
