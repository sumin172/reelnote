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

## 4. 테스트 설정

- [ ] 단위/통합 테스트 프레임워크 설정 (Jest, Vitest, JUnit, pytest 등)
- [ ] 필요 시 `*-e2e` 프로젝트와 시나리오 정의
- [ ] `nx.json`의 `targetDefaults.test`와 호환되는지 확인

## 5. CI/CD

- [ ] `build`/`test` 타깃이 CI에서 동작하도록 설정
- [ ] 필요한 환경 변수/시크릿 문서화 및 등록
- [ ] 배포 워크플로우(컨테이너 빌드, 배포 프로세스)가 있다면 문서화

## 6. 컨테이너 & 로컬 개발

- [ ] 멀티스테이지 `Dockerfile`과 `.dockerignore` 작성
- [ ] 로컬 개발용 `docker-compose` 서비스 추가 (필요 시)
- [ ] **Health Check 엔드포인트 구현** (`health-check-spec.md` 참조)
  - [ ] K8s 프로브용 엔드포인트: `/health/live` (Liveness), `/health/ready` (Readiness)
  - [ ] 공통 스펙 준수: `status`, `timestamp` (UTC), `service`, `checks` (선택), `version` (선택)
  - [ ] `status` 값: Actuator 표준 사용 (`UP`, `DOWN`, `OUT_OF_SERVICE`, `UNKNOWN`)
  - [ ] 버전 읽기: 빌드 아티팩트에서 읽기 (환경변수 override 금지)
    - Node.js: `package.json` → 시작 시 메모리 캐싱
    - Spring Boot: `build-info.properties` 또는 `application.yml`에 주입
  - [ ] 로깅 정책: 성공 로그는 기록하지 않음, 실패 시에만 `warn`/`error` 기록
  - [ ] 메트릭: 헬스 체크 실패 카운터 추가 (`health_check_failures_total`)
  - [ ] 인증 정책: `/health/**`는 인증 없음 (내부망 전제), 상세 health는 인증 필요

## 7. 관측성

- [ ] 구조화된 로깅 포맷 정의
- [ ] 메트릭/트레이싱(OpenTelemetry, Jaeger 등) 도입 여부 결정
- [ ] **`X-Trace-Id` 헤더 처리 구현** (`ERROR_HANDLING_GUIDE.md` 참조)
  - 요청 헤더 `X-Trace-Id` 확인 (있으면 사용, 없으면 UUID v4 생성)
  - 서비스 간 호출 시 `X-Trace-Id` 헤더 자동 전파
  - 모든 로그에 `traceId` 포함 (MDC/Span 등 활용)
  - 에러 응답에 `traceId` 필드 포함
- [ ] **로깅 정책 준수** (`ERROR_HANDLING_GUIDE.md` 참조)
  - 로그 레벨 가이드라인: 4xx → WARN, 5xx → ERROR
  - 5xx 오류에 스택 트레이스 포함
  - 민감 정보(비밀번호, 토큰, 개인정보) 로그에 포함 금지
  - 모든 로그에 `traceId` 포함
- [ ] 상관관계 ID 미들웨어/필터 구현

## 8. API 응답 형식 표준화

### 성공 응답
- [ ] **DTO 직접 반환 원칙** (`ERROR_SPECIFICATION.md` 참조)
  - 성공 응답(HTTP `2xx`)은 DTO를 직접 반환
  - `ApiResponse<T>` 같은 래퍼 클래스 사용하지 않음
  - 예: `ResponseEntity<ReviewResponse>`, `Promise<MovieResponseDto>`
- [ ] 서비스 간 응답 형식 일관성 확인
  - 다른 서비스들과 동일한 패턴 사용
  - 클라이언트가 서비스별 분기 처리 불필요하도록 유지

### 에러 응답
- [ ] 공통 에러 스펙 준수 (`ERROR_SPECIFICATION.md` 참조)
  - `ErrorDetail` 스키마 사용 (code, message, details, traceId)
  - 표준 에러 코드 사용 (`VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR` 등)
  - HTTP 상태 코드 매핑 표준 준수
  - **JSON 직렬화 규칙 준수** (`ERROR_SPECIFICATION.md` 참조)
    - 선택적 필드(`details`, `traceId`)는 `null`/`undefined`인 경우 JSON에서 제외
    - Kotlin: `@JsonInclude(JsonInclude.Include.NON_NULL)` 사용
    - TypeScript: `undefined` 필드는 자동 제외 (기본 동작)
- [ ] **예외 처리 가이드 준수** (`ERROR_HANDLING_GUIDE.md` 참조)
  - 에러 코드 네이밍 규칙 준수 (공통/도메인/검증 에러 코드 분류)
  - TraceId 정책 준수 (요청 헤더 확인, 전파, 로그 포함)
  - 로깅 정책 준수 (4xx: WARN, 5xx: ERROR, 스택 트레이스 포함 여부)
  - BaseAppException 패턴 사용 (프레임워크 독립 베이스 예외)

