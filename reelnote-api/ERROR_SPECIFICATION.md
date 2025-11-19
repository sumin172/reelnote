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

## 2. 에러 코드 목록

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




