import { ApiError } from "../api/client";
import { errorConfig } from "./error-config";

/**
 * 에러 처리 결과
 */
export type HandledError = {
  message: string;
  retryable: boolean;
  redirect?: string;
  logLevel: "error" | "warn" | "info";
  traceId?: string;
  errorCode?: string;
};

/**
 * 에러 코드별 처리 로직 실행
 *
 * @param error ApiError 인스턴스
 * @returns 처리된 에러 정보
 */
export function handleError(error: ApiError): HandledError {
  // 알려진 에러 코드인지 먼저 검증
  if (!error.isKnownCode()) {
    // 알 수 없는 에러 코드는 기본 처리
    return {
      message: error.message || "알 수 없는 오류가 발생했습니다",
      retryable: false,
      logLevel: "error",
      traceId: error.traceId,
      errorCode: error.code,
    };
  }

  // 타입 가드로 이미 ErrorCode로 좁혀짐
  const code = error.code;
  const config = errorConfig[code];

  // 제품 메시지 우선 (error-config.ts의 메시지가 UX 기준)
  const configMessage = config?.message;
  const message = configMessage || error.message || "오류가 발생했습니다";

  return {
    message,
    retryable: config?.retryable ?? false,
    redirect: config?.redirect,
    logLevel: config?.logLevel ?? "error",
    traceId: error.traceId,
    errorCode: error.code,
  };
}

/**
 * 에러를 사용자 친화적 메시지로 변환 (문구 변환기)
 *
 * 역할: 어떤 타입의 에러든 문자열 메시지로 변환
 * - ApiError: 에러 코드별 메시지 매핑
 * - Error: error.message 사용
 * - 기타: 기본 메시지 반환
 *
 * @param error 에러 객체 (unknown 타입)
 * @returns 사용자에게 표시할 메시지
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (!error.isKnownCode()) {
      return error.message || "알 수 없는 오류가 발생했습니다";
    }

    // 타입 가드로 이미 ErrorCode로 좁혀짐
    const code = error.code;
    const config = errorConfig[code];

    // 제품 메시지 우선 (error-config.ts의 메시지가 UX 기준)
    const configMessage = config?.message;
    return configMessage || error.message || "오류가 발생했습니다";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다";
}
