/**
 * ALIVE 앱 전용 로거 유틸리티
 *
 * - __DEV__ 환경에서만 log/warn 출력 (프로덕션 빌드 시 제거됨)
 * - error는 항상 출력 (운영 오류 추적 목적)
 * - 모든 메시지에 '[ALIVE]' 프리픽스 추가
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (__DEV__) console.log('[ALIVE]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn('[ALIVE]', ...args);
  },
  // 에러는 프로덕션에서도 항상 출력
  error: (...args: unknown[]) => {
    console.error('[ALIVE]', ...args);
  },
};
