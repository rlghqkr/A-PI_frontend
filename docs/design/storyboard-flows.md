# Patron 화면 흐름 인벤토리 (스토리보드 원본)

Figma 스토리보드 작성용으로 코드(src/pages, src/features)와 기준 문서를 대조해 정리한 화면·상태·전환 목록입니다.

- Figma 파일 `cprn8IzgC8DPWNjGFFdsqe`: 09 Storyboard(전체 기능, 작성 중) · 10 Storyboard(P-04 기능별 흐름, 노드 60:801) · 11 Storyboard(P-05 기능별 흐름, 예정)
- Mock seed 의 날짜는 오늘(todayKst) 기준으로 만들어집니다. 아래 SIM/REQ ID 는 2026-10-23 기준이라 날짜가 바뀌면 ID 의 날짜 부분도 같이 바뀝니다 (예: 2026-10-26 에는 SIM-20261009-001 → SIM-20261012-001).

## P-01 고객 AI 사용 현황 (/customers, /customers/:customerId)

| ID | 유형 | 화면 | URL | 진입 방법 | 근거 | 코드 |
|---|---|---|---|---|---|---|
| P01-S1 | 페이지 | 고객 AI 사용 현황 (전체 고객) | `/customers` | 사이드바 'P-01 고객 AI 사용 현황' 클릭 (또는 / 접속 시 /customers 로 리다이렉트) (← 진입) | 02 화면설계 기준서 v1.4 §4 P-01(4.1~4.5); design-spec.md §P-01 1~7; LOGBASE Patron 화면.pdf P-01 SCREEN GUIDE 01~05 | src/pages/customers/CustomerUsagePage.tsx:14; src/App.tsx:27-35 |
| P01-S1-LOADING | 상태 | 조회 중 (스켈레톤) | `/customers` | [조회] 클릭 직후 또는 최초 진입 직후 (← P01-S1) | design-spec.md §07 States(Loading) | src/pages/customers/CustomerKpis.tsx:16; src/pages/customers/CustomerUsagePage.tsx:66 |
| P01-S1-PENDING | 상태 | 조회 조건 변경 — 적용 대기 | `/customers` | 필터 바에서 '고객' Select를 'A전자'로 변경 ([조회] 클릭 전) (← P01-S1) | design-spec.md §P-01 2 (조회 전 변경은 '적용 대기' 표시, URL query 유지) | src/pages/customers/CustomerFilterBar.tsx:46; src/components/ui/FilterBar.tsx:42 |
| P01-S1-FILTERED | 상태 | 특정 고객·서비스·모델 조회 결과 | `/customers?customer=C-001&service=S-PDP-A&model=openai%2Fgpt-4o&granularity=week` | 필터 변경 후 [조회] 클릭 (← P01-S1-PENDING) | 02 화면설계 기준서 v1.4 §4.4 처리 규칙 2·9; 01 요구사항 P-01 처리 규칙 | src/pages/customers/CustomerFilterBar.tsx:48; src/pages/customers/useCustomerUsageData.ts:14 |
| P01-S1-RANGE-INVALID | 상태 | 잘못된 조회 기간 (검증 차단) | `/customers?start=2026-10-23&end=2026-09-01` | 기간 시작일을 종료일보다 늦게 입력 후 [조회] 클릭 (제출 차단) (← P01-S1) | 02 화면설계 기준서 v1.4 §4.6 잘못된 기간 → 입력 오류 안내; 01 요구사항 P-01 오류 및 빈 데이터 | src/pages/customers/CustomerUsagePage.tsx:47; src/domain/aggregate.ts:124; src/pages/customers/CustomerFilterBar.tsx:45 |
| P01-S1-ERROR | 상태 | 사용량 조회 실패 | `/customers` | 사이드바 'Mock 환경 설정' > '다음 조회 1회 실패' ON 후 [조회] 클릭 (← P01-S1) | 02 화면설계 기준서 v1.4 §4.6 집계 API 실패 → 조회 실패 안내; 01 요구사항 P-01 사용량 수집 실패 | src/pages/customers/CustomerUsagePage.tsx:51; src/api/mock/MockPatronApi.ts:149; src/features/shared/MockControlsPanel.tsx:40 |
| P01-S1-EMPTY | 상태 | 조회 결과 없음 | `/customers?customer=C-003&model=x-ai%2Fgrok-2` | 사용 이력이 없는 조건(고객=C미디어, 모델=Grok 2)으로 [조회] 클릭 (← P01-S1-PENDING) | 02 화면설계 기준서 v1.4 §4.6 사용 이력 없음 → 조회 결과 없음 | src/pages/customers/CustomerUsageTable.tsx:109; src/pages/customers/RequestHistoryTable.tsx:129 |
| P01-S1-UNKNOWN | 상태 | 비용 미확인 필터 적용 | `/customers?cost=UNKNOWN` | KPI '비용 미확인 건수' 카드('눌러서 호출 이력 보기') 클릭 → 상세 API 호출 이력으로 스크롤. 다시 누르면 해제 ('이력에서 보는 중 · 눌러서 해제') (← P01-S1) | design-spec.md §P-01 3 (비용 미확인 건수 카드 클릭 시 상세 테이블 필터); 02 화면설계 기준서 v1.4 §4.6 비용 미확인 → 금액 대신 미확인 상태; LOGBASE Patron 화면.pdf P-01 (비용 미확인 건수 별도 카드) | src/pages/customers/CustomerKpis.tsx:56; src/pages/customers/RequestHistoryTable.tsx; src/pages/customers/CustomerUsagePage.tsx:41; src/lib/scrollToSection.ts |
| P01-S1-UNKNOWN-EMPTY | 상태 | 비용 미확인 호출 없음 | `/customers?customer=C-003&cost=UNKNOWN` | 미확인 필터 상태에서 미확인 건이 없는 조건으로 URL 진입 (← P01-S1-UNKNOWN) | 설계 판단 | src/pages/customers/RequestHistoryTable.tsx:129-137 |
| P01-S1-TAB-SERVICE | 탭 | 비용 분석 — 서비스별 탭 | `/customers` | '비용 분석' 카드의 [서비스별] 탭 클릭 (← P01-S1) | design-spec.md §P-01 5; 02 화면설계 기준서 v1.4 §4.5 분석 정보 | src/pages/customers/CostAnalysisTabs.tsx:68 |
| P01-S1-TAB-MODEL | 탭 | 비용 분석 — 모델별 탭 | `/customers` | '비용 분석' 카드의 [모델별] 탭 클릭 (← P01-S1) | design-spec.md §P-01 5; 01 요구사항 P-01 모델별 사용량 확인 | src/pages/customers/CostAnalysisTabs.tsx:30 |
| P01-S1-HISTORY-ALL | 상태 | 상세 API 호출 이력 — 전체보기 | `/customers?historySort=requested_at:desc` | '상세 API 호출 이력' 카드의 [전체보기 (N)] 클릭 (← P01-S1) | LOGBASE Patron 화면.pdf P-01 SCREEN GUIDE 05 (실패·Timeout 포함, 전체보기); design-spec.md §P-01 7 | src/pages/customers/RequestHistoryTable.tsx:106 |
| P01-S1-USAGE-ALL | 상태 | 고객별 사용 현황 — 전체보기 | `/customers` | '고객별 사용 현황' 카드의 [전체보기 (N)] 클릭 (← P01-S1) | design-spec.md §P-01 6 (정렬·전체보기); 02 화면설계 기준서 v1.4 §4.6 고객 식별 실패 → 미분류 | src/pages/customers/CustomerUsageTable.tsx:51-56, 88-93 |
| P01-S2 | 페이지 | 고객 상세 사용 현황 (A전자) | `/customers/C-001` | '고객별 사용 현황' 표의 고객명 링크 'A전자' 클릭 (목록 query 그대로 유지) (← P01-S1) | design-spec.md §P-01 8; LOGBASE Patron 화면.pdf P-01 04 (고객명 클릭 → 해당 고객 상세) | src/pages/customers/CustomerDetailPage.tsx:18; src/pages/customers/CustomerUsageTable.tsx:51; src/App.tsx:37 |
| P01-S2-LOADING | 상태 | 고객 상세 로딩 | `/customers/C-001` | 고객명 클릭 직후 (← P01-S1) | design-spec.md §07 States(Loading) | src/pages/customers/CustomerDetailPage.tsx:65; src/pages/customers/BudgetCard.tsx:36,42 |
| P01-S2-NOTFOUND | 상태 | 고객을 찾을 수 없음 | `/customers/C-999` | 존재하지 않는 고객 ID URL 직접 접근 (← 진입) | 설계 판단 | src/pages/customers/CustomerDetailPage.tsx:73-89 |
| P01-S2-REF-ERROR | 상태 | 기준 데이터 조회 실패 | `/customers/C-001` | 기준 데이터(고객·서비스·모델) 로드 실패 시 (← P01-S1) | 설계 판단 | src/pages/customers/CustomerDetailPage.tsx:66-72 |
| P01-S2-ERROR | 상태 | 고객 상세 — 사용량 조회 실패 | `/customers/C-001` | 'Mock 환경 설정' > '다음 조회 1회 실패' ON 후 상세에서 [조회] 클릭 (← P01-S2) | 02 화면설계 기준서 v1.4 §4.6 집계 API 실패 | src/pages/customers/CustomerDetailPage.tsx:119-122 |
| P01-S2-RANGE-INVALID | 상태 | 고객 상세 — 잘못된 기간 | `/customers/C-001?start=2026-10-23&end=2026-09-01` | 상세 필터 바에서 기간 오류 입력 / 오류 URL 진입 (← P01-S2) | 02 화면설계 기준서 v1.4 §4.6 잘못된 기간 | src/pages/customers/CustomerDetailPage.tsx:115-118 |
| P01-S2-BUDGET-WARN | 상태 | 월 예산 — 주의 상태 (B리테일) | `/customers/C-002` | '고객별 사용 현황' 표의 'B리테일' 클릭 (← P01-S1) | 02 화면설계 기준서 v1.4 §4.2 예산 경고 및 초과 상태 확인, §4.4 사용률 기준 표시 | src/pages/customers/BudgetCard.tsx:27,56-90; src/domain/aggregate.ts:232-235 |
| P01-S2-BUDGET-UNSET | 상태 | 월 예산 — 미설정 (C미디어) | `/customers/C-003` | '고객별 사용 현황' 표의 'C미디어' 클릭 (← P01-S1) | 02 화면설계 기준서 v1.4 §4.6 예산 미설정 → 예산 사용률 미설정 | src/pages/customers/BudgetCard.tsx:36-37,64,86 |
| P01-S2-BUDGET-PREVMONTH | 상태 | 월 예산 — 이전 월 선택 | `/customers/C-001` | 예산 카드 우상단 '예산 월' Select에서 '2026-09' 선택 (← P01-S2) | 설계 판단 (02 §4.2 고객별 월 예산 조회) | src/pages/customers/CustomerDetailPage.tsx:28-35; src/pages/customers/BudgetCard.tsx:35 |
| P01-S2-BUDGET-ERROR | 상태 | 월 예산 — 예산 조회 실패 | `/customers/C-001` | 예산 목록 조회가 실패했을 때 (← P01-S2) | 설계 판단 | src/pages/customers/BudgetCard.tsx:48-54 |
| P01-S2-TABS | 탭 | 고객 상세 — 비용 분석 서비스별/모델별 | `/customers/C-001` | '비용 분석' 카드의 [모델별] 탭 클릭 (← P01-S2) | design-spec.md §P-01 8 (해당 고객 서비스별/모델별) | src/pages/customers/CustomerDetailPage.tsx:160-168 |
| P01-S2-UNKNOWN | 상태 | 고객 상세 — 비용 미확인 필터 | `/customers/C-001?cost=UNKNOWN` | KPI '비용 미확인 건수' 카드 클릭 → 상세 이력으로 스크롤 (← P01-S2) | design-spec.md §P-01 3, 8 | src/pages/customers/CustomerDetailPage.tsx:63; src/lib/scrollToSection.ts |
| P01-D1 | Drawer | 월 예산 등록 | `/customers/C-003` | 예산 카드의 [등록] 클릭 (← P01-S2-BUDGET-UNSET) | design-spec.md §P-01 8 (예산 편집 Drawer: 월·금액·경고 기준·저장/취소·검증); 02 §4.3 월 예산/예산 경고 기준 입력 | src/pages/customers/BudgetDrawer.tsx:78-138 |
| P01-D1-EDIT | Drawer | 월 예산 수정 | `/customers/C-001` | 예산 카드의 [수정] 클릭 (← P01-S2) | 02 화면설계 기준서 v1.4 §4.7 고객별 예산 등록·수정 가능 | src/pages/customers/BudgetDrawer.tsx:31-37,82 |
| P01-D1-INVALID | 상태 | 월 예산 — 입력 검증 오류 | `/customers/C-003` | 금액 비우거나 0, 경고 기준 0 또는 101 입력 후 [저장] 클릭 (← P01-D1) | design-spec.md §P-01 8 (검증) | src/pages/customers/BudgetDrawer.tsx:39-46 |
| P01-D1-MONTH-CHANGE | 상태 | 월 예산 — 적용 월 변경 안내 | `/customers/C-001` | [수정] Drawer에서 '적용 월'을 다른 월로 변경 (← P01-D1-EDIT) | 설계 판단 (upsert 고객+월 기준 덮어쓰기) | src/pages/customers/BudgetDrawer.tsx:65-75 |
| P01-D1-SAVING | 상태 | 월 예산 — 저장 중 / 저장 실패 | `/customers/C-001` | 유효값 입력 후 [저장] 클릭 (← P01-D1-EDIT) | 설계 판단 | src/pages/customers/BudgetDrawer.tsx:86-91,103; src/api/mock/MockPatronApi.ts:230 |
| P01-S2-SAVED | 상태 | 월 예산 저장 완료 | `/customers/C-003` | Drawer의 [저장] 클릭 (검증 통과) (← P01-D1) | 02 화면설계 기준서 v1.4 §4.7 고객별 예산 등록·수정 가능 | src/pages/customers/BudgetDrawer.tsx:48-61; src/pages/customers/BudgetCard.tsx:92 |
| P01-S2-BUDGET-EXCEEDED | 상태 | 월 예산 — 초과 상태 | `/customers/C-001` | [수정] Drawer에서 금액을 현재 사용액보다 작게 저장 (← P01-D1-EDIT) | 02 화면설계 기준서 v1.4 §4.2 예산 경고 및 초과 상태 확인 | src/domain/aggregate.ts:234; src/pages/customers/BudgetCard.tsx:27,74 |
| F05-DRAWER | Drawer | 공통 호출 상세 (F-05) | `/customers` | '상세 API 호출 이력' 표의 Request ID(REQ-YYYYMMDD-NNNNN) 클릭 (← P01-S1) | 02 화면설계 기준서 v1.4 공통 호출 상세(P-01 상세 조회 request_id); design-spec.md §P-01 7 | src/features/shared/cells.tsx:172; src/features/request-detail/RequestDetailDrawer.tsx:48 |

