# 프론트엔드 개발 표준 가이드

> **지속적 개발 시 실시간 참조 가이드** - 이미 개발된 프론트엔드에서 기능 추가/개선 시 항상 고려해야 하는 필수 요소
>
> - **목적**: 새로운 기능 추가, API 연동, 컴포넌트 구현 시 빠른 참조
> - **대상**: 프론트엔드 애플리케이션 (모든 페이지 및 컴포넌트)
> - **사용 시점**: 일상적인 개발 작업 중 지속적으로 참조

---

## 🎯 빠른 체크리스트

새로운 기능을 추가할 때 다음을 빠르게 확인하세요:

- [ ] **에러 처리**: `useErrorHandler` 훅 사용, `handleError()`로 에러 처리 후 `ErrorState`에 traceId, retryable 포함
- [ ] **에러 코드**: 백엔드와 동기화된 에러 코드 Enum 사용
- [ ] **React Query**: React Query v5 패턴 준수 (`onError` 제거, `useEffect`로 처리)
- [ ] **QueryKey 패턴**: 계층적 QueryKey 구조 사용 (all → lists → search/list)
- [ ] **서비스 레이어**: 컴포넌트에서 직접 `apiFetch` 사용 금지, 서비스 함수만 사용
- [ ] **타입 안전성**: API 응답 타입 명시, `unknown` 타입 안전하게 처리
- [ ] **MSW 핸들러**: 에러 코드 Enum 사용 (하드코딩 금지)
- [ ] **ActionId**: 훅 레이어(`useReviewApi`, `useCatalogApi`) 사용하여 actionId 자동 주입
- [ ] **환경 변수**: 타입 안전한 환경 변수 접근 (`lib/env` 사용)

---

## 1. 에러 처리 (Error Handling)

### 1-1. 에러 코드 사용 (필수) ⚠️

**새 에러 코드 추가 또는 에러 처리 시 확인:**

✅ **해야 할 것:**
- 백엔드와 동기화된 에러 코드 Enum 사용 (`CommonErrorCode`, `ReviewErrorCode`, `CatalogErrorCode`)
- MSW 핸들러에서도 에러 코드 Enum 사용 (하드코딩 금지)
- 새로운 에러 코드 추가 시 `errorConfig`에 설정 등록

❌ **하지 말 것:**
- 에러 코드 하드코딩 (`"VALIDATION_ERROR"` 대신 `CommonErrorCode.VALIDATION_ERROR` 사용)
- 알 수 없는 에러 코드를 그대로 사용 (자동으로 `UNKNOWN_ERROR`로 정규화됨)

**체크리스트:**
- [ ] 에러 코드는 `lib/errors/error-codes.ts`의 Enum 사용
- [ ] MSW 핸들러에서도 Enum 사용
- [ ] 새 에러 코드 추가 시 `errorConfig`에 설정 추가

**참고 문서:**
- [에러 처리 스펙](../specs/error-handling.md) - 에러 코드 정의 (섹션 2)
- **코드 참고:** `src/lib/errors/error-codes.ts`, `src/lib/errors/error-config.ts`

---

### 1-2. 에러 처리 패턴

**React Query 사용 시 에러 처리:**

✅ **올바른 패턴:**
- `useErrorHandler` 훅으로 전역 정책 처리 (리다이렉트, 로깅 등 부작용)
- `handleError()` 함수로 에러 처리하여 traceId, retryable, errorCode 정보 추출
- `ErrorState` 컴포넌트에 traceId, retryable, onRetryAction, errorCode 전달 (새 패턴)
- React Query v5: `useQuery`는 `onError` 제거, `useEffect`로 처리
- React Query v5: `useMutation`은 `onError` 사용 가능

