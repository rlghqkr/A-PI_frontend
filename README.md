# LOGBASE Patron — Super Admin Console (Frontend PoC)

AI 사용량·비용 통제, 모델 등록·검증, Multi-LLM 비교 실험을 하나로 묶은 관리자 콘솔의 프론트엔드입니다.
기준 문서: `docs/01-*.pdf`(기능 요구사항·공통 데이터 계약 v1.2), `docs/02-*.pdf`(화면설계 기준서 v1.4), `docs/03-*.pdf`(화면설계 설명), `docs/LOGBASE Patron 화면.pdf`.

## 실행

```bash
pnpm install
pnpm dev          # http://localhost:5180 (점유 시 자동으로 다음 포트, 터미널 표시 주소 사용)
pnpm build        # tsc -b && vite build
pnpm lint         # oxlint
pnpm exec vitest run
```

Node 22 / pnpm 11 기준. 백엔드 없이 **Mock Adapter** 로 동작합니다 (아래 참고).

## 화면

| 라우트 | 화면 | 비고 |
|---|---|---|
| `/customers`, `/customers/:customerId` | P-01 고객 AI 사용 현황 | CUSTOMER_SERVICE 호출만 집계, 고객 예산 등록·수정 |
| `/internal`, `/internal/projects/:projectId` | P-02 내부 AI 예산 관리 | INTERNAL_DEVELOPMENT·SIMULATION·SYSTEM_TEST 출처 구분, 구독료·월 예산 관리, 미분류 표시 |
| `/models` | P-03 AI 모델 관리 | OpenRouter 카탈로그 검색·등록(TESTING)·수정·연결 테스트·ACTIVE/INACTIVE |
| `/simulator` | P-04 Multi-LLM Simulator | ACTIVE 모델 2~4개 병렬 실행, JSON/Schema 검증, 자동 저장, `?from=SIM-ID` 재실행 복원 |
| `/simulations`, `/simulations/:simulationId` | P-05 시뮬레이션 결과 이력 | 검색·정렬·페이지네이션, 상세, 재실행(비활성 모델 교체·제외) |
| 전역 `?request=REQ-ID` | F-05 공통 호출 상세 Drawer | 모든 Request ID 에서 동일 패널 |

## 구조

```
src/
  domain/      types.ts(논리 데이터 계약) · aggregate.ts(집계 규칙 단일 구현) · format.ts(USD·Token·KST) · status.ts(상태→레이블/톤) · validation.ts(JSON/Schema)
  api/         PatronApi.ts(인터페이스) · mock/MockPatronApi.ts(Mock Adapter) · index.ts(교체 지점)
  mock/        seed.ts(결정적 Seed 데이터셋) · scenarios.ts · responses.ts
  components/  ui/(공통 UI 키트) · charts/ · layout/AppShell.tsx
  features/    request-detail/(F-05) · shared/(공통 셀) · simulation/(P-04·P-05 공용 결과 컴포넌트)
  pages/       customers/ internal/ models/ simulator/ simulations/
docs/design/   design-spec.md(UI/UX 설계 명세) · design-decisions.md(미확정·설계 결정 목록)
```

## 데이터 정책 (코드에서 강제)

- 비용 미확인(UNKNOWN)은 `cost_usd: null` 로 유지하고 "미확인"으로 표시합니다. 0 USD 로 표시하지 않습니다.
- 실행 상태(`status`)와 비용 상태(`cost_status`)는 별도 필드·배지입니다.
- 확정+추정 합계는 항상 "추정 포함"을 명시하고, 미확인은 건수로만 표시합니다.
- 예산 미설정은 "미설정"(사용률 null)이며 0% 가 아닙니다. 사용률 산정 기준(확정/추정 포함)을 함께 표시합니다.
- 요약 KPI 와 상세 테이블은 같은 필터링 배열(`summarize(rows)` + `rows`)을 사용해 합계가 일치합니다.
- 구독료는 `SubscriptionCost` 로만 집계하고 구성원에게 배분하지 않습니다.
- 재시도는 새 Request ID + `parent_request_id`, 재실행은 새 Simulation ID 이며 과거 기록을 수정하지 않습니다.
- 저장 시각 UTC, 표시 KST. API Key 원문은 어디에도 없습니다(표시명만).

단위 테스트(`src/domain/aggregate.test.ts`)가 Seed 데이터에 대해 위 불변조건을 검증합니다.

## Mock Adapter 와 실제 API 연동

`src/api/index.ts` 의 `api` 가 유일한 교체 지점입니다. `PatronApi` 인터페이스를 구현한 HTTP 어댑터로 바꾸면 UI 변경 없이 연동됩니다.
Mock 은 인메모리 + `localStorage`(당일 스냅샷) 로 등록·수정·실행 결과를 보존하며, 사이드바 하단 "Mock 환경 설정"에서 **다음 조회 1회 실패**(오류 상태 검증)와 **Seed 초기화**가 가능합니다.

실제 연동 시 확인이 필요한 항목은 `docs/design/design-decisions.md` 의 `[검증 필요]` 행(DD-05~DD-10)과 요구사항 문서 §8 OpenRouter 사전 검증 항목을 따릅니다.

## 디자인

Figma 파일 "Patron — Complete Admin Console" 단일 페이지에 토큰·컴포넌트, P-01~P-05, 상세 패널·모달, 상태 매트릭스, 반응형(1024/390) 프레임이 정리되어 있습니다. 코드의 디자인 토큰은 `src/index.css` 의 `@theme` 블록과 일치합니다.
