# 검증 결과 (2026-10-22)

## 자동 검증
| 항목 | 명령 | 결과 |
|---|---|---|
| TypeScript 타입 검사 | `pnpm exec tsc -p tsconfig.app.json --noEmit` | 통과 (0 errors) |
| Lint | `pnpm lint` (oxlint) | 통과 · 경고 4건 (fast-refresh 상수 export 2, effect 내 setState 2 — 동작 영향 없음) |
| 단위 테스트 | `pnpm exec vitest run` | 18/18 통과 (`src/domain/aggregate.test.ts`: Request ID 유일성, UNKNOWN≠0, TIMEOUT+UNKNOWN 유지, 고객/내부 출처 분리, 요약=상세 합계, 재시도 관계, Mock 최소 구성, 예산 4상태, DD-11/12 상태 계산, JSON/Schema 분리) |
| 프로덕션 빌드 | `pnpm build` | 통과 (vite build, 코드 스플리팅 페이지별 청크) |

## 브라우저 검증 (Chrome, 1440×1000, Mock Adapter)
| 시나리오 | 결과 |
|---|---|
| P-01 조회 · KPI · 추이 · 고객별/서비스별/모델별 · 상세 이력 · Request 상세 Drawer | 정상. 콘솔 오류 없음 |
| P-01 고객 상세 예산 등록 (C미디어, $0.01) → 토스트 → 사용률 55.4% · 추정 포함 기준 · 정상 배지 → 새로고침 후 유지 | 정상 (localStorage 변경분 스냅샷) |
| P-02 KPI(확정/추정/구독료/총 관리 비용 추정 포함/미확인/미분류) · 미분류 경고 · 일별 API 비용 + 월별 구독료 분리 차트 · 프로젝트/구성원/구독료/상세 | 정상 |
| P-03 모델 목록 · 상세 Drawer · 연결 테스트 실행(성공, SYSTEM_TEST Request 생성) → ACTIVE 전환 (헤더 ACTIVE 4→5) | 정상 |
| P-04 시나리오 선택 → Prompt 자동 채움 → 모델 3개 선택 → 실행 전 검증 → 병렬 실행(RUNNING→결과) → 자동 저장 토스트 | 정상. 모델별 비용 상태 혼합(미확인/확정) 표시, 0 USD 미표시 |
| P-05 목록 · 상세(비활성 모델 포함 실행 경고) → 재실행 모달: 1개 모델만 남으면 차단 → INACTIVE 교체 → P-04 설정 복원(`?from`, `models`) → 새 Simulation 실행 → 이력에 신규 ID 추가, 원본 기록 불변 | 정상 |
| 반응형 1000px(사이드바 아이콘 모드·필터 줄바꿈) / 390px(세로 스택·KPI 2열) | 정상 (390px 에서 Select 폭 붕괴 → 수정 완료) |

## 발견·수정한 결함
1. localStorage 스냅샷이 Seed 전체(수천 건)를 저장해 quota 초과로 저장이 무시됨 → 변경분(예산·구독료·모델·시뮬레이션·런타임 호출)만 저장하도록 변경.
2. USD 금액 입력 `step=1` 로 소수 금액이 브라우저 검증에 막힘(툴팁만 표시) → `step=0.01`.
3. 극소 확정 비용이 `$0.0000` 으로 표시되어 미확인/0과 혼동 → 0.0005 미만은 6자리 표시.
4. KPI 큰 숫자 말줄임 → 자릿수에 따라 폰트 축소.
5. 기간 입력이 `w-full` 에 밀려 세로로 쌓임 → 고정 폭.
6. 메인 영역 가로 스크롤(툴팁 absolute 요소) → `overflow-x-hidden`.
7. 축소 사이드바에서 Mock 패널 텍스트 깨짐 → 축소 시 숨김.

## 수행하지 못한 검증
- 실제 OpenRouter API 호출(모델 목록·가격·Provider 고정·Fallback·JSON Schema·이미지·실패 비용 대조)은 백엔드/Key 부재로 미검증. `docs/design/design-decisions.md` DD-05~DD-10 참조.
- E2E 자동 테스트(Playwright 등) 미구성. 브라우저 검증은 수동 시나리오로 수행.
