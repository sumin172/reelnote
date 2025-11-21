# 신규 마이크로서비스 체크리스트

새로운 서비스를 추가할 때 아래 항목을 순차적으로 점검하세요.

## 1. 프로젝트 구조 등록

- [ ] `reelnote-api/` 등 적절한 디렉터리에 서비스 생성
- [ ] `nx.json` 또는 `project.json`에 프로젝트와 태그 정의
- [ ] `pnpm-workspace.yaml`에 패키지 경로 추가 (Node.js 기반일 경우)
- [ ] 주요 Nx 타깃(`build`, `serve`, `test` 등) 설정

## 2. 코드 스타일 & 린팅

- [ ] `.editorconfig`, `.gitattributes`에 필요한 언어 규칙 반영
- [ ] 서비스 전용 `eslint.config.mjs`, `ktlint`, `ruff`, `golangci-lint` 등 설정 파일 생성
- [ ] CI 워크플로우에 린트 작업 추가 또는 업데이트

## 3. 설정 파일

- [ ] `.env.example` 작성 및 필수 환경 변수 문서화
- [ ] `.gitignore` 업데이트
- [ ] 서비스 README에 기술 스택, 구조, 실행 방법, API 문서 링크 정리
- [ ] **데이터베이스 마이그레이션 관리**
  - 마이그레이션 파일을 버전 관리에 포함
  - **Prisma**:
    - `prisma/migrations` 디렉터리를 저장소에 포함 (초기 마이그레이션 포함)
    - 프로덕션 마이그레이션 타겟: `prisma:migrate:deploy` Nx 타겟 추가
    - Seeding 전략 수립 (Local/Dev만 허용, Stage/Prod 금지)
  - **Flyway**:
    - `db/migration` 디렉터리의 모든 `V*.sql` 파일 포함
  - 마이그레이션 파일 네이밍 규칙 준수
    - Flyway: `V{version}__{description}.sql` (예: `V1__Create_reviews_table.sql`)
    - Prisma: `{timestamp}_{description}` (자동 생성, `--name` 옵션으로 의미있는 이름 지정 권장)
  - 개발/운영 계열 DB에는 `prisma db push` 사용 금지
  - 롤백 전략 문서화 (필요 시)

## 4. 테스트 설정

- [ ] 단위/통합 테스트 프레임워크 설정 (Jest, Vitest, JUnit, pytest 등)
- [ ] 필요 시 `*-e2e` 프로젝트와 시나리오 정의
- [ ] `nx.json`의 `targetDefaults.test`와 호환되는지 확인
- [ ] **최소 테스트 커버리지 요구사항**
  - 핵심 비즈니스 로직: 단위 테스트 작성 (도메인 서비스, UseCase 등)
  - 컨트롤러: 통합 테스트 또는 `@WebMvcTest` / `@WebFluxTest` 작성
  - 예외 처리: 글로벌 예외 핸들러/필터 테스트
  - 에러 코드 ↔ 메시지 매핑 검증 테스트 (드리프트 방지)
  - 외부 서비스 클라이언트: Mock/Stub 사용하여 테스트
- [ ] **필수 테스트 항목**
  - 에러 코드 ↔ 메시지 리소스 일치 검증 테스트
  - BaseAppException 패턴 테스트
  - TraceId 전파 테스트 (서비스 간 호출 시)
  - Health Check 엔드포인트 테스트

## 5. CI/CD

- [ ] `build`/`test` 타깃이 CI에서 동작하도록 설정
- [ ] 필요한 환경 변수/시크릿 문서화 및 등록
- [ ] 배포 워크플로우(컨테이너 빌드, 배포 프로세스)가 있다면 문서화

## 6. 컨테이너 & 로컬 개발