```typescript
// Query 에러 처리 (새 패턴: handleError 사용, traceId 포함)
import { handleError, getUserMessage } from "@/lib/errors/error-utils";
import { ApiError } from "@/lib/api/client";

const handleErrorSideEffects = useErrorHandler();
const { data, isError, error, refetch } = useQuery<ResponseType>({ /* ... */ });

useEffect(() => {
  if (error) {
    handleErrorSideEffects(error);  // 리다이렉트, 로깅 등 부작용
  }
}, [error, handleErrorSideEffects]);

if (isError) {
  if (error instanceof ApiError) {
    const handled = handleError(error);
    return (
      <ErrorState
        message={handled.message}
        traceId={handled.traceId}
        retryable={handled.retryable}
        onRetryAction={() => refetch()}
        errorCode={
          process.env.NODE_ENV !== "production"
            ? handled.errorCode
            : undefined
        }
      />
    );
  }
  // ApiError가 아닌 경우 fallback
  return <ErrorState message={getUserMessage(error)} />;
}

// Mutation 에러 처리
const handleError = useErrorHandler();
const { mutate } = useMutation({
  mutationFn: createData,
  onError: (error) => {
    handleError(error);  // ✅ Mutation은 onError 지원
  },
});
```

❌ **잘못된 패턴:**
```typescript
// ❌ useQuery에서 onError 사용 (v5에서 제거됨)
const { data } = useQuery({
  onError: (error) => { /* ... */ },  // ❌ 타입 에러
});

// ❌ 에러 코드 하드코딩
if (error.code === "VALIDATION_ERROR") { /* ... */ }  // ❌

// ❌ 직접 instanceof 체크 반복
if (error instanceof ApiError) { /* ... */ }
if (error instanceof Error) { /* ... */ }
```

**체크리스트:**
- [ ] 모든 React Query 사용 컴포넌트에서 `useErrorHandler` 사용
- [ ] Query 에러 처리: `handleError()`로 에러 처리 후 `ErrorState`에 traceId, retryable 등 전달
- [ ] `ErrorState`에 traceId, retryable, onRetryAction, errorCode 포함 (새 패턴)
- [ ] `useQuery`는 `onError` 제거, `useEffect`로 처리
- [ ] `useMutation`은 `onError` 사용 가능

**코드 참고:**
- `src/hooks/use-error-handler.ts` - 부작용 처리 (리다이렉트, 로깅)
- `src/lib/errors/error-utils.ts` - `handleError()`, `getUserMessage()`
- `src/app/reviews/ReviewsList.tsx` - 새 패턴 예시 (Query 에러 처리)
- `src/app/catalog/CatalogSearch.tsx` - 새 패턴 예시 (Query 에러 처리)
- `src/app/reviews/new/ReviewCreateForm.tsx` - Mutation 에러 처리 예시

**참고: Toast 알림**
- 현재 `useErrorHandler` 내부의 toast 알림은 주석 처리되어 있습니다 (47번째 줄)
- Query 에러는 `ErrorState` 컴포넌트로 화면에 표시되므로 toast가 필요 없습니다
- Mutation 에러는 필요시 컴포넌트 내에서 별도로 toast를 구현할 수 있습니다
- 향후 전역 toast 알림이 필요하면 `useErrorHandler` 내부의 주석을 해제하고 toast 라이브러리를 설정해야 합니다

---


---

## 2. API 통신 (API Communication)

### 2-1. API 호출 패턴 (필수) ⚠️

**새 API 연동 시 반드시 확인:**

✅ **해야 할 것:**
- 모든 API 호출은 `apiFetch` 사용 (직접 `fetch` 금지)
- 응답 타입 제네릭으로 명시 (`apiFetch<ResponseType>`)
- 도메인별 서비스 파일에서 API 호출 로직 분리 (`domains/{domain}/services.ts`)
- 컴포넌트에서는 서비스 함수만 사용 (직접 `apiFetch` 호출 금지)
- React Query `queryKey` 팩토리 함수 정의

❌ **하지 말 것:**
- 직접 `fetch` 호출 (TraceId 전파 누락)
- 타입 없는 API 호출
- 컴포넌트에서 직접 `apiFetch` 호출 (ESLint 규칙으로 금지됨)
- 서비스 레이어 없이 컴포넌트에 API 로직 포함

**체크리스트:**
- [ ] 모든 API 호출은 `apiFetch` 사용
- [ ] 응답 타입 제네릭으로 명시 (`apiFetch<ResponseType>`)
- [ ] 서비스 레이어에서 API 호출 로직 분리 (`domains/{domain}/services.ts`)
- [ ] 컴포넌트에서 직접 `apiFetch` 사용 금지 (서비스 함수만 사용)
- [ ] QueryKey 팩토리 함수 정의 (`queryKeys`)

