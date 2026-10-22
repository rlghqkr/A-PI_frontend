import type { Scenario } from '../domain/types';

export const PRODUCT_SCHEMA = JSON.stringify(
  {
    type: 'object',
    required: ['product_name', 'category', 'key_features', 'target_customer'],
    properties: {
      product_name: { type: 'string' },
      category: { type: 'string' },
      key_features: { type: 'array', items: { type: 'string' } },
      target_customer: { type: 'string' },
      price_range: { type: 'string' },
    },
  },
  null,
  2,
);

export const SUMMARY_SCHEMA = JSON.stringify(
  {
    type: 'object',
    required: ['title', 'summary', 'key_points'],
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      key_points: { type: 'array', items: { type: 'string' } },
      sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    },
  },
  null,
  2,
);

/** 화면설계 기준서 v1.4 §7.4 테스트 시나리오 5종 */
export const SCENARIOS: Scenario[] = [
  {
    scenario_id: 'SC-01',
    name: '상품 이미지·속성 분석',
    description: '상품 이미지를 분석해 카테고리·핵심 속성·소재를 구조화한다. 이미지 입력 지원 모델만 실행 가능.',
    prompt_template:
      '당신은 커머스 상품 분석가입니다. 첨부된 상품 이미지와 입력 정보를 바탕으로 상품의 카테고리, 핵심 속성(색상·소재·형태), 타깃 고객을 JSON으로 정리하세요. 추측한 항목은 confidence를 낮게 표기하세요.',
    input_hint: '상품명, 브랜드, 간단한 설명을 입력하고 이미지를 첨부하세요.',
    requires_image: true,
    default_json: true,
    default_schema: PRODUCT_SCHEMA,
  },
  {
    scenario_id: 'SC-02',
    name: '상품 설명·마케팅 문구 생성',
    description: '상품 정보로 PDP용 상품 설명과 마케팅 카피를 생성한다.',
    prompt_template:
      '아래 상품 정보를 바탕으로 온라인 상품 상세페이지(PDP)에 들어갈 상품 설명 2문단과 20자 이내의 마케팅 헤드라인 3개를 한국어로 작성하세요. 과장 표현과 근거 없는 효능 주장은 피하세요.',
    input_hint: '상품명, 소재, 사이즈, 주요 특징, 가격대를 입력하세요.',
    requires_image: false,
    default_json: false,
    default_schema: null,
  },
  {
    scenario_id: 'SC-03',
    name: '데이터 요약·구조화',
    description: '긴 텍스트(리뷰·문서)를 요약하고 핵심 포인트를 구조화한다.',
    prompt_template:
      '다음 텍스트를 3문장 이내로 요약하고, 핵심 포인트 3~5개와 전반적인 감성(positive/neutral/negative)을 JSON으로 반환하세요.',
    input_hint: '요약할 리뷰, 문서, 회의록 등을 입력하세요.',
    requires_image: false,
    default_json: true,
    default_schema: SUMMARY_SCHEMA,
  },
  {
    scenario_id: 'SC-04',
    name: '비정형 텍스트 → JSON 변환',
    description: '자유 형식 텍스트에서 지정 Schema에 맞는 JSON을 추출한다. Schema 검증 테스트에 적합.',
    prompt_template:
      '아래 비정형 텍스트에서 상품 정보를 추출하여 지정된 JSON Schema를 정확히 준수하는 JSON만 출력하세요. 설명 문장이나 마크다운 코드 블록을 포함하지 마세요.',
    input_hint: '상품 소개 메일, 카탈로그 문장 등 비정형 텍스트를 입력하세요.',
    requires_image: false,
    default_json: true,
    default_schema: PRODUCT_SCHEMA,
  },
  {
    scenario_id: 'SC-05',
    name: '일반 분석·추론',
    description: '주어진 정보로 분석과 근거 있는 추론을 수행한다.',
    prompt_template:
      '아래 상황을 분석하고, 가능한 원인 3가지와 각 원인의 검증 방법을 근거와 함께 제시하세요. 확실하지 않은 부분은 명확히 표시하세요.',
    input_hint: '분석할 상황, 데이터, 질문을 입력하세요.',
    requires_image: false,
    default_json: false,
    default_schema: null,
  },
];

export function findScenario(id: string | null): Scenario | undefined {
  return id ? SCENARIOS.find((s) => s.scenario_id === id) : undefined;
}
