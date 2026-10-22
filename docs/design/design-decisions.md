# 설계 결정 및 미확정 항목 목록

| ID | 구분 | 내용 | 결정/대체 동작 |
|---|---|---|---|
| DD-01 | [설계안] | 기본 조회 기간 최근 30일 | 모든 화면 기본값 30일, 프리셋 7/30/90 제공 |
| DD-02 | [설계안] | 예산 경고 기준 비율 "정책 확정 필요" | 예산별 `warningPct` 입력(기본 80%). 로그베이스 확정 시 기본값만 교체 |
| DD-03 | [설계안] | 예산 사용률 기준(확정 vs 추정 포함) | 추정이 존재하면 "추정 포함 기준"으로 계산하고 basis 레이블 표시. 확정 기준 값도 툴팁 제공 |
| DD-04 | [설계안] | P-05 독립 페이지 vs P-04 하위 | 독립 라우트 `/simulations`로 구현. P-04 결과 바에서 이력 링크, P-05에서 재실행 시 P-04로 설정 복원 이동 (탐색 편의) |
| DD-05 | [검증 필요] | OpenRouter 실제 응답 Provider·모델 제공 여부 | Mock은 actual_provider를 제공하되 일부 호출은 "미확인"으로 표시해 UI가 null을 처리함을 검증 |
| DD-06 | [검증 필요] | Provider 고정·Fallback 비활성화 동작 | Mock은 routing_policy를 기록하고, 고정 미지원 모델은 결과 카드에 "비교 조건 차이" 노트 표시 |
| DD-07 | [검증 필요] | JSON Schema 지원 여부(모델별) | 모델 capability `json`으로 구분. 미지원 모델은 실행 전 검증 경고(차단 아님), Schema 검증은 응답 후 클라이언트에서 수행 |
| DD-08 | [검증 필요] | 이미지 입력 병렬 실행 범위 | 이미지 미지원 모델 선택 시 실행 차단 + 사유. Mock은 이미지 지원 모델만 실행 |
| DD-09 | [검증 필요] | 실패·Timeout 호출 비용 대조 가능 여부 | TIMEOUT/FAILED 호출은 cost_status UNKNOWN 유지, 0 USD 표시 금지. "대조 전" 표시 |
| DD-10 | [검증 필요] | Reasoning·Cache Token 집계 | P0 UI는 input/output만 표시. 타입에 optional `reasoning_tokens`, `cached_tokens` 예약 |
| DD-11 | [설계안] | 시뮬레이션 전체 상태 계산 | 모델 종료 상태 확정 후 계산: 전부 SUCCESS→SUCCESS, 일부 SUCCESS→PARTIAL_SUCCESS, SUCCESS 없음 & 취소만 아님→FAILED, 취소로 종료·성공 없음→CANCELLED |
| DD-12 | [설계안] | 비용 확인 상태(시뮬레이션 단위) | 확정 / 추정 포함 / 미확인 포함 / 확인 중(RUNNING·PENDING 포함 시) |
| DD-13 | 문서 간 차이 | 02 v1.4 §4.5 "고객 수" KPI vs 03 설명서 요약 항목에 없음 | 상위 기준(v1.4) 채택: 고객 수 KPI 포함 |
| DD-14 | 문서 간 차이 | 기존 화면 자료는 녹색 브랜드, 프롬프트는 네이비/차콜 | 프롬프트 지시 우선: 딥 네이비 사이드바 + 블루 액션 컬러 |
| DD-15 | 범위 외 | 원화 환산(기존 화면 P-05 "약 1,720원" 표기) | P0 제외. 표시하지 않음 |
| DD-16 | 범위 외 | 품질 자동 평가·최적 모델 추천 | 구현하지 않음 |
| DD-17 | [설계안] | 작업 건수 집계 | distinct `task_id`. task_id 없는 호출은 작업 수에 포함하지 않고 "작업 미식별 N건" 캡션 |
| DD-18 | [설계안] | 성공률 분모 | 종료 호출(SUCCESS+FAILED+TIMEOUT). PENDING/RUNNING/CANCELLED 제외 |
| DD-19 | 미검증 | 실제 백엔드 API 없음 | `PatronApi` 인터페이스 + `MockPatronApi`(인메모리 + localStorage 영속). 실제 어댑터 교체 지점 명시 |
| DD-20 | [설계안] | 동일 Request ID 중복 전달 방지(T-05/T-10) | Mock 저장소에서 request_id 유일성 보장(중복 insert 무시) |
| DD-21 | [설계안] | 구독료 통화 | USD 고정(P0). 통화 필드는 표시만 |
| DD-22 | [설계안] | 모델 가격 단위 | OpenRouter 표기 관행에 따라 USD / 1M tokens로 표시, 기준 시각 함께 표시 |
| DD-23 | [설계안] | Figma 폰트 | Pretendard 미제공 → Noto Sans KR + JetBrains Mono. 코드는 Pretendard(CDN) |
| DD-24 | [설계안] | P-01 "고객별 사용 현황" 행 단위 | 고객×서비스 행(기존 화면 참고). 고객 합계는 고객 상세에서 확인 |
