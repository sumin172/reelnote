/**
 * 단순한 MSW 관리 모듈
 */

export { initializeMSW } from './manager';
export { createHandlers } from './handlers';

// 타입 재내보내기
export type { RequestHandler } from 'msw';