#### BaseAppException 패턴 (프레임워크 독립 베이스 예외)

모든 서비스는 **프레임워크 독립적인 베이스 예외 클래스**를 사용하여 일관된 예외 처리를 구현해야 합니다. 이는 프레임워크 차이를 수용하되, 개념적 일관성을 유지하기 위함입니다.

**공통 속성:**
- `errorCode`: 에러 코드 (string)
- `httpStatus`: HTTP 상태 코드
- `message`: 사용자 친화적 메시지
- `details`: 추가 컨텍스트 정보 (선택)

**프레임워크별 구현:**

**NestJS (TypeScript):**
```typescript
// BaseAppException - 프레임워크 독립 베이스
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

// 서비스별 예외 클래스
export class ServiceException extends BaseAppException {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown>,
  ) {
    super(code, message, status, details);
  }
}
```

**Spring Boot (Kotlin):**
```kotlin
// BaseAppException - 프레임워크 독립 베이스
abstract class BaseAppException(
    message: String,
    val errorCode: String,
    val httpStatus: HttpStatus,
    val details: Map<String, Any>? = null,
    cause: Throwable? = null,
) : RuntimeException(message, cause)

// 서비스별 예외 클래스
sealed class ServiceException(
    message: String,
    errorCode: String,
    httpStatus: HttpStatus,
    details: Map<String, Any>? = null,
    cause: Throwable? = null,
) : BaseAppException(message, errorCode, httpStatus, details, cause)
```

**예외 핸들러/필터:**
- NestJS: `HttpExceptionFilter`에서 `BaseAppException` 우선 처리
- Spring Boot: `GlobalExceptionHandler`에서 `BaseAppException` 처리
- 로그 레벨 자동 결정: 5xx → ERROR, 4xx → WARN

#### 에러 처리 패턴 (Catalog Service 참고)

에러 메시지를 하드코딩하지 말고, **에러 코드 중심으로 설계**하는 것이 유지보수성과 일관성을 보장합니다. Catalog Service에서는 다음과 같은 패턴을 사용합니다:

**1. 에러 코드 정의 및 메시지 분리**

**핵심 원칙: 에러 코드는 시스템 공통 기준, 메시지 키는 각 서비스/프레임워크에 최적화된 표현**

- **에러 코드**: 머신 친화적 ID, HTTP 응답의 `code` 필드, 클라이언트/로그/모니터링 기준값
- **메시지 키**: 사람이 읽는 문장 관리 레이어, 프레임워크별 형식 (JSON/Properties)

먼저 에러 코드 enum을 정의하고, 메시지는 별도 리소스 파일로 관리합니다:

```typescript
// 에러 코드 enum (예: ServiceErrorCode, CatalogErrorCode)
// Source of Truth: 이 enum이 기준이 됨
export enum CatalogErrorCode {
  // 도메인별 에러 (SERVICE_* prefix 권장)
  MOVIE_NOT_FOUND = "CATALOG_MOVIE_NOT_FOUND",

  // 검증 에러 (VALIDATION_* prefix)
  VALIDATION_SEARCH_QUERY_REQUIRED = "VALIDATION_SEARCH_QUERY_REQUIRED",

  // 범용 에러
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// 메시지 리소스 파일 (예: messages.ko.json)
// Catalog Service: 에러 코드와 동일한 키 사용
{
  "CATALOG_MOVIE_NOT_FOUND": "영화 정보를 찾을 수 없습니다. TMDB ID: {tmdbId}",
  "VALIDATION_SEARCH_QUERY_REQUIRED": "검색어는 필수입니다."
}
```

**Spring Boot (Kotlin) 예시:**
```kotlin
// 에러 코드 object (Source of Truth)
object ErrorCodes {
    const val REVIEW_NOT_FOUND = "REVIEW_NOT_FOUND"
    const val VALIDATION_ERROR = "VALIDATION_ERROR"
}

// 메시지 리소스 파일 (messages.properties)
// Review Service: 계층적 키 사용 (프레임워크 최적화)
error.review.not.found=리뷰를 찾을 수 없습니다. ID: {0}
error.validation.failed=입력 데이터 검증에 실패했습니다
validation.search.keyword.required=검색어는 필수입니다
```

**2. 메시지 조회 서비스**

에러 코드를 메시지로 변환하는 서비스를 구현합니다 (향후 다국어 지원 확장 가능):

```typescript
// MessageService - 에러 코드 → 메시지 변환
@Injectable()
export class MessageService {
  get(code: CatalogErrorCode | string, params?: MessageParams): string {
    // 메시지 리소스에서 조회 및 파라미터 치환
    // Catalog: 명명된 파라미터 {tmdbId}
  }
}
```

**Spring Boot (Kotlin) 예시:**
```kotlin
// MessageSource 사용 (Spring 기본 제공)
// Review: 위치 기반 파라미터 {0}, {1}
messageSource.getMessage("error.review.not.found", arrayOf(reviewId), Locale.getDefault())
```