**코드 참고:**
- `src/lib/api/client.ts` - API 클라이언트
- `src/domains/review/services.ts` - 서비스 레이어 예시
- `src/domains/catalog/services.ts` - 서비스 레이어 예시
- `eslint.config.mjs` - ESLint 규칙 (컴포넌트에서 `apiFetch` 직접 사용 금지)

---

### 2-2. ActionId 전파 (필수) ⚠️

**API 요청 시 `X-Action-Id` 헤더 자동 포함**

✅ **해야 할 것:**
- 컴포넌트에서는 **훅 레이어 사용** (`useReviewApi`, `useCatalogApi`) - actionId 자동 주입
- 여러 API 호출이 연속으로 발생하는 사용자 액션의 경우 `useActionTrace().startAction()` 사용

❌ **하지 말 것:**
- 컴포넌트에서 직접 `apiFetch` 호출 (actionId 누락)
- 서비스 함수를 컴포넌트에서 직접 호출 (actionId 누락)

**체크리스트:**
- [ ] 컴포넌트에서는 훅 레이어 사용 (`useReviewApi`, `useCatalogApi`)
- [ ] 여러 API 호출이 연속으로 발생하는 경우 `useActionTrace().startAction()` 사용
- [ ] 수동으로 `X-Action-Id` 헤더 추가하는 코드 없음 (훅 레이어가 자동 처리)

**참고 문서:** [ActionId 가이드](./action-id-guide.md)

### 2-3. TraceId (백엔드 관리)

**TraceId는 백엔드가 생성/관리합니다.**

✅ **확인 사항:**
- 프론트엔드는 `X-Trace-Id` 헤더를 보내지 않음
- 에러 응답에서 traceId를 읽어와서 로그에 포함
- 성공 응답의 traceId는 사용하지 않음 (선택사항)

**체크리스트:**
- [ ] 프론트엔드에서 `X-Trace-Id` 헤더를 보내는 코드 없음
- [ ] 에러 응답에서 traceId를 읽어와서 사용

**참고 문서:**
- [TraceId 가이드](./trace-id-guide.md) - 프론트엔드 처리 방법 포함
- [에러 처리 스펙](../specs/error-handling.md) - TraceId 정책 (섹션 3)

---

## 3. React Query 패턴

### 3-1. QueryKey 패턴 표준화 (필수) ⚠️

**새 Query 추가 시 반드시 확인:**

✅ **해야 할 것:**
- 계층적 QueryKey 구조 사용: `all` → `lists()` → `search()` / `list()`
- `search`는 `lists()` 계열로 분류 (검색도 리스트 계열)
- QueryKey params는 `Readonly` 타입으로 제한
- QueryKey 타입 export (`ReturnType` 사용)

❌ **하지 말 것:**
- QueryKey를 직접 배열로 하드코딩 (`["catalog", "search"]` 대신 `catalogQueryKeys.search()` 사용)
- params를 mutable 타입으로 정의
- 계층 구조 없이 평면적으로 정의

**표준 패턴:**
```typescript
// domains/{domain}/services.ts
export const domainQueryKeys = {
  all: ["domain"] as const,
  lists: () => [...domainQueryKeys.all, "list"] as const,
  // search는 lists 계열 (검색도 리스트 결과를 반환)
  search: (params: Readonly<{ q: string; page: number }>) =>
    [...domainQueryKeys.lists(), "search", params] as const,
  // list도 lists 계열
  list: (params?: Readonly<{ page?: number; size?: number }>) =>
    [...domainQueryKeys.lists(), params] as const,
} as const;

// QueryKey 타입 export (타입 안전성 강화)
export type DomainQueryKey =
  | ReturnType<typeof domainQueryKeys.all>
  | ReturnType<typeof domainQueryKeys.lists>
  | ReturnType<typeof domainQueryKeys.search>
  | ReturnType<typeof domainQueryKeys.list>;
```

