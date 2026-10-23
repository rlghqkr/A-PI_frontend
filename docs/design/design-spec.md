# Patron (Super Admin) — UI/UX 설계 명세 v1.0

문서 기준: 01 요구사항·데이터 계약 v1.2 (기능/정책) > 02 화면설계 기준서 v1.4 (화면별 행동·완료조건) > 03 화면설계 설명 (동작·흐름) > LOGBASE Patron 화면 (배치 참고).
정책 표기 `[확정]` `[설계안]` `[검증 필요]`는 원문 그대로 유지한다. 미확정 항목은 `design-decisions.md`에 기록한다.

## 0. 제품 포지셔닝
Patron은 "AI 비용·사용량 통제 + 모델 등록·검증 + 다중 LLM 실험·추적"을 하나로 묶은 **AI 운영 관리 콘솔**이다. 정보 밀도, 시각적 계층, 탐색 속도, 데이터 신뢰성을 장식보다 우선한다.

## 1. 디자인 시스템

### 1.1 Color tokens (light)
| Token | Hex | 용도 |
|---|---|---|
| `bg.canvas` | #F4F6F9 | 앱 배경 |
| `bg.surface` | #FFFFFF | 카드·테이블·패널 |
| `bg.subtle` | #F8FAFC | 테이블 헤더, 섹션 배경 |
| `bg.sidebar` | #0B1F3A | 사이드바 (딥 네이비) |
| `bg.sidebarActive` | #163A68 | 사이드바 선택 항목 |
| `border.default` | #E2E8F0 | 기본 보더 |
| `border.strong` | #CBD5E1 | 입력 포커스 전 보더 |
| `text.primary` | #0F172A | 본문 |
| `text.secondary` | #475569 | 보조 텍스트 |
| `text.muted` | #94A3B8 | 플레이스홀더·캡션 |
| `text.inverse` | #FFFFFF | 사이드바·프라이머리 버튼 |
| `brand.primary` | #1D4ED8 | 주요 행동 버튼, 링크, 선택 상태 |
| `brand.primaryHover` | #1E40AF | |
| `brand.soft` | #DBEAFE | 선택 배경 |
| `status.success` | #15803D / bg #DCFCE7 | SUCCESS, 정상, 확정 비용 |
| `status.warning` | #B45309 / bg #FEF3C7 | 경고, 비용 미확인(UNKNOWN), TIMEOUT |
| `status.danger` | #B91C1C / bg #FEE2E2 | FAILED, 예산 초과 |
| `status.info` | #1D4ED8 / bg #DBEAFE | RUNNING, 안내 |
| `status.estimated` | #6D28D9 / bg #EDE9FE | 추정 비용(ESTIMATED) |
| `status.neutral` | #475569 / bg #F1F5F9 | PENDING, CANCELLED, 미설정, INACTIVE |
| `chart.1..5` | #1D4ED8, #0EA5E9, #7C3AED, #16A34A, #F59E0B | 차트 시리즈 |

상태는 색상만으로 구분하지 않는다. 모든 배지는 텍스트 레이블을 포함한다.

### 1.2 Typography
- 코드: `Pretendard Variable` → `Pretendard` → `Noto Sans KR` → `Inter` → system-ui. 숫자는 `font-variant-numeric: tabular-nums`.
- Figma: `Noto Sans KR` (Regular/Medium/Bold), ID·코드는 `JetBrains Mono`.
- Scale: display 24/32 Bold, h1 20/28 Bold, h2 16/24 Semibold(Medium in Figma), body 14/20, small 13/18, caption 12/16, mono 12/16.

### 1.3 Spacing / Radius / Shadow
- Spacing 4px base: 4, 8, 12, 16, 20, 24, 32.
- Radius: sm 6, md 8, lg 12, pill 999.
- Shadow: `sm` 0 1px 2px rgba(15,23,42,.06); `md` 0 4px 12px rgba(15,23,42,.08) (drawer/modal).
- 그라디언트·유리 효과·장식 애니메이션 금지. 아이콘은 Lucide 단일 라이브러리.

