/**
 * Mock 모델 응답 생성기. 시나리오별 그럴듯한 응답 원문을 결정적으로 생성한다.
 * 실제 LLM 호출이 아니며, 품질 평가·추천 기능은 없다.
 */
import type { Rng } from './rng';

export type ResponseKind = 'ok' | 'json_ok' | 'json_missing_field' | 'json_invalid';

const HEADLINES = [
  '하루의 시작을 바꾸는 선택',
  '가볍게, 더 오래 입다',
  '당신의 책상을 완성하는 한 조각',
  '소재부터 다른 데일리 아이템',
  '매일 쓰는 것이니까, 더 꼼꼼하게',
  '기본에 충실한 디자인',
];

export function marketingCopy(input: string, rng: Rng, modelFlavor: string): string {
  const name = firstLine(input) || '이 상품';
  const h = [rng.pick(HEADLINES), rng.pick(HEADLINES), rng.pick(HEADLINES)];
  return [
    `${name}은(는) 일상에서 자주 손이 가는 기본 아이템입니다. 입력하신 소재와 구성 정보를 바탕으로 보면, 가벼운 무게와 관리가 쉬운 소재가 가장 큰 장점입니다. 실제 사용 환경에서 부담 없이 반복 사용할 수 있도록 마감과 내구성을 고려해 설계되었습니다.`,
    ``,
    `사이즈와 색상 선택지가 있어 사용 목적에 맞게 고를 수 있으며, 별도의 복잡한 관리 없이 세척과 보관이 간편합니다. 선물용으로도 무난하게 어울리는 구성입니다. (${modelFlavor})`,
    ``,
    `헤드라인 제안`,
    `1. ${h[0]}`,
    `2. ${h[1]}`,
    `3. ${h[2]}`,
  ].join('\n');
}

export function analysisText(input: string, rng: Rng, modelFlavor: string): string {
  const topic = firstLine(input) || '제시된 상황';
  const n = rng.int(3, 4);
  const causes = [
    ['수요 변화', '동일 기간의 유입 채널별 트래픽과 전환율을 비교해 채널 단위 변동을 확인합니다.'],
    ['가격·프로모션 요인', '프로모션 적용 전후의 객단가와 장바구니 이탈률을 비교합니다.'],
    ['재고·배송 이슈', '품절 SKU 비율과 배송 지연 건수를 주간 단위로 집계해 상관을 확인합니다.'],
    ['외부 요인', '경쟁사 이벤트 일정과 검색량 추이를 대조합니다.'],
  ];
  const lines = [`${topic}에 대한 분석입니다. 확실하지 않은 부분은 [가정]으로 표시했습니다.`, ''];
  for (let i = 0; i < n; i++) {
    lines.push(`${i + 1}. ${causes[i][0]}`);
    lines.push(`   - 근거: 입력 정보에서 관련 지표의 변동이 관찰됨 [가정]`);
    lines.push(`   - 검증 방법: ${causes[i][1]}`);
  }
  lines.push('', `추가로 필요한 데이터: 일자별 세션 수, SKU별 재고, 프로모션 캘린더. (${modelFlavor})`);
  return lines.join('\n');
}

export function productJson(input: string, kind: ResponseKind, rng: Rng): string {
  const name = firstLine(input) || '샘플 상품';
  const obj: Record<string, unknown> = {
    product_name: name,
    category: rng.pick(['의류/상의', '주방용품', '가전/소형', '문구/오피스', '생활/욕실']),
    key_features: [rng.pick(['가벼운 무게', '통기성 소재', '간편 세척']), rng.pick(['내구성 마감', '컴팩트 수납', '다양한 색상'])],
    target_customer: rng.pick(['20~30대 1인 가구', '실용성을 중시하는 직장인', '선물을 찾는 고객']),
    price_range: rng.pick(['1~3만원', '3~5만원', '5~10만원']),
  };
  if (kind === 'json_missing_field') {
    delete obj.target_customer;
    delete obj.key_features;
  }
  const text = JSON.stringify(obj, null, 2);
  if (kind === 'json_invalid') return '```json\n' + text.slice(0, Math.floor(text.length * 0.7)) + '\n…(응답이 max_tokens 에 도달하여 잘림)';
  return text;
}

export function summaryJson(input: string, kind: ResponseKind, rng: Rng): string {
  const obj: Record<string, unknown> = {
    title: (firstLine(input) || '텍스트 요약').slice(0, 40),
    summary: '입력된 텍스트는 제품 사용 경험과 배송·포장 상태에 대한 의견을 담고 있습니다. 전반적으로 품질에 만족하지만 배송 지연을 지적합니다. 재구매 의사는 조건부로 긍정적입니다.',
    key_points: ['품질 만족', '배송 지연 불만', '포장 상태 양호', '재구매 의사 조건부'].slice(0, rng.int(3, 4)),
    sentiment: rng.pick(['positive', 'neutral']),
  };
  if (kind === 'json_missing_field') delete obj.key_points;
  const text = JSON.stringify(obj, null, 2);
  if (kind === 'json_invalid') return text.slice(0, Math.floor(text.length * 0.6));
  return text;
}

export function imageAnalysisJson(input: string, kind: ResponseKind, rng: Rng): string {
  const obj: Record<string, unknown> = {
    product_name: firstLine(input) || '이미지 상품',
    category: rng.pick(['의류/아우터', '신발', '가방/잡화']),
    key_features: [rng.pick(['네이비 컬러', '베이지 컬러', '블랙 컬러']), rng.pick(['면 혼방 소재 (confidence 0.6)', '가죽 질감 (confidence 0.7)']), '심플한 실루엣'],
    target_customer: '캐주얼 데일리룩을 찾는 20~30대',
    price_range: '5~10만원 (confidence 0.4)',
  };
  if (kind === 'json_missing_field') delete obj.category;
  const text = JSON.stringify(obj, null, 2);
  if (kind === 'json_invalid') return text.slice(0, Math.floor(text.length * 0.5));
  return text;
}

export function buildResponse(scenarioId: string | null, jsonMode: boolean, input: string, kind: ResponseKind, rng: Rng, modelFlavor: string): string {
  switch (scenarioId) {
    case 'SC-01':
      return imageAnalysisJson(input, kind, rng);
    case 'SC-02':
      return marketingCopy(input, rng, modelFlavor);
    case 'SC-03':
      return summaryJson(input, kind, rng);
    case 'SC-04':
      return productJson(input, kind, rng);
    case 'SC-05':
      return analysisText(input, rng, modelFlavor);
    default:
      return jsonMode ? productJson(input, kind, rng) : analysisText(input, rng, modelFlavor);
  }
}

function firstLine(s: string): string {
  return (s ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? '';
}

/** 긴 응답 생성 (전체 응답 보기 검증용) */
export function longText(base: string, repeat: number): string {
  const out: string[] = [base];
  for (let i = 1; i < repeat; i++) out.push(`\n--- 추가 상세 ${i} ---\n${base}`);
  return out.join('\n');
}
