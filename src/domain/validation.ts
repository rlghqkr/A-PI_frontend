/**
 * JSON 파싱 검증과 (최소) JSON Schema 검증.
 * JSON 파싱 성공 ≠ Schema 준수. 두 결과를 분리해 반환한다.
 */
import type { JsonCheck, SchemaCheck } from './types';

export interface ValidationOutcome {
  json: JsonCheck;
  schema: SchemaCheck;
  missingFields: string[];
  schemaErrors: string[];
}

interface MinimalSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, MinimalSchema>;
  items?: MinimalSchema;
  enum?: unknown[];
}

/** 마크다운 코드 펜스 안의 JSON 도 허용 (응답 원문은 보존하고 파싱만 관대하게) */
export function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : text).trim();
}

export function parseSchema(schemaText: string | null): { ok: true; schema: MinimalSchema | null } | { ok: false; error: string } {
  if (!schemaText || !schemaText.trim()) return { ok: true, schema: null };
  try {
    const parsed = JSON.parse(schemaText) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, error: 'Schema는 JSON 객체여야 합니다.' };
    return { ok: true, schema: parsed as MinimalSchema };
  } catch (e) {
    return { ok: false, error: `Schema JSON 파싱 실패: ${(e as Error).message}` };
  }
}

export function validateResponse(responseText: string | null, schemaText: string | null): ValidationOutcome {
  if (responseText === null) return { json: 'NOT_RUN', schema: 'NOT_RUN', missingFields: [], schemaErrors: [] };
  let value: unknown;
  try {
    value = JSON.parse(extractJson(responseText));
  } catch {
    const s = parseSchema(schemaText);
    return { json: 'INVALID', schema: s.ok && s.schema ? 'FAIL' : 'NOT_APPLIED', missingFields: [], schemaErrors: ['JSON 파싱 실패로 Schema 검증 불가'] };
  }
  const s = parseSchema(schemaText);
  if (!s.ok || !s.schema) return { json: 'VALID', schema: 'NOT_APPLIED', missingFields: [], schemaErrors: [] };
  const errors: string[] = [];
  const missing: string[] = [];
  check(value, s.schema, '$', errors, missing);
  return { json: 'VALID', schema: errors.length === 0 && missing.length === 0 ? 'PASS' : 'FAIL', missingFields: missing, schemaErrors: errors };
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function check(value: unknown, schema: MinimalSchema, path: string, errors: string[], missing: string[]) {
  if (schema.type) {
    const t = typeOf(value);
    const ok = schema.type === t || (schema.type === 'number' && t === 'integer');
    if (!ok) {
      errors.push(`${path}: 기대 타입 ${schema.type}, 실제 ${t}`);
      return;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: 허용 값 ${JSON.stringify(schema.enum)} 외의 값`);
  if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const req of schema.required ?? []) {
      if (!(req in obj)) missing.push(path === '$' ? req : `${path}.${req}`);
    }
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      if (k in obj) check(obj[k], sub, `${path}.${k}`, errors, missing);
    }
  }
  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    value.forEach((item, i) => check(item, schema.items as MinimalSchema, `${path}[${i}]`, errors, missing));
  }
}
