# ReelNote Frontend 아키텍처

> Review Service와 Catalog Service와 동일한 다층 Port/Adapter 언어로 정리된 프론트엔드 아키텍처 가이드

## 1. 개요

- **목적**: 마이크로서비스 백엔드와 연동하여 영화 리뷰 플랫폼의 사용자 인터페이스를 제공하는 웹 애플리케이션
- **패턴**: Domain-Driven Design + Layered Architecture + React Query 패턴
- **핵심 기능**: 리뷰 관리, 영화 검색, 반응형 UI, 개발 환경 독립성 (MSW)

## 2. 레이어 & 도메인 구조

| 계층                 | 폴더         | 책임                              | 예시                              |
|--------------------|------------|---------------------------------|---------------------------------|
| Presentation       | `app/`     | Next.js App Router 페이지 및 레이아웃   | `page.tsx`, `layout.tsx`        |
| Domain/Application | `domains/` | 도메인별 비즈니스 로직, 서비스 레이어, QueryKey | `domains/review/services.ts`    |
| Infrastructure     | `lib/`     | API 클라이언트, 환경 변수, MSW, 에러 처리    | `lib/api/client.ts`, `lib/env/` |

### 레이어 간 데이터 흐름

```
[Page Component] (app/)
    ↓ useQuery
[Domain Service] (domains/*/services.ts)
    ↓ apiFetch
[API Client] (lib/api/client.ts)
    ↓ fetch
[Backend API] or [MSW Handler] (lib/msw/)
```

### 레이어 간 의존성 규칙

