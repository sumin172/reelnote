# 개발 표준 가이드

> 마이크로서비스 확장/개선 개발 시 항상 고려해야 하는 필수 요소 실시간 체크리스트
>
> - 목적: 새로운 기능 추가, 엔드포인트 추가, 서비스 간 통신 구현 시 빠른 참조
> - 대상: 모든 마이크로서비스 (새 서비스 및 기존 서비스)

---

## 🎯 빠른 체크리스트

새로운 기능을 추가할 때 다음을 빠르게 확인하세요:

- [ ] **TraceId 전파**: 서비스 간 호출 시 `X-Trace-Id` 헤더 자동 전파 확인
- [ ] **에러 처리**: `BaseAppException` 패턴 사용, 예외 생성 팩토리 사용
- [ ] **에러 응답**: `ErrorDetail` 스키마 준수 (code, message, details, traceId)
- [ ] **로깅**: 모든 로그에 `traceId` 포함, 레벨 규칙 준수 (4xx: WARN, 5xx: ERROR)
- [ ] **API 문서**: OpenAPI/Swagger 어노테이션 추가, 에러 응답 스키마 명시
- [ ] **Resilience**: 외부 서비스 호출 시 Retry + Circuit Breaker 고려
- [ ] **테스트**: 예외 처리, TraceId 전파, 에러 코드-메시지 매핑 검증

---

## 1. 서비스 간 통신 (Service-to-Service Communication)

### 1-1. TraceId 전파 (필수) ⚠️

**서비스 간 HTTP 호출 시 반드시 확인:**

✅ **해야 할 것:**
- WebClient/HttpService 필터/인터셉터에서 `X-Trace-Id` 헤더 **자동 전파**
- MDC/요청 컨텍스트에서 traceId 읽어 헤더로 자동 추가

❌ **하지 말 것:**
- 수동으로 `X-Trace-Id` 헤더 추가 (`headers.add("X-Trace-Id", ...)` 금지)

#### Spring Boot (Kotlin) - WebClient

```kotlin
// WebClient 설정 시 필터 추가 (필수!)
@Bean
fun webClient(builder: WebClient.Builder): WebClient {
    return builder
        .filter(WebClientTraceIdFilter.create())  // ← 필수!
        .build()
}

// 참고 구현:
// - TraceIdFilter: 요청 시작 시 traceId 생성/설정
// - WebClientTraceIdFilter: MDC에서 traceId를 읽어 헤더로 자동 추가
// - reelnote-api/review-service/src/main/kotlin/app/reelnote/review/infrastructure/config/
```

#### NestJS (TypeScript) - HttpService

```typescript
// HttpService Interceptor에서 자동 전파 구현 필요
// (현재 Catalog Service는 다른 서비스를 호출하지 않아 미구현)
// 다른 서비스를 호출할 경우 Interceptor 추가 필요
```

**체크리스트:**
- [ ] 모든 WebClient Bean에 `WebClientTraceIdFilter` 적용됨
- [ ] 수동으로 `X-Trace-Id` 헤더 추가하는 코드 없음
- [ ] 테스트에서 TraceId 전파 확인됨

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 3

---

### 1-2. Resilience 패턴 (권장)

**외부 서비스 호출 시 필수 고려:**

#### 필수 항목

- [ ] **타임아웃 설정**: 연결/읽기/쓰기 타임아웃 명시 (기본: 5s/10s)
- [ ] **Retry 전략**: 일시적 네트워크 오류/타임아웃에 대한 재시도
  - 지수 백오프 (1s → 2s → 4s)
  - 재시도 대상: 네트워크 오류, 타임아웃, 5xx, 429
  - 최대 재시도: 3회
- [ ] **Circuit Breaker**: 연속 실패 시 일시적 차단
  - 임계값: 실패율 50% 이상, 최소 요청 수 충족 시 OPEN
  - 상태: CLOSED → OPEN → HALF_OPEN

#### 구현 가이드