- [ ] 멀티스테이지 `Dockerfile`과 `.dockerignore` 작성
- [ ] 로컬 개발용 `docker-compose` 서비스 추가 (필요 시)
- [ ] **Health Check 엔드포인트 구현** ([docs/specs/health-check.md](../specs/health-check.md) 참조)
  - [ ] K8s 프로브용 엔드포인트: `/health/live` (Liveness), `/health/ready` (Readiness)
  - [ ] 공통 스펙 준수: `status`, `timestamp` (UTC), `service`, `checks` (선택), `version` (선택)
  - [ ] `status` 값: Actuator 표준 사용 (`UP`, `DOWN`, `OUT_OF_SERVICE`, `UNKNOWN`)
  - [ ] 버전 읽기: 빌드 아티팩트에서 읽기 (환경변수 override 금지)
    - Node.js: `package.json` → 시작 시 메모리 캐싱
    - Spring Boot: `build-info.properties` 또는 `application.yml`에 주입
  - [ ] 로깅 정책: 성공 로그는 기록하지 않음, 실패 시에만 `warn`/`error` 기록
  - [ ] 메트릭: 헬스 체크 실패 카운터 추가 (`health_check_failures_total`)
  - [ ] 인증 정책: `/health/**`는 인증 없음 (내부망 전제), 상세 health는 인증 필요

## 7. 서비스 간 통신 (Service-to-Service Communication)

서비스 간 HTTP 통신을 구현할 때 다음 사항을 준수해야 합니다.

### 7.1 TraceId 전파 (필수)

- [ ] **`X-Trace-Id` 헤더 자동 전파** ([docs/specs/error-handling.md](../specs/error-handling.md) 참조)
  - 모든 서비스 간 HTTP 호출에 `X-Trace-Id` 헤더 포함
  - 현재 요청의 TraceId를 다음 호출로 자동 전파
  - 클라이언트 필터/인터셉터에서 자동 처리 (수동 설정 불필요)
  - **⚠️ 수동 헤더 추가 금지**: WebClient/HttpService 요청에 수동으로 `X-Trace-Id` 헤더 추가하지 않음

- [ ] **Spring Boot (Kotlin) 구현**
  - [ ] `TraceIdFilter` 구현 (요청 시작 시 traceId 생성/설정)
    - `@Component` + `@Order(1)`로 가장 먼저 실행
    - 요청 헤더 `X-Trace-Id` 확인, 없으면 UUID v4 생성
    - MDC에 traceId 설정 (모든 로그에 자동 포함)
    - 참고: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/infrastructure/config/TraceIdFilter.kt`
  - [ ] `WebClientTraceIdFilter` 구현 (서비스 간 호출 시 자동 전파)
    - MDC에서 traceId를 읽어 `X-Trace-Id` 헤더로 자동 추가
    - 참고: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/infrastructure/config/WebClientTraceIdFilter.kt`
  - [ ] WebClient 설정에 필터 적용
    ```kotlin
    @Bean
    fun webClient(builder: WebClient.Builder): WebClient {
        return builder
            .filter(WebClientTraceIdFilter.create())  // ← 필수!
            .build()
    }
    ```
  - [ ] **체크리스트:**
    - [ ] 모든 WebClient Bean에 `WebClientTraceIdFilter` 적용됨
    - [ ] 수동으로 `X-Trace-Id` 헤더 추가하는 코드 없음
    - [ ] 테스트에서 TraceId 전파 확인됨

- [ ] **NestJS (TypeScript) 구현**
  - [ ] HttpService Interceptor에서 `X-Trace-Id` 헤더 자동 추가
    - 요청 컨텍스트에서 traceId를 읽어 헤더로 추가
    - 참고: Catalog Service는 현재 다른 서비스를 호출하지 않아 미구현
    - 다른 서비스를 호출할 경우 Interceptor 추가 필요
  - [ ] **체크리스트:**
    - [ ] HttpService Interceptor에 TraceId 전파 로직 포함
    - [ ] 수동으로 `X-Trace-Id` 헤더 추가하는 코드 없음

### 7.2 Resilience 패턴 (권장)

