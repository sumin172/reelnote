import { config, isMSWEnabled } from '../env';

export type FetchOptions = RequestInit & { baseUrl?: string };
type ErrorWithStatus = Error & { status: number };

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { baseUrl = config.apiBaseUrl, headers, ...rest } = options;
  const isBrowser = typeof window !== 'undefined';
  
  // MSW 활성화 여부 확인
  const mswEnabled = isBrowser && isMSWEnabled;
  const baseUrlToUse = mswEnabled ? '' : baseUrl;
  const url = `${baseUrlToUse}${path}`;

  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(config.userSeq
        ? { 'X-User-Seq': config.userSeq.toString() }
        : {}),
      ...headers,
    },
    next: { revalidate: 0 },
  });

  // React Query의 에러 처리에 위임 - 단순히 에러를 throw
  if (!res.ok) {
    const text = await res.text();
    const errorWithStatus: ErrorWithStatus = Object.assign(
      new Error(`API ${res.status}: ${text || res.statusText}`),
      { status: res.status }
    );
    // React Query가 재시도 로직을 처리할 수 있도록 에러에 상태 정보 추가
    throw errorWithStatus;
  }

  // Handle empty body
  const contentLength = res.headers.get('content-length');
  if (contentLength === '0' || res.status === 204) return undefined as unknown as T;

  const json = (await res.json()) as unknown;

  // Unwrap common API envelope { success, data, ... }
  if (
    json &&
    typeof json === 'object' &&
    'success' in (json as Record<string, unknown>) &&
    'data' in (json as Record<string, unknown>)
  ) {
    return (json as { data: T }).data;
  }

  return json as T;
}