**Spring Boot:**
- Resilience4j (`resilience4j-spring-boot3`, `resilience4j-reactor`) 사용
- WebClient 필터 체인에 `CircuitBreakerOperator`, `RetryOperator` 추가

**NestJS:**
- `axios-retry` + `opossum` 패턴 (Catalog Service 참고)
- `reelnote-api/catalog-service/src/tmdb/tmdb.client.ts`

**설정:**
- 환경 변수로 재시도 횟수, 타임아웃, Circuit Breaker 임계값 관리

**참고 문서:** [docs/improvements.md](../improvements.md) - Review Service의 CatalogClient Resilience 전략

---

### 1-3. 클라이언트 설정 표준화

- [ ] 타임아웃 설정을 환경 변수로 관리
- [ ] 클라이언트별 설정 클래스 분리 (예: `CatalogApiProperties`)
- [ ] 연결 풀 크기 설정 (필요 시)

---

### 1-4. 에러 처리

**외부 서비스 호출 실패 시:**

- [ ] `EXTERNAL_API_ERROR` (502) 에러 코드 사용
- [ ] Circuit Breaker OPEN 상태는 `SERVICE_UNAVAILABLE` (503) 사용
- [ ] 에러 응답 `details`에 대상 서비스 정보 포함 (`apiName`, `statusCode` 등)
- [ ] 로그에 대상 서비스, 요청 경로, 응답 상태 코드 기록

---

## 2. 에러 처리 (Error Handling)

### 2-1. BaseAppException 패턴 (필수)

**모든 예외는 `BaseAppException` 상속 + 예외 생성 팩토리 사용**

#### ✅ 올바른 패턴

```kotlin
// Spring Boot
// 1. 예외 생성 팩토리 사용
throw exceptionFactory.notFound(reviewId = 123L)

// 2. 팩토리 구현
@Service
class ReviewExceptionFactory(private val messageSource: MessageSource) {
    fun notFound(reviewId: Long): ReviewNotFoundException {
        val message = messageSource.getMessage(
            "error.review.not.found",
            arrayOf(reviewId),
            Locale.getDefault()
        )
        return ReviewNotFoundException(reviewId, message)
    }
}
```

```typescript
// NestJS
// 1. 예외 생성 팩토리 사용
throw this.exceptionFactory.movieNotFound(tmdbId);

// 2. 팩토리 구현
@Injectable()
export class ExceptionFactoryService {
  constructor(private readonly messageService: MessageService) {}

  movieNotFound(tmdbId: number): CatalogException {
    return new CatalogException(
      CatalogErrorCode.MOVIE_NOT_FOUND,
      this.messageService.get(CatalogErrorCode.MOVIE_NOT_FOUND, { tmdbId }),
      HttpStatus.NOT_FOUND,
      { tmdbId },
    );
  }
}
```

#### ❌ 잘못된 패턴

```kotlin
// 메시지 하드코딩 금지
throw ReviewNotFoundException(
    reviewId = 123L,
    message = "리뷰를 찾을 수 없습니다"  // ❌ 하드코딩
)

// 예외 클래스 생성자에 직접 생성 금지
throw ReviewNotFoundException(123L, "리뷰를 찾을 수 없습니다")  // ❌
```

**체크리스트:**
- [ ] 모든 예외가 `BaseAppException` 상속
- [ ] 모든 예외가 팩토리를 통해서만 생성
- [ ] 메시지 리소스 파일에서 메시지 관리
- [ ] 에러 코드가 먼저 정의되고, 메시지 리소스에 매핑됨

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 5, 6

---

### 2-2. 에러 코드 네이밍 규칙

**에러 코드 추가 시:**

- [ ] **공통 코드 우선**: 가능하면 범용 코드 사용 (`NOT_FOUND`, `VALIDATION_ERROR` 등)
- [ ] **도메인 코드**: 비즈니스 도메인에서 발생한 에러는 서비스 prefix 사용
  - 형식: `{SERVICE}_{ENTITY}_{ACTION}_{RESULT}`
  - 예: `CATALOG_MOVIE_NOT_FOUND`, `REVIEW_ALREADY_EXISTS`
