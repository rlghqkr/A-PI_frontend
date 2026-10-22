import { Play } from 'lucide-react';
import { useState } from 'react';
import { api, CURRENT_ADMIN, type ConnectionTestOutcome } from '../../api';
import { Button, DescriptionList, InlineAlert, Textarea, useToast } from '../../components/ui';
import { formatKst, formatMs, formatTokens } from '../../domain/format';
import { ERROR_TYPE } from '../../domain/status';
import type { ModelRegistry, ModelTestResult } from '../../domain/types';
import { useMutation } from '../../hooks/useAsync';
import { useReferenceData } from '../../hooks/useReferenceData';
import { CostCell, RequestIdCell } from '../../features/shared/cells';
import { TestResultBadge } from './cells';

export const DEFAULT_TEST_PROMPT = "연결 테스트입니다. 'OK'라고만 답하세요.";

export interface ConnectionTestPanelProps {
  model: ModelRegistry;
  onOpenRequest: (requestId: string) => void;
}

/** 연결 테스트 섹션: Prompt 입력 → 실행 → 결과 패널. 이력은 SYSTEM_TEST 로 기록된다. */
export function ConnectionTestPanel({ model, onOpenRequest }: ConnectionTestPanelProps) {
  const { refreshModels } = useReferenceData();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState(DEFAULT_TEST_PROMPT);
  const [outcome, setOutcome] = useState<ConnectionTestOutcome | null>(null);
  const test = useMutation((modelId: string, p: string, by: string) => api.runConnectionTest(modelId, p, by));

  const run = async () => {
    if (!prompt.trim()) return;
    const res = await test.run(model.model_id, prompt, CURRENT_ADMIN.user_id);
    if (!res) return;
    setOutcome(res);
    await refreshModels();
    const r = res.model.last_test?.result;
    toast({
      tone: r === 'SUCCESS' ? 'success' : r === 'TIMEOUT' ? 'warning' : 'danger',
      title: r === 'SUCCESS' ? '연결 테스트 성공' : r === 'TIMEOUT' ? '연결 테스트 Timeout' : '연결 테스트 실패',
      description: `${model.display_name} · Request ${res.request.request_id}`,
      actionLabel: '호출 상세 보기',
      onAction: () => onOpenRequest(res.request.request_id),
    });
  };

  const latest: ModelTestResult | null = outcome?.model.last_test ?? model.last_test;

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        label="테스트 Prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        showCount
        maxLength={2000}
        error={test.fieldErrors.prompt ?? (prompt.trim() ? undefined : 'Prompt 를 입력하세요.')}
        disabled={test.loading}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">실행 결과는 SYSTEM_TEST 이력으로 기록되며 P-02 내부 사용량에 집계됩니다.</p>
        <Button onClick={run} loading={test.loading} disabled={!prompt.trim()} disabledReason="Prompt 를 입력하세요" leftIcon={<Play />}>
          {test.loading ? '테스트 실행 중…' : '연결 테스트 실행'}
        </Button>
      </div>
      {test.loading && (
        <InlineAlert tone="info" title="테스트 실행 중…">
          {model.display_name} ({model.provider}) 에 요청을 보내고 응답을 기다리는 중입니다. Timeout 30초.
        </InlineAlert>
      )}
      {test.error && !test.loading && (
        <InlineAlert tone="danger" title="테스트 요청 실패">
          {test.error}
        </InlineAlert>
      )}

      {outcome ? (
        <ResultPanel outcome={outcome} />
      ) : latest ? (
        <LastResultPanel test={latest} />
      ) : (
        <InlineAlert tone="info" title="아직 연결 테스트를 실행하지 않았습니다">
          ACTIVE 로 전환하려면 연결 테스트에 성공해야 합니다.
        </InlineAlert>
      )}
    </div>
  );
}

function ResultPanel({ outcome }: { outcome: ConnectionTestOutcome }) {
  const { request, model } = outcome;
  const t = model.last_test;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-subtle p-3" role="status">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">이번 실행 결과</span>
        <TestResultBadge test={t} />
      </div>
      {request.error_type && (
        <InlineAlert tone={request.status === 'TIMEOUT' ? 'warning' : 'danger'} title={ERROR_TYPE[request.error_type]}>
          {request.error_message ?? '오류 메시지 없음'}
        </InlineAlert>
      )}
      <DescriptionList
        columns={2}
        items={[
          { label: '응답 시간', value: <span className="tnum">{formatMs(request.latency_ms)}</span> },
          { label: 'Input / Output Token', value: <span className="tnum">{formatTokens(request.input_tokens)} / {formatTokens(request.output_tokens)}</span> },
          { label: '비용', value: <CostCell cost_usd={request.cost_usd} cost_status={request.cost_status} /> },
          { label: '실제 Provider', value: request.actual_provider ?? <span className="text-ink-muted">미확인</span> },
          { label: '검증 시각', value: `${formatKst(request.requested_at)} KST` },
          { label: 'Request ID', value: <RequestIdCell id={request.request_id} short={false} /> },
        ]}
      />
      <p className="text-xs text-ink-muted">SYSTEM_TEST 이력으로 기록됨 · 비용은 API 응답 기준이며 응답에 비용이 없으면 "미확인"으로 남습니다.</p>
    </div>
  );
}

function LastResultPanel({ test }: { test: ModelTestResult }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">마지막 검증 결과</span>
        <TestResultBadge test={test} />
      </div>
      {test.error_type && (
        <InlineAlert tone={test.result === 'TIMEOUT' ? 'warning' : 'danger'} title={ERROR_TYPE[test.error_type]}>
          {test.error_message ?? '오류 메시지 없음'}
        </InlineAlert>
      )}
      <DescriptionList
        columns={2}
        items={[
          { label: '응답 시간', value: <span className="tnum">{formatMs(test.latency_ms)}</span> },
          { label: '마지막 검증 시각', value: `${formatKst(test.tested_at)} KST` },
          { label: 'Request ID', value: <RequestIdCell id={test.request_id} short={false} /> },
        ]}
      />
      <p className="text-xs text-ink-muted">Token·비용 등 상세는 Request ID 를 눌러 호출 상세에서 확인하세요. SYSTEM_TEST 이력으로 기록됨.</p>
    </div>
  );
}
