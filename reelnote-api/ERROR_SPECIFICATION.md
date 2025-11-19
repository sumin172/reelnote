# ReelNote API 공통 에러 스펙

> Review Service와 Catalog Service에서 공통으로 사용하는 에러 응답 스펙

## 1. 에러 응답 형식

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

### 필드 설명

| 필드    | 타입              | 필수 | 설명                                      |
| ------- | ----------------- | ---- | ----------------------------------------- |
| `code`  | `string`          | ✅   | 에러 코드 (머신 읽기용, 대문자_스네이크)  |
| `message` | `string`       | ✅   | 사람 친화적 에러 메시지 (한국어)          |
| `details` | `object`       | ❌   | 추가 컨텍스트 (path, fieldErrors 등)      |
| `traceId` | `string`       | ❌   | 분산 추적 ID (X-Trace-Id 헤더에서 전파)  |

### JSON 직렬화 규칙

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

### 성공/실패 구분

- **성공**: HTTP `2xx` + 정상 DTO 응답
- **실패**: HTTP `4xx/5xx` + 위 `ErrorDetail` 형식

## 2. 에러 코드와 메시지 관리

### 2.1 에러 코드 vs 메시지 키: 역할 분리

**핵심 원칙: 에러 코드는 시스템 공통 기준, 메시지 키는 각 서비스/프레임워크에 최적화된 표현**

#### 에러 코드 (Error Code)

- **역할**: 머신 친화적 ID
- **위치**: HTTP 응답의 `code` 필드에 들어감
- **용도**: 클라이언트/로그/모니터링에서 기준이 되는 값
- **특징**:
  - 서비스 간 공통으로 사용 가능
  - 대문자 스네이크 케이스 (`VALIDATION_ERROR`, `REVIEW_NOT_FOUND`)
  - Source of Truth: `ErrorCodes.kt` (Review), `CatalogErrorCode.ts` (Catalog), `ERROR_SPECIFICATION.md`

**예시:**
- `VALIDATION_SEARCH_QUERY_REQUIRED`
- `REVIEW_NOT_FOUND`
- `CATALOG_MOVIE_NOT_FOUND`

#### 메시지 키 / 메시지 리소스 (Message Key)

- **역할**: "사람이 읽는 문장"을 관리하기 위한 레이어
- **위치**: 프레임워크별 리소스 파일
  - Catalog Service: `messages.ko.json` (JSON 형식)
  - Review Service: `messages.properties` (Properties 형식)
- **특징**:
  - 프레임워크/언어별로 형식이 다를 수 있음
  - 에러 코드와 1:1 매핑되거나, 여러 메시지 키가 하나의 에러 코드에 매핑될 수 있음
  - 파라미터 치환 방식도 프레임워크별로 다름

**예시:**
- Catalog: `VALIDATION_SEARCH_QUERY_REQUIRED` (에러 코드와 동일)
- Review: `validation.search.keyword.required` (계층적 키)

### 2.2 에러 코드 ↔ 메시지 키 매핑

#### 구조

```
Error Code Spec (Source of Truth)
  ├─ Catalog Service: messages.ko.json의 key
  └─ Review Service: messages.properties의 key
```

#### 매핑 테이블

| 에러 코드 | HTTP 상태 | Catalog Service (JSON) | Review Service (Properties) |
|-----------|-----------|------------------------|----------------------------|
| `VALIDATION_ERROR` | `400` | `VALIDATION_ERROR` | `error.validation.failed` |
| `VALIDATION_SEARCH_QUERY_REQUIRED` | `400` | `VALIDATION_SEARCH_QUERY_REQUIRED` | `validation.search.keyword.required` |
| `VALIDATION_TMDB_ID_INVALID` | `400` | `VALIDATION_TMDB_ID_INVALID` | - |
| `UNAUTHORIZED` | `401` | `UNAUTHORIZED` | - |
| `FORBIDDEN` | `403` | `FORBIDDEN` | - |
| `NOT_FOUND` | `404` | `NOT_FOUND` | - |
| `REVIEW_NOT_FOUND` | `404` | - | `error.review.not.found` |
| `CATALOG_MOVIE_NOT_FOUND` | `404` | `CATALOG_MOVIE_NOT_FOUND` | - |
| `CONFLICT` | `409` | `CONFLICT` | - |
| `REVIEW_ALREADY_EXISTS` | `409` | - | `error.review.already.exists` |
| `REVIEW_UNAUTHORIZED_UPDATE` | `403` | - | `error.review.unauthorized.update` |
| `REVIEW_UNAUTHORIZED_DELETE` | `403` | - | `error.review.unauthorized.delete` |
| `INTERNAL_ERROR` | `500` | `INTERNAL_ERROR` | `error.internal.server` |
| `EXTERNAL_API_ERROR` | `502` | `EXTERNAL_API_ERROR` | `error.external.api.failed` |
| `CATALOG_TMDB_API_FAILED` | `502` | `CATALOG_TMDB_API_FAILED` | - |
| `SERVICE_UNAVAILABLE` | `503` | `CATALOG_SERVICE_UNAVAILABLE` | - |

