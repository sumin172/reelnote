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

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(config.userSeq ? { "X-User-Seq": config.userSeq.toString() } : {}),
      ...headers,
    },
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
      throw new ApiError(
        errorDetail.message,
        res.status,
        errorDetail.code,
        errorDetail.details,
        errorDetail.traceId,
      );
    }

    // 표준 에러 스키마가 없으면 기본 에러
    throw new ApiError(
      errorText || res.statusText || `API 요청 실패 (${res.status})`,
      res.status,
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