**계층 구조 설명:**
- `all`: 도메인 루트 (모든 쿼리 무효화 시 사용)
- `lists()`: 모든 리스트 계열 쿼리 그룹 (`list`, `search` 등)
- `search()` / `list()`: 실제 쿼리 키 (params 포함)

**체크리스트:**
- [ ] QueryKey는 계층적 구조 사용 (`all` → `lists()` → `search()` / `list()`)
- [ ] `search`는 `lists()` 계열로 분류
- [ ] QueryKey params는 `Readonly` 타입으로 제한
- [ ] QueryKey 타입 export (`ReturnType` 사용)
- [ ] JSDoc에 계층 구조 문서화

**코드 참고:**
- `src/domains/catalog/services.ts` - Catalog QueryKey 패턴
- `src/domains/review/services.ts` - Review QueryKey 패턴

---

### 3-2. 서비스 레이어 분리 (필수) ⚠️

**API 호출 시 반드시 확인:**

✅ **해야 할 것:**
- 모든 API 호출은 `domains/{domain}/services.ts`에 서비스 함수로 정의
- 컴포넌트에서는 서비스 함수만 사용 (`useQuery`, `useMutation`의 `queryFn` / `mutationFn`)
- QueryKey 팩토리와 서비스 함수를 같은 파일에 정의

❌ **하지 말 것:**
- 컴포넌트에서 직접 `apiFetch` 호출 (ESLint 규칙으로 금지됨)
- 컴포넌트에서 직접 `fetch` 호출
- 서비스 레이어 없이 컴포넌트에 API 로직 포함

**올바른 패턴:**
```typescript
// ✅ domains/review/services.ts
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

// ✅ 컴포넌트에서 사용
import { reviewQueryKeys, fetchReviews } from "@/domains/review/services";

const { data } = useQuery({
  queryKey: reviewQueryKeys.list({ page: 0, size: 10 }),
  queryFn: () => fetchReviews({ page: 0, size: 10 }),
});
```

**잘못된 패턴:**
```typescript
// ❌ 컴포넌트에서 직접 apiFetch 사용 (ESLint 오류)
import { apiFetch } from "@/lib/api/client";

const { data } = useQuery({
  queryKey: ["reviews"],
  queryFn: () => apiFetch<Page<Review>>("/v1/reviews"),  // ❌ 금지됨
});
```

**ESLint 규칙:**
- 컴포넌트 파일 (`src/app/**`, `src/components/**`, `src/domains/**`)에서 `apiFetch` 직접 import 금지
- 테스트 파일 (`*.test.ts`, `*.spec.ts`) 및 Storybook (`*.stories.ts`)는 예외

**체크리스트:**
- [ ] 모든 API 호출은 서비스 함수로 정의 (`domains/{domain}/services.ts`)
- [ ] 컴포넌트에서는 서비스 함수만 사용
- [ ] 컴포넌트에서 `apiFetch` 직접 import 없음 (ESLint 규칙 준수)
- [ ] QueryKey 팩토리와 서비스 함수를 같은 파일에 정의

**코드 참고:**
- `src/domains/catalog/services.ts` - 서비스 레이어 예시
- `src/domains/review/services.ts` - 서비스 레이어 예시
- `src/app/catalog/CatalogSearch.tsx` - 컴포넌트에서 서비스 함수 사용 예시
- `eslint.config.mjs` - ESLint 규칙 설정

---

### 3-3. Query/Mutation 사용 시 확인

**새 Query 또는 Mutation 추가 시:**

✅ **해야 할 것:**
- Query 타입 명시 (`useQuery<ResponseType>`)
- QueryKey는 서비스 파일의 `queryKeys` 팩토리 함수 사용
- `useQuery`는 `onError` 제거, `useEffect`로 에러 처리
- `useMutation`은 `onError` 사용 가능
- 성공 시 필요한 쿼리 무효화 (`invalidateQueries`)

**체크리스트:**
- [ ] Query 타입 명시 (`useQuery<ResponseType>`)
- [ ] QueryKey는 `queryKeys` 팩토리 함수 사용
- [ ] `useQuery`는 `onError` 제거, `useEffect`로 에러 처리
- [ ] `useMutation`은 `onError` 사용 가능
- [ ] 성공 시 필요한 쿼리 무효화 (`invalidateQueries`)

