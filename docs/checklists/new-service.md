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
- [ ] `X-Trace-Id` 헤더 처리 구현
  - 요청에 헤더가 있으면 사용, 없으면 새로 생성
  - 서비스 간 호출 시 `X-Trace-Id` 헤더 자동 전파
  - 모든 로그에 `traceId` 포함 (MDC/Span 등 활용)
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

#### 에러 처리 패턴 (Catalog Service 참고)

에러 메시지를 하드코딩하지 말고, **에러 코드 중심으로 설계**하는 것이 유지보수성과 일관성을 보장합니다. Catalog Service에서는 다음과 같은 패턴을 사용합니다:

**1. 에러 코드 정의 및 메시지 분리**

먼저 에러 코드 enum을 정의하고, 메시지는 별도 리소스 파일로 관리합니다:

```typescript
// 에러 코드 enum (예: ServiceErrorCode, CatalogErrorCode)
export enum CatalogErrorCode {
  // 도메인별 에러 (SERVICE_* prefix 권장)
  MOVIE_NOT_FOUND = "CATALOG_MOVIE_NOT_FOUND",

  // 검증 에러 (VALIDATION_* prefix)
  VALIDATION_SEARCH_QUERY_REQUIRED = "VALIDATION_SEARCH_QUERY_REQUIRED",

  // 범용 에러
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// 메시지 리소스 파일 (예: messages.ko.json)
{
  "CATALOG_MOVIE_NOT_FOUND": "영화 정보를 찾을 수 없습니다. TMDB ID: {tmdbId}",
  "VALIDATION_SEARCH_QUERY_REQUIRED": "검색어(q)는 필수입니다."
}
```

**2. 메시지 조회 서비스**

에러 코드를 메시지로 변환하는 서비스를 구현합니다 (향후 다국어 지원 확장 가능):

```typescript
// MessageService - 에러 코드 → 메시지 변환
@Injectable()
export class MessageService {
  get(code: CatalogErrorCode | string, params?: MessageParams): string {
    // 메시지 리소스에서 조회 및 파라미터 치환
  }
}
```

**3. 예외 생성 팩토리 패턴**

하드코딩된 문자열을 제거하고, 예외 생성 로직을 중앙에서 관리합니다:

```typescript
// 표준 예외 클래스
export class CatalogException extends HttpException {
  constructor(
    public readonly code: CatalogErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }
}

// ExceptionFactoryService - 예외 생성 중앙 관리
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

// 사용: throw this.exceptionFactory.movieNotFound(tmdbId);
```

**이점:**
- 하드코딩 제거: 에러 메시지가 코드와 분리되어 관리 용이
- 일관성 보장: 모든 예외가 동일한 구조로 생성됨
- 확장성: 다국어 지원, 로깅/메트릭 추가 시 팩토리만 수정
- 테스트 용이: 에러 코드로 예외 타입 식별 가능

**체크리스트:**
- [ ] 에러 코드 enum 정의 (도메인별, 검증별, 범용 분류)
- [ ] 메시지 리소스 파일 생성 (`messages.ko.json` 등)
- [ ] MessageService 구현 (에러 코드 → 메시지 변환, 파라미터 치환)
- [ ] 표준 예외 클래스 정의 (`ServiceException extends HttpException`)
- [ ] ExceptionFactoryService 구현 (각 예외 타입별 팩토리 메서드)
- [ ] 글로벌 예외 핸들러/필터 구현
  - 모든 예외를 `ErrorDetail` 형식으로 변환
  - `traceId`가 모든 에러 응답에 포함되도록 보장
  - MessageService를 통한 표준 메시지 조회
- [ ] OpenAPI/Swagger 문서화
  - `ErrorDetail` 스키마가 API 문서에 포함되도록 설정
  - 주요 에러 응답(400, 404, 500 등)에 `ErrorDetail` 스키마 명시

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