## P-02 내부 AI 예산 관리 (/internal, /internal/projects/:projectId)

| ID | 유형 | 화면 | URL | 진입 방법 | 근거 | 코드 |
|---|---|---|---|---|---|---|
| P02-S1 | 페이지 | 내부 AI 예산 관리 (기본) | `/internal` | 사이드바 'P-02 내부 AI 예산 관리' (← 진입) | 02 화면설계 기준서 v1.4 §5.1~5.5; design-spec.md P-02 1~8; 03 화면설계 설명 P-02 §2 ①~⑦; LOGBASE Patron 화면.pdf P-02 1/2 | src/pages/internal/InternalBudgetPage.tsx:17 |
| P02-S2 | 상태 | 로딩 (Skeleton) | `/internal` | 페이지 진입 직후 / '조회' 클릭 직후 (← P02-S1) | design-spec.md 07 States(Loading) | src/pages/internal/InternalKpis.tsx:15 |
| P02-S3 | 상태 | 조회 실패 (ErrorState) | `/internal` | Mock 패널 '다음 조회 1회 실패' 켠 뒤 페이지 진입 (← P02-S1) | 02 화면설계 기준서 v1.4 §5.6 (API 조회 실패 → 조회 실패) | src/pages/internal/InternalBudgetPage.tsx:52 |
| P02-S4 | 상태 | 재조회 실패 (마지막 성공 기준 표시) | `/internal?origin=SIMULATION` | 필터 변경 후 '조회' (Mock 실패 ON) (← P02-S1) | 설계 판단 (02 기준서 §5.6 조회 실패의 부분 실패 처리) | src/pages/internal/InternalBudgetPage.tsx:53 |
| P02-S5 | 상태 | 필터 적용 대기 / 기간 입력 오류 | `/internal` | 필터 값 변경(조회 전) (← P02-S1) | 03 화면설계 설명 P-02 ① 조회 조건; design-spec.md P-02 1 | src/pages/internal/InternalFilterBar.tsx:38 |
| P02-S6 | 상태 | 조회 기간 오류 (URL) | `/internal?start=2026-10-23&end=2026-10-01` | 잘못된 기간이 담긴 URL 직접 진입 (← P02-S1) | 설계 판단 | src/pages/internal/InternalBudgetPage.tsx:51 |
| P02-S7 | 상태 | 구성원 필터 적용 (구독료 해당 없음) | `/internal?user=U-001` | 구성원 선택 후 '조회' (← P02-S1) | 02 화면설계 기준서 v1.4 §5.4-9 (구독료 개인 배분 금지); 03 설명 P-02 ② | src/pages/internal/InternalKpis.tsx:31 |
| P02-S8 | 상태 | 집계 단위 월 (구독료 별도 시리즈) | `/internal?g=month` | 집계 단위 '월' 선택 후 '조회' (← P02-S1) | design-spec.md P-02 4; 03 설명 P-02 ③ 비용 추이 | src/pages/internal/InternalTrendCharts.tsx:18 |
| P02-S9 | 상태 | 조회 결과 없음 (Empty) | `/internal?user=U-004&origin=SYSTEM_TEST` | 결과 없는 조건으로 '조회' (← P02-S1) | 02 화면설계 기준서 v1.4 §5.6 (사용 데이터 없음 → 조회 결과 없음) | src/pages/internal/ProjectBudgetTable.tsx:94 |
| P02-S10 | 상태 | 미분류 사용량 — 구성원 미식별 보기 | `/internal` | '구성원 미식별 보기' 또는 KPI '미분류 사용량' 카드 클릭 (← P02-S1) | 02 화면설계 기준서 v1.4 §5.4-4, §5.6 (구성원 정보 없음 → 미분류); design-spec.md P-02 3; 03 설명 P-02 ⑦ | src/pages/internal/UnclassifiedAlert.tsx:22 |
| P02-S11 | 상태 | 미분류 사용량 — 프로젝트 미식별 보기 | `/internal` | '프로젝트 미식별 보기' (← P02-S1) | 02 화면설계 기준서 v1.4 §5.4-4; design-spec.md P-02 3 | src/pages/internal/UnclassifiedAlert.tsx:27 |
| P02-S12 | 상태 | 비용 미확인만 보기 | `/internal` | KPI '비용 미확인 호출' 카드 클릭 또는 '비용 미확인만' (← P02-S1) | 02 화면설계 기준서 v1.4 §3.7, §5.6 (비용 미확인 → 미확인으로 표시); LOGBASE Patron 화면.pdf P-02 2/2 | src/pages/internal/InternalKpis.tsx:53 |
| P02-S13 | 상태 | 상세 API 사용 이력 전체보기 | `/internal` | '전체보기' (다시 '최근 20건만') (← P02-S1) | design-spec.md P-02 8; LOGBASE Patron 화면.pdf P-02 1/2 (05 상세 API 이력: 정렬·전체보기) | src/pages/internal/RequestHistoryTable.tsx:91 |
| P02-S14 | 상태 | 상세 이력 조건 불일치 (필터 Empty) | `/internal` | 미분류 필터 + '비용 미확인만' 동시 적용 (← P02-S11) | 설계 판단 | src/pages/internal/RequestHistoryTable.tsx:108 |
| P02-S15 | Drawer | 공통 호출 상세 Drawer (F-05) | `/internal?request=REQ-YYYYMMDD-NNNNN` | 상세 API 사용 이력의 Request ID 클릭 (← P02-S1) | 02 화면설계 기준서 v1.4 §8 (P-02 상세 조회 → 공통 호출 상세 request_id); design-spec.md P-02 8, F-05 | src/pages/internal/RequestHistoryTable.tsx:65 |
| P02-S16 | 상태 | 구독료 관리 — 전체 기간 보기 | `/internal` | '전체 기간 보기' (복귀 '조회 기간만 보기') (← P02-S1) | 02 화면설계 기준서 v1.4 §5.2 구독료 조회, §5.6 (귀속 불명확 → 미배분 유지); design-spec.md P-02 7 | src/pages/internal/SubscriptionSection.tsx:85 |
| P02-S17 | Drawer | 구독료 등록 Drawer | `/internal` | '구독료 등록' (← P02-S1) | 02 화면설계 기준서 v1.4 §5.3 (구독 도구명·금액·적용 월·귀속 프로젝트); design-spec.md P-02 7; 03 설명 P-02 ⑤ | src/pages/internal/SubscriptionDrawer.tsx:44 |
| P02-S18 | 상태 | 구독료 입력 검증 오류 | `/internal` | 빈 값으로 '등록' (← P02-S17) | 설계 판단 (02 기준서 §5.3 입력 항목) | src/pages/internal/SubscriptionDrawer.tsx:34 |
| P02-S19 | Drawer | 구독료 편집 Drawer | `/internal` | 구독료 목록의 도구명 링크(예: 'ChatGPT Team') (← P02-S1) | 02 화면설계 기준서 v1.4 §5.2 구독료 수정; design-spec.md P-02 7 | src/pages/internal/SubscriptionSection.tsx:42 |
| P02-S20 | 상태 | 구독료 저장 완료 (Toast) | `/internal` | '등록' 또는 '저장' (← P02-S17) | 02 화면설계 기준서 v1.4 §5.7 (구독료 수동 등록·수정 가능) | src/pages/internal/SubscriptionDrawer.tsx:100 |
| P02-D1 | 페이지 | 프로젝트 상세 (예산 정상) | `/internal/projects/PRJ-001` | 프로젝트별 예산 현황의 프로젝트명 'LOGBASE AI PDP 개발' (← P02-S1) | design-spec.md P-02 9; LOGBASE Patron 화면.pdf P-02 1/2 (03 프로젝트명 클릭 → 세부 사용 내역·예산 수정); 02 기준서 §5.5 | src/pages/internal/ProjectDetailPage.tsx:79 |
| P02-D2 | 상태 | 프로젝트 상세 — 예산 초과 | `/internal/projects/PRJ-002` | 프로젝트명 '고객 프로젝트 X 자동화' (← P02-S1) | 02 화면설계 기준서 v1.4 §5.6 (예산 초과 → 초과 상태 표시), §5.7 | src/pages/internal/ProjectDetailPage.tsx:65 |
| P02-D3 | 상태 | 프로젝트 상세 — 예산 주의 | `/internal/projects/PRJ-POC` | 프로젝트명 'Patron PoC' (← P02-S1) | 02 화면설계 기준서 v1.4 §5.4-7 (예산 경고 기준) | src/pages/internal/ProjectDetailPage.tsx:68 |
| P02-D4 | 상태 | 프로젝트 상세 — 예산 미설정 / 구독료 없음 | `/internal/projects/PRJ-TEST` | 프로젝트명 '모델 연결 테스트' (← P02-S1) | 02 화면설계 기준서 v1.4 §5.6 (예산 미설정 → 미설정); LOGBASE Patron 화면.pdf P-02 2/2 (예산 미설정은 사용률 0%가 아님) | src/pages/internal/ProjectDetailPage.tsx:46 |
| P02-D5 | 상태 | 프로젝트 상세 — 기간 내 호출 없음 | `/internal/projects/PRJ-001?start=2025-01-01&end=2025-01-31` | 기간을 호출 없는 범위로 바꾸고 '조회' (← P02-D1) | 02 화면설계 기준서 v1.4 §5.6 (사용 데이터 없음) | src/pages/internal/ProjectDetailPage.tsx:127 |
| P02-D6 | 상태 | 프로젝트를 찾을 수 없음 | `/internal/projects/PRJ-999` | 존재하지 않는 projectId URL 직접 진입 (← P02-S1) | 설계 판단 | src/pages/internal/ProjectDetailPage.tsx:140 |
| P02-D7 | Drawer | 월 예산 수정 Drawer | `/internal/projects/PRJ-001` | 예산 카드 '예산 수정' (← P02-D1) | 02 화면설계 기준서 v1.4 §5.2 월 예산 등록·수정, §5.3; design-spec.md P-02 9 | src/pages/internal/ProjectBudgetDrawer.tsx:21 |
| P02-D8 | Drawer | 월 예산 등록 Drawer | `/internal/projects/PRJ-TEST` | '예산 등록' (← P02-D4) | 02 화면설계 기준서 v1.4 §5.3 (월 예산 기본값 미설정) | src/pages/internal/ProjectDetailPage.tsx:41 |
| P02-D9 | 상태 | 예산 입력 검증 오류 | `/internal/projects/PRJ-TEST` | 잘못된 값으로 '저장' (← P02-D8) | 설계 판단 (02 기준서 §5.3 예산 경고율) | src/pages/internal/ProjectBudgetDrawer.tsx:74 |
| P02-D10 | 상태 | 예산 저장 완료 (Toast + 카드 갱신) | `/internal/projects/PRJ-TEST` | '저장' (← P02-D8) | 02 화면설계 기준서 v1.4 §5.7 (월 예산 등록·수정 및 초과 상태 표시) | src/pages/internal/ProjectBudgetDrawer.tsx:86 |
| P02-D11 | Drawer | 구독료 등록 Drawer (프로젝트 귀속 기본값) | `/internal/projects/PRJ-TEST` | 구독료 관리 '구독료 등록' (← P02-D4) | design-spec.md P-02 9 (구독료(귀속분)) | src/pages/internal/SubscriptionSection.tsx:115 |
| P02-D12 | Drawer | 공통 호출 상세 Drawer (프로젝트 상세에서) | `/internal/projects/PRJ-001?request=REQ-YYYYMMDD-NNNNN` | 상세 API 사용 이력의 Request ID (← P02-D1) | 02 화면설계 기준서 v1.4 §8 (P-02 상세 조회 → 공통 호출 상세) | src/pages/internal/ProjectDetailPage.tsx:201 |

