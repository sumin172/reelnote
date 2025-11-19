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

### 도메인별 에러 코드 (예시)

서비스별로 추가 도메인 에러 코드를 정의할 수 있으나, 가능한 한 위 공통 코드를 우선 사용합니다.

**Review Service 예시:**
- `REVIEW_NOT_FOUND`
- `MOVIE_NOT_FOUND`

**Catalog Service 예시:**
- `MOVIE_NOT_FOUND`
- `TMDB_API_ERROR`

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

```typescript
// ErrorDetailDto
export class ErrorDetailDto {
  code!: string;
  message!: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

// HttpExceptionFilter에서 자동 변환
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // ErrorDetailDto로 변환
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




