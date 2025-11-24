# 에러 처리 스펙 및 가이드

> ReelNote API 서비스들의 예외 처리 및 에러 응답 표준 스펙 및 구현 가이드

## 📋 목차

1. [에러 응답 스펙](#1-에러-응답-스펙)
2. [에러 코드 관리](#2-에러-코드-관리)
3. [TraceId 정책](#3-traceid-정책)
4. [로깅 정책](#4-로깅-정책)
5. [프레임워크별 구현 패턴](#5-프레임워크별-구현-패턴)
6. [베이스 예외 클래스](#6-베이스-예외-클래스)
7. [클라이언트 처리](#7-클라이언트-처리)
8. [검증 체크리스트](#8-검증-체크리스트)

---

## 1. 에러 응답 스펙

### 1-1. 표준 에러 응답 형식

모든 에러 응답은 다음 형식을 따라야 합니다:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "입력 데이터 검증에 실패했습니다",
  "details": {
    "path": "/api/v1/movies/123",
    "fieldErrors": {
      "rating": "평점은 1-5 사이여야 합니다."
    }
  },
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 1-2. 필드 설명

| 필드        | 타입       | 필수 | 설명                            |
|-----------|----------|----|-------------------------------|
| `code`    | `string` | ✅  | 에러 코드 (머신 읽기용, 대문자_스네이크)      |
| `message` | `string` | ✅  | 사람 친화적 에러 메시지 (한국어)           |
| `details` | `object` | ❌  | 추가 컨텍스트 (path, fieldErrors 등) |
| `traceId` | `string` | ❌  | 분산 추적 ID (X-Trace-Id 헤더에서 전파) |

### 1-3. JSON 직렬화 규칙

**선택적 필드 (`details`, `traceId`) 처리:**
- 값이 `null`이거나 `undefined`인 경우, JSON 응답에서 **필드를 생략**해야 합니다.
- 클라이언트는 필드가 없거나 `null`인 경우를 동일하게 처리해야 합니다.

**프레임워크별 구현:**
- **Kotlin/Spring Boot**: `@JsonInclude(JsonInclude.Include.NON_NULL)` 사용 (기본값 또는 클래스 레벨)
- **TypeScript/NestJS**: `undefined` 필드는 자동으로 제외됨 (기본 동작)

**예시:**
```json
// details와 traceId가 없는 경우
{
  "code": "VALIDATION_ERROR",
  "message": "입력 데이터 검증에 실패했습니다"
}

// details만 있는 경우
{
  "code": "VALIDATION_ERROR",
  "message": "입력 데이터 검증에 실패했습니다",
  "details": {
    "fieldErrors": {
      "rating": "평점은 1-5 사이여야 합니다."
    }
  }
}
```

### 1-4. 성공/실패 구분

- **성공**: HTTP `2xx` + 정상 DTO 응답
- **실패**: HTTP `4xx/5xx` + 위 `ErrorDetail` 형식

### 1-5. HTTP 상태 코드 매핑

#### 표준 매핑 규칙

| 에러 코드                  | HTTP 상태 코드 | 사용 시나리오                          |
|------------------------|------------|----------------------------------|
| `VALIDATION_ERROR`     | `400`      | 입력 파라미터 검증 실패                    |
| `UNAUTHORIZED`         | `401`      | 인증 토큰 없음/만료                      |
| `FORBIDDEN`            | `403`      | 인증됐으나 권한 없음                      |
| `NOT_FOUND`            | `404`      | 리소스 ID로 찾을 수 없음                  |
| `CONFLICT`             | `409`      | 중복 생성, 비즈니스 충돌                   |
| `UNPROCESSABLE_ENTITY` | `422`      | 도메인 규칙 위반 (IllegalState 등)       |
| `INTERNAL_ERROR`       | `500`      | 예상치 못한 서버 오류                     |
| `EXTERNAL_API_ERROR`   | `502`      | 외부 API 호출 실패                     |
| `SERVICE_UNAVAILABLE`  | `503`      | Circuit Breaker Open, Rate Limit |

#### 특수 케이스

- **`VALIDATION_ERROR`**:
  - `400`: 입력 파라미터 검증 실패 (ValidationPipe, `@Valid`)
  - `422`: 도메인 로직 위반 (`IllegalArgumentException`, `IllegalStateException`)

---

## 2. 에러 코드 관리

### 2-1. 에러 코드 네이밍 규칙

#### 기본 규칙

1. **대문자와 언더스코어 사용**: `UPPER_SNAKE_CASE`
2. **명확하고 구체적**: 무엇이 잘못되었는지 명확히 표현
3. **계층적 구조**: 도메인별 prefix 사용

#### 네이밍 패턴

**1. 공통 에러 코드 (서비스 간 공유)**
```
VALIDATION_ERROR          # 입력 검증 실패
UNAUTHORIZED              # 인증 필요
FORBIDDEN                 # 권한 없음
NOT_FOUND                 # 리소스를 찾을 수 없음
CONFLICT                  # 리소스 충돌
INTERNAL_ERROR            # 서버 내부 오류
EXTERNAL_API_ERROR        # 외부 API 호출 실패
SERVICE_UNAVAILABLE       # 서비스 일시적 불가
```

**규칙:**
- 서비스 prefix 없이 사용
- 모든 서비스에서 동일한 의미로 사용
- HTTP 상태 코드와 1:1 매핑

**2. 도메인별 에러 코드 (서비스 전용)**
```
{SERVICE}_<ENTITY>_<ACTION>_<RESULT}

예시:
CATALOG_MOVIE_NOT_FOUND           # Catalog Service: 영화를 찾을 수 없음
CATALOG_TMDB_API_FAILED           # Catalog Service: TMDB API 호출 실패
REVIEW_NOT_FOUND                  # Review Service: 리뷰를 찾을 수 없음
REVIEW_ALREADY_EXISTS             # Review Service: 리뷰가 이미 존재함
```

**규칙:**
- 서비스 prefix는 대문자 (예: `CATALOG_`, `REVIEW_`)
- 엔티티명은 단수형 (예: `MOVIE`, `REVIEW`)
- 액션은 과거분사형 (예: `NOT_FOUND`, `ALREADY_EXISTS`)
- 결과는 명확한 상태 (예: `FAILED`, `INVALID`)

**3. 검증 에러 코드**
```
VALIDATION_<FIELD>_<RULE>

예시:
VALIDATION_SEARCH_QUERY_REQUIRED  # 검색어 필수
VALIDATION_TMDB_ID_INVALID        # TMDB ID 유효하지 않음
VALIDATION_RATING_RANGE           # 평점 범위 오류
```

**규칙:**
- `VALIDATION_` prefix 사용
- 필드명은 대문자 (예: `SEARCH_QUERY`, `TMDB_ID`)
- 규칙은 간결하게 (예: `REQUIRED`, `INVALID`, `RANGE`)

### 2-2. 범용 코드 vs 도메인 코드 사용 기준

#### 범용 코드를 사용하는 경우

**기준:** 도메인 구분이 의미 없는 단순 리소스 없음 또는 클라이언트가 도메인을 신경 쓰지 않아도 되는 경우

**예시:**
- 헬스 체크용 리소스
- 내부 관리용 리소스
- 클라이언트가 도메인을 구분할 필요가 없는 일반적인 404/500 에러
- 프레임워크 레벨에서 발생하는 검증 에러 (`VALIDATION_ERROR`)

#### 도메인 코드를 사용하는 경우

**기준:** 이 에러가 어떤 도메인에서 발생했는지가 중요한 경우. 사용자/클라이언트/운영자가 도메인 정보를 보고 싶어하는 경우

**예시:**
- 리뷰, 영화, 사용자 계정, 결제 등 비즈니스 도메인에서 발생하는 에러
- 로그/모니터링에서 도메인을 구분해야 하는 경우
- 클라이언트가 도메인별로 다른 UX를 제공해야 하는 경우

**간단한 판단 기준:**
> "사용자/클라이언트/운영자가 이 에러를 보고 무슨 도메인에서 터졌는지 알고 싶으면 도메인 코드, 아니면 범용 코드"

### 2-3. 에러 코드 목록

#### 공통 에러 코드

| 코드                     | HTTP 상태 | 설명                             |
|------------------------|---------|--------------------------------|
| `VALIDATION_ERROR`     | `400`   | 입력 데이터 검증 실패                   |
| `UNAUTHORIZED`         | `401`   | 인증 필요                          |
| `FORBIDDEN`            | `403`   | 권한 없음                          |
| `NOT_FOUND`            | `404`   | 리소스를 찾을 수 없음                   |
| `CONFLICT`             | `409`   | 리소스 충돌 (중복 생성 등)               |
| `UNPROCESSABLE_ENTITY` | `422`   | 도메인 규칙 위반                      |
| `INTERNAL_ERROR`       | `500`   | 서버 내부 오류                       |
| `EXTERNAL_API_ERROR`   | `502`   | 외부 API 호출 실패                   |
| `SERVICE_UNAVAILABLE`  | `503`   | 서비스 일시적 불가 (Circuit Breaker 등) |

#### 도메인별 에러 코드

**Review Service 도메인 에러 코드**

| 코드                           | HTTP 상태 | 설명                       |
|------------------------------|---------|--------------------------|
| `REVIEW_NOT_FOUND`           | `404`   | 리뷰를 찾을 수 없음              |
| `REVIEW_ALREADY_EXISTS`      | `409`   | 리뷰가 이미 존재함 (중복 생성 시도)    |
| `REVIEW_UNAUTHORIZED_UPDATE` | `403`   | 리뷰 수정 권한 없음 (본인의 리뷰만 가능) |
| `REVIEW_UNAUTHORIZED_DELETE` | `403`   | 리뷰 삭제 권한 없음 (본인의 리뷰만 가능) |

**Catalog Service 도메인 에러 코드**

| 코드                        | HTTP 상태 | 설명               |
|---------------------------|---------|------------------|
| `CATALOG_MOVIE_NOT_FOUND` | `404`   | 영화를 찾을 수 없음      |
| `CATALOG_TMDB_API_FAILED` | `502`   | TMDB API 호출 실패   |
| `CATALOG_JOB_NOT_FOUND`   | `404`   | 작업(Job)을 찾을 수 없음 |
| `CATALOG_JOB_IN_PROGRESS` | `409`   | 작업이 이미 진행 중      |

**검증 에러 코드 (서비스 공통):**
- `VALIDATION_SEARCH_QUERY_REQUIRED` - 검색어 필수
- `VALIDATION_TMDB_ID_INVALID` - TMDB ID 유효하지 않음

### 2-4. 에러 코드 vs 메시지 키: 역할 분리

**핵심 원칙: 에러 코드는 시스템 공통 기준, 메시지 키는 각 서비스/프레임워크에 최적화된 표현**

#### 에러 코드 (Error Code)

- **역할**: 머신 친화적 ID
- **위치**: HTTP 응답의 `code` 필드에 들어감
- **용도**: 클라이언트/로그/모니터링에서 기준이 되는 값
- **특징**:
  - 서비스 간 공통으로 사용 가능
  - 대문자 스네이크 케이스 (`VALIDATION_ERROR`, `REVIEW_NOT_FOUND`)
  - Source of Truth: `ErrorCodes.kt` (Review), `CatalogErrorCode.ts` (Catalog), 이 문서

#### 메시지 키 / 메시지 리소스 (Message Key)

- **역할**: "사람이 읽는 문장"을 관리하기 위한 레이어
- **위치**: 프레임워크별 리소스 파일
  - Catalog Service: `messages.ko.json` (JSON 형식)
  - Review Service: `messages.properties` (Properties 형식)
- **특징**:
  - 프레임워크/언어별로 형식이 다를 수 있음
  - 에러 코드와 1:1 매핑되거나, 여러 메시지 키가 하나의 에러 코드에 매핑될 수 있음
  - 파라미터 치환 방식도 프레임워크별로 다름

#### 에러 코드 ↔ 메시지 키 매핑

| 에러 코드                              | HTTP 상태 | Catalog Service (JSON)             | Review Service (Properties)          |
|------------------------------------|---------|------------------------------------|--------------------------------------|
| `VALIDATION_ERROR`                 | `400`   | `VALIDATION_ERROR`                 | `error.validation.failed`            |
| `VALIDATION_SEARCH_QUERY_REQUIRED` | `400`   | `VALIDATION_SEARCH_QUERY_REQUIRED` | `validation.search.keyword.required` |
| `VALIDATION_TMDB_ID_INVALID`       | `400`   | `VALIDATION_TMDB_ID_INVALID`       | -                                    |
| `UNAUTHORIZED`                     | `401`   | `UNAUTHORIZED`                     | -                                    |
| `FORBIDDEN`                        | `403`   | `FORBIDDEN`                        | -                                    |
| `NOT_FOUND`                        | `404`   | `NOT_FOUND`                        | -                                    |
| `REVIEW_NOT_FOUND`                 | `404`   | -                                  | `error.review.not.found`             |
| `CATALOG_MOVIE_NOT_FOUND`          | `404`   | `CATALOG_MOVIE_NOT_FOUND`          | -                                    |
| `CONFLICT`                         | `409`   | `CONFLICT`                         | -                                    |
| `REVIEW_ALREADY_EXISTS`            | `409`   | -                                  | `error.review.already.exists`        |
| `REVIEW_UNAUTHORIZED_UPDATE`       | `403`   | -                                  | `error.review.unauthorized.update`   |
| `REVIEW_UNAUTHORIZED_DELETE`       | `403`   | -                                  | `error.review.unauthorized.delete`   |
| `INTERNAL_ERROR`                   | `500`   | `INTERNAL_ERROR`                   | `error.internal.server`              |
| `EXTERNAL_API_ERROR`               | `502`   | `EXTERNAL_API_ERROR`               | `error.external.api.failed`          |
| `CATALOG_TMDB_API_FAILED`          | `502`   | `CATALOG_TMDB_API_FAILED`          | -                                    |
| `SERVICE_UNAVAILABLE`              | `503`   | `CATALOG_SERVICE_UNAVAILABLE`      | -                                    |

**참고:**
- `-` 표시는 해당 서비스에서 사용하지 않는 에러 코드를 의미합니다.
- Review Service는 Spring Bean Validation 메시지도 별도로 관리합니다 (`validation.*` 키).

#### 드리프트 방지: 매핑 검증 테스트

**문제점:**
- 에러 코드 추가했는데 메시지 리소스에 안 넣음
- 한 서비스에서만 문구 바꾸고 다른 서비스는 오래된 문구 유지
- 오타나 키 이름 변경 후 매핑 문서 미갱신

**해결책: 자동화된 테스트로 검증**

**Catalog Service 검증:**
```typescript
// 모든 CatalogErrorCode enum 값이 messages.ko.json에 존재하는지 검증
describe('Message Resource Validation', () => {
  it('should have messages for all error codes', () => {
    const errorCodes = Object.values(CatalogErrorCode);
    const messages = loadMessages();

    errorCodes.forEach(code => {
      expect(messages).toHaveProperty(code);
    });
  });
});
```

**Review Service 검증:**
```kotlin
// 모든 ErrorCodes 값에 대응하는 메시지 키가 존재하는지 검증
@Test
fun `모든 에러 코드에 대응하는 메시지가 존재해야 함`() {
    val errorCodeToMessageKey = mapOf(
        ErrorCodes.VALIDATION_ERROR to "error.validation.failed",
        ErrorCodes.REVIEW_NOT_FOUND to "error.review.not.found",
        // ...
    )

    errorCodeToMessageKey.forEach { (code, key) ->
        assertDoesNotThrow {
            messageSource.getMessage(key, null, Locale.getDefault())
        }
    }
}
```

#### 메시지 문구 통일 가이드

**기준: 사용자 화면에 노출될 메시지를 기준으로 통일**

- 에러 코드: 개발자/시스템 기준 (머신 친화적)
- 메시지 문구: 사용자 화면 기준 (사람 친화적)

**통일 규칙:**
1. 동일한 의미의 메시지는 동일한 문구 사용
2. 사용자 입장에서 더 자연스러운 문구를 기준으로 선택
3. 한 서비스에서 문구 변경 시, 다른 서비스도 동일하게 반영

**예시:**
- ❌ "검색어는 필수입니다" vs "검색어(q)는 필수입니다"
- ✅ "검색어는 필수입니다" (사용자 기준으로 통일)

**현재 통일 완료 메시지:**
- `VALIDATION_ERROR`: "입력 데이터 검증에 실패했습니다" (양쪽 동일 ✅)
- `VALIDATION_SEARCH_QUERY_REQUIRED`: "검색어는 필수입니다" (양쪽 동일 ✅)

#### 파라미터 스타일 가이드

**원칙: 서비스 내부 일관성이 더 중요, Cross-service 통일은 "문제 없으면 그대로 둔다"**

**Catalog Service (명명된 파라미터):**
```json
{
  "CATALOG_MOVIE_NOT_FOUND": "영화 정보를 찾을 수 없습니다. TMDB ID: {tmdbId}",
  "CATALOG_TMDB_API_FAILED": "TMDB API 호출에 실패했습니다: {message}"
}
```

**사용:**
```typescript
messageService.get(CatalogErrorCode.MOVIE_NOT_FOUND, { tmdbId: 123 });
```

**Review Service (위치 기반 파라미터):**
```properties
error.review.not.found=리뷰를 찾을 수 없습니다. ID: {0}
error.movie.not.found=영화 정보를 찾을 수 없습니다. ID: {0}
```

**사용:**
```kotlin
messageSource.getMessage("error.review.not.found", arrayOf(reviewId), Locale.getDefault())
```

### 2-5. 에러 코드 등록 체크리스트

새로운 에러 코드를 추가할 때:

- [ ] 네이밍 규칙을 따르는가?
- [ ] 기존 코드와 중복되지 않는가?
- [ ] 공통 코드로 사용 가능한가? (가능하면 공통 코드 사용)
- [ ] HTTP 상태 코드와 올바르게 매핑되는가?
- [ ] 에러 메시지가 명확한가?
- [ ] 문서에 등록되었는가?
- [ ] **OpenAPI Info.description의 Error Codes 섹션 업데이트**
- [ ] **ErrorDetail 스키마의 enum/allowableValues 업데이트** (Catalog: `CatalogErrorCode` enum, Review: `allowableValues` 배열)

---

## 3. TraceId 정책

### 3-1. 목적

- **분산 추적**: 마이크로서비스 간 요청 추적
- **로그 상관관계**: 동일 요청의 모든 로그를 연결
- **디버깅**: 문제 발생 시 전체 요청 흐름 파악

### 3-2. 형식

- **표준**: UUID v4 (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`)
- **예시**: `550e8400-e29b-41d4-a716-446655440000`
- **길이**: 36자 (하이픈 포함)
- **포맷 검증**: 외부에서 들어온 `X-Trace-Id`가 UUID v4 포맷이 아니면 무시하고 새로 생성

### 3-3. 처리 규칙

#### 1. 요청 수신 시

```
1. X-Trace-Id 헤더 확인
   ├─ 있음 → UUID v4 포맷 검증
   │   ├─ 유효한 UUID v4 → 해당 값 사용
   │   └─ 유효하지 않음 → 무시하고 새로 생성
   └─ 없음 → 새로 생성 (UUID v4)
```

**포맷 검증 정책:**
- 외부에서 들어온 `X-Trace-Id`가 UUID v4 포맷이 아니면 버리고 새로 생성
- 이는 향후 Gateway/BFF에서 traceId를 생성하는 경우에도 일관성 유지
- 포맷 검증은 선택사항이지만, 권장됨 (보안 및 일관성 측면)

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

### 3-4. 생성 방식 통일

**모든 서비스는 표준 라이브러리/API를 사용하여 UUID v4를 생성합니다:**

- **Node.js/TypeScript (Catalog Service)**: `crypto.randomUUID()` 사용
  - Node.js 14.17.0+ / 16+ 기본 지원
  - 암호학적 랜덤 보장
  - 추가 의존성 불필요

- **Kotlin/Java (Review Service)**: `UUID.randomUUID().toString()` 사용
  - Java 표준 라이브러리
  - 암호학적 랜덤 보장

- **Frontend (TypeScript)**: `crypto.randomUUID()` 우선 사용, 없으면 fallback

**중요:** `Math.random()` 기반의 수동 UUID 생성은 사용하지 않습니다.
- 암호학적 랜덤이 아님
- 구현 버그 가능성
- 서비스 간 일관성 저하

### 3-5. 구현 예시

#### NestJS (Catalog Service)

```typescript
import { randomUUID } from "crypto";

// 필터에서 traceId 처리
private getOrCreateTraceId(request: Request): string {
  const traceIdHeader = request.headers["x-trace-id"] as string | undefined;
  if (traceIdHeader) {
    // 선택사항: UUID v4 포맷 검증
    // if (this.isValidUUIDv4(traceIdHeader)) {
    //   return traceIdHeader;
    // }
    return traceIdHeader;
  }
  return this.generateTraceId(); // UUID v4 생성
}

// UUID v4 형식의 traceId 생성
// Node.js 표준 crypto.randomUUID() 사용 (암호학적 랜덤 보장)
private generateTraceId(): string {
  return randomUUID();
}
```

#### Spring Boot (Review Service)

```kotlin
import java.util.UUID

// GlobalExceptionHandler에서 traceId 처리
private fun getOrCreateTraceId(request: WebRequest): String {
  val traceIdHeader = request.getHeader("X-Trace-Id")
  if (!traceIdHeader.isNullOrBlank()) {
    // 선택사항: UUID v4 포맷 검증
    // if (isValidUUIDv4(traceIdHeader)) {
    //   return traceIdHeader
    // }
    return traceIdHeader
  }
  // MDC에서 확인
  val mdcTraceId = MDC.get("traceId")
  if (!mdcTraceId.isNullOrBlank()) {
    return mdcTraceId
  }
  // 새로 생성 (Java 표준 UUID.randomUUID() 사용)
  return UUID.randomUUID().toString()
}
```

### 3-6. TraceId 전파 체크리스트

- [ ] 요청 헤더에서 `X-Trace-Id` 확인
- [ ] 없으면 표준 라이브러리로 UUID v4 생성 (`crypto.randomUUID()` 또는 `UUID.randomUUID()`)
- [ ] (권장) 외부에서 들어온 `X-Trace-Id`가 UUID v4 포맷이 아니면 무시하고 새로 생성
- [ ] MDC에 저장하여 로그에 자동 포함
- [ ] 서비스 간 호출 시 헤더에 포함
- [ ] 에러 응답에 `traceId` 필드 포함

---

## 4. 로깅 정책

### 4-1. 로그 레벨 가이드라인

| 로그 레벨   | 사용 시나리오              | 예시             |
|---------|----------------------|----------------|
| `ERROR` | 예상치 못한 서버 오류 (5xx)   | 예외 스택 트레이스 포함  |
| `WARN`  | 비즈니스 예외, 검증 실패 (4xx) | 예외 메시지 포함      |
| `INFO`  | 정상적인 비즈니스 로직         | 중요한 상태 변경      |
| `DEBUG` | 개발/디버깅용 상세 정보        | 상세 파라미터, 중간 상태 |

### 4-2. 예외별 로깅 규칙

#### 1. 비즈니스 예외 (4xx)

```typescript
// NestJS
logger.warn(`예외 발생: ${errorDetail.message}, traceId=${traceId}`);
```

```kotlin
// Spring Boot
logger.warn("비즈니스 예외 발생: ${ex.message}, traceId=$traceId", ex)
```

**규칙:**
- 레벨: `WARN`
- 메시지: 예외 메시지 + `traceId`
- 스택 트레이스: 선택사항 (간단한 예외는 생략 가능)

#### 2. 서버 오류 (5xx)

```typescript
// NestJS
logger.error(
  `예상치 못한 예외 발생: ${errorDetail.message}, traceId=${traceId}`,
  exception instanceof Error ? exception.stack : String(exception),
);
```

```kotlin
// Spring Boot
logger.error("예상치 못한 예외 발생: ${ex.message ?: "알 수 없는 오류"}, traceId=$traceId", ex)
```

**규칙:**
- 레벨: `ERROR`
- 메시지: 예외 메시지 + `traceId`
- 스택 트레이스: **필수** (디버깅에 필요)

#### 3. 검증 실패 (400)

```typescript
// NestJS
logger.warn(`검증 예외 발생: ${errorDetail.message}, traceId=${traceId}`);
```

```kotlin
// Spring Boot
logger.warn("검증 예외 발생: ${ex.message}, traceId=$traceId")
```

**규칙:**
- 레벨: `WARN`
- 메시지: 검증 실패 내용 + `traceId`
- 스택 트레이스: 생략 (일반적인 클라이언트 오류)

### 4-3. 로그 형식

#### 표준 형식

```
[YYYY-MM-DD HH:mm:ss.SSS] [LEVEL] [traceId=xxx] [LoggerName] 메시지
```

#### 예시

```
[2025-01-15 10:30:45.123] [WARN] [traceId=550e8400-e29b-41d4-a716-446655440000] [GlobalExceptionHandler] 비즈니스 예외 발생: 리뷰를 찾을 수 없습니다. ID: 123
[2025-01-15 10:30:45.456] [ERROR] [traceId=550e8400-e29b-41d4-a716-446655440000] [HttpExceptionFilter] 예상치 못한 예외 발생: 서버 내부 오류가 발생했습니다
```

### 4-4. 로그에 포함할 정보

#### 필수 정보

- `traceId`: 요청 추적 ID
- 예외 메시지: 사용자에게 표시될 메시지
- 로그 레벨: 적절한 레벨

#### 선택 정보

- HTTP 상태 코드: 에러 응답의 상태 코드
- 요청 경로: 어떤 엔드포인트에서 발생했는지
- 사용자 정보: 인증된 사용자 ID (보안 주의)
- 요청 파라미터: 디버깅에 필요한 파라미터 (민감 정보 제외)

### 4-5. 민감 정보 처리

**절대 로그에 포함하지 말 것:**
- 비밀번호, 토큰, API 키
- 개인정보 (주민등록번호, 전화번호 등)
- 신용카드 정보

**주의해서 포함할 것:**
- 사용자 ID (필요시 마스킹)
- 이메일 (필요시 마스킹)
- 요청 본문 (민감 정보 제외)

### 4-6. 로깅 체크리스트

- [ ] 모든 예외에 `traceId` 포함
- [ ] 로그 레벨이 적절한가? (4xx: WARN, 5xx: ERROR)
- [ ] 5xx 오류에 스택 트레이스 포함
- [ ] 민감 정보가 포함되지 않았는가?
- [ ] 로그 메시지가 명확하고 검색 가능한가?

---

## 5. 프레임워크별 구현 패턴

### 5-1. Review Service (Kotlin/Spring Boot)

#### ErrorDetail 클래스

```kotlin
// ErrorDetail
data class ErrorDetail(
    val code: String,
    val message: String,
    val details: Map<String, Any>? = null,
    val traceId: String? = null,
)
```

#### GlobalExceptionHandler

```kotlin
@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(ReviewException::class)
    fun handleReviewException(
        ex: ReviewException,
        request: WebRequest,
    ): ResponseEntity<ErrorDetail> {
        val traceId = getOrCreateTraceId(request)
        logger.warn("비즈니스 예외 발생: ${ex.message}, traceId=$traceId", ex)

        val error = ErrorDetail(
            code = ex.errorCode,
            message = ex.message ?: getMessage("error.unknown"),
            details = requestMetadata(request, ex.details),
            traceId = traceId,
        )
        return ResponseEntity.status(ex.httpStatus).body(error)
    }
}
```

### 5-2. Catalog Service (TypeScript/NestJS)

#### ErrorDetailDto 클래스

```typescript
// ErrorDetailDto - 표준 에러 응답 스키마
export class ErrorDetailDto {
  code!: string;
  message!: string;
  details?: Record<string, unknown>;
  traceId?: string;
}
```

#### 에러 코드 관리

```typescript
// CatalogErrorCode - 에러 코드 enum 정의
export enum CatalogErrorCode {
  // 도메인 에러 (CATALOG_ prefix)
  MOVIE_NOT_FOUND = "CATALOG_MOVIE_NOT_FOUND",
  TMDB_API_FAILED = "CATALOG_TMDB_API_FAILED",

  // 검증 에러 (VALIDATION_ prefix)
  VALIDATION_SEARCH_QUERY_REQUIRED = "VALIDATION_SEARCH_QUERY_REQUIRED",
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // 범용 에러
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  // ... 등
}
```

#### 메시지 리소스 관리

```json
// messages.ko.json - 에러 코드별 메시지 정의
{
  "CATALOG_MOVIE_NOT_FOUND": "영화 정보를 찾을 수 없습니다. TMDB ID: {tmdbId}",
  "VALIDATION_SEARCH_QUERY_REQUIRED": "검색어(q)는 필수입니다.",
  "INTERNAL_ERROR": "서버 내부 오류가 발생했습니다."
}
```

```typescript
// MessageService - 메시지 조회 서비스
@Injectable()
export class MessageService {
  get(code: CatalogErrorCode | string, params?: MessageParams): string {
    // 메시지 리소스에서 조회 및 파라미터 치환
  }
}
```

#### 예외 생성 패턴

```typescript
// CatalogException - 표준 예외 클래스
export class CatalogException extends HttpException {
  constructor(
    public readonly code: CatalogErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }
}

// ExceptionFactoryService - 예외 생성 팩토리
@Injectable()
export class ExceptionFactoryService {
  constructor(private readonly messageService: MessageService) {}

  movieNotFound(tmdbId: number): CatalogException {
    return new CatalogException(
      CatalogErrorCode.MOVIE_NOT_FOUND,
      this.messageService.get(CatalogErrorCode.MOVIE_NOT_FOUND, { tmdbId }),
      HttpStatus.NOT_FOUND,
    );
  }
}

// 사용 예시
throw this.exceptionFactory.movieNotFound(tmdbId);
```

#### 글로벌 예외 필터

```typescript
// HttpExceptionFilter에서 자동 변환
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly messageService: MessageService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // CatalogException은 { code, message } 자동 반환
    // 기타 예외는 ErrorDetailDto로 변환
  }
}
```

---

## 6. 베이스 예외 클래스

### 6-1. 설계 원칙

1. **프레임워크 독립성**: 프레임워크 특정 클래스 상속 최소화
2. **필수 필드**: `errorCode`, `httpStatus`, `message`
3. **선택 필드**: `details` (추가 컨텍스트)
4. **일관된 인터페이스**: 모든 서비스에서 동일한 속성 구조

### 6-2. 공통 속성

| 속성           | 타입           | 필수 | 설명                            |
|--------------|--------------|----|-------------------------------|
| `errorCode`  | `string`     | ✅  | 에러 코드 (예: `VALIDATION_ERROR`) |
| `httpStatus` | `HttpStatus` | ✅  | HTTP 상태 코드                    |
| `message`    | `string`     | ✅  | 사용자 친화적 메시지                   |
| `details`    | `object`     | ❌  | 추가 컨텍스트 정보                    |

### 6-3. 구현 비교

| 항목        | NestJS                           | Spring Boot                                 |
|-----------|----------------------------------|---------------------------------------------|
| 베이스 클래스   | `BaseAppException extends Error` | `BaseAppException extends RuntimeException` |
| 프레임워크 의존성 | 없음                               | 없음 (HttpStatus만 사용)                         |
| 필터/핸들러    | `HttpExceptionFilter`            | `GlobalExceptionHandler`                    |
| 변환 방식     | 필터에서 직접 변환                       | 핸들러에서 ResponseEntity 생성                     |

### 6-4. 사용 예시

#### NestJS

```typescript
// 예외 생성
throw new CatalogException(
  CatalogErrorCode.MOVIE_NOT_FOUND,
  this.messageService.get(CatalogErrorCode.MOVIE_NOT_FOUND, { tmdbId }),
  HttpStatus.NOT_FOUND,
  { tmdbId }, // details
);

// 또는 팩토리 사용
throw this.exceptionFactory.movieNotFound(tmdbId);
```

#### Spring Boot

```kotlin
// 예외 생성
throw ReviewNotFoundException(
    reviewId = 123L,
    userSeq = 456L,
    movieId = 789L,
)

// 또는 팩토리 메서드 사용 (권장)
throw ReviewException.notFound(reviewId = 123L)
```

---

## 7. 클라이언트 처리

### 7-1. 프론트엔드

```typescript
interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

// 모든 서비스에서 동일한 형식으로 처리
if (!response.ok) {
  const error: ErrorDetail = await response.json();
  throw new ApiError(error.code, error.message, error.traceId);
}
```

---

## 8. 검증 체크리스트

- [ ] 모든 에러 응답이 `ErrorDetail` 형식을 따름
- [ ] `code` 필드가 표준 에러 코드 목록에 있음
- [ ] HTTP 상태 코드가 `code`와 올바르게 매핑됨
- [ ] `traceId`가 모든 에러 응답에 포함됨
- [ ] `X-Trace-Id` 헤더가 서비스 간 전파됨
- [ ] 클라이언트가 에러 응답을 일관되게 파싱 가능

---

## 📝 변경 이력

- `2024-12-XX`: 초안 작성 (Review Service, Catalog Service 통일)
- `2025-01-XX`: Catalog Service 구현 가이드 업데이트
  - 에러 코드 중심 설계 (CatalogErrorCode enum)
  - 메시지 리소스 관리 (messages.ko.json, MessageService)
  - 예외 생성 패턴 (CatalogException, ExceptionFactoryService)
- `2025-01-XX`: 문서 통합 및 위치 변경
  - `ERROR_SPECIFICATION.md` + `ERROR_HANDLING_GUIDE.md` → `docs/specs/error-handling.md` 통합
  - 공통 스펙 문서를 `docs/specs/` 폴더로 이동

