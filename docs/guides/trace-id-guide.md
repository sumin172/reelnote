# TraceId 가이드

> HTTP 요청 단위 분산 추적 ID 관리 가이드

## 📋 목차

1. [개념 정리](#1-개념-정리)
2. [TraceId vs ActionId](#2-traceid-vs-actionid)
3. [백엔드 구현](#3-백엔드-구현)
4. [프론트엔드 처리](#4-프론트엔드-처리)
5. [참고 문서](#5-참고-문서)

---

## 1. 개념 정리

### 1-1. TraceId란?

**TraceId**는 HTTP 요청 단위로 생성되는 분산 추적 ID입니다.

- **생성 주체**: 백엔드 (마이크로서비스)
- **생성 시점**: HTTP 요청 수신 시
- **사용 목적**: 마이크로서비스 간 요청 추적 및 로그 상관관계

### 1-2. 형식

- **표준**: UUID v4 (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`)
- **예시**: `550e8400-e29b-41d4-a716-446655440000`
- **길이**: 36자 (하이픈 포함)

---

## 2. TraceId vs ActionId

| 항목 | TraceId | ActionId |
|------|---------|----------|
| **생성 주체** | 백엔드 | 프론트엔드 |
| **단위** | HTTP 요청 1개 | 사용자 액션 1개 |
| **생성 시점** | HTTP 요청 수신 시 | 사용자 액션 시작 시 |
| **사용 목적** | 마이크로서비스 간 요청 추적 | 사용자 액션 단위 추적 |
| **헤더 이름** | `X-Trace-Id` | `X-Action-Id` |
| **프론트엔드 역할** | 전송하지 않음 (백엔드가 생성/관리) | 생성 및 전송 |

**자세한 내용**: [ActionId 가이드](./action-id-guide.md) 참조

---

## 3. 백엔드 구현

### 3-1. 처리 규칙

#### 1. 요청 수신 시

```
1. X-Trace-Id 헤더 확인
   ├─ 있음 → UUID v4 포맷 검증
   │   ├─ 유효한 UUID v4 → 해당 값 사용
   │   └─ 유효하지 않음 → 무시하고 새로 생성
   └─ 없음 → 새로 생성 (UUID v4)
```

#### 2. 로깅 시

- 모든 로그에 `traceId` 포함
- MDC (Mapped Diagnostic Context)에 저장하여 자동 포함
- 로그 형식: `[traceId=xxx] 메시지`

#### 3. 서비스 간 호출 시

- 요청 헤더에 `X-Trace-Id` 포함하여 전파
- 동일한 `traceId`를 모든 서비스에서 사용

#### 4. 응답 시

- 모든 에러 응답에 `traceId` 필드 포함
- 성공 응답에는 포함하지 않음 (선택사항)

### 3-2. 생성 방식 통일

**모든 백엔드 서비스는 표준 라이브러리/API를 사용하여 UUID v4를 생성합니다:**

- **Node.js/TypeScript (Catalog Service)**: `crypto.randomUUID()` 사용
- **Kotlin/Java (Review Service)**: `UUID.randomUUID().toString()` 사용

**중요:** `Math.random()` 기반의 수동 UUID 생성은 사용하지 않습니다.

### 3-3. 구현 예시

자세한 구현 예시는 [에러 처리 스펙](../specs/error-handling.md) 섹션 3을 참조하세요.

---

## 4. 프론트엔드 처리

### 4-1. 핵심 원칙

**프론트엔드는 TraceId를 생성하거나 전송하지 않습니다.**

- ❌ 프론트엔드에서 `X-Trace-Id` 헤더를 보내지 않음
- ✅ 백엔드가 생성한 traceId를 에러 응답에서 읽어와서 사용
- ✅ 에러 로깅 시 traceId 포함

### 4-2. 에러 응답에서 TraceId 읽기

```typescript
// lib/api/client.ts
const errorDetail = await res.json();

// 에러 응답에서 traceId 읽기
const traceId = errorDetail.traceId || res.headers.get("X-Trace-Id") || undefined;

// ApiError에 포함
throw new ApiError(
  errorDetail.message,
  res.status,
  errorDetail.code,
  errorDetail.details,
  traceId, // 백엔드가 생성한 traceId
);
```

### 4-3. 로깅 시 TraceId 포함

```typescript
// lib/logger/index.ts
logger.error("API 요청 실패", {
  traceId: apiError.traceId, // 백엔드가 생성한 traceId
  errorCode: apiError.code,
});
```

### 4-4. 사용자에게 TraceId 표시

```typescript
// ErrorState 컴포넌트
<ErrorState
  message={handled.message}
  traceId={handled.traceId} // 사용자 문의 시 제공
  retryable={handled.retryable}
/>
```

---

## 5. 참고 문서

- [에러 처리 스펙](../specs/error-handling.md) - TraceId 정책 상세 (섹션 3)
- [로깅 가이드](./logging.md) - TraceId 전파 및 로깅 (섹션 5)
- [ActionId 가이드](./action-id-guide.md) - ActionId vs TraceId 비교
- [프론트엔드 개발 표준](./frontend-development-standards.md) - TraceId 처리 체크리스트

---

## 6. 체크리스트

### 백엔드

- [ ] 요청 헤더에서 `X-Trace-Id` 확인
- [ ] 없으면 표준 라이브러리로 UUID v4 생성
- [ ] MDC에 저장하여 로그에 자동 포함
- [ ] 서비스 간 호출 시 헤더에 포함
- [ ] 에러 응답에 `traceId` 필드 포함

### 프론트엔드

- [ ] `X-Trace-Id` 헤더를 보내지 않음
- [ ] 에러 응답에서 traceId 읽기
- [ ] 로깅 시 traceId 포함
- [ ] 사용자 문의 시 traceId 제공

