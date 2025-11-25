/**
 * 환경 변수 설정
 * Zod 기반 런타임 검증을 통한 안전한 환경 변수 관리
 *
 * @important 서버/클라이언트 분리
 * - 클라이언트 컴포넌트에서는 NEXT_PUBLIC_* 접두사가 있는 환경 변수만 접근 가능
 * - 서버 전용 환경 변수는 이 모듈에서 export하지 않음
 */

import { validateEnv, type ValidatedEnv } from "./validation";

// 환경 변수 검증 (서버 사이드에서만 실행)
// Next.js 빌드/런타임 시점에 검증하여 조기 실패 보장
validateEnv();

/**
 * 검증된 환경 변수 객체
 *
 * 모든 환경 변수는 Zod 스키마로 검증되어 타입 안전하게 접근 가능합니다.
 * 검증은 서버 사이드에서만 수행되며, 클라이언트에서는 기본값이 반환됩니다.
 *
 * @example
 * ```typescript
 * import { env } from "@/lib/env";
 * const baseUrl = env.NEXT_PUBLIC_REVIEW_API_BASE_URL;
 * ```
 */
export const env: ValidatedEnv = (() => {
  // 클라이언트 사이드에서는 process.env에서 직접 읽기
  if (typeof window !== "undefined") {
    return {
      NEXT_PUBLIC_REVIEW_API_BASE_URL:
        process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL || "",
      NEXT_PUBLIC_REVIEW_API_TIMEOUT: parseInt(
        process.env.NEXT_PUBLIC_REVIEW_API_TIMEOUT || "10000",
        10,
      ),
      NEXT_PUBLIC_REVIEW_API_RETRY: parseInt(
        process.env.NEXT_PUBLIC_REVIEW_API_RETRY || "3",
        10,
      ),
      NEXT_PUBLIC_CATALOG_API_BASE_URL:
        process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL || "",
      NEXT_PUBLIC_CATALOG_API_TIMEOUT: parseInt(
        process.env.NEXT_PUBLIC_CATALOG_API_TIMEOUT || "10000",
        10,
      ),
      NEXT_PUBLIC_CATALOG_API_RETRY: parseInt(
        process.env.NEXT_PUBLIC_CATALOG_API_RETRY || "3",
        10,
      ),
      NEXT_PUBLIC_ENABLE_MSW: process.env.NEXT_PUBLIC_ENABLE_MSW === "true",
      NEXT_PUBLIC_USER_SEQ: process.env.NEXT_PUBLIC_USER_SEQ
        ? parseInt(process.env.NEXT_PUBLIC_USER_SEQ, 10)
        : null,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
      NODE_ENV:
        (process.env.NODE_ENV as "development" | "production" | "test") ||
        "development",
    } as ValidatedEnv;
  }

  // 서버 사이드에서는 검증된 값 사용
  return validateEnv();
})();

/**
 * 사용자 시퀀스
 * 개발 환경에서 사용자 식별을 위한 설정
 */
export const userSeq = env.NEXT_PUBLIC_USER_SEQ;

/**
 * MSW 활성화 여부
 * 환경 변수가 명시되지 않으면 프로덕션이 아닌 환경에서 자동으로 활성화
 */
export const isMSWEnabled =
  env.NEXT_PUBLIC_ENABLE_MSW ?? env.NODE_ENV !== "production";
