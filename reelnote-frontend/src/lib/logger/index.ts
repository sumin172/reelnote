/**
 * 구조화된 로깅 시스템
 *
 * 백엔드(Kotlin/NestJS)와 일관된 로깅 정책을 따릅니다:
 * - 구조화된 로그 컨텍스트
 * - HTTP 상태 코드 기반 로그 레벨 (5xx: ERROR, 4xx: WARN)
 * - 모든 로그에 traceId 포함
 * - 5xx 에러에만 스택 트레이스 포함
 * - errorType 구분 (SYSTEM/BUSINESS)
 */

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogContext {
  level: LogLevel;
  message: string;
  errorCode?: string;
  errorType?: "SYSTEM" | "BUSINESS";
  traceId?: string;
  timestamp: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

interface LogParams {
  message: string;
  error?: Error;
  traceId?: string;
  metadata?: Record<string, unknown>;
  includeStack?: boolean;
  errorCode?: string;
  errorType?: "SYSTEM" | "BUSINESS";
}

const isBrowser = typeof window !== "undefined";
const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

/**
 * 스택 트레이스 포함 여부 결정
 */
function shouldIncludeStack(includeStack?: boolean): boolean {
  if (includeStack !== undefined) return includeStack;
  // 개발 환경에서는 항상 포함, 프로덕션에서는 선택적
  return isDevelopment;
}

/**
 * PII(개인 식별 정보) 필터링
 * 프로덕션 환경에서 민감한 정보를 제거하거나 마스킹합니다.
 */
function sanitize(logContext: LogContext): LogContext {
  if (!isProduction) {
    // 개발 환경에서는 필터링하지 않음
    return logContext;
  }

  const sanitized = { ...logContext };

  // metadata에서 민감한 정보 제거/마스킹
  if (sanitized.metadata) {
    const sensitiveKeys = [
      "userEmail",
      "email",
      "password",
      "token",
      "authorization",
      "cookie",
      "sessionId",
    ];

    sanitized.metadata = { ...sanitized.metadata };
    for (const key of sensitiveKeys) {
      if (key in sanitized.metadata) {
        sanitized.metadata[key] = "[REDACTED]";
      }
    }
  }

  return sanitized;
}

/**
 * 로그 샘플링 결정
 * 프로덕션 환경에서 로그 볼륨을 제어합니다.
 */
function shouldSample(logContext: LogContext): boolean {
  if (!isProduction) {
    // 개발 환경에서는 항상 전송
    return true;
  }

  // ERROR 레벨은 항상 전송
  if (logContext.level === "error") {
    return true;
  }

  // WARN은 50% 샘플링
  if (logContext.level === "warn") {
    return Math.random() < 0.5;
  }

  // INFO/DEBUG는 10% 샘플링
  return Math.random() < 0.1;
}

/**
 * 에러 리포팅 서비스로 전송
 * 브라우저와 SSR 환경을 구분하여 처리합니다.
 */
function sendToErrorReportingService(logContext: LogContext): void {
  if (!isProduction) {
    // 개발 환경에서는 전송하지 않음
    return;
  }

  const sanitized = sanitize(logContext);

  if (!shouldSample(sanitized)) {
    return;
  }

  // TODO: 실제 에러 리포팅 서비스 연동 (Sentry, LogRocket 등)
  if (isBrowser) {
    // 브라우저 SDK 사용
    // 예: Sentry.captureException(...)
  } else {
    // 서버 측 로깅
    // 예: 서버 전용 로깅 서비스 또는 파일 로그
  }

  // 현재는 구조화된 JSON을 콘솔에 출력 (프로덕션에서도 디버깅용)
  // 실제 운영에서는 이 부분을 제거하고 위의 SDK로 대체
  try {
    const jsonString = JSON.stringify(sanitized, null, 0);
    if (isBrowser) {
      // 브라우저에서는 네트워크 요청으로 전송하는 것이 일반적
      // fetch('/api/logs', { method: 'POST', body: jsonString })
    } else {
      // 서버에서는 구조화된 로그를 표준 출력으로 전송 (로그 수집 도구가 수집)
      console.error(jsonString);
    }
  } catch (error) {
    // JSON 직렬화 실패 시 (순환 참조 등) 기본 정보만 출력
    console.error("[Logger] Failed to serialize log context", {
      level: sanitized.level,
      message: sanitized.message,
      errorCode: sanitized.errorCode,
    });
  }
}

/**
 * 공통 로깅 함수
 * 모든 로그 레벨이 이 함수를 통해 처리됩니다.
 */
function log(level: LogLevel, params: LogParams): void {
  const {
    message,
    error,
    traceId,
    metadata,
    includeStack,
    errorCode,
    errorType,
  } = params;

  const logContext: LogContext = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(errorCode && { errorCode }),
    ...(errorType && { errorType }),
    ...(traceId && { traceId }),
    ...(metadata && { metadata }),
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        ...(shouldIncludeStack(includeStack) &&
          error.stack && {
            stack: error.stack,
          }),
      },
    }),
  };

  // 개발 환경: 콘솔에 객체 그대로 출력 (브라우저에서 읽기 편함)
  if (isDevelopment) {
    const consoleMethod =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "info"
            ? console.info
            : console.debug;

    // 객체 그대로 출력 (브라우저 콘솔에서 트리로 펼쳐볼 수 있음)
    consoleMethod(`[${level.toUpperCase()}]`, logContext);
  }

  // 프로덕션 환경: 에러 리포팅 서비스로 전송
  if (isProduction) {
    sendToErrorReportingService(logContext);
  }
}

