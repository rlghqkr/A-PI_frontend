import { KpiCard, Skeleton } from '../../components/ui';
import { formatInt, formatUsd } from '../../domain/format';
import type { InternalDerived } from './useInternalData';

export interface InternalKpisProps {
  derived: InternalDerived | null;
  loading: boolean;
  onUnknownClick?: () => void;
  onUnclassifiedClick?: () => void;
  /** 프로젝트 상세에서는 미분류 KPI 대신 호출 수 표시 */
  projectMode?: boolean;
}

export function InternalKpis({ derived, loading, onUnknownClick, onUnclassifiedClick, projectMode }: InternalKpisProps) {
  if (loading && !derived) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6" aria-busy="true" aria-label="요약 지표 불러오는 중">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
    );
  }
  if (!derived) return null;
  const { summary: s, subscriptionApplicable, subscriptionUsd, subscriptionMonths, totalManagedUsd, unclassifiedUser, unclassifiedProject } = derived;
  const includesEstimated = s.estimatedUsd > 0;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard label="API 확정 비용" value={formatUsd(s.confirmedUsd)} tone="success" sub={`확정 ${formatInt(derived.confirmedCount)}건`} hint="API 응답·대조로 금액이 확정된 호출의 합계" />
      <KpiCard label="API 추정 비용" value={formatUsd(s.estimatedUsd)} tone="estimated" sub={`추정 ${formatInt(derived.estimatedCount)}건 (Token×단가)`} hint="확정되지 않아 Token×단가로 추정한 비용. 확정 비용과 합산 시 '추정 포함' 표기" />
      <KpiCard
        label="월 구독료"
        value={subscriptionApplicable ? formatUsd(subscriptionUsd) : <span className="text-base font-semibold text-ink-muted">해당 없음</span>}
        sub={subscriptionApplicable ? `적용 월 ${subscriptionMonths.length}개: ${subscriptionMonths.join(', ')}` : '구성원·모델·출처 필터에는 적용되지 않음'}
        hint="SubscriptionCost 의 적용 월 기준 합계(ACTIVE). API 비용과 별도이며 구성원·모델·출처에 배분하지 않음"
      />
      <KpiCard
        label={
          <span>
            총 관리 비용 {includesEstimated && <span className="font-normal text-estimated">(추정 포함)</span>}
          </span>
        }
        value={formatUsd(totalManagedUsd)}
        sub={
          !subscriptionApplicable
            ? `API 확정 + 추정 (구독료 제외)${s.unknownCount > 0 ? ` · 미확인 ${formatInt(s.unknownCount)}건 미반영` : ''}`
            : s.unknownCount > 0
              ? `비용 미확인 ${formatInt(s.unknownCount)}건은 반영되지 않음`
              : 'API 확정 + 추정 + 구독료'
        }
        hint="API 확정 비용 + API 추정 비용 + 월 구독료. 비용 미확인 호출은 합계에서 제외. 구성원·모델·출처 필터 시 구독료는 제외"
      />
      <KpiCard
        label="비용 미확인 호출"
        value={`${formatInt(s.unknownCount)}건`}
        tone={s.unknownCount > 0 ? 'warning' : undefined}
        sub={s.unknownCount > 0 ? '클릭 시 상세 이력에 미확인 필터 적용' : '모든 호출 비용 확인됨'}
        onClick={s.unknownCount > 0 ? onUnknownClick : undefined}
        hint="실패·Timeout 등으로 비용을 확인하지 못한 호출. 금액은 0이 아닌 '미확인'"
      />
      {projectMode ? (
        <KpiCard label="API 호출" value={`${formatInt(s.calls)}건`} sub={`성공 ${formatInt(s.success)} · 실패 ${formatInt(s.failed)} · Timeout ${formatInt(s.timeout)}`} />
      ) : (
        <KpiCard
          label="미분류 사용량"
          value={`${formatInt(unclassifiedUser.calls + unclassifiedProject.calls)}건`}
          tone={unclassifiedUser.calls + unclassifiedProject.calls > 0 ? 'warning' : undefined}
          sub={`구성원 미식별 ${formatInt(unclassifiedUser.calls)}건 ${formatUsd(unclassifiedUser.totalIncludingEstimatedUsd)} · 프로젝트 미식별 ${formatInt(unclassifiedProject.calls)}건 ${formatUsd(unclassifiedProject.totalIncludingEstimatedUsd)}`}
          onClick={unclassifiedUser.calls + unclassifiedProject.calls > 0 ? onUnclassifiedClick : undefined}
          hint="user_id 또는 project_id 가 없는 호출. 금액은 확정+추정(추정 포함), 미확인 제외"
        />
      )}
    </div>
  );
}