- [ ] **외부 서비스 호출에 Resilience 패턴 적용**
  - **Retry**: 일시적 네트워크 오류/타임아웃에 대한 재시도
    - 지수 백오프 전략 사용 (예: 1s → 2s → 4s)
    - 재시도 대상: 네트워크 오류, 타임아웃, 5xx, 429 (Too Many Requests)
    - 최대 재시도 횟수 설정 (기본: 3회)
  - **Circuit Breaker**: 연속 실패 시 일시적 차단
    - 상태: CLOSED → OPEN → HALF_OPEN
    - 임계값: 실패율 50% 이상, 최소 요청 수 충족 시 OPEN
    - 타임아웃 후 HALF_OPEN으로 전환하여 재시도
  - **Timeout**: 요청 타임아웃 설정
    - 연결 타임아웃: 기본 5초
    - 읽기/쓰기 타임아웃: 기본 10초
  - **Rate Limiting**: 동시 요청 수 제한 (필요 시)
    - 동시성 제어로 대상 서비스 보호

**구현 가이드:**
- **NestJS**: `axios-retry` + `opossum` 패턴 (Catalog Service 참고)
- **Spring Boot**: `spring-retry` + Resilience4j 또는 WebClient의 `retry()` + `resilience4j-circuitbreaker` 패턴
- **설정**: 환경 변수로 재시도 횟수, 타임아웃, Circuit Breaker 임계값 관리

### 7.3 클라이언트 설정 표준화

- [ ] **외부 서비스 클라이언트 설정 일관성**
  - 타임아웃 설정을 환경 변수로 관리
  - 연결 풀 크기 설정 (필요 시)
  - 클라이언트별 설정 클래스 분리 (예: `CatalogApiProperties`)
  - 테스트 환경에서 Mock 클라이언트 사용 가능하도록 인터페이스 분리

### 7.4 에러 처리

- [ ] **외부 서비스 호출 실패 처리**
  - `EXTERNAL_API_ERROR` 에러 코드 사용
  - 에러 응답에 대상 서비스 정보 포함 (`details.apiName`, `details.statusCode` 등)
  - Circuit Breaker OPEN 상태는 `SERVICE_UNAVAILABLE` (503)으로 처리
  - 로그에 대상 서비스, 요청 경로, 응답 상태 코드 기록

## 8. 관측성

- [ ] 구조화된 로깅 포맷 정의
- [ ] **메트릭 수집 방식 결정** (표준 라이브러리 권장)
  - **Spring Boot**: Micrometer 사용 (Actuator 기본 제공)
  - **NestJS**: `@prometheus/client` 또는 `prom-client` 사용
  - 인메모리 메트릭은 운영 환경에서 제한적 (서버 재시작 시 초기화)
  - Prometheus/Grafana 연동 준비
- [ ] 메트릭/트레이싱(OpenTelemetry, Jaeger 등) 도입 여부 결정
- [ ] **`X-Trace-Id` 헤더 처리 구현** ([docs/specs/error-handling.md](../specs/error-handling.md) 참조)
  - 요청 헤더 `X-Trace-Id` 확인 (있으면 사용, 없으면 UUID v4 생성)
  - 모든 로그에 `traceId` 포함 (MDC/Span 등 활용)
  - 에러 응답에 `traceId` 필드 포함
  - ⚠️ **서비스 간 호출 시 전파는 "7. 서비스 간 통신" 섹션 참조**
- [ ] **로깅 정책 준수** ([docs/specs/error-handling.md](../specs/error-handling.md) 참조)
  - 로그 레벨 가이드라인: 4xx → WARN, 5xx → ERROR
  - 5xx 오류에 스택 트레이스 포함
  - 민감 정보(비밀번호, 토큰, 개인정보) 로그에 포함 금지
  - 모든 로그에 `traceId` 포함
- [ ] 상관관계 ID 미들웨어/필터 구현

## 9. API 문서화