**참고:**
- `-` 표시는 해당 서비스에서 사용하지 않는 에러 코드를 의미합니다.
- Review Service는 Spring Bean Validation 메시지도 별도로 관리합니다 (`validation.*` 키).

### 2.3 드리프트 방지: 매핑 검증 테스트

**문제점:**
- 에러 코드 추가했는데 메시지 리소스에 안 넣음
- 한 서비스에서만 문구 바꾸고 다른 서비스는 오래된 문구 유지
- 오타나 키 이름 변경 후 매핑 문서 미갱신

**해결책: 자동화된 테스트로 검증**

#### Catalog Service 검증

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

#### Review Service 검증

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

### 2.4 메시지 문구 통일 가이드

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

### 2.5 파라미터 스타일 가이드

**원칙: 서비스 내부 일관성이 더 중요, Cross-service 통일은 "문제 없으면 그대로 둔다"**

#### Catalog Service (명명된 파라미터)

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

#### Review Service (위치 기반 파라미터)

```properties
error.review.not.found=리뷰를 찾을 수 없습니다. ID: {0}
error.movie.not.found=영화 정보를 찾을 수 없습니다. ID: {0}
```

**사용:**
```kotlin
messageSource.getMessage("error.review.not.found", arrayOf(reviewId), Locale.getDefault())
```

**문서화:**
- 각 서비스의 파라미터 스타일을 명확히 문서화
- 필요시 "메시지 작성 가이드" 섹션으로 분리 가능

## 3. 에러 코드 목록

### 공통 에러 코드

| 코드                    | HTTP 상태 | 설명                           |
| ----------------------- | --------- | ------------------------------ |
| `VALIDATION_ERROR`      | `400`     | 입력 데이터 검증 실패          |
| `UNAUTHORIZED`          | `401`     | 인증 필요                      |
| `FORBIDDEN`             | `403`     | 권한 없음                      |
| `NOT_FOUND`             | `404`     | 리소스를 찾을 수 없음          |
| `CONFLICT`              | `409`     | 리소스 충돌 (중복 생성 등)     |
| `UNPROCESSABLE_ENTITY`  | `422`     | 도메인 규칙 위반               |
| `INTERNAL_ERROR`        | `500`     | 서버 내부 오류                 |
| `EXTERNAL_API_ERROR`    | `502`     | 외부 API 호출 실패             |
| `SERVICE_UNAVAILABLE`   | `503`     | 서비스 일시적 불가 (Circuit Breaker 등) |

### 도메인별 에러 코드

서비스별로 추가 도메인 에러 코드를 정의할 수 있으나, 가능한 한 위 공통 코드를 우선 사용합니다.

#### Review Service 도메인 에러 코드

| 코드                          | HTTP 상태 | 설명                                    |
| ----------------------------- | --------- | --------------------------------------- |
| `REVIEW_NOT_FOUND`            | `404`     | 리뷰를 찾을 수 없음                     |
| `REVIEW_ALREADY_EXISTS`       | `409`     | 리뷰가 이미 존재함 (중복 생성 시도)     |
| `REVIEW_UNAUTHORIZED_UPDATE` | `403`     | 리뷰 수정 권한 없음 (본인의 리뷰만 가능) |
| `REVIEW_UNAUTHORIZED_DELETE` | `403`     | 리뷰 삭제 권한 없음 (본인의 리뷰만 가능) |

**사용 예시:**
```kotlin
// 리뷰를 찾을 수 없을 때
throw ReviewException.notFound(reviewId = 123L)

// 중복 리뷰 생성 시도
throw ReviewException.alreadyExists(userSeq = 456L, movieId = 789L)

// 권한 없는 수정/삭제 시도
throw ReviewException.unauthorizedUpdate(reviewId = 123L, userSeq = 999L)
```