/**
 * 로거 API
 * 백엔드와 일관된 인터페이스를 제공합니다.
 */
export const logger = {
  /**
   * ERROR 레벨 로깅
   * 5xx 에러나 심각한 시스템 오류에 사용합니다.
   */
  error: (
    message: string,
    error?: Error,
    context?: {
      traceId?: string;
      metadata?: Record<string, unknown>;
      includeStack?: boolean;
      errorCode?: string;
      errorType?: "SYSTEM" | "BUSINESS";
    },
  ) => {
    log("error", {
      message,
      error,
      traceId: context?.traceId,
      metadata: context?.metadata,
      includeStack: context?.includeStack,
      errorCode: context?.errorCode,
      errorType: context?.errorType,
    });
  },

  /**
   * WARN 레벨 로깅
   * 4xx 에러나 경고 상황에 사용합니다.
   */
  warn: (
    message: string,
    context?: {
      traceId?: string;
      metadata?: Record<string, unknown>;
      errorCode?: string;
      errorType?: "SYSTEM" | "BUSINESS";
    },
  ) => {
    log("warn", {
      message,
      traceId: context?.traceId,
      metadata: context?.metadata,
      errorCode: context?.errorCode,
      errorType: context?.errorType,
    });
  },

  /**
   * INFO 레벨 로깅
   * 일반적인 정보성 로그에 사용합니다.
   */
  info: (
    message: string,
    context?: {
      traceId?: string;
      metadata?: Record<string, unknown>;
    },
  ) => {
    log("info", {
      message,
      traceId: context?.traceId,
      metadata: context?.metadata,
    });
  },

  /**
   * DEBUG 레벨 로깅
   * 개발/디버깅 목적의 상세 로그에 사용합니다.
   */
  debug: (
    message: string,
    context?: {
      traceId?: string;
      metadata?: Record<string, unknown>;
    },
  ) => {
    log("debug", {
      message,
      traceId: context?.traceId,
      metadata: context?.metadata,
    });
  },
};

/**
 * ApiError에서 로그 컨텍스트 생성 및 로깅
 * error-config.ts의 logLevel 설정을 활용합니다.
 */
import { ApiError } from "../api/client";
import { errorConfig } from "../errors/error-config";
import { isErrorCode } from "../errors/error-codes";

export function logFromApiError(error: ApiError): void {
  // error-config.ts에서 logLevel 조회
  // UNKNOWN_ERROR는 errorConfig에 없으므로 타입 가드 필요
  const config = isErrorCode(error.code) ? errorConfig[error.code] : undefined;
  const logLevel = config?.logLevel ?? "error";

  // HTTP 상태 코드 기반 errorType 결정
  const errorType: "SYSTEM" | "BUSINESS" =
    error.status >= 500 ? "SYSTEM" : "BUSINESS";

  // 스택 트레이스 포함 여부: 5xx 에러에만 포함
  const includeStack = error.status >= 500;

  const logParams = {
    message: error.message,
    error: error.status >= 500 ? new Error(error.message) : undefined,
    traceId: error.traceId,
    metadata: {
      url: error.details?.path || error.details?.url,
      status: error.status,
      code: error.code,
      ...error.details,
    },
    includeStack,
    errorCode: error.code,
    errorType,
  };

  // logLevel에 따라 적절한 메서드 호출
  if (logLevel === "error") {
    logger.error(logParams.message, logParams.error, {
      traceId: logParams.traceId,
      metadata: logParams.metadata,
      includeStack: logParams.includeStack,
      errorCode: logParams.errorCode,
      errorType: logParams.errorType,
    });
  } else if (logLevel === "warn") {
    logger.warn(logParams.message, {
      traceId: logParams.traceId,
      metadata: logParams.metadata,
      errorCode: logParams.errorCode,
      errorType: logParams.errorType,
    });
  } else {
    logger.info(logParams.message, {
      traceId: logParams.traceId,
      metadata: logParams.metadata,
    });
  }
}