- [ ] **OpenAPI/Swagger 설정**
  - OpenAPI 3.0 스펙 준수
  - **경로 통일**: 모든 신규 서비스는 다음 표준 경로를 사용해야 합니다
    - Swagger UI: `/api/docs` (필수)
    - OpenAPI JSON: `/api/docs-json` (필수)
  - 운영 환경에서는 문서 노출 비활성화 (`application-prod.yml` 등)
  - DTO 및 에러 응답 스키마 문서화
  - 주요 에러 응답(400, 404, 500 등)에 `ErrorDetail` 스키마 명시
  - 태그(Tag) 사용으로 엔드포인트 그룹화
  - 예시 요청/응답 포함

## 10. API 응답 형식 표준화

### 성공 응답
- [ ] **DTO 직접 반환 원칙** ([docs/specs/error-handling.md](../specs/error-handling.md) 참조)
  - 성공 응답(HTTP `2xx`)은 DTO를 직접 반환
  - `ApiResponse<T>` 같은 래퍼 클래스 사용하지 않음
  - 예: `ResponseEntity<ReviewResponse>`, `Promise<MovieResponseDto>`
- [ ] 서비스 간 응답 형식 일관성 확인
  - 다른 서비스들과 동일한 패턴 사용
  - 클라이언트가 서비스별 분기 처리 불필요하도록 유지

### 에러 응답
- [ ] 공통 에러 스펙 준수 ([docs/specs/error-handling.md](../specs/error-handling.md) 참조)
  - `ErrorDetail` 스키마 사용 (code, message, details, traceId)
  - 표준 에러 코드 사용 (`VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR` 등)
  - HTTP 상태 코드 매핑 표준 준수
  - **JSON 직렬화 규칙 준수** ([docs/specs/error-handling.md](../specs/error-handling.md) 참조)
    - 선택적 필드(`details`, `traceId`)는 `null`/`undefined`인 경우 JSON에서 제외
    - Kotlin: `@JsonInclude(JsonInclude.Include.NON_NULL)` 사용
    - TypeScript: `undefined` 필드는 자동 제외 (기본 동작)
- [ ] **예외 처리 가이드 준수** ([docs/specs/error-handling.md](../specs/error-handling.md) 참조)
  - 에러 코드 네이밍 규칙 준수 (공통/도메인/검증 에러 코드 분류)
  - TraceId 정책 준수 (요청 헤더 확인, 전파, 로그 포함)
  - 로깅 정책 준수 (4xx: WARN, 5xx: ERROR, 스택 트레이스 포함 여부)
  - BaseAppException 패턴 사용 (프레임워크 독립 베이스 예외)

#### BaseAppException 패턴 (프레임워크 독립 베이스 예외)

ReelNote MSA의 모든 서비스는 **프레임워크 독립적인 베이스 예외 클래스**를 사용하여 일관된 예외 처리를 구현해야 합니다. 이는 프레임워크 차이를 수용하되, 개념적 일관성을 유지하기 위함입니다.

**설계 원칙:**

1. **프레임워크 독립성**: 프레임워크 특정 예외 클래스 상속 최소화
2. **일관된 인터페이스**: 모든 서비스에서 동일한 속성 구조 사용
3. **표준 응답 형식**: 모든 예외가 `ErrorDetail` 스키마로 변환 가능

**공통 속성 (모든 서비스에서 동일):**

| 속성           | 타입           | 필수 | 설명                            |
|--------------|--------------|----|-------------------------------|
| `errorCode`  | `string`     | ✅  | 에러 코드 (예: `REVIEW_NOT_FOUND`) |
| `httpStatus` | `HttpStatus` | ✅  | HTTP 상태 코드                    |
| `message`    | `string`     | ✅  | 사용자 친화적 메시지                   |
| `details`    | `object`     | ❌  | 추가 컨텍스트 정보                    |

**구현 요구사항:**

- 모든 서비스별 예외 클래스는 `BaseAppException`을 상속해야 함
- 예외 클래스는 메시지를 파라미터로 받되, 생성은 팩토리를 통해서만 수행
- 글로벌 예외 핸들러/필터에서 `BaseAppException`을 우선 처리하여 `ErrorDetail`로 변환
- 로그 레벨 자동 결정: 5xx → ERROR, 4xx → WARN