**코드 참고:**
- `src/domains/review/services.ts` - QueryKey 패턴
- `src/app/reviews/ReviewsList.tsx` - Query 사용 예시
- `src/app/reviews/new/ReviewCreateForm.tsx` - Mutation 사용 예시

---

## 4. 컴포넌트 작성

### 4-1. 상태 컴포넌트 사용

**로딩/에러/빈 상태는 공통 컴포넌트 사용**

✅ **해야 할 것:**
- 로딩/에러/빈 상태는 공통 컴포넌트 재사용
- 에러 메시지는 `getUserMessage()`로 변환

**체크리스트:**
- [ ] 로딩/에러/빈 상태는 공통 컴포넌트 사용 (`LoadingState`, `ErrorState`, `EmptyState`)
- [ ] 에러 메시지는 `getUserMessage(error)` 사용

**코드 참고:** `src/domains/shared/components/state/`

---

## 5. 타입 안전성

### 5-1. 타입 명시 및 처리

**새 기능 추가 시 타입 안전성 확인:**

✅ **해야 할 것:**
- `useQuery` 제네릭으로 응답 타입 명시
- 서비스 함수 반환 타입 명시 (`Promise<ResponseType>`)
- `apiFetch` 제네릭으로 타입 안전성 확보
- `unknown` 타입은 유틸 함수에서 처리 (`getUserMessage()`)

**체크리스트:**
- [ ] API 호출 시 타입 명시 (`apiFetch<ResponseType>`, `useQuery<ResponseType>`)
- [ ] 에러는 `getUserMessage(error)` 사용 (타입 체크는 유틸 함수 내부에서 처리)

---

## 6. 환경 변수 접근

### 6-1. 환경 변수 사용 시 확인

**환경 변수 접근 시:**

✅ **해야 할 것:**
- `lib/env/index.ts`에서 export되는 `env`, `userSeq`, `isMSWEnabled` 사용
- 추가 설정값은 `lib/config/review.config.ts`, `lib/config/catalog.config.ts`에서 접근

❌ **하지 말 것:**
- `process.env` 직접 접근 금지

**체크리스트:**
- [ ] 환경 변수는 `lib/env`의 `env`/`userSeq`/`isMSWEnabled`로 접근
- [ ] API 설정은 `lib/config/*.config.ts`를 통해 접근
- [ ] `process.env` 직접 접근 금지

**참고 문서:** `src/lib/env/README.md`

---

## 7. MSW 핸들러 작성

### 7-1. MSW 핸들러 추가 시 확인

**새 MSW 핸들러 추가 시:**

✅ **해야 할 것:**
- 에러 코드는 Enum 사용 (하드코딩 금지)
- 표준 에러 스키마 준수 (`ErrorDetail` 형식: `code`, `message`, `details`, `traceId`)
- TraceId는 `crypto.randomUUID()`로 생성

**체크리스트:**
- [ ] 에러 코드는 Enum 사용 (`CommonErrorCode`, `ReviewErrorCode`, `CatalogErrorCode`)
- [ ] 표준 에러 스키마 준수
- [ ] TraceId 생성 (`crypto.randomUUID()`)

**참고 문서:** `src/lib/msw/README.md`

---

## 8. 폼 관리

### 8-1. 폼 검증 패턴

**새 폼 추가 시:**

✅ **해야 할 것:**
- Zod 스키마로 폼 검증 정의
- `z.infer`로 타입 자동 추론
- `zodResolver`로 React Hook Form과 통합

**체크리스트:**
- [ ] Zod 스키마로 폼 검증 정의 (`domains/{domain}/schema.ts`)
- [ ] `z.infer`로 타입 자동 추론
- [ ] `zodResolver`로 React Hook Form과 통합

**코드 참고:** `src/domains/review/schema.ts`, `src/app/reviews/new/ReviewCreateForm.tsx`

---

## 9. 테스트

### 9-1. 테스트 파일 구조

**테스트 파일 위치 규칙:**