**3. BaseAppException 기반 예외 클래스**

프레임워크 독립성을 위해 `BaseAppException`을 상속합니다:

```typescript
// BaseAppException 상속 (HttpException 대신)
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

**4. 예외 생성 팩토리 패턴**

하드코딩된 문자열을 제거하고, 예외 생성 로직을 중앙에서 관리합니다:

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
      { tmdbId }, // details에 컨텍스트 정보 포함
    );
  }
}

// 사용: throw this.exceptionFactory.movieNotFound(tmdbId);
```

**Spring Boot (Kotlin) 예시:**
```kotlin
// Companion object에 팩토리 메서드 추가 (권장)
sealed class ServiceException(...) : BaseAppException(...) {
    companion object {
        fun notFound(id: Long): ServiceNotFoundException =
            ServiceNotFoundException(id)
    }
}
```

**이점:**
- 하드코딩 제거: 에러 메시지가 코드와 분리되어 관리 용이
- 일관성 보장: 모든 예외가 동일한 구조로 생성됨
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
  - [ ] 네이밍 규칙 준수 (`ERROR_HANDLING_GUIDE.md` 참조)
    - 공통: `VALIDATION_ERROR`, `NOT_FOUND` 등 (prefix 없음)
    - 도메인: `{SERVICE}_{ENTITY}_{ACTION}_{RESULT}` (예: `CATALOG_MOVIE_NOT_FOUND`)
    - 검증: `VALIDATION_{FIELD}_{RULE}` (예: `VALIDATION_SEARCH_QUERY_REQUIRED`)
- [ ] **메시지 관리** (`ERROR_SPECIFICATION.md` 섹션 2 참조)
  - [ ] 메시지 리소스 파일 생성 (`messages.ko.json`, `messages.properties` 등)
  - [ ] MessageService 구현 (에러 코드 → 메시지 변환, 파라미터 치환)
  - [ ] **에러 코드 ↔ 메시지 키 매핑 검증 테스트 작성** (드리프트 방지)
    - 모든 에러 코드가 메시지 리소스에 존재하는지 검증
    - 예: `message.service.spec.ts`, `MessageResourceValidationTest.kt`
  - [ ] **메시지 문구 통일**: 동일한 의미의 메시지는 사용자 기준으로 통일
  - [ ] **파라미터 스타일**: 서비스 내부 일관성 유지 (Catalog: `{fieldName}`, Review: `{0}`)
- [ ] **예외 생성 패턴**
  - [ ] ExceptionFactoryService 구현 (NestJS) 또는 Companion object 팩토리 메서드 (Spring Boot)
  - [ ] 각 예외 타입별 팩토리 메서드 제공
  - [ ] `details` 필드에 컨텍스트 정보 포함 (예: `{ tmdbId: 123 }`)
- [ ] **글로벌 예외 핸들러/필터 구현**
  - [ ] `BaseAppException` 우선 처리
  - [ ] 모든 예외를 `ErrorDetail` 형식으로 변환
  - [ ] `traceId`가 모든 에러 응답에 포함되도록 보장
  - [ ] 로그 레벨 자동 결정 (5xx: ERROR, 4xx: WARN)
  - [ ] 5xx 오류에 스택 트레이스 포함
- [ ] **TraceId 정책 준수** (`ERROR_HANDLING_GUIDE.md` 참조)
  - [ ] 요청 헤더 `X-Trace-Id` 확인 및 전파
  - [ ] 모든 로그에 `traceId` 포함 (MDC/Span 활용)
  - [ ] 서비스 간 호출 시 `X-Trace-Id` 헤더 자동 전파
- [ ] **OpenAPI/Swagger 문서화**
  - [ ] `ErrorDetail` 스키마가 API 문서에 포함되도록 설정
  - [ ] 주요 에러 응답(400, 404, 500 등)에 `ErrorDetail` 스키마 명시

## 9. 보안 및 시크릿

- [ ] 의존성 취약점 스캔 도구 설정 (Dependabot, Renovate 등)
- [ ] 환경 변수 검증 스키마 정의
- [ ] 인증/인가, CORS 등 보안 설정 검토

## 10. 운영 모니터링

- [ ] **헬스체크 및 경고 시스템 구성**
  - [ ] K8s liveness/readiness 프로브 설정 (`/health/live`, `/health/ready`)
  - [ ] 헬스 체크 실패 메트릭 모니터링 (`health_check_failures_total`)
  - [ ] 헬스 체크 실패 시 알림 규칙 설정
- [ ] 로그 집계/관찰 도구(Loki, ELK 등) 연동 여부 검토
- [ ] 장애 대응 및 알림 흐름 정리

---

필요시 항목을 자유롭게 확장하고, 서비스 README 또는 운영 문서와 연동해 최신 상태를 유지하세요.