### 1.4 공통 컴포넌트 (코드 `src/components/ui`)
Button(primary/secondary/ghost/danger, sm/md, loading, disabled+reason tooltip), IconButton, Input, Select, DateRangePicker(시작·종료 + 프리셋 7/30/90일), Textarea, NumberInput, Badge(status 변형), KpiCard(label, value, unit, sub, tone, tooltip), DataTable(컬럼 정렬 ▲▼, 숫자 우측정렬, sticky header, empty/loading/error 슬롯, 페이지네이션, 전체보기 토글), Pagination, Tabs, Drawer(우측 480/640), Modal, ConfirmDialog, Toast, InlineAlert(info/warning/danger/success), Skeleton, EmptyState(제목·설명·행동), ErrorState(재시도), CopyableId(긴 ID 복사), Tooltip, SectionCard(title, description, actions).

### 1.5 공통 레이아웃
- 좌측 고정 사이드바 240px (좁은 화면 64px 아이콘 모드, <1024px): Patron 로고, 5개 메뉴(P-01~P-05), 현재 선택 하이라이트, 하단 Mock 환경 배지.
- 상단 헤더 56px: 화면 제목, Breadcrumb, "조회 기준 KST · 데이터 갱신 시각", 관리자 아바타.
- 메인: 필터 바 → KPI 행 → 분석(차트/표) → 상세 테이블. 패딩 24. 최소 폭 320에서 세로 스택, 테이블 가로 스크롤.
- 상세: 우측 Drawer(공통 호출 상세, 예산 편집, 구독료 편집, 모델 상세). Modal: 확인 단계(비활성화, 재실행), 전체 응답 보기.

## 2. 데이터 모델 (프론트 타입, `src/domain/types.ts`)
논리 계약 기준. 실제 DB 컬럼 확정으로 주장하지 않는다.
- Enums: `UsageOrigin` CUSTOMER_SERVICE|INTERNAL_DEVELOPMENT|SIMULATION|SYSTEM_TEST, `OwnerType` CUSTOMER|INTERNAL|POC, `ExecStatus` PENDING|RUNNING|SUCCESS|FAILED|TIMEOUT|CANCELLED, `SimulationStatus` + PARTIAL_SUCCESS, `ErrorType` 8종, `CostStatus` CONFIRMED|ESTIMATED|UNKNOWN, `CostSource` API_RESPONSE|ESTIMATED_CALC|RECONCILED|NONE, `ModelStatus` TESTING|ACTIVE|INACTIVE, `BudgetState` NORMAL|WARNING|EXCEEDED|UNSET, `JsonCheck` VALID|INVALID|NOT_RUN, `SchemaCheck` PASS|FAIL|NOT_APPLIED|NOT_RUN.
- Entities: Customer, Project(kind INTERNAL|POC|TEST), User, Service, APIKeyMapping(원문 없음), ModelRegistry, OpenRouterCatalogModel, AIRequest(계약 A/B/C 필드 전부), SimulationRun, SimulationResult, Budget(ownerType CUSTOMER|PROJECT, month, amountUsd, warningPct), SubscriptionCost, Scenario.
- 시각: 저장 ISO UTC, 표시 KST (`Asia/Seoul`). 월 경계 KST.

## 3. 집계 규칙 (`src/domain/aggregate.ts`, 단일 구현)
- `summarize(requests)`: calls, tasks(= distinct task_id, task_id 없는 호출은 호출 자체를 1 작업으로 세지 않고 "작업 미식별"로 별도 카운트), success/failed/timeout/cancelled/pending/running, successRate = success ÷ 종료 호출(SUCCESS+FAILED+TIMEOUT), inputTokens, outputTokens, confirmedUsd, estimatedUsd, unknownCount.
- 비용 합계에서 UNKNOWN은 금액 합산 제외, 건수만 표시. 확정+추정 합계는 반드시 "추정 포함" 레이블.
- `budgetStatus(amountUsd|null, confirmedUsd, estimatedUsd, warningPct)`: amount null → UNSET. 사용률 기준은 **추정 포함**으로 계산하되 basis 레이블을 함께 반환 (`확정 기준` vs `추정 포함 기준`); 추정이 0이면 확정 기준.
- P-01 = usage_origin CUSTOMER_SERVICE만. P-02 = INTERNAL_DEVELOPMENT, SIMULATION, SYSTEM_TEST (출처별 구분 집계).
- 구성원 미식별(user_id null) 호출은 프로젝트 비용에는 포함, 구성원별에서는 "미분류" 행. 프로젝트 미식별(project_id null)은 "미분류(프로젝트)" 행으로만 표시하고 어떤 프로젝트에도 귀속하지 않음.
- 구독료는 SubscriptionCost에서만 집계, 적용 월 기준. 프로젝트 귀속이 null이면 "미배분". 구독료는 일별 추이에 배분하지 않고 월별 별도 표시.
- 총 관리 비용 = 확정 API + 추정 API + 구독료, "추정 포함" 표기 + 미확인 건수 안내.
- 동일 필터에서 요약 = 상세 합계: 요약과 상세 테이블은 같은 필터링된 배열을 입력으로 사용.