## P-03 AI 모델 관리 (/models)

| ID | 유형 | 화면 | URL | 진입 방법 | 근거 | 코드 |
|---|---|---|---|---|---|---|
| P03-S1 | 페이지 | AI 모델 관리 — 등록 모델 목록 | `/models` | 사이드바 'P-03 AI 모델 관리' (← 진입) | 02 기준서 v1.4 §6.2·§6.6 / 03 설명 P-03 ①② / design-spec P-03 1·2·5 | src/pages/models/ModelsPage.tsx:78 |
| P03-S1a | 상태 | 목록 로딩 | `/models` | 페이지 최초 진입(새로고침) (← P03-S1) | design-spec 07 States(Loading) | src/pages/models/ModelsPage.tsx:87 |
| P03-S1b | 상태 | 목록 조회 오류 | `/models` | (조회 실패 시 자동) (← P03-S1a) | 02 기준서 v1.4 §6.7 (모델 목록 API 오류 → 조회 실패) / 03 설명 P-03 오류 및 빈 데이터 | src/pages/models/ModelsPage.tsx:117 |
| P03-S1c | 상태 | 필터 적용 목록 | `/models?status=TESTING` | '상태' Select → 'TESTING' (또는 검색창에 표시명/Model ID 입력, Provider 선택) (← P03-S1) | 03 설명 P-03 ① 모델 검색 / 02 기준서 §6.2 | src/pages/models/ModelsPage.tsx:92 |
| P03-S1d | 상태 | 필터 결과 없음 | `/models?q=zzz` | 검색창에 일치하지 않는 검색어 입력 (← P03-S1c) | design-spec 07 States(Empty) | src/pages/models/ModelsTable.tsx:110 |
| P03-S1e | 상태 | 등록 모델 없음 | `/models` | (등록 모델 0건일 때) (← P03-S1) | 설계 판단 (design-spec 07 States Empty) | src/pages/models/ModelsTable.tsx:110 |
| P03-S1f | 상태 | 가격 미확인 행 | `/models?q=mistral` | 목록에서 Mistral Large 행 확인(검색 'mistral') (← P03-S1) | 02 기준서 v1.4 §6.7 (가격정보 없음 → 가격 미확인) | src/pages/models/cells.tsx:22 |
| P03-S1g | 상태 | 상위 10개 표시 · 전체보기 | `/models` | 목록 하단 '전체보기' (← P03-S1) | 03 설명 P-03 ② (전체보기 또는 페이지네이션) / LOGBASE Patron 화면 P-03 2/2 (정렬·전체보기) | src/pages/models/ModelsTable.tsx:121 |
| P03-R1 | Drawer | 신규 모델 등록 — Step 1 카탈로그 검색 | `/models` | 헤더 '신규 모델 등록' 버튼 (← P03-S1) | 02 기준서 v1.4 §6.4-1·2 / 03 설명 P-03 ③ / design-spec P-03 3 | src/pages/models/RegisterModelDrawer.tsx:140 |
| P03-R1a | 상태 | 카탈로그 조회 중 | `/models` | Drawer 열림 또는 검색어 입력(300ms 디바운스) (← P03-R1) | design-spec 07 States(Loading) | src/pages/models/RegisterModelDrawer.tsx:152 |
| P03-R1b | 상태 | 카탈로그 조회 실패 | `/models` | (조회 실패 시 자동) (← P03-R1a) | 02 기준서 v1.4 §6.7 (모델 목록 API 오류) / 03 설명 P-03 오류 및 빈 데이터 (OpenRouter 모델 목록 조회 실패) | src/pages/models/RegisterModelDrawer.tsx:158 |
| P03-R1c | 상태 | 카탈로그 검색 결과 없음 | `/models` | 카탈로그 검색에 일치하지 않는 검색어 입력 (← P03-R1) | 설계 판단 | src/pages/models/RegisterModelDrawer.tsx:160 |
| P03-R2 | Drawer | 신규 모델 등록 — Step 2 정보 확인 | `/models` | Step 1 결과 카드 클릭(예: 'Grok 2') (← P03-R1) | 02 기준서 v1.4 §6.3·§6.4-3·4 / 03 설명 P-03 ③ / design-spec P-03 3 | src/pages/models/RegisterModelDrawer.tsx:216 |
| P03-R2a | 상태 | 표시명 미입력 — 등록 차단 | `/models` | Step 2에서 표시명 지우기 (← P03-R2) | 02 기준서 v1.4 §6.3 (표시 이름 필수) | src/pages/models/RegisterModelDrawer.tsx:55 |
| P03-R2b | 상태 | 중복 Model ID / 등록 실패 | `/models` | [TESTING으로 등록] (중복 또는 서버 오류 발생 시) (← P03-R2) | 02 기준서 v1.4 §6.7 (동일 모델 중복 등록 → 등록 차단) / LOGBASE Patron 화면 P-03 2/2 (중복 Model ID 차단·실패 사유 표시) | src/pages/models/RegisterModelDrawer.tsx:219 |
| P03-D1 | Drawer | 모델 상세 Drawer | `/models?model=openai%2Fgpt-4o` | 목록 '표시명' 링크 클릭(예: 'GPT-4o') (← P03-S1) | 02 기준서 v1.4 §6.6 / 03 설명 P-03 ④ / design-spec P-03 4 | src/pages/models/ModelDetailDrawer.tsx:48 |
| P03-D1n | 상태 | 등록 직후 상세 (TESTING · 테스트 미실행) | `/models?model=x-ai%2Fgrok-2` | Step 2 'TESTING으로 등록' (← P03-R2) | 02 기준서 v1.4 §6.4-4 (TESTING 저장) / 03 설명 P-03 ⑥ | src/pages/models/ModelsPage.tsx:50 |
| P03-D1a | 상태 | 상세 로딩 | `/models?model=openai%2Fgpt-4o` | 상세 URL 딥링크로 새로고침 진입 (← P03-D1) | design-spec 07 States(Loading) | src/pages/models/ModelDetailDrawer.tsx:41 |
| P03-D1b | 상태 | 모델을 찾을 수 없음 | `/models?model=unknown%2Fmodel` | 잘못된/삭제된 model 파라미터로 진입 (← P03-S1) | 설계 판단 | src/pages/models/ModelDetailDrawer.tsx:45 |
| P03-D2 | 상태 | 정보 편집 모드 | `/models?model=openai%2Fgpt-4o` | 정보 섹션 '편집' (← P03-D1) | 02 기준서 v1.4 §6.2 (모델 정보 수정) / 03 설명 P-03 ④ | src/pages/models/ModelInfoSection.tsx:40 |
| P03-D3 | 상태 | 가격 미확인 상세 | `/models?model=mistralai%2Fmistral-large` | 목록 'Mistral Large' 클릭 (← P03-S1f) | 02 기준서 v1.4 §6.7 (가격정보 없음 → 가격 미확인) / 03 설명 P-03 오류 및 빈 데이터 | src/pages/models/ModelPricingDetails.tsx:7 |
| P03-D4 | 패널 | 연결 테스트 섹션 | `/models?model=meta-llama%2Fllama-3.1-70b-instruct&section=test` | 목록 행 '테스트' 버튼 (← P03-S1) | 02 기준서 v1.4 §6.4-5·6 / 03 설명 P-03 ②(목록 테스트 버튼)·⑤ / design-spec P-03 4 | src/pages/models/ModelDetailDrawer.tsx:26 |
| P03-D4v | 상태 | 테스트 Prompt 미입력 — 실행 차단 | `/models?model=meta-llama%2Fllama-3.1-70b-instruct&section=test` | 테스트 Prompt 내용 삭제 (← P03-D4) | 02 기준서 v1.4 §6.3 (테스트 Prompt 테스트 시 필수) | src/pages/models/ConnectionTestPanel.tsx:55 |
| P03-D4r | 상태 | 테스트 실행 중 | `/models?model=meta-llama%2Fllama-3.1-70b-instruct&section=test` | '연결 테스트 실행' (← P03-D4) | design-spec P-03 4 (진행 상태) | src/pages/models/ConnectionTestPanel.tsx:64 |
| P03-D4s | 상태 | 테스트 성공 결과 | `/models?model=meta-llama%2Fllama-3.1-70b-instruct&section=test` | (실행 완료) (← P03-D4r) | 02 기준서 v1.4 §6.4-6 / 03 설명 P-03 ⑤ (응답시간·Token·비용 확인) | src/pages/models/ConnectionTestPanel.tsx:88 |
| P03-D4f | 상태 | 테스트 실패 결과 (인증 오류) | `/models?model=mistralai%2Fmistral-large&section=test` | '연결 테스트 실행' (← P03-D4) | 03 설명 P-03 오류 및 빈 데이터 (인증 오류·API 연결 실패) / LOGBASE Patron 화면 P-03 2/2 (실패 사유 표시) | src/pages/models/ConnectionTestPanel.tsx:97 |
| P03-D4t | 상태 | 테스트 Timeout 결과 | `/models?model=google%2Fgemini-1.0-pro&section=test` | '연결 테스트 실행' (← P03-D4) | 02 기준서 v1.4 §3.5 실행 상태 / 03 설명 P-03 ⑤ | src/pages/models/ConnectionTestPanel.tsx:98 |
| P03-D5 | 패널 | 상태 관리 — ACTIVE 전환 불가 | `/models?model=mistralai%2Fmistral-large` | 상세 Drawer 하단 '상태 관리' 섹션 (← P03-D1) | 02 기준서 v1.4 §6.4-7·§6.5 / 03 설명 P-03 ⑥ (실패 모델 ACTIVE 전환 불가) | src/pages/models/ModelStatusSection.tsx:52 |
| P03-D5a | 상태 | ACTIVE 전환 완료 | `/models?model=meta-llama%2Fllama-3.1-70b-instruct` | 'ACTIVE로 전환' (← P03-D5) | 02 기준서 v1.4 §6.4-7·8 / §9 (P-03 → P-04 ACTIVE 모델 목록 반영) / LOGBASE Patron 화면 P-03 2/2 (연결 테스트 성공은 자동 활성화가 아님) | src/pages/models/ModelStatusSection.tsx:22 |
| P03-D5b | Modal | INACTIVE 전환 확인 | `/models?model=openai%2Fgpt-4o-mini` | 'INACTIVE로 전환' (← P03-D5) | 02 기준서 v1.4 §6.4-9·10 / design-spec P-03 4 (ConfirmDialog 문구) | src/pages/models/ModelStatusSection.tsx:81 |
| P03-D5c | 상태 | INACTIVE 모델 상태 관리 | `/models?model=anthropic%2Fclaude-3-haiku` | INACTIVE 전환 확인 후 / 목록에서 INACTIVE 모델 클릭 (← P03-D5b) | 02 기준서 v1.4 §6.5 (INACTIVE 관리자 재검증 가능) / LOGBASE Patron 화면 P-03 2/2 (비활성화 후에도 과거 이력 유지) | src/pages/models/ModelStatusSection.tsx:67 |

