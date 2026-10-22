/**
 * API 어댑터 교체 지점.
 * 실제 백엔드 연동 시: `new HttpPatronApi(baseUrl)` 로 교체하고 MockControls 노출을 제거한다.
 */
import type { PatronApi } from './PatronApi';
import { MockPatronApi } from './mock/MockPatronApi';

const mock = new MockPatronApi();

export const api: PatronApi = mock;
/** Mock 전용 제어 (지연·오류 주입·초기화). 실제 API 에서는 undefined. */
export const mockControls = mock;
export const IS_MOCK = true;
/** PoC 단일 관리자 (설계안: 단일 관리자 역할) */
export const CURRENT_ADMIN = { user_id: 'U-001', name: '김민수', role: 'Patron 관리자' };

export { ApiError } from './PatronApi';
export type * from './PatronApi';
