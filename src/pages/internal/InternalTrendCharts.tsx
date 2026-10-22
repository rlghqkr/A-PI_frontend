import { DailyCostStackChart, MonthlyCostChart } from '../../components/charts';
import { SectionCard, Skeleton } from '../../components/ui';
import type { Granularity } from '../../domain/types';
import type { InternalDerived } from './useInternalData';

const UNIT_LABEL: Record<Granularity, string> = { day: '일', week: '주', month: '월' };

export function InternalTrendCharts({ derived, granularity, loading }: { derived: InternalDerived | null; granularity: Granularity; loading: boolean }) {
  if (loading && !derived) {
    return (
      <div className="grid gap-5 xl:grid-cols-2" role="status" aria-busy="true" aria-label="추이 차트 불러오는 중">
        <Skeleton className="h-[340px]" />
        <Skeleton className="h-[340px]" />
      </div>
    );
  }
  if (!derived) return null;
  // 집계 단위가 월이면 구독료를 같은 차트에 별도(비스택) 시리즈로 표시 (spec P-02 item 4)
  const subByMonth = new Map(derived.monthly.map((m) => [m.month, m.subscriptionUsd]));
  const points = derived.trendPoints.map((p) => ({
    label: p.label,
    confirmedUsd: p.confirmedUsd,
    estimatedUsd: p.estimatedUsd,
    ...(granularity === 'month' ? { subscriptionUsd: subByMonth.get(p.key) ?? 0 } : {}),
  }));
  const hasApi = derived.trendPoints.some((p) => p.calls > 0);
  const hasMonthly = derived.monthly.some((m) => m.apiUsd > 0 || m.subscriptionUsd > 0);
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard
        title="API 비용 추이"
        description={`집계 단위 ${UNIT_LABEL[granularity]} · 확정/추정 스택${granularity === 'month' ? ' · 구독료는 별도 시리즈(적용 월 기준)' : ''} · 비용 미확인 ${derived.summary.unknownCount}건은 금액에 포함되지 않음`}
      >
        <DailyCostStackChart data={hasApi ? points : []} title={granularity === 'month' ? 'API 비용 (확정 / 추정) · 구독료' : 'API 비용 (확정 / 추정)'} unitLabel={UNIT_LABEL[granularity]} withSubscription={granularity === 'month'} />
      </SectionCard>
      <SectionCard title="월별 API 비용 · 구독료" description="구독료는 적용 월 기준, 일별 배분 없음">
        <MonthlyCostChart data={hasMonthly ? derived.monthly : []} />
      </SectionCard>
    </div>
  );
}
