/** 공통 포맷 유틸 — 금액·Token·비율·시각(KST). 컴포넌트 안에서 중복 구현하지 않는다. */

export const KST_TZ = 'Asia/Seoul';

const usd4 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const usd6 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
const usd2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat('ko-KR');

/** USD 금액. null 은 "미확인" — 절대 0으로 표시하지 않는다. */
export function formatUsd(value: number | null | undefined, opts?: { precision?: 2 | 4; withUnit?: boolean }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '미확인';
  const p = opts?.precision ?? (Math.abs(value) < 1 ? 4 : 2);
  // 0 이 아닌 극소 금액이 "$0.0000" 으로 보이지 않도록 자릿수를 늘린다 (미확인 ≠ 0 과 혼동 방지)
  const s = value !== 0 && Math.abs(value) < 0.0005 && !opts?.precision ? usd6.format(value) : (p === 4 ? usd4 : usd2).format(value);
  return opts?.withUnit === false ? s : `$${s}`;
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return int.format(value);
}

export function formatTokens(value: number | null | undefined): string {
  return formatInt(value);
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value.toFixed(digits)}%`;
}

export function formatMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

const dtFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KST_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const dFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: KST_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

function parts(d: Date, f: Intl.DateTimeFormat): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of f.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** UTC ISO → "YYYY-MM-DD HH:mm:ss" (KST) */
export function formatKst(iso: string | null | undefined, opts?: { seconds?: boolean }): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const p = parts(d, dtFmt);
  const base = `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  return opts?.seconds === false ? base : `${base}:${p.second}`;
}

/** UTC ISO → "YYYY-MM-DD" (KST) */
export function toKstDate(iso: string): string {
  const p = parts(new Date(iso), dFmt);
  return `${p.year}-${p.month}-${p.day}`;
}

/** UTC ISO → "YYYY-MM" (KST 월 경계) */
export function toKstMonth(iso: string): string {
  return toKstDate(iso).slice(0, 7);
}

/** KST 날짜 문자열(YYYY-MM-DD)의 00:00 KST 를 UTC ISO 로 */
export function kstDateStartIso(date: string): string {
  return new Date(`${date}T00:00:00+09:00`).toISOString();
}
export function kstDateEndIso(date: string): string {
  return new Date(`${date}T23:59:59.999+09:00`).toISOString();
}

/** ISO 주 시작(월요일) — KST 날짜 문자열 기준 */
export function kstWeekStart(date: string): string {
  const d = new Date(`${date}T00:00:00+09:00`);
  const day = (d.getUTCDay() + 6) % 7; // 월=0
  d.setUTCDate(d.getUTCDate() - day);
  return toKstDate(d.toISOString());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return toKstDate(d.toISOString());
}

export function todayKst(): string {
  return toKstDate(new Date().toISOString());
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function shortId(id: string, max = 18): string {
  if (id.length <= max) return id;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

/** 간단한 FNV-1a 해시 (입력 동일성 확인용 표시값) */
export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `h${h.toString(16).padStart(8, '0')}`;
}
