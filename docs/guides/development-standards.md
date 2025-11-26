# 개발 표준 가이드

> **지속적 개발 시 실시간 참조 가이드** - 이미 개발된 서비스에서 기능 추가/개선 시 항상 고려해야 하는 필수 요소
>
> - **목적**: 새로운 기능 추가, 엔드포인트 추가, 서비스 간 통신 구현 시 빠른 참조
> - **대상**: 모든 마이크로서비스 (새 서비스 및 기존 서비스)
> - **사용 시점**: 일상적인 개발 작업 중 지속적으로 참조
>
> ⚠️ **새 서비스를 처음부터 만들 때는** [신규 서비스 체크리스트](new-service.md)를 먼저 참고하세요.

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

**체크리스트:**
- [ ] 모든 WebClient Bean에 `WebClientTraceIdFilter` 적용됨 (Spring Boot)
- [ ] HttpService Interceptor에 TraceId 전파 로직 포함 (NestJS)
- [ ] 수동으로 `X-Trace-Id` 헤더 추가하는 코드 없음
- [ ] 테스트에서 TraceId 전파 확인됨

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 3
**초기 구현 가이드:** [신규 서비스 체크리스트 - TraceId 전파](new-service.md#71-traceid-전파-필수)

---

### 1-2. Resilience 패턴

**외부 서비스 호출 시 필수 고려:**

✅ **해야 할 것:**
- 타임아웃 설정: 연결/읽기/쓰기 타임아웃 명시 (기본: 5s/10s)
- Retry 전략: 일시적 네트워크 오류/타임아웃에 대한 재시도
  - 지수 백오프 (1s → 2s → 4s)
  - 재시도 대상: 네트워크 오류, 타임아웃, 5xx, 429
  - 최대 재시도: 3회
- Circuit Breaker: 연속 실패 시 일시적 차단
  - 임계값: 실패율 50% 이상, 최소 요청 수 충족 시 OPEN
  - 상태: CLOSED → OPEN → HALF_OPEN
- 환경 변수로 재시도 횟수, 타임아웃, Circuit Breaker 임계값 관리

**체크리스트:**
- [ ] 타임아웃 설정 명시
- [ ] Retry 전략 적용 (지수 백오프, 최대 3회)
- [ ] Circuit Breaker 적용 (실패율 50% 이상 시 OPEN)
- [ ] 환경 변수로 설정 관리

**초기 구현 가이드:** [신규 서비스 체크리스트 - Resilience 패턴](new-service.md#72-resilience-패턴)

---

### 1-3. 클라이언트 설정 표준화

**외부 API 클라이언트 모듈 추가/수정 시:**

✅ **해야 할 것:**
- `HttpModule.registerAsync + ConfigService` 사용 (동적 설정 주입)
- 전용 Config 클래스 분리 (`TmdbConfig` 등)
- Factory 패턴으로 의존성 주입 순서 보장
- 타임아웃 설정을 환경 변수로 관리

**체크리스트:**
- [ ] `HttpModule.registerAsync + ConfigService` 사용
- [ ] 전용 Config 클래스 분리
- [ ] Factory 패턴으로 의존성 주입 순서 보장
- [ ] 타임아웃 설정을 환경 변수로 관리

**초기 구현 가이드:** [신규 서비스 체크리스트 - 클라이언트 설정 표준화](new-service.md#73-클라이언트-설정-표준화)

---

### 1-4. 외부 서비스 호출 실패 처리

**외부 서비스 호출 실패 시:**

✅ **해야 할 것:**
- `EXTERNAL_API_ERROR` (502) 에러 코드 사용
- Circuit Breaker OPEN 상태는 `SERVICE_UNAVAILABLE` (503) 사용
- 에러 응답 `details`에 대상 서비스 정보 포함 (`apiName`, `statusCode` 등)
- 로그에 대상 서비스, 요청 경로, 응답 상태 코드 기록

**체크리스트:**
- [ ] `EXTERNAL_API_ERROR` (502) 또는 `SERVICE_UNAVAILABLE` (503) 사용
- [ ] 에러 응답 `details`에 대상 서비스 정보 포함
- [ ] 로그에 대상 서비스, 요청 경로, 응답 상태 코드 기록

---

## 2. 에러 처리 (Error Handling)

### 2-1. 예외 생성 패턴 (필수) ⚠️

**새 예외 추가 또는 예외 발생 시:**

✅ **해야 할 것:**
- `BaseAppException` 상속
- 예외 생성 팩토리 사용 (`exceptionFactory.xxx()`)
- 메시지 리소스 파일에서 메시지 관리

❌ **하지 말 것:**
- 메시지 하드코딩
- 예외 클래스 생성자에 직접 생성

**체크리스트:**
- [ ] 모든 예외가 `BaseAppException` 상속
- [ ] 모든 예외가 팩토리를 통해서만 생성
- [ ] 메시지 리소스 파일에서 메시지 관리
- [ ] 에러 코드가 먼저 정의되고, 메시지 리소스에 매핑됨

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 5, 6
**초기 구현 가이드:** [신규 서비스 체크리스트 - BaseAppException 패턴](new-service.md#10-api-응답-형식-표준화)

---

### 2-2. 에러 코드 네이밍 규칙

**새 에러 코드 추가 시:**

✅ **해야 할 것:**
- 공통 코드 우선: 가능하면 범용 코드 사용 (`NOT_FOUND`, `VALIDATION_ERROR` 등)
- 도메인 코드: 비즈니스 도메인에서 발생한 에러는 서비스 prefix 사용
  - 형식: `{SERVICE}_{ENTITY}_{ACTION}_{RESULT}`
  - 예: `CATALOG_MOVIE_NOT_FOUND`, `REVIEW_ALREADY_EXISTS`
- 검증 코드: `VALIDATION_{FIELD}_{RULE}` 형식
  - 예: `VALIDATION_SEARCH_QUERY_REQUIRED`

**판단 기준:**
> "사용자/클라이언트/운영자가 이 에러를 보고 무슨 도메인에서 터졌는지 알고 싶으면 도메인 코드, 아니면 범용 코드"

**체크리스트:**
- [ ] 공통 코드 우선 사용
- [ ] 도메인 코드는 서비스 prefix 사용
- [ ] 검증 코드는 `VALIDATION_{FIELD}_{RULE}` 형식

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 2.1, 2.2

---

### 2-3. 에러 응답 형식

**모든 에러 응답은 `ErrorDetail` 스키마 준수:**

✅ **해야 할 것:**
- `ErrorDetail` 스키마 사용 (`code`, `message`, `details`, `traceId`)
- JSON 직렬화: 선택적 필드는 `null`/`undefined`인 경우 제외
  - Kotlin: `@JsonInclude(JsonInclude.Include.NON_NULL)` 사용
  - TypeScript: `undefined` 필드는 자동 제외
- HTTP 상태 코드 매핑 준수
  - `VALIDATION_ERROR` → 400 또는 422
  - `NOT_FOUND` → 404
  - `EXTERNAL_API_ERROR` → 502
  - `SERVICE_UNAVAILABLE` → 503

**체크리스트:**
- [ ] 모든 에러 응답이 `ErrorDetail` 스키마 준수
- [ ] 선택적 필드는 `null`/`undefined`인 경우 JSON에서 제외
- [ ] HTTP 상태 코드 매핑 준수

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 1

---

### 2-4. 에러 코드 ↔ 메시지 매핑 검증

**새 에러 코드 추가 시 필수:**

✅ **해야 할 것:**
- 메시지 리소스 파일에 에러 코드 추가 (`messages.ko.json`, `messages.properties`)
- 매핑 검증 테스트 작성/업데이트

**체크리스트:**
- [ ] 메시지 리소스 파일에 에러 코드 추가
- [ ] 매핑 검증 테스트 작성/업데이트
- [ ] 에러 코드 추가 시 테스트 업데이트

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 2.4

---

## 3. TraceId 정책

### 3-1. TraceId 처리 확인

**요청 수신, 로깅, 응답 시:**

✅ **해야 할 것:**
- 요청 헤더 `X-Trace-Id` 확인 (없으면 UUID v4 생성)
- MDC/Span에 traceId 설정 (모든 로그에 자동 포함)
- 모든 에러 응답에 `traceId` 필드 포함

**체크리스트:**
- [ ] 요청 헤더 `X-Trace-Id` 확인 및 생성
- [ ] 모든 로그에 `traceId` 포함 (MDC/Span 자동 포함)
- [ ] 모든 에러 응답에 `traceId` 필드 포함

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 3

---

## 4. 로깅 정책

### 4-1. 로그 레벨 가이드라인

**로깅 시 확인:**

✅ **해야 할 것:**
- 로그 레벨 규칙 준수
  - `ERROR`: 예상치 못한 서버 오류 (5xx) - 스택 트레이스 필수
  - `WARN`: 비즈니스 예외, 검증 실패 (4xx)
  - `INFO`: 정상적인 비즈니스 로직
  - `DEBUG`: 개발/디버깅용 상세 정보
- 모든 로그에 `traceId` 포함
- 민감 정보 포함 금지 (비밀번호, 토큰, API 키, 개인정보 등)

**체크리스트:**
- [ ] 로그 레벨 적절함 (4xx: WARN, 5xx: ERROR)
- [ ] 5xx 오류에 스택 트레이스 포함
- [ ] 모든 로그에 `traceId` 포함
- [ ] 민감 정보 포함되지 않음

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 4

---

## 5. API 응답 형식

### 5-1. 성공 응답

**새 엔드포인트 추가 시:**

✅ **해야 할 것:**
- DTO 직접 반환 (래퍼 클래스 사용 금지)

❌ **하지 말 것:**
- `ApiResponse<T>` 같은 래퍼 클래스 사용
- Entity/Prisma 모델 직접 반환

**체크리스트:**
- [ ] DTO 직접 반환
- [ ] 래퍼 클래스 사용하지 않음
- [ ] Entity/Prisma 모델 직접 반환하지 않음

---

### 5-2. 에러 응답

**에러 응답 시:**

✅ **해야 할 것:**
- `ErrorDetail` 스키마 사용 (`code`, `message`, `details`, `traceId`)

**체크리스트:**
- [ ] 모든 에러 응답이 `ErrorDetail` 스키마 준수
- [ ] `traceId` 필드 포함

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 1

---

## 6. API 문서화

### 6-1. OpenAPI/Swagger 어노테이션

**새 엔드포인트 추가 시:**

✅ **해야 할 것:**
- OpenAPI 어노테이션 추가 (`@Operation`, `@ApiResponse` 등)
- DTO 스키마 문서화 (`@Schema`, `@ApiProperty`)
- 주요 에러 응답(400, 404, 500 등)에 `ErrorDetail` 스키마 명시
- 태그(Tag) 사용으로 엔드포인트 그룹화

**체크리스트:**
- [ ] OpenAPI 어노테이션 추가
- [ ] DTO 스키마 문서화
- [ ] 주요 에러 응답에 `ErrorDetail` 스키마 명시
- [ ] 태그 사용으로 엔드포인트 그룹화

**초기 설정 가이드:** [신규 서비스 체크리스트 - API 문서화](new-service.md#9-api-문서화)

---

### 6-2. Swagger/DTO 타입 안정성 규칙

**DTO 작성 시:**

✅ **해야 할 것:**
- 모든 `@ApiProperty`에 명시적 `type` 지정
- DTO 간 참조 시 `type: () => DTO` 함수 형태 사용 (순환 참조 방지)
- Entity/Prisma 모델은 Swagger에 직접 노출하지 않음

**체크리스트:**
- [ ] 모든 `@ApiProperty`에 명시적 `type` 지정
- [ ] DTO 간 참조는 `type: () => DTO` 패턴 사용
- [ ] Entity/Prisma 모델을 컨트롤러에서 직접 반환하지 않음
- [ ] 모든 응답/요청은 전용 DTO 사용

---

### 6-3. 에러 코드 문서화

**에러 코드 추가/변경 시:**

✅ **해야 할 것:**
- OpenAPI Info description에 Error Codes 섹션 추가 (Markdown 형식)
- ErrorDetail.code 필드에 enum/allowableValues 연결
- 공통 에러 코드와 도메인 에러 코드 구분하여 표시

**⚠️ 주의: 문서 드리프트 방지**

에러 코드 추가/변경 시 다음 항목도 함께 업데이트:

**체크리스트:**
- [ ] `ErrorCodes` object 또는 enum 업데이트
- [ ] OpenAPI Info.description의 Error Codes 섹션 업데이트 (Markdown)
- [ ] ErrorDetail 스키마의 enum/allowableValues 업데이트
- [ ] 메시지 리소스 파일 업데이트

**참고 문서:** [docs/specs/error-handling.md](../specs/error-handling.md) 섹션 2

---

### 6-4. API 문서 경로

**API 문서 표준 경로 확인:**

✅ **확인 사항:**
- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/docs-json`
- 운영 환경에서는 비활성화

**체크리스트:**
- [ ] 표준 경로 사용 (`/api/docs`, `/api/docs-json`)
- [ ] 운영 환경에서 비활성화 확인

---

## 7. 테스트

### 7-1. 테스트 작성 전략 (기능 구현 시)

**새 기능 구현 시 테스트 작성 (TDD 스타일 권장):**

✅ **해야 할 것:**
- 기능 구현과 함께 테스트 작성 (TDD 스타일 권장)
- 계층별 테스트 작성 (Application, Interface, Infrastructure)
- UseCase/Service 테스트 작성 (`application/{Service}Test`)
- Controller 테스트 작성 (`interfaces/rest/{Controller}Test`)
- 통합 테스트 작성 (필요 시, Testcontainers 사용)

**체크리스트:**
- [ ] Application 계층 테스트: UseCase/Service 로직 검증 (MockK/Mockito 사용)
- [ ] Interface 계층 테스트: Controller API 엔드포인트 검증 (WebMvcTest/MockMvc 사용)
- [ ] Infrastructure 계층 테스트: 실제 DB/외부 서비스 연동 검증 (Testcontainers 사용, 필요 시)
- [ ] 예외 처리 테스트: GlobalExceptionHandler/Filter가 예외를 올바르게 변환하는지
- [ ] TraceId 전파 테스트: 서비스 간 호출 시 TraceId가 전파되는지
- [ ] 에러 코드-메시지 매핑 검증: 새 에러 코드가 메시지 리소스에 존재하는지
- [ ] 에러 응답 형식 검증: `ErrorDetail` 스키마 준수 확인

**테스트 범위:**
- **Application 계층**: 비즈니스 로직, 예외 처리, 도메인 규칙 검증
- **Interface 계층**: HTTP 요청/응답 변환, DTO 검증, 상태 코드 매핑
- **Infrastructure 계층**: 실제 DB 연동, 외부 서비스 호출, 캐시 동작 (통합 테스트)

**코드 참고:**
- Review Service 예시:
  - Application: `src/test/kotlin/app/reelnote/review/application/ReviewServiceTest.kt`
  - Interface: `src/test/kotlin/app/reelnote/review/interfaces/rest/ReviewControllerTest.kt`
  - Infrastructure: `src/test/kotlin/app/reelnote/review/infrastructure/SoftDeleteIntegrationTest.kt`

**참고 문서:**
- 테스트 커버리지 개선 계획: [docs/improvements.md](../improvements.md) 섹션 5

---

### 7-2. 필수 테스트 항목

**새 기능 추가 시 반드시 포함해야 하는 테스트:**

✅ **해야 할 것:**
- 예외 처리 테스트: GlobalExceptionHandler/Filter가 예외를 올바르게 변환하는지
- TraceId 전파 테스트: 서비스 간 호출 시 TraceId가 전파되는지
- 에러 코드-메시지 매핑 검증: 새 에러 코드가 메시지 리소스에 존재하는지
- 에러 응답 형식 검증: `ErrorDetail` 스키마 준수 확인

**체크리스트:**
- [ ] 예외 처리 테스트 작성
- [ ] TraceId 전파 테스트 작성
- [ ] 에러 코드-메시지 매핑 검증 테스트 작성/업데이트
- [ ] 에러 응답 형식 검증 테스트 작성

---

## 8. 환경 변수 검증

### 8-1. 환경 변수 추가 시 확인

**새 환경 변수 추가 시:**

✅ **해야 할 것:**
- 필수 환경 변수 누락 시 서비스 시작 실패하도록 검증
- 환경 변수 타입 및 범위 검증
- Spring Boot: `@ConfigurationProperties` + `@Valid` 사용
- NestJS: `class-validator` + DTO 기반 설정 검증

**체크리스트:**
- [ ] 필수 환경 변수 누락 시 서비스 시작 실패
- [ ] 환경 변수 타입 및 범위 검증
- [ ] 프레임워크별 검증 패턴 적용

### 8-2. OpenAPI 스키마 생성 시 검증 스킵 (NestJS 전용)

**⚠️ 중요: `SKIP_ENV_VALIDATION` 플래그 역할 고정**

✅ **해야 할 것:**
- `SKIP_ENV_VALIDATION`은 OpenAPI 스키마 생성 시에만 사용
- `isSchemaGeneration()` 헬퍼 함수로 일관되게 확인

❌ **하지 말 것:**
- 테스트에서 DB 연결을 건너뛰기 위한 용도로 재사용 금지
- 로컬 개발 편의를 위한 검증 스킵 용도로 재사용 금지

**체크리스트:**
- [ ] `SKIP_ENV_VALIDATION`은 OpenAPI 스키마 생성 시에만 사용
- [ ] 테스트/로컬 편의 목적으로 재사용하지 않음
- [ ] `isSchemaGeneration()` 헬퍼 함수로 일관되게 확인

---

## 9. Health Check

**새 의존성 추가 시 Health Check 업데이트 고려:**

✅ **해야 할 것:**
- 핵심 의존성은 `checks`에 포함 검토
  - 기준: "이 의존성이 죽으면 서비스 전체가 DOWN이어야 하는가?"
- 외부 API는 `checks`에서 제외 또는 `DEGRADED` 상태로 표시
- 타임아웃: 외부 연동 체크는 1초 이내
- 실패해도 전체 `status`는 `UP` 유지 (외부 API의 경우)

**체크리스트:**
- [ ] 핵심 의존성은 `checks`에 포함 검토
- [ ] 외부 API는 제외 또는 `DEGRADED` 상태
- [ ] 타임아웃 1초 이내

**참고 문서:**
- Health Check 스펙: [docs/specs/health-check.md](../specs/health-check.md)
- 초기 구현: [신규 서비스 체크리스트 - 컨테이너 & 로컬 개발](new-service.md#6-컨테이너--로컬-개발)

---

## 📋 빠른 참조

### 새 기능 추가 시 체크

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
   - [ ] Entity/Prisma 모델 직접 반환하지 않음
   - [ ] 에러 코드 문서화 업데이트

4. **외부 API 클라이언트 추가 시:**
   - [ ] 표준 패턴 준수 (Config + Client + Factory)
   - [ ] 타임아웃 환경 변수로 관리
   - [ ] Resilience 패턴 적용

5. **로깅 시:**
   - [ ] 로그 레벨 적절함 (4xx: WARN, 5xx: ERROR)
   - [ ] `traceId` 포함됨 (MDC 자동)
   - [ ] 민감 정보 포함되지 않음

6. **테스트 (기능 구현 시):**
   - [ ] Application 계층 테스트 작성 (UseCase/Service 로직 검증)
   - [ ] Interface 계층 테스트 작성 (Controller API 엔드포인트 검증)
   - [ ] 예외 처리, TraceId 전파, 에러 코드-메시지 매핑 검증 포함

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

