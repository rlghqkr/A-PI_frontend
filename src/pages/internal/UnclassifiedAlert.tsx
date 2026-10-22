import { Button, InlineAlert } from '../../components/ui';
import { formatInt, formatUsd } from '../../domain/format';
import type { UsageSummary } from '../../domain/aggregate';
import type { DetailFocus } from './useInternalData';

export interface UnclassifiedAlertProps {
  user: UsageSummary;
  project: UsageSummary;
  onShow: (focus: DetailFocus) => void;
}

/** 구성원/프로젝트 미식별 호출 안내. "상세 보기" → 상세 테이블 필터 */
export function UnclassifiedAlert({ user, project, onShow }: UnclassifiedAlertProps) {
  if (user.calls === 0 && project.calls === 0) return null;
  return (
    <InlineAlert
      tone="warning"
      title="미분류 사용량이 있습니다"
      action={
        <div className="flex flex-wrap gap-1.5">
          {user.calls > 0 && (
            <Button size="sm" variant="secondary" onClick={() => onShow('user-unclassified')}>
              구성원 미식별 보기
            </Button>
          )}
          {project.calls > 0 && (
            <Button size="sm" variant="secondary" onClick={() => onShow('project-unclassified')}>
              프로젝트 미식별 보기
            </Button>
          )}
        </div>
      }
    >
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        <li>
          구성원 미식별 <strong className="tnum">{formatInt(user.calls)}건</strong> · {formatUsd(user.totalIncludingEstimatedUsd)}
          {user.estimatedUsd > 0 && ' (추정 포함)'}
          {user.unknownCount > 0 && ` · 미확인 ${formatInt(user.unknownCount)}건`} — 프로젝트 비용에는 포함되며 구성원별 표에서는 "미분류" 행으로 표시
        </li>
        <li>
          프로젝트 미식별 <strong className="tnum">{formatInt(project.calls)}건</strong> · {formatUsd(project.totalIncludingEstimatedUsd)}
          {project.estimatedUsd > 0 && ' (추정 포함)'}
          {project.unknownCount > 0 && ` · 미확인 ${formatInt(project.unknownCount)}건`} — 어떤 프로젝트 예산에도 귀속되지 않음
        </li>
      </ul>
    </InlineAlert>
  );
}