#### Catalog Service 도메인 에러 코드

| 코드                          | HTTP 상태 | 설명                        |
| ----------------------------- | --------- | --------------------------- |
| `CATALOG_MOVIE_NOT_FOUND`     | `404`     | 영화를 찾을 수 없음         |
| `CATALOG_TMDB_API_FAILED`    | `502`     | TMDB API 호출 실패          |
| `CATALOG_JOB_NOT_FOUND`       | `404`     | 작업(Job)을 찾을 수 없음    |
| `CATALOG_JOB_IN_PROGRESS`     | `409`     | 작업이 이미 진행 중         |

**검증 에러 코드 (서비스 공통):**
- `VALIDATION_SEARCH_QUERY_REQUIRED` - 검색어 필수
- `VALIDATION_TMDB_ID_INVALID` - TMDB ID 유효하지 않음

## 3. HTTP 상태 코드 매핑

### 표준 매핑 규칙

| 에러 코드               | HTTP 상태 코드 | 사용 시나리오                      |
| ----------------------- | -------------- | ---------------------------------- |
| `VALIDATION_ERROR`      | `400`          | 입력 파라미터 검증 실패            |
| `UNAUTHORIZED`          | `401`          | 인증 토큰 없음/만료                |
| `FORBIDDEN`             | `403`          | 인증됐으나 권한 없음               |
| `NOT_FOUND`             | `404`          | 리소스 ID로 찾을 수 없음           |
| `CONFLICT`              | `409`          | 중복 생성, 비즈니스 충돌           |
| `VALIDATION_ERROR`      | `422`          | 도메인 규칙 위반 (IllegalState 등) |
| `INTERNAL_ERROR`        | `500`          | 예상치 못한 서버 오류              |
| `EXTERNAL_API_ERROR`    | `502`          | 외부 API 호출 실패                 |
| `SERVICE_UNAVAILABLE`   | `503`          | Circuit Breaker Open, Rate Limit   |

### 특수 케이스

- **`VALIDATION_ERROR`**:
  - `400`: 입력 파라미터 검증 실패 (ValidationPipe, `@Valid`)
  - `422`: 도메인 로직 위반 (`IllegalArgumentException`, `IllegalStateException`)

## 4. TraceId 규격

### 헤더

- **헤더명**: `X-Trace-Id`
- **형식**: UUID v4 (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`)
- **예시**: `550e8400-e29b-41d4-a716-446655440000`

### 처리 규칙

1. **요청에 `X-Trace-Id`가 있으면**: 그 값을 사용하고 응답에 포함
2. **요청에 `X-Trace-Id`가 없으면**: 새로 생성하고 응답에 포함
3. **로그 기록 시**: `traceId`를 MDC에 추가하여 모든 로그에 자동 포함

### 전파 규칙

- 서비스 간 호출 시: 요청 헤더에 `X-Trace-Id` 포함하여 전파
- 클라이언트 응답: 항상 `traceId` 필드에 포함

## 5. 구현 가이드

### Review Service (Kotlin/Spring Boot)

```kotlin
// ErrorDetail
data class ErrorDetail(
    val code: String,
    val message: String,
    val details: Map<String, Any>? = null,
    val traceId: String? = null,
)

// GlobalExceptionHandler에서 자동 변환
@ExceptionHandler(ReviewException::class)
fun handleReviewException(): ResponseEntity<ErrorDetail>
```

### Catalog Service (TypeScript/NestJS)

#### 기본 구조

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

## 6. 클라이언트 처리

### 프론트엔드

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

## 7. 검증 체크리스트

- [ ] 모든 에러 응답이 `ErrorDetail` 형식을 따름
- [ ] `code` 필드가 표준 에러 코드 목록에 있음
- [ ] HTTP 상태 코드가 `code`와 올바르게 매핑됨
- [ ] `traceId`가 모든 에러 응답에 포함됨
- [ ] `X-Trace-Id` 헤더가 서비스 간 전파됨
- [ ] 클라이언트가 에러 응답을 일관되게 파싱 가능

## 8. 변경 이력

- `2024-12-XX`: 초안 작성 (Review Service, Catalog Service 통일)
- `2025-01-XX`: Catalog Service 구현 가이드 업데이트
  - 에러 코드 중심 설계 (CatalogErrorCode enum)
  - 메시지 리소스 관리 (messages.ko.json, MessageService)
  - 예외 생성 패턴 (CatalogException, ExceptionFactoryService)