**프레임워크별 구현 예시 (참고용):**

```typescript
// NestJS: BaseAppException - 프레임워크 독립 베이스
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
```

```kotlin
// Spring Boot: BaseAppException - 프레임워크 독립 베이스
abstract class BaseAppException(
    message: String,
    val errorCode: String,
    val httpStatus: HttpStatus,
    val details: Map<String, Any>? = null,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
```

#### 에러 처리 패턴

ReelNote MSA의 모든 서비스는 **에러 코드 중심 설계**와 **예외 생성 팩토리 패턴**을 사용하여 일관된 예외 처리를 구현해야 합니다.

**핵심 설계 원칙:**

1. **에러 메시지 하드코딩 금지**: 모든 에러 메시지는 리소스 파일에서 관리
2. **에러 코드 중심 설계**: 에러 코드가 Source of Truth, 메시지는 표현 레이어
3. **예외 생성 팩토리 패턴**: 모든 예외는 팩토리를 통해 생성하여 중앙 관리
4. **메시지 국제화 준비**: 메시지 리소스 분리로 향후 다국어 지원 용이

**1. 에러 코드와 메시지 분리**

**에러 코드 (Error Code)**
- 머신 친화적 식별자
- HTTP 응답의 `code` 필드에 사용
- 클라이언트/로그/모니터링의 기준값
- Source of Truth: 코드에서 정의된 에러 코드가 기준

**메시지 (Message)**
- 사람이 읽는 문장
- 리소스 파일에서 관리 (`messages.properties`, `messages.ko.json` 등)
- 프레임워크별 형식 허용 (Properties, JSON 등)
- 파라미터 치환 지원 (예: `{0}`, `{tmdbId}`)

**구현 예시:**

```kotlin
// 에러 코드 정의 (Source of Truth)
object ErrorCodes {
    const val REVIEW_NOT_FOUND = "REVIEW_NOT_FOUND"
    const val REVIEW_ALREADY_EXISTS = "REVIEW_ALREADY_EXISTS"
    const val VALIDATION_ERROR = "VALIDATION_ERROR"
}

// 메시지 리소스 파일 (messages.properties)
error.review.not.found=리뷰를 찾을 수 없습니다. ID: {0}
error.review.already.exists=이미 해당 영화에 대한 리뷰가 존재합니다
error.validation.failed=입력 데이터 검증에 실패했습니다
```

```typescript
// 에러 코드 enum (Source of Truth)
export enum CatalogErrorCode {
  MOVIE_NOT_FOUND = "CATALOG_MOVIE_NOT_FOUND",
  VALIDATION_SEARCH_QUERY_REQUIRED = "VALIDATION_SEARCH_QUERY_REQUIRED",
}

// 메시지 리소스 파일 (messages.ko.json)
{
  "CATALOG_MOVIE_NOT_FOUND": "영화 정보를 찾을 수 없습니다. TMDB ID: {tmdbId}",
  "VALIDATION_SEARCH_QUERY_REQUIRED": "검색어는 필수입니다."
}
```

**2. 메시지 조회 서비스**

에러 코드를 메시지로 변환하는 서비스를 구현합니다. 프레임워크별로 제공되는 메시지 조회 메커니즘을 활용하되, 동일한 인터페이스로 접근합니다.

- **Spring Boot**: `MessageSource` 사용 (Spring 기본 제공)
- **NestJS**: `MessageService` 구현 (커스텀 서비스)

**3. 예외 생성 팩토리 패턴 (필수)**

**모든 서비스는 예외 생성 팩토리를 구현해야 합니다.** 이는 다음을 보장합니다:

- 메시지 하드코딩 방지: 팩토리에서만 메시지 리소스 접근
- 일관성 보장: 모든 예외가 동일한 방식으로 생성
- 확장성: 향후 로깅/메트릭 추가 시 팩토리만 수정
- 테스트 용이: 팩토리만 모킹하면 예외 생성 로직 테스트 가능

