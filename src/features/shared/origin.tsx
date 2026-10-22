/**
 * usage_origin 공통 표시 헬퍼.
 * - `OriginBadge`: 출처 배지 (USAGE_ORIGIN 라벨/톤 사용)
 * - `INTERNAL_ORIGIN_OPTIONS`: P-02 전용 옵션 (CUSTOMER_SERVICE 제외)
 */
import { Badge } from '../../components/ui';
import type { SelectOption } from '../../components/ui';
import { USAGE_ORIGIN } from '../../domain/status';
import type { UsageOrigin } from '../../domain/types';

export const ALL_ORIGINS: UsageOrigin[] = ['CUSTOMER_SERVICE', 'INTERNAL_DEVELOPMENT', 'SIMULATION', 'SYSTEM_TEST'];

/** P-02(내부 예산)에서 집계 대상이 되는 출처 */
export const INTERNAL_ORIGINS: Exclude<UsageOrigin, 'CUSTOMER_SERVICE'>[] = ['INTERNAL_DEVELOPMENT', 'SIMULATION', 'SYSTEM_TEST'];

export const INTERNAL_ORIGIN_OPTIONS: SelectOption[] = INTERNAL_ORIGINS.map((o) => ({ value: o, label: USAGE_ORIGIN[o].label }));

export interface OriginBadgeProps {
  origin: UsageOrigin;
  /** true 면 짧은 라벨(고객/개발/시뮬/테스트) — 좁은 테이블 컬럼용 */
  short?: boolean;
  size?: 'sm' | 'md';
}

export function OriginBadge({ origin, short, size = 'sm' }: OriginBadgeProps) {
  const meta = USAGE_ORIGIN[origin];
  return (
    <Badge tone={meta.tone} size={size} title={meta.label}>
      {short ? meta.short : meta.label}
    </Badge>
  );
}