## P-04 Multi-LLM Simulator (/simulator) — 좌측 실행 설정 패널(420px) + 우측 실행 결과 2컬럼. SIM ID는 todayKst 기준으로 seed 생성(2026-10-23 기준 예: SIM-20261022-001). Request ID는 실행마다 REQ-YYYYMMDD-NNNNN으로 동적 발급. ACTIVE 모델(seed): GPT-4o, GPT-4o Mini, Claude 3.5 Sonnet, Gemini 1.5 Pro / TESTING 3개, INACTIVE 2개. Mock은 localStorage에 변경분을 영속 저장함.

| ID | 유형 | 화면 | URL | 진입 방법 | 근거 | 코드 |
|---|---|---|---|---|---|---|
| P04-S0a | 상태 | 기준 정보 로딩 | `/simulator` | 사이드바 'Multi-LLM Simulator' (P-04) (← ENTRY) | design-spec.md 07 States(Loading) | src/pages/simulator/SimulatorPage.tsx:194 |
| P04-S0b | 상태 | 기준 정보 불러오기 오류 | `/simulator` | 사이드바 'Multi-LLM Simulator' (← P04-S0a) | design-spec.md 07 States(Error) | src/pages/simulator/SimulatorPage.tsx:152 |
| P04-S1 | 페이지 | Multi-LLM Simulator 초기 화면 (실행 전) | `/simulator` | 사이드바 'Multi-LLM Simulator' (← P04-S0a) | 02 화면설계 기준서 v1.4 §7 / design-spec.md P-04 '초기 상태(실행 전)' | src/pages/simulator/SimulatorResults.tsx:21 |
| P04-S2 | 상태 | 시나리오 선택 (템플릿 자동 채움) | `/simulator` | '테스트 유형' Select → '상품 설명·마케팅 문구 생성' (또는 '비정형 텍스트 → JSON 변환') (← P04-S1) | 02 기준서 v1.4 §7.3·7.4, design-spec.md P-04 item 1 | src/pages/simulator/SimulatorConfigPanel.tsx:49 |
| P04-S2a | 상태 | 이미지 전제 시나리오 경고 (이미지 없음) | `/simulator` | '테스트 유형' → '상품 이미지·속성 분석' (← P04-S2) | 02 기준서 v1.4 §7.4 [확정] 이미지 지원 여부 검사·미지원 안내 P0 | src/pages/simulator/simulatorConfig.ts:174 |
| P04-S2b | 상태 | 이미지 첨부 미리보기 | `/simulator` | '이미지 선택' 버튼 → 파일 선택 (← P04-S2a) | design-spec.md P-04 item 2 | src/pages/simulator/ImageInputField.tsx:46 |
| P04-S2c | 상태 | 이미지 미지원 모델 차단 | `/simulator` | 이미지 첨부 상태에서 이미지 미지원 모델 체크 (← P04-S2b) | 02 기준서 v1.4 §7.8 '입력 유형 미지원 → 사전 안내', design-spec.md P-04 item 2 | src/pages/simulator/ImageInputField.tsx:69 |
| P04-S3 | 상태 | 모델 선택 (최대 4개 도달) | `/simulator` | '모델 선택 (ACTIVE)' 체크박스 4개 체크 (← P04-S1) | 02 기준서 v1.4 §7.3 모델 선택 2~4개, §7.8 '5개 이상 선택 → 실행 전 차단' | src/pages/simulator/ModelPicker.tsx:67 |
| P04-S3a | 상태 | ACTIVE 모델 없음 | `/simulator` | 사이드바 'Multi-LLM Simulator' (← P04-S1) | 설계 판단 | src/pages/simulator/ModelPicker.tsx:57 |
| P04-S4 | 상태 | 실행 전 검증 차단 (모델 수·Prompt) | `/simulator` | 모델 1개만 체크 / Prompt 입력 후 지우기 (← P04-S1) | 02 기준서 v1.4 §7.5 1~3, design-spec.md P-04 item 7 | src/pages/simulator/SimulatorConfigPanel.tsx:85 |
| P04-S4a | 상태 | JSON Schema 유효성 오류 | `/simulator` | 'JSON 출력 요구' 토글 ON → Schema에 잘못된 JSON 입력 (← P04-S2) | 02 기준서 v1.4 §7.3 JSON Schema 조건부, design-spec.md P-04 item 6 | src/pages/simulator/ParamsSection.tsx:65 |
| P04-S4b | 상태 | 실행 파라미터 범위 오류 | `/simulator` | Temperature 숫자 입력란에 범위 밖 값 입력 (← P04-S1) | 02 기준서 v1.4 §7.3 실행 파라미터, design-spec.md P-04 item 4 | src/pages/simulator/simulatorConfig.ts:207 |
| P04-S5 | 상태 | 실행 준비 완료 (검증 모두 통과) | `/simulator` | Prompt 입력 + 모델 2~4개 체크 (← P04-S2) | 02 기준서 v1.4 §7.6 비교 조건, design-spec.md P-04 items 5·7 | src/pages/simulator/simulatorConfig.ts:218 |
| P04-S5a | 상태 | 실행 시작 실패 (서버 재검증 오류) | `/simulator` | '비교 실행' (← P04-S5) | 설계 판단 (서버 측 재검증) | src/pages/simulator/SimulatorPage.tsx:179 |
| P04-S6 | 상태 | 병렬 실행 중 (RUNNING) | `/simulator?sim=SIM-20261023-001` | '비교 실행' (← P04-S5) | 02 기준서 v1.4 §7.5 5~8, design-spec.md P-04 item 9 | src/pages/simulator/SimulatorResults.tsx:57 |
| P04-S6a | 상태 | 실행 취소됨 (CANCELLED) | `/simulator?sim=SIM-20261023-001` | '실행 취소' (← P04-S6) | 설계 판단 (02 기준서 §7.8 실행 중단 상태 판정) | src/pages/simulator/SimulatorPage.tsx:90 |
| P04-S6b | 상태 | 실행 취소 실패 | `/simulator?sim=SIM-20261023-001` | '실행 취소' (← P04-S6) | 02 기준서 v1.4 §7.8 '서버 재시작으로 실행 중단 → 상태 복구·종료 판정' | src/pages/simulator/SimulatorPage.tsx:174 |
| P04-S7 | 상태 | 실행 완료·자동 저장 (전체 성공) | `/simulator?sim=SIM-20261023-001` | (자동) 모든 모델 응답 도착 (← P04-S6) | design-spec.md P-04 items 8·10·11·12, 02 기준서 §7.7 | src/pages/simulator/SimulatorPage.tsx:125 |
| P04-S8 | 상태 | 저장 결과 열기 (설정 채움) | `/simulator?sim=SIM-20261022-001` | URL 직접 진입 (?sim=) (← ENTRY) | 설계 판단 | src/pages/simulator/SimulatorPage.tsx:117 |
| P04-S8a | 상태 | 결과 조회 로딩 | `/simulator?sim=SIM-20261022-001` | URL 직접 진입 (?sim=) (← P04-S8) | design-spec.md 07 States(Loading) | src/pages/simulator/SimulatorResults.tsx:35 |
| P04-S8b | 상태 | 결과 조회 오류 / 없는 Simulation | `/simulator?sim=SIM-00000000-999` | URL 직접 진입 (?sim=) (← ENTRY) | design-spec.md 07 States(Error) | src/pages/simulator/SimulatorResults.tsx:28 |
| P04-S9 | 상태 | 결과: 부분 성공 (Timeout 포함) | `/simulator?sim=SIM-20261020-001` | URL 직접 진입 (?sim=) (← P04-S7) | 02 기준서 v1.4 §7.8 '모델 Timeout → TIMEOUT 기록, 비용 별도 확인', LOGBASE 화면 P-04 2/2 'Timeout 비용 0 USD 처리 금지' | src/features/simulation/ResultSummaryBar.tsx:22 |
| P04-S10 | 상태 | 결과: 전체 실패 | `/simulator?sim=SIM-20261018-001` | URL 직접 진입 (?sim=) (← P04-S7) | 02 기준서 v1.4 §7.8 '모든 모델 실패 → 전체 FAILED' | src/features/simulation/ModelResponseCard.tsx:78 |
| P04-S11 | 상태 | 결과: JSON·Schema 검증 실패 / 필수 필드 누락 | `/simulator?sim=SIM-20261021-001` | URL 직접 진입 (?sim=) (← P04-S7) | 02 기준서 v1.4 §7.8 'JSON 형식 오류 → 응답 보존·형식 검증 실패', §7.7 | src/features/simulation/ModelResultsTable.tsx:59 |
| P04-S12 | 상태 | 결과: 비교 조건 차이 노트 | `/simulator?sim=SIM-20261022-001` | URL 직접 진입 (?sim=) (← P04-S8) | 02 기준서 v1.4 §7.6 '미지원 설정이 있는 경우 비교 조건 차이를 표시' | src/features/simulation/ModelResponseCard.tsx:112 |
| P04-S13 | 상태 | 결과: 비용 미확인 포함 (이미지 실행) | `/simulator?sim=SIM-20261016-001` | URL 직접 진입 (?sim=) (← P04-S7) | LOGBASE 화면 P-04 2/2 '실행 결과와 비용 확인 상태는 별개' | src/features/simulation/ResultSummaryBar.tsx:59 |
| P04-M1 | Modal | 전체 응답 보기 | `/simulator?sim=SIM-20261022-001` | 응답 카드 하단 '전체 응답 보기' (← P04-S7) | design-spec.md P-04 item 11, LOGBASE 화면 P-04 2/2 '긴 응답은 전체 응답 보기 제공' | src/features/simulation/FullResponseModal.tsx:25 |
| P04-S14 | 상태 | 재실행 설정 복원 | `/simulator?from=SIM-20261022-001` | 결과 요약 바 '재실행' (← P04-S7) | design-spec.md P-04 '재실행 진입(/simulator?from=SIM-ID): 설정 복원 + 모델 검증 배너', 02 기준서 화면 연계 P-05 재실행→P-04 | src/pages/simulator/SimulatorPage.tsx:163 |
| P04-S14a | 상태 | 재실행 원본 로딩 / 불러오기 오류 | `/simulator?from=SIM-20261022-001` | 결과 요약 바 '재실행' (← P04-S7) | 설계 판단 | src/pages/simulator/SimulatorPage.tsx:156 |
| P04-S14b | 상태 | 재실행 복원: 제외된 모델 경고 | `/simulator?from=SIM-20261009-001` | 결과 요약 바 '재실행' / P-05 'P-04에서 열기' (← P04-S14) | 02 기준서 v1.4 화면 연계 '재실행 시 현재 ACTIVE 기준 재검증', design-spec.md P-04 | src/pages/simulator/simulatorConfig.ts:71 |
| P04-S14c | 상태 | 재실행 불가: 원본 입력 접근 불가 | `/simulator?from=SIM-20261002-001` | P-05 상세 'P-04에서 열기' (← P04-S14) | 설계 판단 (01 요구사항 v1.2 입력 버전/Hash 저장 원칙) | src/pages/simulator/simulatorConfig.ts:214 |
| P04-S14d | 상태 | 재실행 원본 없음 | `/simulator?from=SIM-00000000-999` | URL 직접 진입 (?from=) (← ENTRY) | 설계 판단 | src/pages/simulator/SimulatorPage.tsx:158 |
| P04-S15 | 상태 | P-05 재실행 모달 경유 자동 실행 | `/simulator?from=SIM-20261009-001&models=openai/gpt-4o,openai/gpt-4o-mini&run=1` | P-05 재실행 모달 '새 Simulation으로 실행' (← P05-RERUN-MODAL) | 03 화면설계 설명 P-05 재실행, SimulatorPage 주석 'spec P-05 item 4' | src/pages/simulator/SimulatorPage.tsx:101-116 (원본 설정이 화면에 적용된 뒤에만 실행: sourceRunReady) |
| P04-S15a | 상태 | 자동 실행 건너뜀 | `/simulator?from=SIM-20261002-001&run=1` | URL 직접 진입 (?run=1) (← P04-S15) | 설계 판단 | src/pages/simulator/SimulatorPage.tsx:103 |

