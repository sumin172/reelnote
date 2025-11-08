/**
 * 환경 변수 설정
 * 단순하고 실용적인 환경 변수 관리
 */

// 환경 감지
const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
const isServer = typeof window === "undefined";

const fallbackEnvVars = {
  NEXT_PUBLIC_API_BASE_URL: "http://localhost:8080",
  NEXT_PUBLIC_APP_NAME: "ReelNote",
  NEXT_PUBLIC_APP_VERSION: "0.1.0",
} as const;

function reportMissingEnvVars() {
  if (!isServer) {
    return;
  }

  const missingEntries = Object.entries(fallbackEnvVars)
    .filter(([key]) => !process.env[key])
    .map(
      ([key, fallback]) => `${key} → 기본값(${fallback})`,
    );

  if (missingEntries.length > 0 && isDevelopment) {
    console.warn(
      [
        "⚠️ 일부 NEXT_PUBLIC 환경 변수가 설정되지 않아 기본값을 사용합니다.",
        ...missingEntries,
      ].join("\n"),
    );
  }
}

reportMissingEnvVars();

// 환경 변수에 대한 안전한 접근자 함수들
function getEnvVar<Key extends keyof typeof fallbackEnvVars>(
  key: Key,
): string {
  const value = process.env[key];
  if (!value) {
    return fallbackEnvVars[key];
  }
  return value;
}

function getApiBaseUrl(): string {
  return getEnvVar("NEXT_PUBLIC_API_BASE_URL");
}

function getAppName(): string {
  return getEnvVar("NEXT_PUBLIC_APP_NAME");
}

function getAppVersion(): string {
  return getEnvVar("NEXT_PUBLIC_APP_VERSION");
}

export const config = {
  // API 설정 (안전한 접근자 사용)
  get apiBaseUrl() {
    return getApiBaseUrl();
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

  // 앱 설정 (안전한 접근자 사용)
  get appName() {
    return getAppName();
  },
  get appVersion() {
    return getAppVersion();
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