**구현 예시:**

```kotlin
// ReviewExceptionFactory - 예외 생성 중앙 관리
@Service
class ReviewExceptionFactory(
    private val messageSource: MessageSource,
) {
    fun notFound(reviewId: Long): ReviewNotFoundException {
        val message = messageSource.getMessage(
            "error.review.not.found",
            arrayOf(reviewId),
            Locale.getDefault()
        )
        return ReviewNotFoundException(reviewId, message)
    }

    fun alreadyExists(userSeq: Long, movieId: Long): ReviewAlreadyExistsException {
        val message = messageSource.getMessage(
            "error.review.already.exists",
            null,
            Locale.getDefault()
        )
        return ReviewAlreadyExistsException(userSeq, movieId, message)
    }
}

// 사용: throw exceptionFactory.notFound(reviewId)
```

```typescript
// ExceptionFactoryService - 예외 생성 중앙 관리
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

// 사용: throw this.exceptionFactory.movieNotFound(tmdbId)
```

**⚠️ 주의사항:**

- 예외 클래스 생성자에 메시지를 직접 전달하지 말고, 팩토리를 통해 생성
- Companion object나 정적 팩토리 메서드에서도 메시지를 하드코딩하지 말고, 팩토리 사용
- 예외 클래스는 메시지를 파라미터로 받되, 생성은 팩토리에서만 수행

**이점:**
- 하드코딩 제거: 에러 메시지가 코드와 완전히 분리
- 일관성 보장: 모든 예외가 동일한 구조로 생성
- 확장성: 다국어 지원, 로깅/메트릭 추가 시 팩토리만 수정
- 테스트 용이: 에러 코드로 예외 타입 식별 가능
- 드리프트 방지: 매핑 검증 테스트로 에러 코드-메시지 동기화 보장

**체크리스트:**
- [ ] **BaseAppException 구현**
  - [ ] `BaseAppException` 베이스 클래스 생성 (프레임워크 독립)
  - [ ] 서비스별 예외 클래스가 `BaseAppException` 상속
  - [ ] 필수 필드: `errorCode`, `httpStatus`, `message`
  - [ ] 선택 필드: `details` (추가 컨텍스트 정보)
- [ ] **에러 코드 정의**
  - [ ] 에러 코드 enum/object 정의 (도메인별, 검증별, 범용 분류)
  - [ ] 네이밍 규칙 준수 ([docs/specs/error-handling.md](../specs/error-handling.md) 참조)
    - 공통: `VALIDATION_ERROR`, `NOT_FOUND` 등 (prefix 없음)
    - 도메인: `{SERVICE}_{ENTITY}_{ACTION}_{RESULT}` (예: `CATALOG_MOVIE_NOT_FOUND`)
    - 검증: `VALIDATION_{FIELD}_{RULE}` (예: `VALIDATION_SEARCH_QUERY_REQUIRED`)
- [ ] **메시지 관리** ([docs/specs/error-handling.md](../specs/error-handling.md) 섹션 2 참조)
  - [ ] 메시지 리소스 파일 생성 (`messages.ko.json`, `messages.properties` 등)
  - [ ] 메시지 조회 서비스 구현 (Spring Boot: `MessageSource`, NestJS: `MessageService`)
  - [ ] **에러 코드 ↔ 메시지 키 매핑 검증 테스트 작성** (드리프트 방지)
    - 모든 에러 코드가 메시지 리소스에 존재하는지 검증
    - 예: `message.service.spec.ts`, `MessageResourceValidationTest.kt`
  - [ ] **메시지 문구 통일**: 동일한 의미의 메시지는 사용자 기준으로 통일
  - [ ] **파라미터 스타일**: 서비스 내부 일관성 유지 (Catalog: `{fieldName}`, Review: `{0}`)
