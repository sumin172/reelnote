import { userSeq, isMSWEnabled } from "../env";
import { reviewConfig } from "../config/review.config";
import {
  ErrorCode,
  NormalizedErrorCode,
  isErrorCode,
} from "../errors/error-codes";
import { logFromApiError } from "../logger";

export interface FetchOptions extends RequestInit {
  baseUrl?: string;
  actionId?: string; // 사용자 액션 단위 상관관계 ID
}

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
 * TraceId는 백엔드가 생성/관리합니다.
 * 프론트엔드는 X-Trace-Id 헤더를 보내지 않으며,
 * 백엔드가 응답(에러 응답 또는 헤더)에 포함한 traceId를 사용합니다.
 */

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    baseUrl = reviewConfig.baseUrl,
    actionId,
    headers,
    ...rest
  } = options;
  const isBrowser = typeof window !== "undefined";

  // MSW 활성화 여부 확인
  const mswEnabled = isBrowser && isMSWEnabled;
  const baseUrlToUse = mswEnabled ? "/api" : baseUrl;
  const url = `${baseUrlToUse}${path}`;

  // 헤더 머지: 사용자 헤더를 먼저 설정하고, 기본값을 덮어쓰지 않도록 주의
  const userHeaders = new Headers(headers);

  // 기본 헤더 설정 (사용자가 명시적으로 설정한 경우 덮어쓰지 않음)
  if (!userHeaders.has("Content-Type")) {
    userHeaders.set("Content-Type", "application/json");
  }

  // ActionId: 사용자 액션 단위 상관관계 ID (프론트엔드가 생성/관리)
  if (actionId && !userHeaders.has("X-Action-Id")) {
    userHeaders.set("X-Action-Id", actionId);
  }

  // UserSeq: 개발 환경에서 사용자 식별용
  if (userSeq && !userHeaders.has("X-User-Seq")) {
    userHeaders.set("X-User-Seq", userSeq.toString());
  }

  // TraceId는 백엔드가 생성/관리하므로 프론트엔드에서 보내지 않음
  // (사용자가 명시적으로 X-Trace-Id를 설정한 경우에만 전송)

  const requestHeaders: HeadersInit = Object.fromEntries(userHeaders.entries());

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
      // TraceId는 백엔드가 생성/관리하므로 응답에서 가져옴
      // 응답 헤더에서도 확인 (백엔드가 헤더에 포함한 경우)
      const responseTraceId =
        errorDetail.traceId || res.headers.get("X-Trace-Id") || undefined;

      const apiError = new ApiError(
        errorDetail.message,
        res.status,
        errorDetail.code,
        errorDetail.details,
        responseTraceId,
      );

      // 구조화된 로깅 (error-config.ts의 logLevel 활용)
      logFromApiError(apiError);

      throw apiError;
    }

    // 표준 에러 스키마가 없으면 기본 에러
    // TraceId는 백엔드가 생성/관리하므로 응답 헤더에서 확인
    const responseTraceId = res.headers.get("X-Trace-Id") || undefined;

    const apiError = new ApiError(
      errorText || res.statusText || `API 요청 실패 (${res.status})`,
      res.status,
      "UNKNOWN_ERROR", // 표준 에러 스키마가 없는 경우
      { url, message: errorText || res.statusText },
      responseTraceId,
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