## 4. 화면별 정보 구조

### P-01 고객 AI 사용 현황 (`/customers`, 상세 `/customers/:customerId`)
1. 헤더: 제목, "원가 조회 화면(청구액 아님)" 안내 캡션, 조회 기준.
2. 필터 바: 고객(전체/개별), 서비스, 모델, 기간(시작·종료+프리셋), 집계 단위(일/주/월), [조회] 버튼. 조회 전 변경은 "적용 대기" 상태 표시. URL query로 유지.
3. KPI 행(9): 고객 수, 작업 건수, API 호출 수, 성공률(성공/실패/Timeout 건수 sub), Input Token, Output Token, 확정 API 비용, 추정 API 비용(미확인 N건 제외 sub), 비용 미확인 건수(독립 카드 · 경고 톤 · 클릭 시 상세 API 호출 이력을 미확인만 필터하고 해당 섹션으로 스크롤, 재클릭 시 해제). 2xl 이상 9열, 그 미만 5열 줄바꿈.
4. 추이 차트: 집계 단위별 작업 건수(좌축 막대) + 확정/추정 비용(우축 선). 제목·범례·단위·툴팁.
5. 비용 분석 탭: 고객별 / 서비스별 / 모델별 (수평 바 + 표).
6. 고객별 사용 현황 테이블: 고객명(링크), 서비스, 작업, 호출, 성공률, 확정, 추정, 미확인, 월 예산, 사용률(바+%+basis), 상태 배지. 정렬·전체보기.
7. 상세 API 호출 이력 테이블(최근 20 → 전체보기 시 페이지네이션 50): 호출시각(KST), 고객, 서비스, 작업 ID, 모델(요청/실제), Input/Output Token, 비용, 비용 상태, 실행 상태, 오류 유형. Request ID 클릭 → 공통 호출 상세 Drawer.
8. 고객 상세(`/customers/:id`): 고객 헤더 + 예산 카드(등록/수정 버튼 → 예산 편집 Drawer: 월, 금액 USD, 경고 기준 %, 저장/취소, 검증), 해당 고객 KPI/추이/서비스별/모델별/상세 이력. 필터·정렬 유지.
상태: Loading(skeleton), Empty("조회 결과 없음" + 기간 변경 안내), Error(조회 실패 + 재시도), 잘못된 기간(인라인 검증), 비용 미확인 배지.

### P-02 내부 AI 예산 관리 (`/internal`, 프로젝트 상세 `/internal/projects/:projectId`)
1. 필터: 프로젝트, 구성원, 모델, 기간, 호출 출처(전체/개발/시뮬레이션/테스트), [조회].
2. KPI(6): API 확정 비용, API 추정 비용, 월 구독료(적용 월 수 sub), 총 관리 비용(추정 포함 레이블 + 미확인 N건 안내), 비용 미확인 호출, 미분류 사용량(건수·비용).
3. 미분류 InlineAlert: 구성원 미식별 N건 $X / 프로젝트 미식별 N건 $Y, "상세 보기" → 상세 테이블 필터.
4. 추이 차트: 일별 API 비용(확정/추정 스택) + 월 구독료 별도 막대 표(월 단위 선택 시 동일 차트 내 별도 시리즈).
5. 프로젝트별 예산 현황 테이블: 프로젝트명(링크), 출처 구성(개발/시뮬/테스트 비용), 확정, 추정, 구독료, 월 예산, 사용액(추정 포함 표시), 사용률, 상태(정상/주의/초과/미설정). "관리" 컬럼 없음.
6. 구성원별 사용량 테이블: 구성원, 호출, Input/Output Token, 확정, 추정, 미확인 + "미분류" 행 고정.
7. 구독료 관리 SectionCard: 테이블(도구명 링크 → 편집 Drawer, 플랜, 적용 월, 금액, 귀속 프로젝트/미배분, 상태) + [구독료 등록] 버튼 → Drawer(도구명, 플랜/유형, 적용 월, 금액, 통화 USD 고정, 귀속 프로젝트(미배분 허용), 상태, 메모).
8. 상세 API 사용 이력 테이블: 시각, 출처 배지, 프로젝트, 구성원(미분류), 모델, Token, 비용/상태, 실행 상태. Request ID → Drawer.
9. 프로젝트 상세: 예산 카드(등록/수정 Drawer), 출처별 비용 구성, 구성원별, 모델별, 구독료(귀속분), 상세 이력.