- [ ] **검증 코드**: `VALIDATION_{FIELD}_{RULE}` 형식
  - 예: `VALIDATION_SEARCH_QUERY_REQUIRED`

**판단 기준:**
> "사용자/클라이언트/운영자가 이 에러를 보고 무슨 도메인에서 터졌는지 알고 싶으면 도메인 코드, 아니면 범용 코드"

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 2.1, 2.2

---

### 2-3. 에러 응답 형식

**모든 에러 응답은 `ErrorDetail` 스키마 준수:**

```json
{
  "code": "VALIDATION_ERROR",
  "message": "입력 데이터 검증에 실패했습니다",
  "details": { ... },  // 선택적, null이면 JSON에서 제외
  "traceId": "550e8400-..."  // 선택적, null이면 JSON에서 제외
}
```

**JSON 직렬화 규칙:**
- Kotlin: `@JsonInclude(JsonInclude.Include.NON_NULL)` 사용
- TypeScript: `undefined` 필드는 자동 제외 (기본 동작)

**HTTP 상태 코드 매핑:**
- `VALIDATION_ERROR` → 400 (입력 검증) 또는 422 (도메인 규칙 위반)
- `NOT_FOUND` → 404
- `EXTERNAL_API_ERROR` → 502
- `SERVICE_UNAVAILABLE` → 503 (Circuit Breaker OPEN)

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 1

---

### 2-4. 에러 코드 ↔ 메시지 매핑 검증

**새 에러 코드 추가 시 필수:**

- [ ] 메시지 리소스 파일에 에러 코드 추가 (`messages.ko.json`, `messages.properties`)
- [ ] 매핑 검증 테스트 작성/업데이트
  - Review Service: `MessageResourceValidationTest.kt`
  - Catalog Service: `message.service.spec.ts`

**예시:**
```kotlin
// 에러 코드 추가
object ErrorCodes {
    const val REVIEW_NOT_FOUND = "REVIEW_NOT_FOUND"  // 새 코드 추가
}

// 메시지 리소스에 추가
// messages.properties
error.review.not.found=리뷰를 찾을 수 없습니다. ID: {0}

// 매핑 테스트에 추가
private val errorCodeToMessageKey = mapOf(
    ErrorCodes.REVIEW_NOT_FOUND to "error.review.not.found",  // 매핑 추가
    // ...
)
```

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 2.4

---

## 3. TraceId 정책

### 3-1. 요청 수신 시

- [ ] 요청 헤더 `X-Trace-Id` 확인
- [ ] 없으면 UUID v4 생성 (`UUID.randomUUID()` 또는 `crypto.randomUUID()`)
- [ ] MDC/Span에 traceId 설정 (모든 로그에 자동 포함)

**구현:**
- Spring Boot: `TraceIdFilter` (`@Order(1)`로 가장 먼저 실행)
- NestJS: 요청 필터에서 처리

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 3

---

### 3-2. 로깅 시

- [ ] 모든 로그에 `traceId` 포함 (MDC/Span 자동 포함)
- [ ] 로그 형식: `[traceId=xxx] 메시지`

---

### 3-3. 응답 시

- [ ] 모든 에러 응답에 `traceId` 필드 포함
- [ ] 성공 응답에는 포함하지 않음 (선택사항)

---

## 4. 로깅 정책

### 4-1. 로그 레벨 가이드라인

| 로그 레벨 | 사용 시나리오 | 스택 트레이스 |
|---------|------------|------------|
| `ERROR` | 예상치 못한 서버 오류 (5xx) | ✅ **필수** |
| `WARN`  | 비즈니스 예외, 검증 실패 (4xx) | 선택사항 |
| `INFO`  | 정상적인 비즈니스 로직 | - |
| `DEBUG` | 개발/디버깅용 상세 정보 | - |

### 4-2. 로그 형식

```
[YYYY-MM-DD HH:mm:ss.SSS] [LEVEL] [traceId=xxx] [LoggerName] 메시지
```

