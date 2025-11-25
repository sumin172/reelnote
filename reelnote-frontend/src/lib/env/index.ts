/**
 * 환경 변수 설정
 * Zod 기반 런타임 검증을 통한 안전한 환경 변수 관리
 */

import { validateEnv } from "./validation";

// 환경 변수 검증 (서버 사이드에서만 실행)
// Next.js 빌드/런타임 시점에 검증하여 조기 실패 보장
validateEnv();

// 환경 감지
const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

// 기본값 (개발 환경용)
const fallbackEnvVars = {
  NEXT_PUBLIC_REVIEW_API_BASE_URL: "http://localhost:8080/api",
  NEXT_PUBLIC_CATALOG_API_BASE_URL: "http://localhost:3001/api",
  NEXT_PUBLIC_APP_NAME: "ReelNote",
  NEXT_PUBLIC_APP_VERSION: "0.1.0",
} as const;

// 환경 변수에 대한 안전한 접근자 함수
// 클라이언트 사이드에서는 process.env에서 직접 읽고,
// 서버 사이드에서는 검증된 값 또는 기본값 사용
function getEnvVar<Key extends keyof typeof fallbackEnvVars>(key: Key): string {
  const value = process.env[key];
  if (!value) {
    // 개발 환경에서만 기본값 사용
    if (isDevelopment || isTest) {
      return fallbackEnvVars[key];
    }
    // 프로덕션에서는 검증 단계에서 이미 실패했을 것
    return fallbackEnvVars[key];
  }
  return value;
}

export const config = {
  // API 설정
  get reviewApiBaseUrl() {
    return getEnvVar("NEXT_PUBLIC_REVIEW_API_BASE_URL");
  },

  get catalogApiBaseUrl() {
    return getEnvVar("NEXT_PUBLIC_CATALOG_API_BASE_URL");
  },

  // MSW 설정 (환경 변수 우선, 기본은 비-프로덕션에서 활성화)
  get enableMSW() {
    const raw = process.env.NEXT_PUBLIC_ENABLE_MSW;
    if (typeof raw === "string") {
      return raw === "true";
    }
    return !isProduction;
  },

  // 사용자 설정
  get userSeq() {
    const value = process.env.NEXT_PUBLIC_USER_SEQ;
    return value ? parseInt(value, 10) : null;
  },

  // 앱 설정
  get appName() {
    return getEnvVar("NEXT_PUBLIC_APP_NAME");
  },
  get appVersion() {
    return getEnvVar("NEXT_PUBLIC_APP_VERSION");
  },

  // 환경 설정
  isDevelopment,
  isProduction,
  isTest,
  environment: process.env.NODE_ENV,
} as const;

/**
 * MSW 활성화 여부 (환경 변수 기반)
 */
export const isMSWEnabled = config.enableMSW;
