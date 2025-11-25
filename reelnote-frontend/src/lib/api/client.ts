import { userSeq, isMSWEnabled } from "../env";
import { reviewConfig } from "../config/review.config";
import {
  ErrorCode,
  NormalizedErrorCode,
  isErrorCode,
} from "../errors/error-codes";
import { logFromApiError } from "../logger";

export type FetchOptions = RequestInit & { baseUrl?: string };

/**
 * 표준 에러 응답 스키마
 */
export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

/**
 * API 에러 (표준 에러 스키마 포함)
 */
export class ApiError extends Error {
  /**
   * 정규화된 에러 코드
   * 알려진 ErrorCode이거나 "UNKNOWN_ERROR"
   */
  public readonly code: NormalizedErrorCode;

  constructor(
    message: string,
    public readonly status: number,
    code: string | ErrorCode, // 입력은 string도 허용 (하위 호환성)
    public readonly details?: Record<string, unknown>,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";

    // 에러 코드 정규화: 알려진 코드인지 검증하고, 아니면 UNKNOWN_ERROR로 설정
    this.code = isErrorCode(code) ? code : "UNKNOWN_ERROR";

    // 개발 환경에서 알 수 없는 에러 코드 경고
    if (
      process.env.NODE_ENV === "development" &&
      this.code === "UNKNOWN_ERROR" &&
      code !== "UNKNOWN_ERROR"
    ) {
      // logger는 여기서 사용하지 않음 (순환 참조 방지)
      // ApiError 생성 시점에는 logger가 아직 초기화되지 않을 수 있음
      console.warn(
        `[ApiError] Unknown error code: ${code}. Normalized to UNKNOWN_ERROR.`,
      );
    }
  }

  /**
   * 에러 코드가 특정 타입인지 확인 (타입 가드)
   *
   * 예시:
   * ```typescript
   * if (error.isCode(CommonErrorCode.UNAUTHORIZED)) {
   *   // UNAUTHORIZED 에러에 대한 특정 처리
   * }
   * ```
   *
   * 참고: 현재는 사용되지 않지만, 향후 특정 에러 코드별 분기 처리가 필요할 때 유용합니다.
   */
  isCode<T extends ErrorCode>(code: T): this is ApiError & { code: T } {
    return this.code === code;
  }

  /**
   * 에러 코드가 알려진 코드인지 확인
   */
  isKnownCode(): this is ApiError & { code: ErrorCode } {
    return this.code !== "UNKNOWN_ERROR";
  }
}

/**
 * TraceId 생성 (UUID v4 형식)
 */
function generateTraceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * TraceId 가져오기 또는 생성
 * 요청 헤더에 X-Trace-Id가 있으면 사용하고, 없으면 새로 생성
 */
function getOrCreateTraceId(headers?: HeadersInit): string {
  if (headers && typeof headers === "object" && "x-trace-id" in headers) {
    const traceId = (headers as Record<string, string>)["x-trace-id"];
    if (traceId) {
      return traceId;
    }
  }
  return generateTraceId();
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { baseUrl = reviewConfig.baseUrl, headers, ...rest } = options;
  const isBrowser = typeof window !== "undefined";

  // MSW 활성화 여부 확인
  const mswEnabled = isBrowser && isMSWEnabled;
  const baseUrlToUse = mswEnabled ? "/api" : baseUrl;
  const url = `${baseUrlToUse}${path}`;

  // TraceId 전파: 요청 헤더에 있으면 사용, 없으면 생성
  const traceId = getOrCreateTraceId(headers);
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "X-Trace-Id": traceId,
    ...(userSeq ? { "X-User-Seq": userSeq.toString() } : {}),
    ...headers,
  };

  const res = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    next: { revalidate: 0 },
  });

  // Handle empty body (204 No Content)
  const contentLength = res.headers.get("content-length");
  if (contentLength === "0" || res.status === 204)
    return undefined as unknown as T;

  // 응답 본문 파싱 (한 번만 읽기)
  const contentType = res.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  // 에러 응답 처리 (표준 에러 스키마)
  if (!res.ok) {
    let errorDetail: ErrorDetail | null = null;
    let errorText = "";

    if (isJson) {
      try {
        const json = (await res.json()) as unknown;
        // 표준 에러 스키마 확인 (code, message 필드 존재)
        if (
          json &&
          typeof json === "object" &&
          "code" in (json as Record<string, unknown>) &&
          "message" in (json as Record<string, unknown>)
        ) {
          errorDetail = json as ErrorDetail;
        }
      } catch {
        // JSON 파싱 실패 시 무시
      }
    } else {
      errorText = await res.text();
    }

    // 표준 에러 스키마가 있으면 ApiError로 변환
    if (errorDetail) {
      // 응답의 traceId가 없으면 요청의 traceId 사용 (전파 보장)
      const finalTraceId = errorDetail.traceId || traceId;

      const apiError = new ApiError(
        errorDetail.message,
        res.status,
        errorDetail.code,
        errorDetail.details,
        finalTraceId,
      );

      // 구조화된 로깅 (error-config.ts의 logLevel 활용)
      logFromApiError(apiError);

      throw apiError;
    }

    // 표준 에러 스키마가 없으면 기본 에러
    const apiError = new ApiError(
      errorText || res.statusText || `API 요청 실패 (${res.status})`,
      res.status,
      "UNKNOWN_ERROR", // 표준 에러 스키마가 없는 경우
      { url, message: errorText || res.statusText },
      traceId,
    );

    // 구조화된 로깅
    logFromApiError(apiError);

    throw apiError;
  }

  // 성공 응답: 리소스를 그대로 반환 (래퍼 없음)
  if (!isJson) {
    const text = await res.text();
    return text as unknown as T;
  }

  const json = (await res.json()) as unknown;
  return json as T;
}