- **app/** → **domains/** (서비스 레이어 사용)
- **domains/** → **lib/api/** (API 클라이언트 사용)
- **lib/** → **domains/** ❌ (인프라는 도메인에 의존하지 않음)

## 3. 도메인 모델

### 3.1 도메인 구조

```
domains/
├── review/           # 리뷰 도메인
│   ├── index.ts      # Public API (Barrel Export)
│   ├── types.ts      # 도메인 타입 정의
│   ├── schema.ts     # Zod 스키마 (폼 검증)
│   └── services.ts   # API 서비스 레이어 + QueryKey 팩토리
├── catalog/          # 카탈로그 도메인
│   ├── index.ts
│   ├── types.ts
│   └── services.ts
├── shared/           # 공유 도메인
│   └── components/   # 공유 컴포넌트 (Layout, State UI)
└── analysis/         # 분석 도메인 (향후 확장)
    └── index.ts
```

### 3.2 도메인별 책임

**Review 도메인**
- 사용자 리뷰 생성/조회/수정/삭제
- 리뷰 타입 정의 및 Zod 스키마 검증
- Review Service와의 통신

**Catalog 도메인**
- 영화 메타데이터 검색 및 조회
- Catalog Service와의 통신
- 검색 결과 타입 정의

**Shared 도메인**
- 레이아웃 컴포넌트 (Header, ThemeToggle)
- 공통 UI 컴포넌트 (Loading, Error, Empty)
- 모든 도메인에서 사용 가능

### 3.3 도메인 간 의존성 규칙

- `review` → `catalog` (영화 검색 시)
- `shared`는 모든 도메인에서 사용 가능
- 도메인 간 직접 의존 최소화 (서비스를 통한 간접 의존 권장)

## 4. React Query 패턴

### 4.1 QueryKey 팩토리 패턴

**현재 구현**

```typescript
// domains/review/services.ts
export const reviewQueryKeys = {
  all: ["reviews"] as const,
  list: (params?: { page?: number; size?: number }) =>
    [...reviewQueryKeys.all, "list", params] as const,
};

// domains/catalog/services.ts
export const catalogQueryKeys = {
  search: (q: string, page = 1) => ["catalog", "search", { q, page }] as const,
};
```

**장점:**
- **계층적 구조**: `all` 기반으로 전체 그룹 캐시 무효화 가능
- **타입 안전성**: `as const`로 QueryKey 타입 보장
- **중앙 관리**: 도메인별 서비스 레이어에서 통합 관리

**사용 예시:**

```typescript
// 캐시 무효화 시 전체 리뷰 그룹 제거
queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });

// 특정 리뷰 목록 조회
useQuery({
  queryKey: reviewQueryKeys.list({ page: 0, size: 10 }),
  queryFn: () => fetchReviews({ page: 0, size: 10 }),
});
```

### 4.2 서비스 레이어 분리 패턴

**현재 구현**

각 도메인의 `services.ts`에서 다음을 통합 관리:
- API 호출 로직 (`fetchReviews`, `searchMovies`)
- QueryKey 팩토리 (`reviewQueryKeys`, `catalogQueryKeys`)
- API 응답 타입과 도메인 타입 변환

**책임 분리:**
- **서비스 레이어**: API 호출, 데이터 변환, QueryKey 관리
- **컴포넌트**: React Query 훅 사용, UI 렌더링

**예시:**

```typescript
// domains/review/services.ts
export async function fetchReviews(
  params: { page?: number; size?: number } = {},
) {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  const path = `/v1/reviews/my${qs ? `?${qs}` : ""}`;
  return apiFetch<Page<Review>>(path);
}

// app/reviews/ReviewsList.tsx
const { data, isLoading, isError } = useQuery({
  queryKey: reviewQueryKeys.list({ page: 0, size: 10 }),
  queryFn: () => fetchReviews({ page: 0, size: 10 }),
});
```

### 4.3 React Query 설정

**기본 쿼리 옵션** (`app/providers.tsx`):

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**조건부 쿼리 실행:**

```typescript
// 검색어가 있을 때만 쿼리 실행
const { data } = useQuery({
  queryKey: catalogQueryKeys.search(debouncedQuery, 1),
  queryFn: ({ signal }) => searchMovies(debouncedQuery, 1, { signal }),
  enabled: canSearch, // 조건부 실행
  staleTime: 1000 * 30, // 30초
});
```

## 5. 에러 처리 아키텍처

### 5.1 에러 처리 계층 구조

```
[API Response Error]
    ↓
[ApiError] (lib/api/client.ts)
    ↓
[handleError()] (lib/errors/error-utils.ts)
    ↓ 에러 코드별 처리 전략 적용
[HandledError]
    ↓
[useErrorHandler()] (hooks/use-error-handler.ts)
    ↓ 부작용 처리 (리다이렉트, 로깅)
[getUserMessage()] (lib/errors/error-utils.ts)
    ↓ 사용자 메시지 추출
[ErrorState Component]
```

### 5.2 역할 분리

**handleError()의 역할** (`lib/errors/error-utils.ts`)
- 에러 코드별 처리 전략 결정 (retryable, redirect, logLevel)
- `error-config.ts` 기반 중앙화된 에러 처리
- 순수 함수 (부작용 없음)

```typescript
export function handleError(error: ApiError): HandledError {
  const config = errorConfig[error.code];
  return {
    message: config?.message || error.message,
    retryable: config?.retryable ?? false,
    redirect: config?.redirect,
    logLevel: config?.logLevel ?? "error",
    traceId: error.traceId,
  };
}
```

**useErrorHandler()의 역할** (`hooks/use-error-handler.ts`)
- 전역 정책 실행 (리다이렉트, 로깅)
- React Hook (라우터 등 React 의존성 사용)
- 부작용 중심 처리

```typescript
export function useErrorHandler() {
  const router = useRouter();

  return (error: unknown): HandledError => {
    if (error instanceof ApiError) {
      const handled = handleError(error);
      if (handled.redirect) {
        router.push(handled.redirect);
      }
      return handled;
    }
    // 알 수 없는 에러 타입 처리
  };
}
```

**getUserMessage()의 역할** (`lib/errors/error-utils.ts`)
- 어떤 타입의 에러든 사용자 친화적 메시지로 변환
- 순수 함수 (문구 변환기)
- 화면에 표시할 메시지 추출

### 5.3 에러 코드 관리 전략

**현재 구조:**

- `lib/errors/error-codes.ts`: 에러 코드 타입 정의 (Common, Review, Catalog)
- `lib/errors/error-config.ts`: 에러 코드별 설정 (메시지, 처리 전략)
- `lib/errors/error-utils.ts`: 에러 처리 유틸리티

**에러 코드 분류:**

- **Common**: 공통 에러 (VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND 등)
- **Review**: 리뷰 도메인 에러 (REVIEW_NOT_FOUND, REVIEW_ALREADY_EXISTS 등)
- **Catalog**: 카탈로그 도메인 에러 (CATALOG_MOVIE_NOT_FOUND, CATALOG_TMDB_API_FAILED 등)

**백엔드 서비스와의 일관성:**

- 백엔드의 `ErrorDetail` 스키마 (`{ code, message, details, traceId }`)를 그대로 사용
- 에러 코드 매핑을 통한 일관된 에러 처리
- `traceId`를 통한 요청 추적

## 6. 데이터 전략

### 6.1 React Query 캐싱 전략

**기본 설정:**
- `staleTime: 5분`: 5분간 데이터를 fresh로 간주
- `refetchOnWindowFocus: false`: 포커스 시 자동 리패칭 비활성화
- `retry: 1`: 실패 시 1회 재시도

**도메인별 커스터마이징:**

```typescript
// 검색 결과는 30초 TTL
useQuery({
  queryKey: catalogQueryKeys.search(query, page),
  queryFn: () => searchMovies(query, page),
  staleTime: 1000 * 30, // 30초
});

// 리뷰 목록은 기본 5분 TTL 사용
useQuery({
  queryKey: reviewQueryKeys.list(),
  queryFn: () => fetchReviews(),
  // 기본 설정 사용
});
```

### 6.2 MSW 모킹 전략

**개발 환경 독립성:**

- `NEXT_PUBLIC_ENABLE_MSW=true`일 때만 활성화
- 실제 API와 모킹 간 전환 용이
- 백엔드 서비스 없이도 프론트엔드 개발 가능

**구조:**

```
lib/msw/
├── index.ts      # MSW 인터페이스
├── manager.ts    # MSW 초기화 로직
└── handlers.ts   # API 핸들러 정의
```

**현재 지원하는 API:**
- `GET /api/v1/reviews/my` - 리뷰 목록 조회
- `POST /api/v1/reviews` - 리뷰 생성
- `GET /api/v1/search` - 영화 검색

**핸들러 추가 가이드:**

현재는 단일 파일 구조 (3개 엔드포인트 기준). 10개 이상 엔드포인트가 생기면 도메인별 분리 검토.

### 6.3 타입 안전성 전략

**API 응답 타입:**

```typescript
// domains/review/types.ts
export type Review = {
  id: number;
  movieId: number;
  rating: number;
  reason: string;
  tags: string[];
  watchedAt: string;
};

// domains/review/services.ts
export async function fetchReviews(): Promise<Page<Review>> {
  return apiFetch<Page<Review>>("/v1/reviews/my");
}
```

**환경 변수 타입 안전성:**

`lib/env/`에서 타입 안전한 환경 변수 접근:

```typescript
export const config = {
  get reviewApiBaseUrl() {
    return getReviewApiBaseUrl(); // 타입 검증 포함
  },
  get enableMSW() {
    return process.env.NEXT_PUBLIC_ENABLE_MSW === "true" && isDevelopment;
  },
} as const;
```

## 7. Next.js App Router 구조

### 7.1 라우팅 구조

**그룹 라우팅:**
- `(desktop)/`: 데스크톱 레이아웃 그룹
- `(mobile)/`: 모바일 레이아웃 그룹
- 각 그룹은 독립적인 `layout.tsx`를 가짐

**도메인별 페이지:**
- `reviews/`: 리뷰 관련 페이지 (`/reviews`, `/reviews/new`)
- `catalog/`: 카탈로그 관련 페이지 (`/catalog`)

### 7.2 전역 설정

**Providers** (`app/providers.tsx`):
- React Query Provider
- Theme Provider (next-themes)
- MSW 초기화 (개발 환경)

**Layout** (`app/layout.tsx`):
- 루트 레이아웃
- 전역 메타데이터 설정
- Header 컴포넌트 포함

## 8. 모듈 상호작용

### 8.1 도메인 간 의존성

- **review → catalog**: 리뷰 작성 시 영화 검색
- **shared**: 모든 도메인에서 사용 가능 (레이아웃, 공통 UI)

### 8.2 레이어 간 데이터 흐름

```
[Page Component] (app/reviews/page.tsx)
    ↓ import { reviewQueryKeys, fetchReviews } from "@/domains/review/services"
    ↓ useQuery({ queryKey, queryFn })
[Domain Service] (domains/review/services.ts)
    ↓ import { apiFetch } from "@/lib/api/client"
    ↓ apiFetch<Page<Review>>(path)
[API Client] (lib/api/client.ts)
    ↓ fetch + 에러 처리
[Backend API] or [MSW Handler]
```

## 9. 예외 처리

### 9.1 에러 처리 흐름

**컴포넌트에서 에러 처리:**

```typescript
export default function ReviewsList() {
  const handleErrorSideEffects = useErrorHandler();

  const { data, error } = useQuery({
    queryKey: reviewQueryKeys.list(),
    queryFn: () => fetchReviews(),
  });

  // 에러 부작용 처리 (리다이렉트, 로깅)
  useEffect(() => {
    if (error) {
      handleErrorSideEffects(error);
    }
  }, [error, handleErrorSideEffects]);

  // UI에 표시할 에러 메시지 추출
  if (error instanceof ApiError) {
    const handled = handleError(error);
    return <ErrorState message={handled.message} traceId={handled.traceId} />;
  }
}
```

**에러 코드별 처리 전략** (`lib/errors/error-config.ts`):

- `UNAUTHORIZED`: 로그인 페이지로 리다이렉트
- `VALIDATION_ERROR`: 사용자 친화적 메시지 표시
- `INTERNAL_ERROR`: 재시도 가능 여부 표시

## 10. 확장 로드맵

### 10.1 향후 개선 계획

- **도메인 확장**: `domains/analysis/` 도메인 구현
- **서버 컴포넌트**: Next.js 서버 컴포넌트 활용 전략 수립
- **Optimistic Updates**: React Query의 낙관적 업데이트 패턴 적용
- **무한 스크롤**: 리뷰 목록 무한 스크롤 구현
- **에러 경계**: React Error Boundary 통합

### 10.2 성능 최적화

- **코드 스플리팅**: 도메인별 동적 임포트
- **이미지 최적화**: Next.js Image 컴포넌트 활용
- **캐싱 전략 고도화**: 도메인별 세밀한 캐싱 전략

## 11. 마이크로서비스 연동

### 11.1 API Gateway 패턴

**단일 API 클라이언트** (`lib/api/client.ts`)로 여러 서비스를 통합:

```typescript
// Review Service 호출
apiFetch<Page<Review>>("/v1/reviews/my");

// Catalog Service 호출
apiFetch<SearchResponse>("/v1/search?q=...", {
  baseUrl: config.catalogApiBaseUrl,
});
```

### 11.2 공통 에러 스키마

백엔드 서비스의 `ErrorDetail` 스키마를 그대로 사용:

```typescript
export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}
```

### 11.3 TraceId 전파

- 백엔드에서 제공하는 `traceId`를 에러 메시지에 포함
- 사용자 문의 시 추적 가능

## 12. 공용 용어 (Frontend ↔ Backend)

| 용어          | 프론트엔드                   | 백엔드                    | 일관성     |
|-------------|-------------------------|------------------------|---------|
| **서비스 레이어** | `domains/*/services.ts` | `application/*Service` | ✅ 개념 일치 |
| **도메인 모델**  | `domains/*/types.ts`    | `domain/*`             | ✅ 개념 일치 |
| **인프라 레이어** | `lib/`                  | `infrastructure/`      | ✅ 개념 일치 |
| **에러 처리**   | `lib/errors/`           | `exception/`           | ✅ 개념 일치 |
| **에러 코드**   | `error-codes.ts`        | `ErrorCode`            | ✅ 일치    |
| **에러 스키마**  | `ErrorDetail`           | `ErrorDetail`          | ✅ 동일    |

이 가이드는 Review Service와 Catalog Service와 동일한 문체로 작성되어 있으므로, 세 문서를 교차 검토하며 전체 시스템의 아키텍처를 일관되게 이해할 수 있습니다.