### P-03 AI 모델 관리 (`/models`)
1. 툴바: 검색(표시명/Model ID), Provider 필터, 상태 필터, [신규 모델 등록].
2. 등록 모델 테이블: 표시명(링크 → 상세 Drawer), Model ID(mono, 복사), Provider, 지원 기능 칩(텍스트/이미지/JSON/도구), Input $/1M, Output $/1M, 가격 기준 시각, 상태 배지, 마지막 테스트(결과 배지 + 시각), 행 액션 [테스트]. 정렬·페이지네이션(10/20/50)·전체보기.
3. 신규 등록 Drawer: Step 1 OpenRouter 카탈로그 검색(검색어, 목록: 이미 등록된 항목은 "등록됨" 비활성), Step 2 선택 모델 정보 확인(Provider, Model ID, 표시명 편집, 사용 목적, 지원 기능, 가격·통화·기준시각, Context Length), 중복 검사 결과 인라인, [TESTING으로 등록].
4. 모델 상세 Drawer: 정보 섹션 + 편집(표시명·목적), 가격 섹션(기준 시각, 가격 미확인 상태), 연결 테스트 섹션(테스트 Prompt 입력, [연결 테스트 실행], 진행 상태, 결과: 성공/실패/Timeout, 오류 사유, 응답시간, Token, 비용·비용 상태, 마지막 검증 시각, Request ID → 공통 Drawer; 이력은 SYSTEM_TEST), 상태 관리 섹션(현재 상태, [ACTIVE로 전환](마지막 테스트 성공일 때만 활성, 아니면 사유 툴팁), [INACTIVE로 전환] → ConfirmDialog "과거 이력은 보존되며 신규 실행에서 제외됩니다. 운영 AI PDP 모델은 변경되지 않습니다.").
5. 안내 배너: "ACTIVE 전환은 PoC Simulator 사용 가능 의미이며 운영 서비스 모델을 변경하지 않습니다."

### P-04 Multi-LLM Simulator (`/simulator`) — 2컬럼(좌 설정 420px, 우 결과)
좌측 설정 패널:
1. 테스트 유형: 시나리오 Select(5종 + Custom). 시나리오 선택 시 Prompt 템플릿 자동 채움(편집 가능), 요구 입력 형식 안내.
2. Prompt(Textarea, 글자 수), 입력 텍스트(Textarea), 이미지 입력(파일 선택 → 미리보기, 모델 지원 검증: 미지원 모델 경고 "모델 X는 이미지 입력을 지원하지 않습니다").
3. 모델 선택: ACTIVE 모델 체크리스트(2~4, 선택 수 표시 "2/4"), 각 항목 Provider·기능 칩. TESTING/INACTIVE는 목록에서 제외하되 "제외된 모델 N개(TESTING/INACTIVE)" 캡션.
4. 실행 파라미터: Temperature(0~2 slider+숫자), Max Tokens, Timeout(초).
5. Provider 정책: Provider 고정(토글, 기본 on), Fallback(토글, Benchmark 기본 off + 설명).
6. 출력 검증: JSON 출력 요구(토글), JSON Schema(Textarea, 유효성 검사).
7. 실행 전 검증 패널: 체크리스트(모델 수, 입력 지원, Prompt 비어있지 않음, Schema 유효). [비교 실행] 버튼은 모두 통과 시 활성, 아니면 사유 표시.
우측 결과:
8. 실행 요약 바: Simulation ID, 전체 상태, 실행 모델 수, 성공/실패·Timeout 수, 확정 비용, 추정 비용, 미확인 N건, 전체 실행시간, [저장됨 배지/이력에서 보기] [재실행].
9. 병렬 실행 상태: 모델별 진행(RUNNING 스피너→결과). 실행 중 취소 버튼.
10. 비교 표(모델 행): 상태, 응답시간, Input/Output Token, 비용(상태 배지), JSON 검증, Schema 검증, 필수 필드 누락, 오류. 정렬 가능.
11. 모델별 응답 카드(동일 높이 그리드 2~4열): 헤더(모델, Provider 요청/실제, 상태 배지), 지표 행, 응답 미리보기(8줄 clamp), [전체 응답 보기] → Modal(원문 보존, monospace, 복사), 오류 사유 블록, 비교 조건 차이 노트(예: Provider 고정 미지원).
12. 실행 완료 시 자동 저장(실행 조건+결과) 후 토스트 "SIM-ID 저장됨 · 이력에서 보기".
초기 상태(실행 전): 우측 EmptyState "설정을 완료하고 비교 실행을 누르세요". 재실행 진입(`/simulator?from=SIM-ID`): 설정 복원 + 모델 검증 배너.

