import { config, isMSWEnabled } from "../env";

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
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
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
  const { baseUrl = config.reviewApiBaseUrl, headers, ...rest } = options;
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
    ...(config.userSeq ? { "X-User-Seq": config.userSeq.toString() } : {}),
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

      // 에러 로깅 (개발 환경에서만)
      if (process.env.NODE_ENV === "development") {
        console.error("[API Error]", {
          url,
          status: res.status,
          code: errorDetail.code,
          message: errorDetail.message,
          traceId: finalTraceId,
          details: errorDetail.details,
        });
      }

      throw new ApiError(
        errorDetail.message,
        res.status,
        errorDetail.code,
        errorDetail.details,
        finalTraceId,
      );
    }

    // 표준 에러 스키마가 없으면 기본 에러
    if (process.env.NODE_ENV === "development") {
      console.error("[API Error] Non-standard error format", {
        url,
        status: res.status,
        message: errorText || res.statusText,
        traceId,
      });
    }

    throw new ApiError(
      errorText || res.statusText || `API 요청 실패 (${res.status})`,
      res.status,
      undefined,
      undefined,
      traceId,
    );
  }

  // 성공 응답: 리소스를 그대로 반환 (래퍼 없음)
  if (!isJson) {
    const text = await res.text();
    return text as unknown as T;
  }

  const json = (await res.json()) as unknown;
  return json as T;
}