- [ ] **예외 생성 팩토리 패턴 (필수)**
  - [ ] `ExceptionFactoryService` 또는 `ReviewExceptionFactory` 구현
  - [ ] 팩토리가 메시지 조회 서비스를 주입받아 사용
  - [ ] 각 예외 타입별 팩토리 메서드 제공
  - [ ] **예외 클래스 생성자에 메시지를 직접 전달하지 않고, 팩토리를 통해서만 생성**
  - [ ] `details` 필드에 컨텍스트 정보 포함 (예: `{ tmdbId: 123 }`)
  - [ ] 모든 예외 생성이 팩토리를 통해 이루어지는지 확인
- [ ] **글로벌 예외 핸들러/필터 구현**
  - [ ] `BaseAppException` 우선 처리
  - [ ] 모든 예외를 `ErrorDetail` 형식으로 변환
  - [ ] `traceId`가 모든 에러 응답에 포함되도록 보장
  - [ ] 로그 레벨 자동 결정 (5xx: ERROR, 4xx: WARN)
  - [ ] 5xx 오류에 스택 트레이스 포함
- [ ] **TraceId 정책 준수** ([docs/specs/error-handling.md](../specs/error-handling.md) 참조)
  - [ ] 요청 헤더 `X-Trace-Id` 확인 및 생성 (없으면 UUID v4 생성)
  - [ ] 모든 로그에 `traceId` 포함 (MDC/Span 활용)
  - [ ] ⚠️ **서비스 간 호출 시 `X-Trace-Id` 헤더 자동 전파는 "7. 서비스 간 통신" 섹션 참조**

## 11. 보안 및 시크릿

- [ ] 의존성 취약점 스캔 도구 설정 (Dependabot, Renovate 등)
- [ ] **환경 변수 검증 스키마 정의**
  - [ ] **시작 시점 검증 구현** (조기 실패 원칙)
    - 필수 환경 변수 누락 시 서비스 시작 실패하도록 검증
    - 환경 변수 타입 및 범위 검증 (예: 포트 번호 범위)
  - [ ] **프레임워크별 검증 패턴 적용**
    - **Spring Boot**: `@ConfigurationProperties` + `@ConfigurationPropertiesScan` 사용
    - **NestJS**: `class-validator` + DTO 기반 설정 검증 + Config Provider 패턴
  - [ ] **Config Provider 패턴 구현** (NestJS의 경우)
    - 환경 변수 검증 DTO 정의 (`env.validation.ts`)
    - Config Provider 클래스 생성 (`@Injectable()`)
    - 모듈에 Provider 등록
    - 서비스에서 Config Provider 주입 사용
  - [ ] **타입 안전한 설정 접근**
    - `ConfigService.get()` 직접 호출 금지 (Config Provider 사용)
    - `process.env` 직접 접근 금지 (검증 우회 방지)
  - [ ] **베스트 프랙티스 준수**
    - 필수 설정은 명시적 검증 규칙 적용
    - 숫자 범위는 `@Min()`, `@Max()` 데코레이터로 제한
    - 선택적 설정은 `@IsOptional()` 데코레이터 사용
    - URL 형식은 커스텀 검증 로직으로 처리 (postgresql, redis 프로토콜 지원)
- [ ] **인증/인가, CORS 등 보안 설정 검토**
  - `/health/**` 엔드포인트는 인증 없음 (내부망 전제)
  - API 엔드포인트 인증/인가 정책 명확화
  - CORS 정책 환경별 차별화 (dev: localhost 허용, prod: 명시적 origin만 허용)

## 12. 운영 모니터링

- [ ] **헬스체크 및 경고 시스템 구성**
  - [ ] K8s liveness/readiness 프로브 설정 (`/health/live`, `/health/ready`)
  - [ ] 헬스 체크 실패 메트릭 모니터링 (`health_check_failures_total`)
  - [ ] 헬스 체크 실패 시 알림 규칙 설정
- [ ] 로그 집계/관찰 도구(Loki, ELK 등) 연동 여부 검토
- [ ] 장애 대응 및 알림 흐름 정리

---

필요시 항목을 자유롭게 확장하고, 서비스 README 또는 운영 문서와 연동해 최신 상태를 유지하세요.