**예시:**
```kotlin
// Spring Boot
logger.warn("비즈니스 예외 발생: ${ex.message}, traceId=$traceId", ex)
logger.error("예상치 못한 예외 발생: ${ex.message}, traceId=$traceId", ex)  // 스택 트레이스 포함
```

```typescript
// NestJS
this.logger.warn(`예외 발생: ${errorDetail.message}, traceId=${traceId}`);
this.logger.error(
  `예상치 못한 예외 발생: ${errorDetail.message}, traceId=${traceId}`,
  exception instanceof Error ? exception.stack : String(exception),
);
```

### 4-3. 민감 정보 처리

**절대 로그에 포함하지 말 것:**
- 비밀번호, 토큰, API 키
- 개인정보 (주민등록번호, 전화번호 등)
- 신용카드 정보

**주의해서 포함할 것:**
- 사용자 ID (필요시 마스킹)
- 이메일 (필요시 마스킹)

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 4

---

## 5. API 응답 형식

### 5-1. 성공 응답

**✅ DTO 직접 반환 원칙:**

```kotlin
// Spring Boot
@GetMapping("/{id}")
fun getReview(@PathVariable id: Long): ResponseEntity<ReviewResponse> {
    // ...
    return ResponseEntity.ok(reviewResponse)  // DTO 직접 반환
}
```

```typescript
// NestJS
@Get(':id')
async getMovie(@Param('id') id: number): Promise<MovieResponseDto> {
    // ...
    return movieResponseDto;  // DTO 직접 반환
}
```

**❌ 래퍼 클래스 사용 금지:**
```kotlin
// ❌ 잘못된 예시
return ResponseEntity.ok(ApiResponse.success(reviewResponse))  // 래퍼 사용 금지
```

---

### 5-2. 에러 응답

**모든 에러 응답은 `ErrorDetail` 스키마 사용:**

- `code`: 에러 코드 (머신 읽기용)
- `message`: 사람 친화적 메시지
- `details`: 추가 컨텍스트 (선택적, null이면 제외)
- `traceId`: 분산 추적 ID (선택적, null이면 제외)

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 1

---

## 6. API 문서화

### 6-1. OpenAPI/Swagger 설정

**새 엔드포인트 추가 시:**

- [ ] OpenAPI 어노테이션 추가 (`@Operation`, `@ApiResponse` 등)
- [ ] DTO 스키마 문서화 (`@Schema`, `@ApiProperty`)
- [ ] 주요 에러 응답(400, 404, 500 등)에 `ErrorDetail` 스키마 명시
- [ ] 태그(Tag) 사용으로 엔드포인트 그룹화

**예시:**

```kotlin
// Spring Boot
@Tag(name = "Review", description = "리뷰 관리 API")
@Operation(summary = "리뷰 조회", description = "ID로 리뷰를 조회합니다")
@ApiResponses(
    value = [
        ApiResponse(
            responseCode = "200",
            description = "성공",
            content = [Content(schema = Schema(implementation = ReviewResponse::class))]
        ),
        ApiResponse(
            responseCode = "404",
            description = "리뷰를 찾을 수 없음",
            content = [Content(schema = Schema(implementation = ErrorDetail::class))]
        ),
    ],
)
@GetMapping("/{id}")
fun getReview(@PathVariable id: Long): ResponseEntity<ReviewResponse>
```

```typescript
// NestJS
@ApiTags('Movies')
@Get(':id')
@ApiOperation({ summary: '영화 조회', description: 'TMDB ID로 영화 정보를 조회합니다' })
@ApiResponse({ status: 200, description: '성공', type: MovieResponseDto })
@ApiResponse({ status: 404, description: '영화를 찾을 수 없음', type: ErrorDetailDto })
async getMovie(@Param('id') id: number): Promise<MovieResponseDto>
```

---

### 6-2. API 문서 경로

**API 문서 표준 경로:**

모든 백엔드 서비스는 다음 표준 경로를 사용합니다:

- **Swagger UI**: `/api/docs`
- **OpenAPI JSON**: `/api/docs-json`