## P-05 시뮬레이션 결과 이력 (/simulations, /simulations/:simulationId) — 실행 이력 검색, 행 확장, 상세, 전체 응답 Modal, 재실행 Modal에서 P-04로 넘어가는 흐름. Seed ID는 오늘 날짜(todayKst = 2026-10-23)를 기준으로 생성되므로 날짜가 바뀌면 SIM/REQ ID의 날짜 부분도 함께 바뀜. 기본 조회 기간은 2026-09-24 ~ 2026-10-23(최근 30일)이며, SIM-20260918-001은 이 기간 밖이라 목록에 나오지 않고 링크로만 들어갈 수 있음.

| ID | 유형 | 화면 | URL | 진입 방법 | 근거 | 코드 |
|---|---|---|---|---|---|---|
| P05-S1 | 페이지 | 시뮬레이션 결과 이력 (기본 목록) | `/simulations` | 좌측 사이드바 '시뮬레이션 결과 이력' (또는 P-04 헤더 '실행 이력') (← GLOBAL-NAV) | 02 기준서 v1.4 §8.2~8.5 / 03 설명 P-05 ①② / 01 요구사항 P-05 / design-spec §P-05 1·2 / LOGBASE 화면 P-05 1/2 01·02 | src/pages/simulations/SimulationHistoryPage.tsx:18 |
| P05-S1-L | 상태 | 이력 목록 로딩 | `/simulations` | 페이지 진입 직후 또는 [조회] 클릭 (← P05-S1) | design-spec §5 상태 매트릭스 Loading | src/pages/simulations/SimulationHistoryPage.tsx:121 |
| P05-S1-F | 상태 | 필터 적용 결과 (상태·시나리오) | `/simulations?status=FAILED` | 필터 '실행 상태'에서 '실패'를 고르고 [조회] (← P05-S1) | 02 기준서 §8.3 입력 항목, §8.6 비용 미확인 / 03 설명 P-05 ①④ ('실패 실행 비용을 0 USD로 처리하지 않음') | src/pages/simulations/SimulationHistoryFilters.tsx:20 ; src/pages/simulations/SimCells.tsx:15 |
| P05-S1-V | 상태 | 조회 기간 오류 (검증 차단) | `/simulations?start=2026-10-23&end=2026-10-01` | 기간 시작일을 종료일보다 늦게 입력하고 [조회] (← P05-S1) | design-spec §5 Validation Error / 01 요구사항 공통 정책(기본 기간 최근 30일) | src/pages/simulations/SimulationHistoryPage.tsx:115 ; src/domain/aggregate.ts:124 |
| P05-S1-E | 상태 | 조회 결과 없음 (빈 상태) | `/simulations?sim=SIM-00000000-999` | Simulation ID에 존재하지 않는 값을 넣고 [조회] (← P05-S1) | 02 기준서 §8.6 '과거 기록 없음 → 조회 결과 없음' / 01 요구사항 공통 정책 '조회 결과 없음은 정상 빈 상태' | src/pages/simulations/SimulationTable.tsx:110 |
| P05-S1-X | 상태 | 이력 조회 실패 | `/simulations` | (Mock) 사이드바 'Mock 환경 설정' → '다음 조회 1회 실패' ON → [조회] (← P05-S1) | 02 기준서 §8.6 '이력 조회 실패 → 조회 실패 안내' | src/pages/simulations/SimulationTable.tsx:107 ; src/api/mock/MockPatronApi.ts:146 |
| P05-S1-R | 상태 | 기준 데이터 로드 실패 (부분 실패) | `/simulations` | (Mock) '다음 조회 1회 실패' ON → 브라우저 새로고침 (← P05-S1) | design-spec §5 Partial(일부 섹션 실패 InlineAlert) | src/pages/simulations/SimulationHistoryPage.tsx:101 |
| P05-S1-I | 상태 | 현재 비활성 모델 포함 행 | `/simulations` | 목록에서 해당 행의 비활성 칩에 마우스 오버 (← P05-S1) | 02 기준서 §8.6 '비활성 모델 포함 → 결과 조회 허용' / §8.7 '비활성 모델 이력 보존' | src/pages/simulations/SimCells.tsx:37 |
| P05-S2 | 패널 | 행 확장 — 모델별 Request 미니 행 | `/simulations` | 목록 행 왼쪽 확장 토글(▸) (← P05-S1) | 03 설명 P-05 ② ('Simulation 1건 아래 모델별 Request 3건 연결') / design-spec §P-05 2 / LOGBASE 화면 P-05 02 | src/pages/simulations/SimulationTable.tsx:109 ; src/pages/simulations/SimulationRequestRows.tsx:14 |
| P05-X1 | Drawer | 공통 호출 상세 Drawer (F-05) | `/simulations?request=REQ-20261020-05108` | Request ID 링크(예: 'REQ-20261020-05108') 클릭 (← P05-S2) | design-spec §F-05 공통 호출 상세 Drawer / §P-05 3 '각 Request ID → 공통 Drawer' | src/features/shared/cells.tsx:172 ; src/features/request-detail/RequestDetailProvider.tsx:15 |
| P05-M1 | Modal | 재실행 — 새 Simulation 으로 실행 (정상) | `/simulations` | 목록 행 액션 '재실행' (← P05-S1) | 02 기준서 §8.4 5·7·8 / 03 설명 P-05 ⑥ / design-spec §P-05 4 / LOGBASE 화면 P-05 1/2 05 | src/pages/simulations/RerunModal.tsx:30 ; src/pages/simulations/RerunSettingsSummary.tsx:5 |
| P05-M1-L | 상태 | 재실행 Modal 로딩 | `/simulations` | '재실행' 클릭 직후 (← P05-M1) | design-spec §5 Loading / Disabled(사유 툴팁) | src/pages/simulations/RerunModal.tsx:111 |
| P05-M1-B | 상태 | 재실행 차단 — 비활성 모델 제외로 2개 미만 | `/simulations` | 비활성 모델이 포함된 행의 '재실행' (← P05-S1) | 02 기준서 §8.4 6 + [설계안] '2개 미만이면 재실행 불허' / §8.6 '비활성 모델 포함 → 재실행 시 교체·제외' / LOGBASE 화면 P-05 2/2 검증 기준 | src/pages/simulations/RerunModal.tsx:68 ; src/pages/simulations/RerunModal.tsx:188 |
| P05-M1-C | 상태 | 재실행 — 비활성 모델 교체 후 통과 | `/simulations` | 비활성 모델 행의 교체 Select에서 ACTIVE 모델 선택 (← P05-M1-B) | 02 기준서 §8.2 '비활성 모델 대체·제외 후 재실행' / 03 설명 P-05 ⑥ 5 | src/pages/simulations/RerunModal.tsx:170 |
| P05-M1-N | 상태 | 재실행 차단 — 원본 입력 없음 | `/simulations` | 원본 입력이 삭제된 행의 '재실행' (← P05-S1) | 02 기준서 §8.6 '입력 참조 누락 → 재실행 제한 및 사유 안내' / 03 설명 P-05 ⑥ / LOGBASE 화면 P-05 2/2 '원본 입력 없으면 재실행 제한' | src/pages/simulations/RerunModal.tsx:70 |
| P05-M1-X | 상태 | 재실행 Modal 조회 실패 / 기준 데이터 실패 | `/simulations` | (Mock) '다음 조회 1회 실패' ON → '재실행' (← P05-M1) | 02 기준서 §8.6 '이력 조회 실패' · '모델 삭제·미지원 → 신규 실행 불가 안내' | src/pages/simulations/RerunModal.tsx:114 ; src/pages/simulations/RerunModal.tsx:119 |
| P05-M1-T | 상태 | 재실행 확인 → 복원 진행 토스트 | `/simulator?from=SIM-20261022-001&models=openai/gpt-4o,anthropic/claude-3.5-sonnet,google/gemini-1.5-pro&run=1` | '새 Simulation으로 실행' (← P05-M1) | 02 기준서 §9 연동 계약 'P-05 재실행 → P-04 (Prompt, 입력, 실행 설정, 모델)' / §8.7 '과거 기록 변경 없음' | src/pages/simulations/RerunModal.tsx:76 ; src/pages/simulations/simulationRows.ts:93 |
| P05-D1 | 페이지 | 시뮬레이션 상세 (재실행 건) | `/simulations/SIM-20261022-001` | 목록 행 Simulation ID 링크 또는 액션 '상세' (← P05-S1) | 02 기준서 §8.4 2·3·4, §8.5 / 03 설명 P-05 ⑤ / design-spec §P-05 3 / LOGBASE 화면 P-05 1/2 03 | src/pages/simulations/SimulationDetailPage.tsx:15 ; src/features/simulation/ResultSummaryBar.tsx:16 |
| P05-D1-L | 상태 | 상세 로딩 | `/simulations/SIM-20261022-001` | 상세 진입 직후 (← P05-D1) | design-spec §5 Loading(skeleton) | src/pages/simulations/SimulationDetailPage.tsx:63 |
| P05-D1-N | 상태 | 상세 — Simulation 을 찾을 수 없음 | `/simulations/SIM-00000000-999` | 존재하지 않는 ID로 직접 접근 (← P05-S1) | 02 기준서 §8.6 '과거 기록 없음' | src/pages/simulations/SimulationDetailPage.tsx:72 |
| P05-D1-X | 상태 | 상세 조회 실패 | `/simulations/SIM-20261022-001` | (Mock) '다음 조회 1회 실패' ON → 상세 진입 (← P05-S1) | 02 기준서 §8.6 '이력 조회 실패 → 조회 실패 안내' | src/pages/simulations/SimulationDetailPage.tsx:72 ; src/features/simulation/useSimulationDetail.ts:56 |
| P05-D1-O | 페이지 | 시뮬레이션 상세 (재실행 원본, 기본 기간 밖) | `/simulations/SIM-20260918-001` | 재실행 배너 또는 실행 조건 '재실행 원본'의 'SIM-20260918-001' 링크 (← P05-D1) | 02 기준서 §8.7 '재실행 시 새 Simulation ID 생성·과거 기록 변경 없음' / LOGBASE 화면 P-05 2/2 (SIM-001 과거 실행 보존 → SIM-002 신규) | src/pages/simulations/SimulationDetailPage.tsx:128 ; src/pages/simulations/RunConditionsCard.tsx:75 |
| P05-D2 | 페이지 | 시뮬레이션 상세 — 부분 성공 (Timeout) | `/simulations/SIM-20261020-001` | 목록 SIM-20261020-001 링크 (← P05-S1) | 03 설명 P-05 ③④ / 02 기준서 §8.5 '개별·전체 상태' / design-spec §5 Timeout·Unknown Cost | src/features/simulation/ModelResultsTable.tsx:17 ; src/features/simulation/ModelResponseCard.tsx:78 |
| P05-D3 | 페이지 | 시뮬레이션 상세 — 전체 실패 | `/simulations/SIM-20261018-001` | 목록 SIM-20261018-001 링크 (← P05-S1-F) | 03 설명 P-05 ④ '실패 실행 비용을 0 USD로 처리하지 않음' / 01 요구사항 P-05 출력 '실행 오류' | src/features/simulation/ResultSummaryBar.tsx:22 ; src/features/simulation/ModelResponseCard.tsx:128 |
| P05-D4 | 페이지 | 시뮬레이션 상세 — JSON·Schema 검증 결과 | `/simulations/SIM-20261021-001` | 목록 SIM-20261021-001 링크 (← P05-S1) | 02 기준서 §8.5 'JSON·Schema 검증 결과' / 03 설명 P-05 ④ '추정 포함 명시' | src/features/simulation/ModelResultsTable.tsx:39 ; src/pages/simulations/RunConditionsCard.tsx:70 |
| P05-D5 | 페이지 | 시뮬레이션 상세 — 현재 비활성 모델 포함 | `/simulations/SIM-20261009-001` | 목록 SIM-20261009-001 링크 (← P05-S1-I) | 02 기준서 §8.4 4 '과거 모델 상태와 현재 상태 구분' / §8.6 / 03 설명 P-05 ⑤ / design-spec §P-05 3 '현재 INACTIVE' | src/pages/simulations/SimulationDetailPage.tsx:120 ; src/features/simulation/cells.tsx:10 |
| P05-D6 | 페이지 | 시뮬레이션 상세 — 원본 입력 접근 불가 | `/simulations/SIM-20261002-001` | 목록 SIM-20261002-001 링크 (← P05-S1) | 02 기준서 §8.5 '재실행 가능 여부' / §8.6 '입력 참조 누락' | src/pages/simulations/RunConditionsCard.tsx:65 |
| P05-D7 | 페이지 | 시뮬레이션 상세 — 이미지 입력·비용 미확인 | `/simulations/SIM-20261016-001` | 목록 SIM-20261016-001 링크 (← P05-S1) | 02 기준서 §8.6 '비용 미확인 → 당시 비용 상태 유지' / §8.5 'Prompt 및 입력 참조' | src/pages/simulations/RunConditionsCard.tsx:40 |
| P05-D8 | 상태 | 시뮬레이션 상세 — 실행 중 (RUNNING) | `/simulations/SIM-20261023-001` | P-04 실행 중 결과 상단 '이력에서 보기' (← P05-X2) | 03 설명 P-05 ③ RUNNING / ④ 확인 중 | src/features/simulation/ModelResponseCard.tsx:66 ; src/features/simulation/useSimulationDetail.ts:38 |
| P05-D-RF | 상태 | 상세 — 기준 데이터 로드 실패 | `/simulations/SIM-20261009-001` | (Mock) '다음 조회 1회 실패' ON → 상세 새로고침 (← P05-D5) | design-spec §5 Partial | src/pages/simulations/SimulationDetailPage.tsx:102 |
| P05-M2 | Modal | 전체 응답 보기 | `/simulations/SIM-20261022-001` | 응답 카드 하단 '전체 응답 보기' (← P05-D1) | 03 설명 P-05 ⑤ '원본 응답' / design-spec §P-04 11 [전체 응답 보기] → Modal(원문 보존, monospace, 복사) | src/features/simulation/FullResponseModal.tsx:25 ; src/features/simulation/ModelResponseCard.tsx:128 |
| P05-M3 | Modal | 재실행 Modal (상세에서) | `/simulations/SIM-20261009-001` | 상세 헤더 또는 요약 바 '재실행' (← P05-D5) | 03 설명 P-05 ⑥ 처리 흐름 1~2 '과거 Simulation 상세 조회 → 재실행 선택' | src/pages/simulations/SimulationDetailPage.tsx:94 ; src/pages/simulations/SimulationDetailPage.tsx:150 |
| P05-X2 | 페이지 | Multi-LLM Simulator (P-04, 영역 밖) | `/simulator?from=SIM-20261022-001` | 'P-04에서 열기' / '새 Simulation으로 실행' / '새 비교 실행' / 'Simulator 열기' (← P05-D1) | 02 기준서 §9 'P-05 재실행 → P-04' / design-spec §P-04 '재실행 진입 /simulator?from=SIM-ID' | src/pages/simulations/SimulationDetailPage.tsx:91 ; src/pages/simulator/SimulatorPage.tsx:49 |