| 디렉토리          | 패턴             | 예시                                             | 이유                               |
|---------------|----------------|------------------------------------------------|----------------------------------|
| `lib/`        | `__tests__` 폴더 | `lib/api/__tests__/client.test.ts`             | 유틸/인프라 레벨, 테스트 파일 다수 예상          |
| `domains/`    | `__tests__` 폴더 | `domains/review/__tests__/services.test.ts`    | 서비스/스키마/도메인 테스트 여러 개 생기므로 묶어서 관리 |
| `components/` | Co-located     | `components/ui/button.tsx` / `button.test.tsx` | 컴포넌트와 테스트를 같이 열어보는 게 자연스러움       |
| `hooks/`      | 성격에 따라 분리      | 아래 참고                                          | UI 전용 vs 도메인/인프라 구분              |

**hooks/ 테스트 위치 규칙:**

✅ **기본 원칙:**
- **UI 전용 훅** (컴포넌트에 강하게 붙어있는 훅): 컴포넌트와 co-located
  - 예: `useButtonState`, `useModal`
  - 위치: `components/.../useX.ts` + `useX.test.ts`
- **도메인/인프라 훅** (여러 곳에서 재사용되는 훅): `hooks/__tests__` 폴더
  - 예: `useReviewQuery`, `useAuth`, `useErrorHandler`, `useInfiniteScroll`
  - 위치: `hooks/__tests__/useX.test.ts`

**테스트 파일 네이밍:**
- 파일명: `*.test.ts`, `*.test.tsx`로 통일
- `.spec.ts` 사용 금지 (일관성 유지)

**도구 설정 확인:**
- Vitest는 기본적으로 `__tests__` 폴더와 co-located 패턴 모두 자동 인식
- 명시적 설정이 필요한 경우 `vitest.config.ts`에서 확인:
  ```typescript
  // Vitest 기본 패턴이 둘 다 커버함:
  // **/*.{test,spec}.{ts,tsx} (co-located)
  // **/__tests__/**/*.{test,spec}.{ts,tsx} (__tests__ 폴더)
  ```

**체크리스트:**
- [ ] 테스트 파일 위치가 프로젝트 규칙에 맞음
- [ ] 테스트 파일명은 `*.test.ts` 또는 `*.test.tsx` 형식 (`.spec` 사용 금지)
- [ ] hooks는 성격에 따라 위치 결정 (UI 전용: co-located, 도메인/인프라: `__tests__`)
- [ ] 테스트 파일이 소스 파일과 함께 버전 관리됨

---

### 9-2. 테스트 작성 전략 (기능 구현 시)

**새 기능 구현 시 테스트 작성:**

✅ **해야 할 것:**
- 기능 구현과 함께 테스트 작성 (TDD 스타일 권장)
- 도메인 서비스 테스트 작성 (`domains/{domain}/__tests__/services.test.ts`)
- 커스텀 훅 테스트 작성 (도메인/인프라 훅: `hooks/__tests__/use*.test.ts`, UI 전용 훅: 컴포넌트와 co-located)
- 폼 검증 로직 테스트 작성 (`domains/{domain}/__tests__/schema.test.ts`)

**체크리스트:**
- [ ] 도메인 서비스 테스트: API 호출 파라미터 변환, 에러 처리, 타입 안전성 검증
- [ ] 커스텀 훅 테스트: 데이터 fetching, 캐싱 동작, 에러 상태 관리 검증
- [ ] 폼 검증 로직 테스트: 필수 필드 검증, 타입 변환, 커스텀 검증 규칙 검증

**테스트 범위:**
- **도메인 서비스**: API 호출 로직, 파라미터 변환 (URLSearchParams 등), 에러 전파
- **커스텀 훅**: React Query 동작 (fetching, caching, error handling)
- **폼 검증**: Zod 스키마 검증, 타입 변환 (날짜, 숫자 등)

**코드 참고:**
- Phase 1 테스트 예시: `src/lib/api/__tests__/client.test.ts` (인프라 레벨, 완료)
- Phase 2 테스트 예시: 향후 `src/domains/review/__tests__/services.test.ts` (도메인 레벨)

