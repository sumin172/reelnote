# ActionId 가이드

> 사용자 액션 단위 상관관계 ID 관리 가이드

## 📋 목차

1. [개념 정리](#1-개념-정리)
2. [TraceId vs ActionId](#2-traceid-vs-actionid)
3. [사용 방법](#3-사용-방법)
4. [제약사항](#4-제약사항)
5. [백엔드 연동](#5-백엔드-연동)

---

## 1. 개념 정리

### 1-1. ActionId란?

**ActionId**는 사용자 액션 단위로 생성되는 상관관계 ID입니다.

- **생성 주체**: 프론트엔드
- **생성 시점**: 사용자 액션 시작 시
- **사용 목적**: 하나의 사용자 액션에서 발생하는 모든 API 호출을 추적

### 1-2. 사용자 액션 예시

- **리뷰 작성**: 영화 검색 → 리뷰 생성 (2개 API 호출)
- **리뷰 수정**: 리뷰 조회 → 리뷰 수정 (2개 API 호출)
- **리뷰 삭제**: 리뷰 삭제 (1개 API 호출)

---

## 2. TraceId vs ActionId

### 2-1. 개념 분리

| 항목 | TraceId | ActionId |
|------|---------|----------|
| **생성 주체** | 백엔드 | 프론트엔드 |
| **단위** | HTTP 요청 1개 | 사용자 액션 1개 |
| **생성 시점** | HTTP 요청 수신 시 | 사용자 액션 시작 시 |
| **사용 목적** | 마이크로서비스 간 요청 추적 | 사용자 액션 단위 추적 |
| **헤더 이름** | `X-Trace-Id` | `X-Action-Id` |

### 2-2. 예시

**사용자가 리뷰를 작성하는 경우:**

```
사용자 액션: 리뷰 작성
├─ ActionId: "action-abc-123" (프론트엔드가 생성)
│
├─ API 호출 1: 영화 검색
│   ├─ X-Action-Id: "action-abc-123"
│   └─ X-Trace-Id: "trace-001" (백엔드가 생성)
│
└─ API 호출 2: 리뷰 생성
    ├─ X-Action-Id: "action-abc-123" (동일)
    └─ X-Trace-Id: "trace-002" (백엔드가 생성, 다른 값)
```

**백엔드 로그:**

```
[traceId=trace-001, actionId=action-abc-123] 영화 검색 요청
[traceId=trace-002, actionId=action-abc-123] 리뷰 생성 요청
```

- **traceId**: 각 HTTP 요청마다 다른 값 (요청 단위 추적)
- **actionId**: 같은 사용자 액션에서 동일한 값 (액션 단위 추적)

---

## 3. 사용 방법

### 3-1. 기본 사용 (자동 주입)

대부분의 경우, **훅 레이어를 사용**하면 actionId가 자동으로 주입됩니다.

```typescript
// domains/review/hooks/useReviewApi.ts
import { useReviewApi } from "@/domains/review/hooks/useReviewApi";

function ReviewsList() {
  const { fetchReviews } = useReviewApi(); // actionId 자동 주입

  const { data } = useQuery({
    queryKey: reviewQueryKeys.list(),
    queryFn: () => fetchReviews({ page: 0, size: 10 }),
  });
}
```

### 3-2. 사용자 액션 시작 시 새 ActionId 발급

여러 API 호출이 연속으로 발생하는 사용자 액션의 경우, `useActionTrace`를 사용하여 새 actionId를 발급합니다.

```typescript
import { useActionTrace } from "@/hooks/use-action-trace";
import { useReviewApi } from "@/domains/review/hooks/useReviewApi";
import { useCatalogApi } from "@/domains/catalog/hooks/useCatalogApi";

function ReviewCreateForm() {
  const { startAction } = useActionTrace();
  const { createReview } = useReviewApi();
  const { searchMovies } = useCatalogApi();

  const handleSubmit = async (data: ReviewCreateInput) => {
    // 새 사용자 액션 시작
    const actionId = startAction();

    try {
      // 1. 영화 검색 (같은 actionId 사용)
      const movies = await searchMovies(data.movieTitle);

      // 2. 리뷰 생성 (같은 actionId 사용)
      await createReview({
        movieId: movies[0].tmdbId,
        ...data,
      });
    } catch (error) {
      // 에러 처리
    }
  };
}
```

### 3-3. 로깅 시 ActionId 포함

```typescript
import { useActionId } from "@/lib/action/action-context";
import { logger } from "@/lib/logger";

function MyComponent() {
  const actionId = useActionId();

  const handleClick = () => {
    logger.info("리뷰 목록 조회 클릭", {
      actionId, // 자동 포함
    });
  };
}
```

---

## 4. 제약사항

### 4-1. 전역 하나 기준

**현재 구조는 전역에 "현재 활성 액션 하나"만 관리합니다.**

- `useActionTrace().startAction()`을 호출하면, 이전 actionId가 덮어써집니다.
- 동시에 여러 액션이 진행되면, 나중에 시작된 액션이 이전 액션의 actionId를 덮어씁니다.

**이것은 의도된 동작이며, 현재 UX에서는 동시에 여러 긴 액션을 돌리지 않는다는 전제입니다.**

### 4-2. 병렬 액션

**현재 구조는 병렬 액션을 완벽히 처리하지 않습니다.**

동시에 여러 액션이 진행되면:
- A 액션 시작: actionId = A
- 도중에 B 액션 시작: actionId = B
- A 안에서 나중에 날아간 요청은 actionId = B로 찍혀버릴 수 있음

**해결 방법 (향후 필요 시):**
- actionId를 전역 1개가 아니라, "액션 핸들"에 붙여서
- API 호출할 때마다 그 핸들을 넘기는 방식으로 설계

**현재는 이 제약을 "디자인 트레이드오프"로 수용합니다.**

### 4-3. SSR

**ActionProvider는 `"use client"` 환경에서만 사용합니다.**

- SSR에서 서버 컴포넌트가 백엔드 호출할 때는 actionId를 사용하지 않습니다.
- 백엔드는 클라이언트에서 온 요청에만 `X-Action-Id`가 붙어 있고,
- SSR 환경에서 오는 요청은 "순수 HTTP trace"만 사용합니다.

**요약:**
> actionId는 "클라이언트 사용자 액션 전용"이며,
> SSR에서의 백엔드 호출 trace는 서버 쪽 traceId만 씁니다.

---

## 5. 백엔드 연동

### 5-1. 헤더 규약

프론트엔드는 다음 헤더를 전송합니다:

- `X-Action-Id`: 사용자 액션 단위 상관관계 ID (프론트엔드가 생성/관리)
- `X-Trace-Id`: 전송하지 않음 (백엔드가 생성/관리)

### 5-2. 백엔드 처리

백엔드는 두 헤더를 모두 받아서 로그에 기록합니다:

**Review Service (Kotlin/Spring Boot):**

```kotlin
// TraceIdFilter에서 X-Action-Id 헤더도 읽어서 MDC에 저장
val actionId = request.getHeader("X-Action-Id")
if (!actionId.isNullOrBlank()) {
    MDC.put("actionId", actionId)
}

// 로그에 자동 포함
logger.info("리뷰 생성 요청") // [traceId=xxx, actionId=yyy] 자동 포함
```

**Catalog Service (TypeScript/NestJS):**

```typescript
// 필터에서 X-Action-Id 헤더 읽어서 Span에 저장
const actionId = request.headers["x-action-id"];
if (actionId) {
  span.setAttribute("actionId", actionId);
}

// 로그에 포함
logger.log({
  message: "영화 검색 요청",
  traceId,
  actionId, // 포함
});
```

### 5-3. 로그 상관관계

**프론트엔드 로그:**

```json
{
  "level": "info",
  "message": "리뷰 작성 시작",
  "actionId": "action-abc-123"
}
```

**백엔드 로그:**

```json
{
  "level": "info",
  "message": "리뷰 생성 요청",
  "traceId": "trace-002",
  "actionId": "action-abc-123"
}
```

**같은 actionId로 프론트엔드와 백엔드 로그를 연결할 수 있습니다.**

---

## 6. 빠른 참조

### 6-1. 컴포넌트에서 사용

```typescript
// ✅ 훅 레이어 사용 (actionId 자동 주입)
import { useReviewApi } from "@/domains/review/hooks/useReviewApi";

const { fetchReviews } = useReviewApi();
const { data } = useQuery({
  queryKey: reviewQueryKeys.list(),
  queryFn: () => fetchReviews({ page: 0, size: 10 }),
});
```

### 6-2. 사용자 액션 시작 시

```typescript
// ✅ 여러 API 호출이 연속으로 발생하는 경우
import { useActionTrace } from "@/hooks/use-action-trace";

const { startAction } = useActionTrace();

const handleSubmit = async () => {
  const actionId = startAction(); // 새 액션 시작
  // 이제 이 액션의 모든 API 호출이 같은 actionId 사용
};
```

### 6-3. 로깅 시

```typescript
// ✅ 로깅 시 actionId 포함
import { useActionId } from "@/lib/action/action-context";
import { logger } from "@/lib/logger";

const actionId = useActionId();
logger.info("리뷰 목록 조회", { actionId });
```

---

## 7. FAQ

### Q: 기존 서비스 함수(`fetchReviews`, `searchMovies`)는 어떻게 되나요?

**A:** 기존 서비스 함수는 그대로 유지됩니다. React 훅을 사용하지 않는 경우(예: 서버 컴포넌트)를 위해 남겨둡니다.

**권장사항:**
- 컴포넌트에서는 `useReviewApi`, `useCatalogApi` 훅 사용
- 서버 컴포넌트나 일반 함수에서는 기존 서비스 함수 사용

**서버 컴포넌트나 일반 함수에서 기존 서비스 함수를 사용하는 이유:**

1. **React 훅 사용 불가**
   - `useReviewApi`, `useCatalogApi`는 React 훅이므로 클라이언트 컴포넌트에서만 사용 가능
   - 서버 컴포넌트나 일반 함수는 React 훅을 사용할 수 없음

2. **ActionProvider 접근 불가**
   - `ActionProvider`는 `"use client"` 환경에서만 동작 (React Context 사용)
   - 서버 컴포넌트는 서버에서 실행되므로 React Context에 접근할 수 없음
   - 일반 함수는 React 컴포넌트가 아니므로 Context에 접근 불가

3. **ActionId가 필요 없는 경우**
   - 서버 컴포넌트에서의 API 호출은 "사용자 액션"이 아니라 서버 사이드 렌더링을 위한 데이터 fetching
   - ActionId는 "클라이언트 사용자 액션 전용"이므로 서버 컴포넌트에서는 보통 전달하지 않음
   - 서버 컴포넌트의 백엔드 호출은 서버 쪽 traceId만 사용

**예시:**

```typescript
// ✅ 클라이언트 컴포넌트: 훅 사용 (actionId 자동 주입)
"use client";
function ReviewsList() {
  const { fetchReviews } = useReviewApi();
  const { data } = useQuery({
    queryKey: reviewQueryKeys.list(),
    queryFn: () => fetchReviews({ page: 0, size: 10 }),
  });
}

// ✅ 서버 컴포넌트: 기존 서비스 함수 직접 사용 (actionId 없음)
async function ServerReviewsList() {
  const reviews = await fetchReviews({ page: 0, size: 10 });
  return <div>{/* ... */}</div>;
}

// ✅ 일반 함수: 기존 서비스 함수 직접 사용
async function getReviewsData() {
  return await fetchReviews({ page: 0, size: 10 });
}
```

### Q: ActionProvider를 빠뜨리면 어떻게 되나요?

**A:** `useActionId()` 또는 `useActionContext()`를 호출하면 명확한 에러 메시지와 함께 예외가 발생합니다 (fail-fast).

```
Error: useActionId must be used within <ActionProvider>.
Make sure to wrap your app with <ActionProvider> in app/providers.tsx
```

### Q: 병렬 액션을 지원하려면 어떻게 해야 하나요?

**A:** 현재 구조는 병렬 액션을 지원하지 않습니다. 필요하면:
1. actionId를 전역 1개가 아니라, "액션 핸들"에 붙이기
2. API 호출할 때마다 그 핸들을 넘기는 방식으로 설계

현재는 "동시에 여러 긴 액션을 돌리지 않는다"는 전제로 충분합니다.

---

## 8. 참고 문서

- [프론트엔드 아키텍처](../../reelnote-frontend/ARCHITECTURE.md)
- [에러 처리 스펙](../specs/error-handling.md)
- [프론트엔드 개발 표준](./frontend-development-standards.md)