## F-05 공통 호출 상세 Drawer + 앱 Shell(사이드바/헤더/Mock 환경 설정/라우팅)

| ID | 유형 | 화면 | URL | 진입 방법 | 근거 | 코드 |
|---|---|---|---|---|---|---|
| SH-01 | 상태 | 루트 진입 리다이렉트 | `/ → /customers` | 브라우저 주소 / 직접 입력 또는 사이드바 로고 'LOGBASE Patron' 클릭 (← 진입) | design-spec.md §1.5 공통 레이아웃 / 02 화면설계 기준서 v1.4 §2.2 화면 목록 | src/App.tsx:27 |
| SH-02 | 페이지 | 공통 레이아웃 (사이드바 펼침 + 헤더) | `/customers` | SH-01 리다이렉트 후 자동 표시 (← SH-01) | design-spec.md §1.5 공통 레이아웃 / 02 화면설계 기준서 v1.4 §2.2 화면 목록 | src/components/layout/AppShell.tsx:181 |
| SH-03 | 상태 | 사이드바 아이콘 모드 (접힘) | `/customers` | 사이드바 상단 '메뉴 접기' 아이콘 버튼 클릭 (다시 '메뉴 펼치기'로 복원) — 또는 창 폭 <1024px 시 자동 (← SH-02) | design-spec.md §1.5 공통 레이아웃 (좁은 화면 64px 아이콘 모드, <1024px) | src/components/layout/AppShell.tsx:46 |
| SH-04 | 상태 | 화면 로딩 스켈레톤 | `/customers (또는 /internal, /models, /simulator, /simulations 첫 진입)` | 사이드바 메뉴 최초 클릭 (lazy 화면 chunk 로딩 중) (← SH-02) | design-spec.md §5 상태 매트릭스 (Loading skeleton) | src/features/shared/PageSkeleton.tsx:3 |
| SH-05 | 패널 | Mock 환경 설정 패널 | `/customers` | 사이드바 하단 'Mock 환경 설정' 클릭 (▼/▲ 토글) (← SH-02) | 02 화면설계 기준서 v1.4 §10 Mock 데이터 및 검증 데이터 / design-spec.md §1.5 (하단 Mock 환경 배지) | src/features/shared/MockControlsPanel.tsx:11 |
| SH-06 | 상태 | 다음 조회 1회 실패 ON | `/customers` | Mock 환경 설정 패널의 '다음 조회 1회 실패' 토글 ON (← SH-05) | 01 요구사항 v1.2 §5 공통 화면 정책 (데이터 수집 실패: 오류 상태로 별도 표시) | src/features/shared/MockControlsPanel.tsx:34 |
| SH-07 | 상태 | Seed 데이터 초기화 | `현재 URL 그대로 새로고침` | Mock 환경 설정 패널의 'Seed 데이터 초기화' 클릭 (확인 대화상자 없음) (← SH-05) | 02 화면설계 기준서 v1.4 §10.3 검증 데이터 구분 (Seed/Mock) | src/features/shared/MockControlsPanel.tsx:43 |
| SH-08 | 상태 | 알 수 없는 경로 리다이렉트 | `/unknown-path → /customers` | 주소창에 존재하지 않는 경로 직접 입력 (← SH-02) | 설계 판단 | src/App.tsx:92 |
| F05-S1 | 상태 | 공통 호출 상세 Drawer — 로딩 | `/customers?request=REQ-20261023-05028` | 아무 화면의 상세 이력 테이블에서 Request ID(파란 mono 링크) 클릭 (← SH-02) | design-spec.md §4 F-05 공통 호출 상세 Drawer (전역 ?request=REQ-ID) / §5 상태 매트릭스 Loading | src/features/request-detail/RequestDetailDrawer.tsx:90 |
| F05-S2 | Drawer | 공통 호출 상세 — 고객 호출 단일 성공 (확정 비용) | `/customers?request=REQ-20261023-05028` | P-01 상세 API 호출 이력의 Request ID 'REQ-…05028' 클릭 (← F05-S1) | design-spec.md §4 F-05 / 02 화면설계 기준서 v1.4 §9 화면 간 연동 계약 (P-01 상세 조회 → 공통 호출 상세, request_id) / §3.4 공통 AI 호출 데이터 계약 | src/features/request-detail/RequestDetailDrawer.tsx:105 |
| F05-S3 | Drawer | 공통 호출 상세 — 재시도 호출 (2회차) | `/customers?request=REQ-20261023-05014` | P-01 상세 이력에서 재시도 호출의 Request ID 'REQ-…05014' 클릭 (← F05-S1) | 02 화면설계 기준서 v1.4 §3.9 불변조건 3 (재시도는 새 요청으로 기록·원 요청과 연결) / 01 요구사항 v1.2 §3.2 AIRequest 공통 필드 parent_request_id / design-spec.md §4 F-05 (재시도 체인 목록) | src/features/request-detail/RetryChainList.tsx:14 |
| F05-S4 | Drawer | 공통 호출 상세 — 재시도 원 요청 (1회차 실패) | `/customers?request=REQ-20261023-05013` | F05-S3에서 '재시도 원 요청 보기' 버튼 또는 parent 링크 'REQ-20261023-05013' 또는 체인 행 '1회차' 클릭 (← F05-S3) | 02 화면설계 기준서 v1.4 §3.5 실행 상태 / §3.9 불변조건 4 (실패·Timeout 이력 보존) / §3.7 비용 상태 및 집계 | src/features/request-detail/RequestDetailDrawer.tsx:79 |
| F05-S5 | 상태 | 공통 호출 상세 — Timeout 호출 | `/customers?request=REQ-20261023-05037` | P-01 상세 이력에서 실행 상태 Timeout 행의 Request ID 클릭 (← F05-S1) | 02 화면설계 기준서 v1.4 §3.5 실행 상태 / design-spec.md §5 상태 매트릭스 Timeout(요청 레벨) | src/features/request-detail/RequestDetailSections.tsx:167 |
| F05-S6 | 상태 | 공통 호출 상세 — 비용 미확인 (성공 호출) | `/customers?request=REQ-20261022-04945` | P-01 상세 이력에서 비용 '미확인' 행의 Request ID 클릭 (← F05-S1) | 02 화면설계 기준서 v1.4 §3.7 비용 상태 및 집계 / 01 요구사항 v1.2 §5 (비용 상태 확정·추정·미확인 구분) | src/features/request-detail/RequestDetailSections.tsx:195 |
| F05-S7 | 상태 | 공통 호출 상세 — 추정 비용 + 실제 Provider 미확인 | `/customers?request=REQ-20261023-05027` | P-01 상세 이력에서 비용 상태 '추정' 행의 Request ID 클릭 (← F05-S1) | 02 화면설계 기준서 v1.4 §3.7 비용 상태 및 집계 (추정 포함 명시) | src/features/request-detail/RequestDetailSections.tsx:105 |
| F05-S8 | Drawer | 공통 호출 상세 — 내부 개발 호출 (구성원 미분류) | `/internal?request=REQ-20261023-05081` | P-02 상세 API 사용 이력에서 Request ID(전체 표시) 클릭 (← F05-S1) | 02 화면설계 기준서 v1.4 §9 (P-02 상세 조회 → 공통 호출 상세) / §5.4 처리 규칙 4 (사용자 식별 불가 시 미분류) | src/features/request-detail/RequestDetailSections.tsx:77 |
| F05-S9 | 상태 | 공통 호출 상세 — 프로젝트 미귀속(Legacy Key) 호출 | `/internal?request=REQ-20261023-05098` | P-02 상세 이력에서 프로젝트 미분류 행의 Request ID 클릭 (← F05-S1) | 02 화면설계 기준서 v1.4 §5.4 처리 규칙 4 / 01 요구사항 v1.2 §2 공통 식별 및 API Key 정책 (Key 원문 노출 금지) | src/features/request-detail/RequestDetailSections.tsx:90 |
| F05-S10 | 상태 | 공통 호출 상세 — 취소 호출 | `/internal?request=REQ-20261020-04805` | P-02 상세 이력에서 실행 상태 '취소' 행의 Request ID 클릭 (← F05-S1) | 02 화면설계 기준서 v1.4 §3.5 실행 상태 | src/features/request-detail/RequestDetailSections.tsx:167 |
| F05-S11 | Drawer | 공통 호출 상세 — 시뮬레이션 호출 + 검증 결과 | `/simulations/SIM-20261021-001?request=REQ-20261021-05103` | P-05 상세 모델별 결과 비교표 또는 응답 카드의 Request ID 클릭 (← F05-S1) | design-spec.md §4 F-05 (검증: json/schema 결과, 시뮬레이션 결과일 때) / §4 P-05 상세 (각 Request ID → 공통 Drawer) | src/features/request-detail/RequestDetailSections.tsx:224 |
| F05-S12 | 상태 | 공통 호출 상세 — 시뮬레이션 호출 Timeout (검증 미실행) | `/simulations/SIM-20261020-001?request=REQ-20261020-05108` | P-05 상세(일부 성공)에서 Timeout 모델의 Request ID 클릭 (← F05-S1) | 02 화면설계 기준서 v1.4 §3.6 시뮬레이션 전체 상태 / §3.5 실행 상태 | src/features/request-detail/RequestDetailSections.tsx:224 |
| F05-S13 | 상태 | 공통 호출 상세 — 실행 중 시뮬레이션 호출 | `/simulator?request=<실행 중 REQ-ID>` | P-04 실행 직후 결과 카드의 Request ID 클릭 (← F05-S1) | 02 화면설계 기준서 v1.4 §9 (P-04 시뮬레이션 실행 → F-05 SIMULATION 호출 이력) / §3.5 실행 상태 | src/api/mock/MockPatronApi.ts:549 |
| F05-S14 | Drawer | 공통 호출 상세 — 연결 테스트 실패 (SYSTEM_TEST) | `/models?request=REQ-TEST-00006` | P-03 모델 상세 Drawer 연결 테스트 섹션의 Request ID 클릭 (Drawer → Drawer 전환) (← F05-S1) | 02 화면설계 기준서 v1.4 §9 (P-03 연결 테스트 → F-05 SYSTEM_TEST 호출 이력) / design-spec.md §4 P-03 모델 상세 Drawer | src/pages/models/ConnectionTestPanel.tsx:135 |
| F05-S15 | 상태 | 공통 호출 상세 — 호출을 찾을 수 없음 (Empty) | `/customers?request=REQ-NOT-EXIST` | 잘못된/만료된 ?request= 값이 담긴 URL 공유 링크 직접 열기 (← SH-02) | 01 요구사항 v1.2 §5 공통 화면 정책 (조회 결과 없음 정상적인 빈 상태) / 03 화면설계 설명 §5 공통 화면 동작 (빈 데이터와 조회 실패 구분) | src/features/request-detail/RequestDetailDrawer.tsx:94 |
| F05-S16 | 상태 | 공통 호출 상세 — 조회 실패 (Error) | `/customers?request=REQ-20261023-05028` | Mock '다음 조회 1회 실패' ON 상태에서 Request ID 클릭 (← SH-06) | 01 요구사항 v1.2 §5 (데이터 수집 실패 오류 상태로 별도 표시) / design-spec.md §5 상태 매트릭스 Error(재시도) | src/features/request-detail/RequestDetailDrawer.tsx:91 |
| F05-S17 | 상태 | 공통 호출 상세 — 검증 결과 조회 실패 (Partial) | `/simulations/SIM-20261021-001?request=REQ-20261021-05103` | 시뮬레이션 호출 Request ID 클릭 시 getSimulation만 실패한 경우 (← F05-S11) | design-spec.md §5 상태 매트릭스 Partial(일부 섹션 실패 InlineAlert) | src/features/request-detail/RequestDetailDrawer.tsx:114 |
| F05-S18 | 상태 | 공통 호출 상세 — 검증 결과 없음 (Partial) | `/simulations/<SIM-ID>?request=<REQ-ID>` | simulation_id가 있으나 결과 레코드가 없는 호출의 Request ID 클릭 (← F05-S11) | 설계 판단 | src/features/request-detail/RequestDetailDrawer.tsx:119 |