**참고 문서:**
- Phase 3 테스트 전략: [docs/improvements.md](../improvements.md) 섹션 4-2

---

### 9-3. 에러 코드 매핑 검증

**새 에러 코드 추가 시:**

✅ **해야 할 것:**
- 중요한 에러 코드에 설정이 있는지 검증
- 설정 구조 검증 (undefined 처리 포함)

**체크리스트:**
- [ ] 에러 코드 추가 시 `errorConfig`에 설정 추가
- [ ] 테스트에서 중요한 에러 코드 설정 검증

**코드 참고:** `src/lib/errors/__tests__/error-config.test.ts`

---

## 📋 빠른 참조

### 새 기능 추가 시 체크

1. **에러 처리:**
   - [ ] 에러 코드는 Enum 사용 (하드코딩 금지)
   - [ ] `useErrorHandler` 사용 (리다이렉트, 로깅 등)
   - [ ] 화면 메시지는 `getUserMessage()` 사용
   - [ ] MSW 핸들러도 에러 코드 Enum 사용

2. **API 연동:**
   - [ ] 컴포넌트에서는 훅 레이어 사용 (`useReviewApi`, `useCatalogApi`)
   - [ ] 여러 API 호출이 연속으로 발생하는 경우 `useActionTrace().startAction()` 사용
   - [ ] 응답 타입 제네릭으로 명시
   - [ ] QueryKey 팩토리 함수 정의

3. **React Query:**
   - [ ] QueryKey는 계층적 구조 사용 (`all` → `lists()` → `search()` / `list()`)
   - [ ] QueryKey params는 `Readonly` 타입으로 제한
   - [ ] Query 타입 명시 (`useQuery<ResponseType>`)
   - [ ] QueryKey는 서비스 파일의 `queryKeys` 팩토리 함수 사용
   - [ ] `useQuery`는 `onError` 제거, `useEffect`로 에러 처리
   - [ ] `useMutation`은 `onError` 사용 가능
   - [ ] 성공 시 필요한 쿼리 무효화 (`invalidateQueries`)

4. **컴포넌트 & 환경 변수:**
   - [ ] 로딩/에러/빈 상태는 공통 컴포넌트 사용
   - [ ] 환경 변수는 `lib/env`의 `env`/`userSeq`/`isMSWEnabled` 사용
   - [ ] API 설정은 `lib/config/*.config.ts`로 접근

5. **테스트 (Phase 2):**
   - [ ] 도메인 서비스 테스트 작성 (기능 구현 시)
   - [ ] 커스텀 훅 테스트 작성 (React Query 동작 검증)
   - [ ] 폼 검증 로직 테스트 작성 (Zod 스키마 검증)

---

## 🔗 참고 문서

### 공통 스펙
- [에러 처리 스펙](../specs/error-handling.md) - 에러 응답 형식 및 에러 코드 정의
- [백엔드 개발 표준](development-standards.md) - 백엔드 에러 처리 및 API 설계

### 프론트엔드 전용
- [README](../../reelnote-frontend/README.md) - 프론트엔드 프로젝트 개요 및 아키텍처
- [ActionId 가이드](./action-id-guide.md) - 사용자 액션 단위 상관관계 ID 관리
- [환경 변수 가이드](../../reelnote-frontend/src/lib/env/README.md) - 환경 변수 관리
- [MSW 가이드](../../reelnote-frontend/src/lib/msw/README.md) - MSW 모킹 패턴

### 코드 참고
- API 클라이언트: `src/lib/api/client.ts`
- 훅 레이어: `src/domains/review/hooks/useReviewApi.ts`, `src/domains/catalog/hooks/useCatalogApi.ts`
- ActionContext: `src/lib/action/action-context.tsx`
- 에러 코드: `src/lib/errors/error-codes.ts`
- 에러 설정: `src/lib/errors/error-config.ts`
- 에러 처리 훅: `src/hooks/use-error-handler.ts`
- QueryKey 패턴: `src/domains/catalog/services.ts`, `src/domains/review/services.ts`
- ESLint 규칙: `reelnote-frontend/eslint.config.mjs`

---

