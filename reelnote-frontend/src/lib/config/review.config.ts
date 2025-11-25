import { env } from "../env";

/**
 * Review API 설정
 *
 * Review Service와의 통신에 필요한 설정을 제공합니다.
 * 모든 설정은 Zod로 검증된 env 객체에서 가져오므로 타입 안전합니다.
 *
 * @example
 * ```typescript
 * import { reviewConfig } from "@/lib/config/review.config";
 *
 * const baseUrl = reviewConfig.baseUrl;
 * const timeout = reviewConfig.timeout;
 * ```
 *
 * @see lib/env/validation.ts - 환경 변수 검증 스키마
 */
export const reviewConfig = {
  /**
   * Review API Base URL
   * 예: http://localhost:8080/api
   */
  baseUrl: env.NEXT_PUBLIC_REVIEW_API_BASE_URL,

  /**
   * API 요청 타임아웃 (밀리초)
   * 기본값: 10000 (10초)
   */
  timeout: env.NEXT_PUBLIC_REVIEW_API_TIMEOUT,

  /**
   * API 요청 재시도 횟수
   * 기본값: 3
   */
  retry: env.NEXT_PUBLIC_REVIEW_API_RETRY,
} as const;