## 누락 보완 (검토 결과)

- [P-02 프로젝트 상세] 프로젝트 상세 — 재조회 실패 (마지막 성공 기준 표시) — 프로젝트 상세에서 필터 변경 후 [조회] (Mock 실패 ON) (`/internal/projects/PRJ-001`)
- [P-02 프로젝트 상세] 프로젝트 상세 — 최초 조회 실패 (ErrorState) — Mock 실패 ON 후 프로젝트명 클릭으로 진입 (`/internal/projects/PRJ-001`)
- [P-02 프로젝트 상세] 프로젝트 상세 — 조회 기간 오류 — 잘못된 기간 URL 직접 진입 (`/internal/projects/PRJ-001?start=2026-10-23&end=2026-10-01`)
- [P-02 프로젝트 상세] 프로젝트 상세 — 비용 미확인만 보기 — KPI '비용 미확인 호출' 카드 클릭 (projectMode KPI는 미분류 카드 클릭 없음) (`/internal/projects/PRJ-001`)
- [P-02 프로젝트 상세] 구독료 편집 Drawer (프로젝트 상세에서) — 프로젝트 상세 '구독료 관리' 목록의 도구명 링크 (`/internal/projects/PRJ-001`)
- [P-02 프로젝트 상세] 프로젝트 상세 — 예산 수정 저장 완료 (Toast) — '예산 수정' Drawer에서 [저장] (`/internal/projects/PRJ-001`)
- [P-04 Simulator] JSON 모드 미지원 모델 경고 — 'JSON 출력 요구' ON + JSON 미지원 모델 체크 (`/simulator`)
- [P-04 Simulator] 실행 전 검증 — ACTIVE 아닌 모델 선택됨 — 모델 선택 후 다른 탭/P-03에서 해당 모델 INACTIVE 전환 후 돌아옴 (`/simulator`)
- [P-05 이력] 취소된 시뮬레이션 (CANCELLED) 목록 행·상세 — P-04에서 실행 직후 '실행 취소' → 사이드바 '시뮬레이션 결과 이력' (`/simulations?status=CANCELLED`)
- [P-05 이력] 실행 중 (RUNNING) 목록 행 — P-04 실행 중 헤더 '실행 이력' (`/simulations`)
- [P-01 고객 상세] 고객 상세 — 상세 이력 전체보기 / 정렬 — 상세 이력 [전체보기 (N)] (`/customers/C-001?historySort=requested_at:desc`)
- [Shell] 헤더 Breadcrumb 링크 (상세 → 목록) — 헤더 Breadcrumb 첫 항목 클릭 (`/customers/C-001, /internal/projects/:id, /simulations/:id`)

