# 예외/에러 응답 스타일 가이드

> ReelNote API 서비스들의 예외 처리 및 에러 응답 표준 가이드

## 목차

1. [개요](#개요)
2. [에러 코드 네이밍 규칙](#에러-코드-네이밍-규칙)
3. [TraceId 정책](#traceid-정책)
4. [로깅 정책](#로깅-정책)
5. [프레임워크별 구현 패턴](#프레임워크별-구현-패턴)
6. [베이스 예외 클래스](#베이스-예외-클래스)

---

## 개요

이 문서는 ReelNote API의 모든 마이크로서비스에서 일관된 예외 처리 및 에러 응답을 위한 가이드입니다.

### 핵심 원칙

1. **일관된 응답 형식**: 모든 서비스는 동일한 `ErrorDetail` 스키마를 사용합니다.
2. **프레임워크 독립성**: 프레임워크 차이를 수용하되, 개념적 일관성을 유지합니다.
3. **추적 가능성**: 모든 에러는 `traceId`를 포함하여 분산 추적이 가능합니다.
4. **명확한 에러 코드**: 머신과 사람이 모두 읽기 쉬운 에러 코드를 사용합니다.

### 표준 에러 응답 형식

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

자세한 스펙은 [ERROR_SPECIFICATION.md](./ERROR_SPECIFICATION.md)를 참고하세요.

---

## 에러 코드 네이밍 규칙

### 기본 규칙

1. **대문자와 언더스코어 사용**: `UPPER_SNAKE_CASE`
2. **명확하고 구체적**: 무엇이 잘못되었는지 명확히 표현
3. **계층적 구조**: 도메인별 prefix 사용

### 네이밍 패턴

#### 1. 공통 에러 코드 (서비스 간 공유)

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

#### 2. 도메인별 에러 코드 (서비스 전용)

```
{SERVICE}_<ENTITY>_<ACTION>_<RESULT>

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

#### 3. 검증 에러 코드

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

### 에러 코드 분류

| 분류 | Prefix | 예시 | 사용 시나리오 |
|------|--------|------|--------------|
| 공통 | 없음 | `NOT_FOUND`, `VALIDATION_ERROR` | 모든 서비스 공통 |
| 도메인 | `{SERVICE}_` | `CATALOG_MOVIE_NOT_FOUND` | 특정 서비스 전용 |
| 검증 | `VALIDATION_` | `VALIDATION_SEARCH_QUERY_REQUIRED` | 입력 검증 실패 |

### 에러 코드 등록 체크리스트

새로운 에러 코드를 추가할 때:

- [ ] 네이밍 규칙을 따르는가?
- [ ] 기존 코드와 중복되지 않는가?
- [ ] 공통 코드로 사용 가능한가? (가능하면 공통 코드 사용)
- [ ] HTTP 상태 코드와 올바르게 매핑되는가?
- [ ] 에러 메시지가 명확한가?
- [ ] 문서에 등록되었는가?

---

## TraceId 정책

### 목적

- **분산 추적**: 마이크로서비스 간 요청 추적
- **로그 상관관계**: 동일 요청의 모든 로그를 연결
- **디버깅**: 문제 발생 시 전체 요청 흐름 파악

### 형식

- **표준**: UUID v4 (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`)
- **예시**: `550e8400-e29b-41d4-a716-446655440000`
- **길이**: 36자 (하이픈 포함)

### 처리 규칙

#### 1. 요청 수신 시

```
1. X-Trace-Id 헤더 확인
   ├─ 있음 → 해당 값 사용
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

### 구현 예시

#### NestJS (Catalog Service)

```typescript
// 필터에서 traceId 처리
private getOrCreateTraceId(request: Request): string {
  const traceIdHeader = request.headers["x-trace-id"] as string | undefined;
  if (traceIdHeader) {
    return traceIdHeader;
  }
  return this.generateTraceId(); // UUID v4 생성
}
```

#### Spring Boot (Review Service)

```kotlin
// GlobalExceptionHandler에서 traceId 처리
private fun getOrCreateTraceId(request: WebRequest): String {
  val traceIdHeader = request.getHeader("X-Trace-Id")
  if (!traceIdHeader.isNullOrBlank()) {
    return traceIdHeader
  }
  // MDC에서 확인
  val mdcTraceId = MDC.get("traceId")
  if (!mdcTraceId.isNullOrBlank()) {
    return mdcTraceId
  }
  // 새로 생성
  return UUID.randomUUID().toString()
}
```

### TraceId 전파 체크리스트

- [ ] 요청 헤더에서 `X-Trace-Id` 확인
- [ ] 없으면 UUID v4 생성
- [ ] MDC에 저장하여 로그에 자동 포함
- [ ] 서비스 간 호출 시 헤더에 포함
- [ ] 에러 응답에 `traceId` 필드 포함

---

## 로깅 정책

### 로그 레벨 가이드라인

| 로그 레벨 | 사용 시나리오 | 예시 |
|-----------|--------------|------|
| `ERROR` | 예상치 못한 서버 오류 (5xx) | 예외 스택 트레이스 포함 |
| `WARN` | 비즈니스 예외, 검증 실패 (4xx) | 예외 메시지 포함 |
| `INFO` | 정상적인 비즈니스 로직 | 중요한 상태 변경 |
| `DEBUG` | 개발/디버깅용 상세 정보 | 상세 파라미터, 중간 상태 |

### 예외별 로깅 규칙

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

### 로그 형식

#### 표준 형식

```
[YYYY-MM-DD HH:mm:ss.SSS] [LEVEL] [traceId=xxx] [LoggerName] 메시지
```

#### 예시

```
[2025-01-15 10:30:45.123] [WARN] [traceId=550e8400-e29b-41d4-a716-446655440000] [GlobalExceptionHandler] 비즈니스 예외 발생: 리뷰를 찾을 수 없습니다. ID: 123
[2025-01-15 10:30:45.456] [ERROR] [traceId=550e8400-e29b-41d4-a716-446655440000] [HttpExceptionFilter] 예상치 못한 예외 발생: 서버 내부 오류가 발생했습니다
```

### 로그에 포함할 정보

#### 필수 정보

- `traceId`: 요청 추적 ID
- 예외 메시지: 사용자에게 표시될 메시지
- 로그 레벨: 적절한 레벨

#### 선택 정보

- HTTP 상태 코드: 에러 응답의 상태 코드
- 요청 경로: 어떤 엔드포인트에서 발생했는지
- 사용자 정보: 인증된 사용자 ID (보안 주의)
- 요청 파라미터: 디버깅에 필요한 파라미터 (민감 정보 제외)

### 민감 정보 처리

**절대 로그에 포함하지 말 것:**
- 비밀번호, 토큰, API 키
- 개인정보 (주민등록번호, 전화번호 등)
- 신용카드 정보

**주의해서 포함할 것:**
- 사용자 ID (필요시 마스킹)
- 이메일 (필요시 마스킹)
- 요청 본문 (민감 정보 제외)

### 로깅 체크리스트

- [ ] 모든 예외에 `traceId` 포함
- [ ] 로그 레벨이 적절한가? (4xx: WARN, 5xx: ERROR)
- [ ] 5xx 오류에 스택 트레이스 포함
- [ ] 민감 정보가 포함되지 않았는가?
- [ ] 로그 메시지가 명확하고 검색 가능한가?

---

## 프레임워크별 구현 패턴

### NestJS (Catalog Service)

#### 베이스 예외 클래스

```typescript
// BaseAppException - 프레임워크 독립 베이스 예외
export abstract class BaseAppException extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
    public readonly httpStatus: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// CatalogException - BaseAppException 상속
export class CatalogException extends BaseAppException {
  constructor(
    public readonly code: CatalogErrorCode,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown>,
  ) {
    super(code, message, status, details);
  }
}
```

#### 예외 필터

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // BaseAppException 처리
    if (exception instanceof BaseAppException) {
      const errorDetail: ErrorDetailDto = {
        code: exception.errorCode,
        message: exception.message,
        details: exception.details,
        traceId: this.getOrCreateTraceId(request),
      };
      response.status(exception.httpStatus).json(errorDetail);
      return;
    }
    // 기타 예외 처리...
  }
}
```

### Spring Boot (Review Service)

#### 베이스 예외 클래스

```kotlin
// BaseAppException - 프레임워크 독립 베이스 예외
abstract class BaseAppException(
    message: String,
    val errorCode: String,
    val httpStatus: HttpStatus,
    val details: Map<String, Any>? = null,
) : RuntimeException(message)

// ReviewException - BaseAppException 상속
sealed class ReviewException(
    message: String,
    errorCode: String,
    httpStatus: HttpStatus,
    details: Map<String, Any>? = null,
) : BaseAppException(message, errorCode, httpStatus, details)
```

#### 예외 핸들러

```kotlin
@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(BaseAppException::class)
    fun handleBaseAppException(
        ex: BaseAppException,
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

---

## 베이스 예외 클래스

### 설계 원칙

1. **프레임워크 독립성**: 프레임워크 특정 클래스 상속 최소화
2. **필수 필드**: `errorCode`, `httpStatus`, `message`
3. **선택 필드**: `details` (추가 컨텍스트)
4. **일관된 인터페이스**: 모든 서비스에서 동일한 속성 구조

### 공통 속성

| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `errorCode` | `string` | ✅ | 에러 코드 (예: `VALIDATION_ERROR`) |
| `httpStatus` | `HttpStatus` | ✅ | HTTP 상태 코드 |
| `message` | `string` | ✅ | 사용자 친화적 메시지 |
| `details` | `object` | ❌ | 추가 컨텍스트 정보 |

### 구현 비교

| 항목 | NestJS | Spring Boot |
|------|--------|-------------|
| 베이스 클래스 | `BaseAppException extends Error` | `BaseAppException extends RuntimeException` |
| 프레임워크 의존성 | 없음 | 없음 (HttpStatus만 사용) |
| 필터/핸들러 | `HttpExceptionFilter` | `GlobalExceptionHandler` |
| 변환 방식 | 필터에서 직접 변환 | 핸들러에서 ResponseEntity 생성 |

### 사용 예시

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

## 참고 문서

- [ERROR_SPECIFICATION.md](./ERROR_SPECIFICATION.md): 에러 응답 스펙 상세
- [Catalog Service ARCHITECTURE.md](./catalog-service/ARCHITECTURE.md)
- [Review Service ARCHITECTURE.md](./review-service/ARCHITECTURE.md)

---

## 변경 이력

- `2025-01-15`: 초안 작성
  - 에러 코드 네이밍 규칙
  - TraceId 정책
  - 로깅 정책
  - 베이스 예외 클래스 가이드


