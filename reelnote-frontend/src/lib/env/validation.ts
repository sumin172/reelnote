import { z } from "zod";

/**
 * 환경 변수 검증 스키마
 *
 * 데이터의 형태만 정의합니다 (순수한 스키마).
 * 환경별 정책(필수/선택)은 validateEnv 함수에서 처리합니다.
 */
// 개발/테스트 환경용 기본값
const defaultApiUrls = {
  NEXT_PUBLIC_REVIEW_API_BASE_URL: "http://localhost:8080/api",
  NEXT_PUBLIC_CATALOG_API_BASE_URL: "http://localhost:3001/api",
};

// URL 검증 헬퍼 함수
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const envSchema = z.object({
  // Review API 설정
  NEXT_PUBLIC_REVIEW_API_BASE_URL: z
    .string()
    .optional()
    .refine((val) => !val || isValidUrl(val), {
      message: "유효한 URL 형식이어야 합니다 (예: http://localhost:8080/api)",
    }),
  NEXT_PUBLIC_REVIEW_API_TIMEOUT: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(10000),
  NEXT_PUBLIC_REVIEW_API_RETRY: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(3),

  // Catalog API 설정
  NEXT_PUBLIC_CATALOG_API_BASE_URL: z
    .string()
    .optional()
    .refine((val) => !val || isValidUrl(val), {
      message: "유효한 URL 형식이어야 합니다 (예: http://localhost:3001/api)",
    }),
  NEXT_PUBLIC_CATALOG_API_TIMEOUT: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(10000),
  NEXT_PUBLIC_CATALOG_API_RETRY: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(3),

  // MSW 설정 (선택)
  NEXT_PUBLIC_ENABLE_MSW: z
    .string()
    .optional()
    .transform((val) => val === "true"),

  // 사용자 설정 (선택)
  NEXT_PUBLIC_USER_SEQ: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : null)),

  // 앱 설정 (선택, 기본값 제공)
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),

  // Node 환경
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

let validatedEnv: ValidatedEnv | null = null;

/**
 * 환경 변수 검증 함수
 *
 * 서버 사이드(빌드/런타임)에서만 실행되며,
 * 검증 실패 시 프로세스를 종료합니다.
 *
 * @returns 검증된 환경 변수 객체
 * @throws 검증 실패 시 프로세스 종료
 */
export function validateEnv(): ValidatedEnv {
  // 클라이언트 사이드에서는 검증하지 않음
  if (typeof window !== "undefined") {
    // 클라이언트에서는 기본값 반환 (타입 안전성을 위해)
    return {
      NEXT_PUBLIC_REVIEW_API_BASE_URL: "",
      NEXT_PUBLIC_REVIEW_API_TIMEOUT: 10000,
      NEXT_PUBLIC_REVIEW_API_RETRY: 3,
      NEXT_PUBLIC_CATALOG_API_BASE_URL: "",
      NEXT_PUBLIC_CATALOG_API_TIMEOUT: 10000,
      NEXT_PUBLIC_CATALOG_API_RETRY: 3,
      NEXT_PUBLIC_ENABLE_MSW: false,
      NEXT_PUBLIC_USER_SEQ: null,
      NEXT_PUBLIC_APP_NAME: undefined,
      NEXT_PUBLIC_APP_VERSION: undefined,
      NODE_ENV: "development",
    };
  }

  // 이미 검증된 경우 캐싱된 값 반환
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    const nodeEnv = process.env.NODE_ENV || "development";
    const isDevelopment = nodeEnv === "development";
    const isTest = nodeEnv === "test";
    const isProduction = nodeEnv === "production";

    // 1단계: 스키마 검증 (데이터 형태만 검증)
    let parsed: z.infer<typeof envSchema>;

    if (isDevelopment || isTest) {
      // 개발/테스트 환경: 기본값 제공
      const envWithDefaults = {
        ...process.env,
        NEXT_PUBLIC_REVIEW_API_BASE_URL:
          process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL ||
          defaultApiUrls.NEXT_PUBLIC_REVIEW_API_BASE_URL,
        NEXT_PUBLIC_CATALOG_API_BASE_URL:
          process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL ||
          defaultApiUrls.NEXT_PUBLIC_CATALOG_API_BASE_URL,
        // timeout, retry는 스키마에서 기본값 처리
      };
      parsed = envSchema.parse(envWithDefaults);
    } else {
      // 프로덕션 환경: 환경 변수 그대로 검증
      parsed = envSchema.parse(process.env);
    }

    // 2단계: 정책 검증 (환경별 필수 변수 체크)
    if (isProduction) {
      const missingVars: string[] = [];
      if (!parsed.NEXT_PUBLIC_REVIEW_API_BASE_URL) {
        missingVars.push("NEXT_PUBLIC_REVIEW_API_BASE_URL");
      }
      if (!parsed.NEXT_PUBLIC_CATALOG_API_BASE_URL) {
        missingVars.push("NEXT_PUBLIC_CATALOG_API_BASE_URL");
      }

      if (missingVars.length > 0) {
        console.error("\n❌ 환경 변수 검증 실패 (프로덕션 정책)\n");
        missingVars.forEach((varName) => {
          console.error(`  ✗ ${varName}: 프로덕션 환경에서는 필수입니다`);
        });
        console.error("\n💡 해결 방법:");
        console.error("  1. .env.production 파일을 확인하세요");
        console.error(
          "  2. env.example 파일을 참고하여 필수 변수를 설정하세요",
        );
        console.error("  3. 배포 환경의 환경 변수를 확인하세요\n");
        process.exit(1);
      }
    }

    validatedEnv = parsed;
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("\n❌ 환경 변수 검증 실패 (스키마 검증)\n");
      error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        console.error(`  ✗ ${path}: ${issue.message}`);
      });
      console.error("\n💡 해결 방법:");
      console.error("  1. .env.local 파일을 확인하세요");
      console.error("  2. env.example 파일을 참고하여 필수 변수를 설정하세요");
      console.error("  3. 프로덕션 배포 시 환경 변수를 확인하세요\n");
      process.exit(1);
    }
    throw error;
  }
}