## 기능 간 연결

- P03-D5a (ACTIVE 전환) → P04-S1 모델 선택 (ACTIVE) 목록: Sidebar 'Multi-LLM Simulator'. Data link only: the model appears as a checkbox and the excluded caption count drops
- P03-D5a (ACTIVE 전환) → P05-M1-C 재실행 Modal 교체 Select 옵션: The newly ACTIVE model becomes a replacement option for INACTIVE models
- P03-D5c (INACTIVE 전환) → P05-S1-I / P05-D5 '현재 비활성' 배지: Data link. Past runs that used the model show the '현재 비활성' badge, and rerun goes into the replace-or-exclude flow (P05-M1-B)
- P03-D5c (INACTIVE 전환) → P04-S14b 재실행 복원 제외 경고 / P04-S1 제외된 모델 캡션: /simulator?from= with an original that includes the model
- P03-D4s/D4f/D4t (연결 테스트 실행) → P02-S1 상세 API 사용 이력 (?origin=SYSTEM_TEST): Sidebar '내부 AI 예산 관리' → 호출 출처 '테스트' → [조회]. The new SYSTEM_TEST call (PRJ-TEST, 실행자 관리자) is counted
- P03-D4s (연결 테스트 실행) → P02-D4 /internal/projects/PRJ-TEST 출처별 비용 구성·상세 이력: Project name '모델 연결 테스트'. The test cost lands in the PRJ-TEST budget, so the 미설정 state shows a used amount
- P03-D4s (Toast '호출 상세 보기') → F05-S14 SYSTEM_TEST 호출 상세: Toast action, or the Request ID in the 연결 테스트 section. The F-05 Drawer opens over the model detail Drawer
- P04-S7 (시뮬레이션 실행) → P02-D3 /internal/projects/PRJ-POC · P02-S1 (?origin=SIMULATION): Data link. SIMULATION calls count toward the Patron PoC project budget and cost-by-origin
- P04-S7 (시뮬레이션 실행) → P01-S1 (미반영): Doc 02 T-02: Simulator calls are not included in P-01 customer cost (P-01 shows CUSTOMER_SERVICE only). Mark this as a negative link
- P04-S6 (실행 중) → F05-S13 실행 중 호출 상세: Request ID on a response card or in the comparison table
- P04-S6a (실행 취소) → P05-S1 ?status=CANCELLED: Sidebar '시뮬레이션 결과 이력' → 상태 '취소'
- P05-D1/D2/D3/D4/D5/D7 비교표·응답 카드 → F05-S11 / F05-S12 시뮬레이션 호출 상세: Request ID click (RequestIdCell in ModelResultsTable.tsx:90 and ModelResponseCard.tsx:125)
- F05-S11 Simulation ID 링크 / '시뮬레이션 상세 보기' → P05-D1..D8 /simulations/:id: Button or link. ?request is removed
- F05-S3 parent_request_id 링크·'재시도 원 요청 보기' → F05-S4: onNavigate pushes ?request=parent. Browser back returns to the previous call
- F05 재시도 체인 행 → F05-S2/S3/S4/S5 (다른 회차): Click a chain row (RetryChainList onNavigate)
- P02-S1/P02-D1 상세 API 사용 이력 → F05-S8 / F05-S9 / F05-S10: Request ID click (internal, unclassified and cancelled calls)
- P01-S1/P01-S2 상세 API 호출 이력 → F05-S2..S7: Request ID click (customer calls)
- P02-S1 프로젝트별 예산 현황 'Patron PoC' → P02-D3 (P-04 SIMULATION 비용 포함): Project name link
- P05-S1-E 'Simulator 열기' / P05-S1 '새 비교 실행' → P04-S1: navigate('/simulator')
- P04-S1 헤더 '실행 이력' → P05-S1: navigate('/simulations')

## 정정 사항

- 영역마다 F-05 노드 ID 가 달랐습니다 (P-01/P-04 'F05-DRAWER', P-02 'P02-S15'/'P02-D12', P-03 'F-05', P-05 'P05-X1'). 모두 전역 RequestDetailDrawer 하나(RequestDetailProvider.tsx:47)이므로 F05-S1(로딩), F05-S2..S18 로 통일합니다.
- P-04 전환이 없는 노드를 가리켰습니다. 'P05-DETAIL' → P05-D1 (실행 중이면 P05-D8), 'P05-LIST' → P05-S1, 'P05-RERUN-MODAL' → P05-M1/P05-M1-T. P-05 의 'P05-X2'(P-04 대용)는 ?from= 이면 P04-S14, run=1 흐름이면 P04-S15 입니다.
- P-03 의 'P-04'·'P-02', P-04 의 'P03' 전환 대상은 각각 P04-S1(모델 목록), P02-S1(?origin=SYSTEM_TEST), P03-S1 입니다.
- P04-S3a → P03 트리거 "안내 문구 'AI 모델 관리'"는 틀렸습니다. ModelPicker.tsx:58 의 문구는 링크가 없는 <p> 이므로 P-03 으로 가는 길은 사이드바 'AI 모델 관리'뿐입니다.
- F05-S5/F05-S6 재현 방법의 'P-01에서 실행 상태=Timeout 필터' / '비용 상태=미확인 필터'는 없는 기능입니다. P-01 필터는 기간·고객·서비스·모델·집계 단위뿐입니다. 실제 경로는 열 정렬(실행 상태 / 비용 상태)과 KPI '비용 미확인 건수' 카드(?cost=UNKNOWN, Timeout 행 포함)입니다.
- P02-D1 은 '← 내부 AI 예산 관리로 돌아가기' 링크가 프로젝트를 찾지 못한 경우에도 보인다고 했습니다. ProjectDetailPage.tsx:139-148 은 ErrorState 만 반환하므로 P02-D6 에는 뒤로 가기 링크와 필터 바가 없고, [기준 정보 다시 불러오기] 버튼은 ref.reload 를 호출합니다.
- P03-D4s 는 실행 중 연결 테스트의 Request ID 가 REQ-TEST-NNNNN 이라고 했습니다. REQ-TEST-0000x 는 seed 의 last_test 만 씁니다. 실제 테스트는 newRequestId() → REQ-YYYYMMDD-NNNNN 이며 usage_origin SYSTEM_TEST, 프로젝트 PRJ-TEST, user_id = 현재 관리자, key K-TEST 로 기록됩니다 (MockPatronApi.ts:345-372).
- 문서 02 §9 'P-03 모델 등록 완료 → P-04 ACTIVE 모델 목록에 반영'은 바로 일어나지 않습니다. 등록하면 TESTING 모델이 생기고(RegisterModelDrawer.tsx:62), 연결 테스트 성공과 P03-D5a(ACTIVE 전환) 뒤에야 P-04 모델 목록에 나옵니다. 그전에는 '제외된 모델 N개 (TESTING …)' 안내에만 집계됩니다.
- P02-S6(조회 기간 오류)은 ErrorState(InternalBudgetPage.tsx:51), P01-S1-RANGE-INVALID 는 '기간을 수정한 뒤 [조회]를 눌러주세요' danger InlineAlert(CustomerUsagePage.tsx:47-50)입니다. 두 상태는 Figma 에서 서로 다르게 그리고 한쪽 프레임을 복사해 쓰지 않습니다.
- F05-S11 '시뮬레이션 상세 보기'는 쿼리 없이 navigate('/simulations/ID') 를 호출합니다. 그래서 ?request= 가 빠지며 Drawer 가 닫히고, replace 가 아닌 push 로 이동합니다. 같은 P-05 상세에서 열었다면 Drawer 만 닫힙니다.
- P-01 KPI 는 '비용 미확인 건수'를 별도 카드로 분리했습니다 (원래 디자인과 같음). '추정 API 비용' 카드에는 '미확인 N건 제외'만 표시합니다. 카드를 누르면 상세 이력으로 스크롤할 때 바깥 레이아웃이 아닌 <main> 만 스크롤합니다 (P-02 상세 이력 이동도 같은 helper 사용).
- P-02 '프로젝트별 예산 현황' 열 순서: 프로젝트명 · 월 예산 · 사용률 · 상태 · 사용액 · 확정 · 추정 · 미확인 · 구독료 · 출처 구성. 사용액은 조회 기간 합계라 예산 월 기준 열과 떨어뜨려 둡니다.