### P-05 시뮬레이션 결과 이력 (`/simulations`, 상세 `/simulations/:simulationId`)
1. 필터: 기간, 시나리오, 모델, 실행 상태, Simulation ID 검색, [조회].
2. 목록 테이블(기본 최신순): 실행 시각, Simulation ID(링크), 시나리오, 모델 수(아바타 칩), 전체 상태, 비용 상태(확정/추정 포함/미확인 포함/확인 중), 총 비용(추정 포함 표기), 실행시간. 행 확장(▸)으로 모델별 Request 2~4건 미니 행 표시. 정렬·페이지네이션(10/20/50).
3. 상세 페이지: 헤더(Simulation ID, 상태, 실행 시각, 실행자, [재실행]), 실행 조건 카드(시나리오, Prompt, 입력, 입력 Hash, 파라미터, Provider 정책, Fallback, JSON/Schema), 요약 KPI, 모델별 결과 비교표 + 응답 카드(P-04와 동일 컴포넌트, 당시 모델 상태 vs 현재 상태 배지 "현재 INACTIVE"), 각 Request ID → 공통 Drawer.
4. 재실행 Modal: 복원 설정 요약, 모델별 현재 상태 검증(ACTIVE 유지 / INACTIVE → 제외 또는 교체 Select(ACTIVE 목록)), 결과 모델 수 < 2이면 차단 + 사유, 원본 입력 없음이면 차단 + 사유. [새 Simulation으로 실행] → `/simulator?from=ID` 설정 복원 후 실행, 기존 기록 불변.

### F-05 공통 호출 상세 Drawer (`RequestDetailDrawer`, 전역 `?request=REQ-ID`)
섹션: 식별(Request ID 복사, Simulation ID 링크, Task ID, attempt_no, parent_request_id 링크 "재시도 원 요청"), 출처(usage_origin, owner_type, key 표시명(원문 없음), 고객/프로젝트/구성원/서비스, call_purpose), 모델(requested/actual model, requested/actual provider, routing_policy, execution_config), 시각(요청/완료 KST, latency), 결과(status, error_type, input/output tokens), 비용(cost_usd 또는 "미확인", cost_status, cost_source, price_reference, reconciled_at, external_generation_id), 검증(json/schema 결과, 시뮬레이션 결과일 때). 재시도 체인 목록.

## 5. 상태 매트릭스 (모든 화면)
Initial / Loading(skeleton) / Success / Empty / Error(재시도) / Partial(일부 섹션 실패 InlineAlert) / Timeout(요청 레벨) / Unknown Cost(배지) / Validation Error(폼 인라인) / Disabled(사유 툴팁).

## 6. Figma 페이지 구성 (`Patron — Complete Admin Console` 단일 페이지)
가로 정렬 프레임(간격 200): 00 Design Tokens & Components(1440) → 01 P-01(1440) → 02 P-02 → 03 P-03 → 04 P-04 → 05 P-05 → 06 Detail Panels & Modals → 07 States(Loading/Empty/Error) → 08 Responsive(1024/390).
