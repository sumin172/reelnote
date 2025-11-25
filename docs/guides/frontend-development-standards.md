# 프론트엔드 개발 표준 가이드

> **지속적 개발 시 실시간 참조 가이드** - 이미 개발된 프론트엔드에서 기능 추가/개선 시 항상 고려해야 하는 필수 요소
>
> - **목적**: 새로운 기능 추가, API 연동, 컴포넌트 구현 시 빠른 참조
> - **대상**: 프론트엔드 애플리케이션 (모든 페이지 및 컴포넌트)
> - **사용 시점**: 일상적인 개발 작업 중 지속적으로 참조

---

## 🎯 빠른 체크리스트

새로운 기능을 추가할 때 다음을 빠르게 확인하세요:

- [ ] **에러 처리**: `useErrorHandler` 훅 사용, `getUserMessage`로 메시지 표시
- [ ] **에러 코드**: 백엔드와 동기화된 에러 코드 Enum 사용
- [ ] **React Query**: React Query v5 패턴 준수 (`onError` 제거, `useEffect`로 처리)
- [ ] **타입 안전성**: API 응답 타입 명시, `unknown` 타입 안전하게 처리
- [ ] **MSW 핸들러**: 에러 코드 Enum 사용 (하드코딩 금지)
- [ ] **TraceId 전파**: API 요청 시 `X-Trace-Id` 헤더 자동 포함
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

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 2
**코드 참고:** `src/lib/errors/error-codes.ts`, `src/lib/errors/error-config.ts`

---

### 1-2. 에러 처리 패턴

**React Query 사용 시 에러 처리:**

✅ **올바른 패턴:**
- `useErrorHandler` 훅으로 전역 정책 처리 (리다이렉트, 로깅 등 부작용)
- `getUserMessage()` 함수로 화면 메시지 표시 (순수 함수)
- React Query v5: `useQuery`는 `onError` 제거, `useEffect`로 처리
- React Query v5: `useMutation`은 `onError` 사용 가능

```typescript
// Query 에러 처리
const handleError = useErrorHandler();
const { data, isError, error } = useQuery<ResponseType>({ /* ... */ });

useEffect(() => {
  if (error) {
    handleError(error);  // 리다이렉트, 로깅 등
  }
}, [error, handleError]);

if (isError) {
  return <ErrorState message={getUserMessage(error)} />;
}

// Mutation 에러 처리
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
- [ ] 화면 메시지는 `getUserMessage(error)` 사용
- [ ] `useQuery`는 `onError` 제거, `useEffect`로 처리
- [ ] `useMutation`은 `onError` 사용 가능

**코드 참고:** `src/hooks/use-error-handler.ts`, `src/lib/errors/error-utils.ts`

---


---

## 2. API 통신 (API Communication)

### 2-1. API 호출 패턴 (필수) ⚠️

**새 API 연동 시 반드시 확인:**

✅ **해야 할 것:**
- 모든 API 호출은 `apiFetch` 사용 (직접 `fetch` 금지)
- 응답 타입 제네릭으로 명시 (`apiFetch<ResponseType>`)
- 도메인별 서비스 파일에서 API 호출 로직 분리 (`domains/{domain}/services.ts`)
- React Query `queryKey` 팩토리 함수 정의

❌ **하지 말 것:**
- 직접 `fetch` 호출 (TraceId 전파 누락)
- 타입 없는 API 호출
- 컴포넌트에서 직접 API 호출

**체크리스트:**
- [ ] 모든 API 호출은 `apiFetch` 사용
- [ ] 응답 타입 제네릭으로 명시 (`apiFetch<ResponseType>`)
- [ ] 서비스 레이어에서 API 호출 로직 분리
- [ ] QueryKey 팩토리 함수 정의 (`queryKeys`)

**코드 참고:** `src/lib/api/client.ts`, `src/domains/review/services.ts`

---

### 2-2. TraceId 전파

**API 요청 시 자동으로 `X-Trace-Id` 헤더 포함됨 (확인만 필요)**

✅ **확인 사항:**
- `apiFetch` 사용 시 TraceId 자동 전파됨
- 수동으로 `X-Trace-Id` 헤더 추가 불필요 (자동 처리됨)

**체크리스트:**
- [ ] `apiFetch` 사용 시 TraceId 자동 전파 확인
- [ ] 수동으로 `X-Trace-Id` 헤더 추가하는 코드 없음

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 3

---

## 3. React Query 패턴

### 3-1. Query/Mutation 사용 시 확인

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
- [ ] 성공 시 필요한 쿼리 무효화

**코드 참고:** `src/domains/review/services.ts` (QueryKey 패턴)

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
- `config` 객체를 통해서만 접근 (`lib/env`)

❌ **하지 말 것:**
- `process.env` 직접 접근 금지

**체크리스트:**
- [ ] 환경 변수는 `config` 객체를 통해서만 접근
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

### 9-1. 에러 코드 매핑 검증

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
   - [ ] `apiFetch` 사용 (직접 `fetch` 금지)
   - [ ] 응답 타입 제네릭으로 명시
   - [ ] 서비스 레이어에서 API 호출 로직 분리
   - [ ] QueryKey 팩토리 함수 정의

3. **React Query:**
   - [ ] Query 타입 명시 (`useQuery<ResponseType>`)
   - [ ] `useQuery`는 `onError` 제거, `useEffect`로 에러 처리
   - [ ] `useMutation`은 `onError` 사용 가능
   - [ ] 성공 시 필요한 쿼리 무효화

4. **컴포넌트:**
   - [ ] 로딩/에러/빈 상태는 공통 컴포넌트 사용
   - [ ] 환경 변수는 `config` 객체를 통해서만 접근

---

## 🔗 참고 문서

### 공통 스펙
- [에러 처리 스펙](../specs/error-handling.md) - 에러 응답 형식 및 에러 코드 정의
- [백엔드 개발 표준](development-standards.md) - 백엔드 에러 처리 및 API 설계

### 프론트엔드 전용
- [README](../../reelnote-frontend/README.md) - 프론트엔드 프로젝트 개요 및 아키텍처
- [환경 변수 가이드](../../reelnote-frontend/src/lib/env/README.md) - 환경 변수 관리
- [MSW 가이드](../../reelnote-frontend/src/lib/msw/README.md) - MSW 모킹 패턴

### 코드 참고
- API 클라이언트: `src/lib/api/client.ts`
- 에러 코드: `src/lib/errors/error-codes.ts`
- 에러 설정: `src/lib/errors/error-config.ts`
- 에러 처리 훅: `src/hooks/use-error-handler.ts`

---

## 📝 변경 이력

- `2025-01-XX`: 초안 작성
  - 에러 코드 관리 체계 (Enum, 타입 안전성)
  - 에러 처리 패턴 (useErrorHandler, getUserMessage)
  - React Query v5 사용법 (onError 제거, useEffect로 처리)
  - API 통신 패턴 (apiFetch, TraceId 전파)
  - 타입 안전성 가이드
  - MSW 핸들러 패턴