**서비스별 로컬 접근 주소:**

- Review Service: `http://localhost:8080/api/docs`, `http://localhost:8080/api/docs-json`
- Catalog Service: `http://localhost:3001/api/docs`, `http://localhost:3001/api/docs-json`

**운영 환경:**
- OpenAPI/Swagger UI 비활성화 (`application-prod.yml` 등)

---

## 7. 테스트

### 7-1. 필수 테스트 항목

**새 기능 추가 시 다음 테스트 작성/확인:**

- [ ] **예외 처리 테스트**: GlobalExceptionHandler/Filter가 예외를 올바르게 변환하는지
- [ ] **TraceId 전파 테스트**: 서비스 간 호출 시 TraceId가 전파되는지
- [ ] **에러 코드-메시지 매핑 검증**: 새 에러 코드가 메시지 리소스에 존재하는지
- [ ] **에러 응답 형식 검증**: `ErrorDetail` 스키마 준수 확인

**예시 테스트:**
- Review Service: `MessageResourceValidationTest.kt`
- Catalog Service: `message.service.spec.ts`

---

## 8. 환경 변수 검증

**새 환경 변수 추가 시:**

- [ ] 필수 환경 변수 누락 시 서비스 시작 실패하도록 검증
- [ ] 환경 변수 타입 및 범위 검증
- [ ] Spring Boot: `@ConfigurationProperties` + `@Valid` 사용
- [ ] NestJS: `class-validator` + DTO 기반 설정 검증

---

## 9. Health Check (새 엔드포인트 추가 시)

**새 의존성 추가 시 Health Check 업데이트 고려:**

- [ ] 핵심 의존성은 `checks`에 포함 검토
  - 기준: "이 의존성이 죽으면 서비스 전체가 DOWN이어야 하는가?"
- [ ] 외부 API는 `checks`에서 제외 또는 `DEGRADED` 상태로 표시
- [ ] 타임아웃: 외부 연동 체크는 1초 이내
- [ ] 실패해도 전체 `status`는 `UP` 유지 (외부 API의 경우)

**참고 문서:** [docs/specs/health-check.md](../specs/health-check.md)

---

## 📋 빠른 참조

### 코드 작성 시 체크

1. **예외 발생 시:**
   - [ ] `exceptionFactory.xxx()` 사용 (메시지 하드코딩 금지)
   - [ ] `BaseAppException` 상속 확인
   - [ ] 에러 코드가 메시지 리소스에 매핑됨
   - [ ] 에러 응답에 `traceId` 포함됨

2. **서비스 간 호출 시:**
   - [ ] `WebClientTraceIdFilter` 적용됨 (Spring Boot)
   - [ ] 수동 헤더 추가 코드 없음
   - [ ] Retry + Circuit Breaker 고려됨

3. **새 엔드포인트 추가 시:**
   - [ ] OpenAPI 어노테이션 추가
   - [ ] 에러 응답 스키마 명시
   - [ ] DTO 직접 반환 (래퍼 없음)

4. **로깅 시:**
   - [ ] 로그 레벨 적절함 (4xx: WARN, 5xx: ERROR)
   - [ ] `traceId` 포함됨 (MDC 자동)
   - [ ] 민감 정보 포함되지 않음

---

## 🔗 참고 문서

### 공통 스펙
- [에러 처리 스펙](../specs/error-handling.md) - 상세 스펙 및 구현 가이드
- [헬스 체크 스펙](../specs/health-check.md) - Health Check 표준

### 체크리스트
- [신규 서비스 체크리스트](new-service.md) - 새 서비스 추가 시 전체 체크리스트

### 코드 참고
- Review Service: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/`
- Catalog Service: `reelnote-api/catalog-service/src/`

---

## 📝 변경 이력

- `2025-01-XX`: 초안 작성
  - 서비스 간 통신 표준 (TraceId 전파, Resilience 패턴)
  - 에러 처리 표준 (BaseAppException, 예외 생성 팩토리)
  - 로깅 정책, API 응답 형식, API 문서화

