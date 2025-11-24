# 기술 개선 사항 모음

> 마이크로서비스 아키텍처 개선 및 기술 부채 해결을 위한 개선 아이디어 문서
>
> - 생성일: 2025년 1월
> - 목적: 당장 작업하지 않지만 향후 개선하면 좋을 내용들을 기록하고 우선순위화
> - 업데이트: 개선 사항이 발견되거나 우선순위가 변경되면 이 문서를 업데이트

---

## 🔴 높은 우선순위

### 1. Review Service의 CatalogClient에 Resilience 전략 부재

**현재 상태:**
- Catalog Service: TMDB 호출에 Rate Limit, Retry (exponential backoff), Circuit Breaker 적용
- Review Service: Catalog 호출에 재시도/회로차단 없음

**영향:**
- Catalog 장애 시 Review Service가 불필요하게 실패 가능
- 일시적 네트워크 오류에 취약
- Catalog Service의 Resilience Layer와 패턴 불일치

**권장 방향:**
- **방안 1 (권장): Resilience4j 사용**
  - Spring Boot 생태계 표준 라이브러리
  - WebClient와 통합 용이 (`CircuitBreakerOperator`, `RetryOperator`)
  - 선언적 설정으로 유지보수 용이
  - Actuator 메트릭과 연동 가능
  - Catalog Service의 개념과 일관성 유지 (다른 라이브러리지만 동일한 패턴)

  **구현 단계:**
  1. Phase 1: 기본 Retry
     - Resilience4j Retry를 WebClient 필터로 추가
     - 지수 백오프 (1s → 2s → 4s)
     - 재시도 대상: 네트워크 오류, 5xx, 429
  2. Phase 2: Circuit Breaker
     - Resilience4j Circuit Breaker 추가
     - 실패율 임계값: 50%
     - 최소 요청 수: 10
     - Open 상태 유지 시간: 60초
  3. Phase 3: 모니터링
     - Actuator 엔드포인트로 상태 노출
     - Circuit Breaker 상태 메트릭 수집

  **필요 의존성:**
  ```kotlin
  implementation("io.github.resilience4j:resilience4j-spring-boot3")
  implementation("io.github.resilience4j:resilience4j-reactor")
  implementation("io.github.resilience4j:resilience4j-circuitbreaker")
  implementation("io.github.resilience4j:resilience4j-retry")
  ```

  **설정 예시:**
  ```yaml
  resilience4j:
    circuitbreaker:
      instances:
        catalogService:
          failureRateThreshold: 50
          waitDurationInOpenState: 60s
          slidingWindowSize: 10
    retry:
      instances:
        catalogService:
          maxAttempts: 3
          waitDuration: 1s
          exponentialBackoffMultiplier: 2
  ```

- **방안 2: WebClient 내장 Retry + 간단한 Circuit Breaker**
  - 추가 의존성 없음
  - 구현 복잡도 낮음
  - 단점: Circuit Breaker를 직접 구현해야 하며, 모니터링 통합이 어려움

**기대 효과:**
- 일시적 네트워크 오류에 대한 자동 재시도로 가용성 향상
- Catalog 장애 시 Circuit Breaker로 연쇄 실패 방지
- Catalog Service와 유사한 Resilience 패턴 적용
- 메트릭 기반 모니터링 및 운영 개선

**참고:**
- Catalog Service의 TMDB Client 구현: `reelnote-api/catalog-service/src/tmdb/tmdb.client.ts`
- Review Service의 CatalogClient 구현: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/infrastructure/catalog/CatalogClient.kt`

---

## 🟡 중간 우선순위

### 2. Health Check 구조 확장 및 모니터링 연동

**현재 상태:**
- Phase 1, 2 완료: `/health/live`, `/health/ready` 엔드포인트 및 기본 구현 완료
- 현재 `checks`에는 `database` 체크만 구현됨
- 메트릭 구현 완료 (Micrometer Counter, HealthMetricsService)하나 Prometheus 연동 미완료

**참고:**
- Health Check 표준 스펙: [docs/specs/health-check.md](specs/health-check.md)

**영향:**
- 외부 의존성 상태 확인 부족 (캐시, 외부 API 등)
- 모니터링 대시보드 부재로 헬스 체크 상태 추적 어려움
- 게이트웨이 도입 시 통합 health 엔드포인트 필요

**권장 방향:**

#### 2-1. checks 구조 확장 (필요한 경우)

**포함 기준:**
- **포함 검토**: 서비스가 트래픽을 받을 수 있는지 판단하는 핵심 의존성
  - `cache` (Redis): 필수 캐시인 경우 포함
  - `external-api`: 실패 시 서비스 전체를 DOWN으로 볼 필요가 있는 경우만 포함
- **제외 또는 별도 처리**: 선택적 의존성
  - 외부 API는 실패해도 서비스 전체를 DOWN으로 보지 않음
  - 필요시 `checks`에 `DEGRADED` 상태로 표시하거나 별도 엔드포인트 제공

**타임아웃 및 보호:**
- 외부 연동 체크는 **짧은 타임아웃** (예: 1초 이내)
- 실패해도 전체 `status`는 `UP` 유지
- 헬스 체크가 서비스 DDOS가 되지 않도록 주의

**구현 예시:**
```yaml
# Review Service 예시
checks:
  database: UP
  cache: UP  # Redis 연결 상태

# Catalog Service 예시
checks:
  database: UP
  cache: UP  # Redis 연결 상태
  tmdb: DEGRADED  # 외부 API는 DEGRADED 상태로 표시
```

#### 2-2. 모니터링 도구 연동

**구현 내용:**
1. **Prometheus 연동**
   - Review Service: Micrometer Counter → Prometheus exporter 설정
   - Catalog Service: `HealthMetricsService` → Prometheus 메트릭 노출
   - 메트릭: `health_check_failures_total` (태그: endpoint, service, check)

2. **Grafana 대시보드 구성**
   - 헬스 체크 실패율 추이
   - 서비스별 헬스 체크 상태
   - checks별 상세 상태

**예상 효과:**
- 헬스 체크 실패를 즉시 확인 가능
- 장애 전 조기 감지
- 서비스 안정성 모니터링 강화

#### 2-3. 게이트웨이 연동 (게이트웨이 도입 시)

**구현 내용:**
- 게이트웨이 도입 시 각 서비스 `/health/**` 집계 엔드포인트 제공
- 외부 노출용 통합 health 엔드포인트 구성
- 서비스별 상태 집계 및 응답 형식 통일

**참고:**
- Health Check 표준 스펙: [docs/specs/health-check.md](specs/health-check.md)
- 게이트웨이 전략: 인프라/오케스트레이션은 서비스별 `/health/**` 직접 호출, 외부/사람은 게이트웨이 `/health/**` 사용

**기대 효과:**
- 외부 의존성 상태 확인 강화로 장애 조기 감지
- 모니터링 대시보드를 통한 헬스 체크 상태 추적
- 게이트웨이 도입 시 통합 health 엔드포인트 제공으로 운영 편의성 향상

---

### 3. OpenAPI 스키마 생성 CI 통합

**현재 상태:**
- `pnpm api-schema:generate` 명령어가 정상 동작
- Catalog Service: NestJS 스크립트 기반 생성 (DB 연결 스킵 가능)
- Review Service: SpringDoc Gradle Plugin 기반 생성 (실행 중 서버에서 추출)
- 두 서비스 모두 `packages/api-schema/generated/`에 직접 생성 (통일된 구조)
- 수동 실행으로만 스키마 생성 가능

**영향:**
- OpenAPI 스키마가 깨져도 CI에서 감지되지 않음
- Swagger 어노테이션 변경 시 스키마 생성 실패를 조기에 발견하지 못함
- API 문서 동기화 문제 조기 발견 어려움

**권장 방향:**

#### 3-1. CI Job 추가

**구현 내용:**
1. **OpenAPI 생성 전용 CI Job 추가**
   - 서버를 띄우지 않고 OpenAPI 스키마만 생성
   - `pnpm api-schema:generate` 실행
   - 생성된 `openapi.json` 파일 검증

2. **검증 단계**
   - OpenAPI 스키마 파일이 정상 생성되었는지 확인
   - JSON 파싱 검증
   - 필수 필드 존재 확인 (`openapi`, `paths`, `components` 등)

3. **실패 시 빌드 중단**
   - 스키마 생성 실패 시 CI 빌드 실패
   - PR 머지 전에 문제 발견 보장

**구현 예시 (GitHub Actions):**
```yaml
name: Validate OpenAPI Schema

on:
  pull_request:
    paths:
      - 'reelnote-api/**'
      - 'tools/scripts/generate-api-schema.mjs'

jobs:
  validate-openapi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Install dependencies
        run: pnpm install

      - name: Generate OpenAPI schemas
        run: pnpm api-schema:generate

      - name: Validate OpenAPI schemas
        run: |
          # JSON 파싱 검증
          jq empty packages/api-schema/generated/catalog-service-openapi.json
          jq empty packages/api-schema/generated/review-service-openapi.json

          # 필수 필드 확인
          jq -e '.openapi' packages/api-schema/generated/catalog-service-openapi.json
          jq -e '.paths' packages/api-schema/generated/catalog-service-openapi.json
```

**기대 효과:**
- Swagger 어노테이션 변경 시 즉시 감지
- API 문서 동기화 문제 조기 발견
- 스키마 생성 프로세스 안정성 향상
- PR 머지 전 문제 해결 보장

**참고:**
- 현재 스크립트: `tools/scripts/generate-api-schema.mjs`
- 생성 위치: `packages/api-schema/generated/` (두 서비스 모두 동일)
- Catalog Service 생성 스크립트: `reelnote-api/catalog-service/src/scripts/generate-openapi.ts`
- Review Service 설정: `reelnote-api/review-service/build.gradle.kts`의 `openApi` 블록
  - `outputDir`: `../../packages/api-schema/generated` (직접 생성)
  - Gradle 태스크: `generateOpenApiDocs`

---

### 4. 테스트 커버리지 개선 (단계적)

**현재 상태:**
- **Catalog Service**: 테스트 커버리지 약 5-10% (2개 파일만 커버)
  - 테스트 파일: `message.service.spec.ts` 1개만 존재
  - 커버리지 포함 파일: `catalog-error-code.ts`, `message.service.ts`만 포함
  - 주요 클래스 19개 중 대부분 테스트 없음
- **Review Service**: 테스트 커버리지 약 60-70%
  - 테스트 파일: 4개 (`ReviewServiceTest`, `ReviewControllerTest`, `SoftDeleteIntegrationTest`, `MessageResourceValidationTest`)
  - 핵심 서비스는 테스트됨, `ReviewQueryService` 누락

**영향:**
- 핵심 비즈니스 로직의 테스트 부재로 리팩토링 시 안전성 저하
- 버그 조기 발견 어려움
- 코드 변경 시 회귀 테스트 부족

**권장 방향:**

#### 3-1. Catalog Service 테스트 추가

**우선순위 높음:**
- `MoviesFacade` 테스트 (`movies.facade.spec.ts`)
  - 핵심 진입점이므로 모든 UseCase 호출 시나리오 검증
- `GetMovieUseCase` 테스트 (`get-movie.usecase.spec.ts`)
  - Lazy Hydration 로직 검증 (캐시 → DB → TMDB 순서)
  - 에러 처리 시나리오 검증
- `MoviesController` 테스트 (`movies.controller.spec.ts`)
  - API 엔드포인트 검증
  - 요청/응답 DTO 변환 검증

**우선순위 중간:**
- `ImportMoviesUseCase` 테스트
  - 동기/비동기 전환 로직 검증
  - 큐 임계치 처리 검증
- `SyncMovieUseCase` 테스트
  - Warm Pool 동기화 로직 검증
- `SearchController`, `SyncController` 테스트
  - API 엔드포인트 검증
- `TmdbService` 테스트
  - 외부 API 호출 모킹
  - Resilience 패턴 검증 (Retry, Circuit Breaker)
- `CacheService` 테스트
  - Redis/인메모리 폴백 로직 검증
  - 캐시 TTL 검증

**구현 예시:**
```typescript
// movies.facade.spec.ts 예시
describe('MoviesFacade', () => {
  it('should get movie with lazy hydration', async () => {
    // 캐시 → DB → TMDB 순서 검증
  });

  it('should handle import movies with queue threshold', async () => {
    // 큐 임계치 초과 시 Job 전환 검증
  });
});
```

#### 3-2. Review Service 테스트 추가

**우선순위 높음:**
- `ReviewQueryService` 테스트 (`ReviewQueryServiceTest.kt`)
  - 페이지네이션 로직 검증
  - 필터링 로직 검증 (userSeq, movieId, tag)
  - 정렬 로직 검증 (sortBy, sortDirection)

**우선순위 중간:**
- `CatalogClient` 테스트
  - 외부 API 호출 모킹
  - 에러 처리 검증
  - 타임아웃 처리 검증
- `GlobalExceptionHandler` 테스트 보완
  - 다양한 예외 시나리오 테스트
  - 예외 메시지 포맷 검증
  - HTTP 상태 코드 매핑 검증

**구현 예시:**
```kotlin
// ReviewQueryServiceTest.kt 예시
class ReviewQueryServiceTest {
  @Test
  fun `페이지네이션 검증`() {
    // page, size 파라미터 검증
  }

  @Test
  fun `필터링 검증`() {
    // userSeq, movieId, tag 필터 검증
  }
}
```

**기대 효과:**
- 핵심 비즈니스 로직의 테스트 커버리지 향상 (목표: 70-80%)
- 리팩토링 시 안전성 확보
- 버그 조기 발견 및 회귀 테스트 강화
- 코드 변경 시 자동 검증으로 품질 유지

**참고:**
- 현재 커버리지 리포트 위치:
  - Catalog Service: `reelnote-api/catalog-service/test-output/jest/coverage/`
  - Review Service: `reelnote-api/review-service/test-output/jacoco/coverage/`
- 커버리지 확인 방법:
  - Catalog Service: `nx test catalog-service` 실행 후 HTML 리포트 확인
  - Review Service: `./gradlew test` 실행 후 HTML 리포트 확인

---

## 🟢 낮은 우선순위

### 3. 로깅 집계 및 모니터링 개선 (장기)

**현재 상태:**
- 로깅 가이드 및 구조화 로깅 표준 정의 완료 (`docs/guides/logging.md`)
- 로그 레벨 매핑 (NestJS ↔ Spring) 문서화 완료
- TraceId 전파 및 구조화된 에러 로깅 구현 완료
  - Review Service: TraceIdFilter (요청 시작 시 traceId 설정) + WebClientTraceIdFilter (서비스 간 호출 시 전파) 완료
  - Catalog Service: HttpExceptionFilter에서 에러 발생 시 traceId 생성/조회 완료
  - Catalog Service: 요청 시작 시 traceId를 설정하는 Interceptor 미구현 (일반 로그에 traceId 포함 불가)
- 중앙 집계 스택 미구현 (각 서비스에서 로컬 출력만)

**영향:**
- 서비스 간 로그를 통합적으로 검색/분석 어려움
- 분산 추적 시각화 부재
- 에러 패턴 분석 및 알람 설정 어려움
- 로그 기반 모니터링 및 대시보드 부재

**권장 방향:**

#### 3-1. 중앙 집계 스택 도입

**구현 내용:**
- **옵션 1: ELK Stack (Elasticsearch, Logstash, Kibana)**
  - 각 서비스에서 JSON 로그를 Logstash로 전송
  - Elasticsearch에 인덱싱
  - Kibana에서 검색/시각화
- **옵션 2: Loki + Promtail + Grafana**
  - Promtail이 각 서비스 로그를 수집하여 Loki로 전송
  - Grafana에서 Loki 데이터 조회 및 시각화
  - Prometheus 메트릭과 함께 통합 대시보드 구성

**필수 공통 필드 (이미 정의됨):**
- `@timestamp`: ISO 8601 형식 타임스탬프
- `service`: 서비스 이름 (`catalog-service`, `review-service`)
- `level`: 로그 레벨 (ERROR, WARN, INFO, DEBUG, TRACE)
- `message`: 로그 메시지
- `traceId`: 분산 추적 ID

**선택 필드:**
- `spanId`: 스팬 ID (분산 추적 시)
- `userId` / `actor`: 사용자 식별자
- `env` / `profile`: 환경 정보

**구현 예시:**

**Loki + Promtail 설정 (각 서비스)**
```yaml
# promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: catalog-service
    static_configs:
      - targets:
          - localhost
        labels:
          job: catalog-service
          service: catalog-service
          env: ${ENV:dev}
    pipeline_stages:
      - json:
          expressions:
            timestamp: "@timestamp"
            level: level
            message: message
            traceId: traceId
            service: service
      - labels:
          level:
          service:
          traceId:
```

**Grafana 대시보드 예시:**
- 에러 로그 추이 (errorType별)
- 서비스별 로그 레벨 분포
- TraceId 기반 요청 추적
- 에러 코드별 발생 빈도

#### 3-2. 분산 추적 도구 연동

**구현 내용:**
- **옵션 1: Jaeger**
  - OpenTracing/OpenTelemetry 표준 사용
  - TraceId 기반 분산 추적 시각화
  - 서비스 간 호출 체인 시각화
- **옵션 2: Zipkin**
  - Spring Cloud Sleuth와 통합 용이
  - 간단한 분산 추적 구현

**기대 효과:**
- Gateway → Catalog Service → Review Service 전체 요청 흐름 추적
- 병목 구간 및 지연 시간 분석
- 에러 발생 지점 정확한 파악

#### 3-3. 로그 기반 알람 설정

**구현 내용:**
- 에러 로그 (ERROR 레벨) 실시간 알람
- 에러 코드별 알람 규칙 설정
  - `SYSTEM` 에러 타입 → 즉시 알람 (Slack, PagerDuty 등)
  - `BUSINESS` 에러 타입 → 주기적 리뷰
- 에러 발생 빈도 임계값 기반 알람
  - 특정 에러 코드가 시간당 N회 이상 발생 시 알람
  - 에러율 증가 추세 감지

**기대 효과:**
- 장애 조기 감지
- 에러 패턴 분석 및 예방
- 운영 효율성 향상

#### 3-4. 로그 보관 정책

**구현 내용:**
- **Hot Storage**: 최근 N일간의 로그 (자주 조회)
  - Elasticsearch/Loki에 저장
  - 빠른 검색/분석 가능
- **Cold Storage**: 오래된 로그 (아카이브)
  - S3, Glacier 등 객체 스토리지로 이동
  - 필요 시 복원 가능
- **보관 기간**: 법적/컴플라이언스 요구사항에 따라 결정

**기대 효과:**
- 장기 로그 보관 비용 절감
- 필요 시 과거 로그 조회 가능
- 규정 준수 (GDPR, 데이터 보관 정책 등)

**참고:**
- 로깅 가이드: [docs/guides/logging.md](guides/logging.md)
- 현재 로그 포맷은 이미 중앙 집계를 전제로 설계됨 (JSON 기반 공통 필드)

#### 3-5. Catalog Service TraceId Interceptor 추가 (선택)

**현재 상태:**
- Catalog Service의 `HttpExceptionFilter`에서 에러 발생 시에만 traceId 생성/조회
- 일반 로그(INFO/DEBUG)에 traceId가 포함되지 않음
- 현재 Catalog Service가 다른 서비스를 호출하지 않아 우선순위 낮음

**영향:**
- 에러 로그만 traceId 포함 가능
- 일반 로그에서 요청 추적 어려움
- 분산 추적 시나리오 제한적

**권장 방향:**
- 요청 시작 시 traceId를 설정하는 Interceptor 구현 (Review Service의 TraceIdFilter와 유사)
- 모든 로그에 traceId가 자동으로 포함되도록 개선
- **우선순위**: 다른 서비스 호출이 추가되거나 일반 로그 추적이 필요한 경우 구현

**참고:**
- Review Service 구현: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/infrastructure/config/TraceIdFilter.kt`
- 가이드 예시: [docs/guides/logging.md](guides/logging.md) 섹션 5-3

**기대 효과:**
- 서비스 간 로그 통합 검색/분석 가능
- 분산 추적 시각화로 요청 흐름 파악 용이
- 에러 패턴 분석 및 조기 감지
- 로그 기반 모니터링 및 대시보드 구성
- 운영 효율성 및 장애 대응 시간 단축

---

### 4. 테스트 커버리지 개선 (장기)

**현재 상태:**
- 단위 테스트는 일부 구현됨
- 통합 테스트는 Review Service에 `SoftDeleteIntegrationTest`만 존재
- E2E 테스트는 프로젝트에 존재하나 커버리지 측정 미적용
- 성능 테스트 부재

**영향:**
- 서비스 간 통합 동작 검증 부족
- 실제 운영 환경과 유사한 시나리오 테스트 부족
- 성능 회귀 감지 어려움

**권장 방향:**

#### 3-1. 통합 테스트 추가

**구현 내용:**
- **Catalog Service 통합 테스트**
  - Prisma + PostgreSQL 통합 테스트
  - Redis 캐시 통합 테스트
  - TMDB API 모킹 통합 테스트
- **Review Service 통합 테스트 확장**
  - Catalog Service 연동 통합 테스트
  - 데이터베이스 트랜잭션 통합 테스트
- **서비스 간 통합 테스트**
  - Review Service ↔ Catalog Service 연동 검증
  - 실제 네트워크 호출 시나리오 검증

**구현 예시:**
```typescript
// catalog-service 통합 테스트 예시
describe('Movies Integration', () => {
  it('should hydrate movie from TMDB and cache', async () => {
    // 실제 DB와 캐시를 사용한 통합 테스트
  });
});
```

#### 3-2. E2E 테스트 보완

**구현 내용:**
- E2E 테스트 커버리지 측정 도입
- 주요 사용자 시나리오 E2E 테스트 추가
  - 영화 조회 → 리뷰 작성 → 리뷰 조회 플로우
  - 검색 → 상세 조회 플로우
- E2E 테스트 자동화 및 CI/CD 통합

**기대 효과:**
- 실제 사용자 시나리오 검증
- 서비스 간 통합 동작 보장
- 배포 전 자동 검증

#### 3-3. 성능 테스트 추가

**구현 내용:**
- **부하 테스트**
  - 주요 API 엔드포인트 부하 테스트
  - 동시성 처리 검증
  - 응답 시간 목표 검증 (p95 ≤ 120ms)
- **스트레스 테스트**
  - 최대 처리량 측정
  - 리소스 한계점 파악
- **성능 회귀 테스트**
  - CI/CD 파이프라인에 성능 테스트 통합
  - 성능 저하 시 빌드 실패

**구현 예시:**
```typescript
// 성능 테스트 예시
describe('Movies API Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    // 동시 요청 처리 검증
  });

  it('should respond within 120ms (p95)', async () => {
    // 응답 시간 목표 검증
  });
});
```

**기대 효과:**
- 성능 회귀 조기 감지
- 운영 환경 성능 예측 가능
- 확장성 검증

**참고:**
- E2E 테스트 위치: `tests/e2e-*` 디렉토리
- 성능 테스트 도구: k6, Artillery, 또는 Jest 기반 성능 테스트

---

### 4. Catalog Service 마이그레이션 자동화 (CI/CD)

**현재 상태:**
- 로컬 개발 환경에서만 마이그레이션 관리
- 운영 배포 시 수동으로 `prisma migrate deploy` 실행 필요
- CI/CD 파이프라인에 마이그레이션 자동 실행 미구현
- `prisma:migrate:deploy` Nx 타겟은 이미 구현됨 (배포 파이프라인 통합 대기 중)

**영향:**
- 배포 시 마이그레이션 누락 가능성
- 배포 프로세스 일관성 부족
- 새 환경 구성 시 수동 작업 필요

**권장 방향:**
- 배포 워크플로우에 `prisma migrate deploy` 단계 추가
- 마이그레이션 실패 시 배포 중단
- **운영 환경 전용** 워크플로우 구성 (개발 DB는 로컬에서만 사용)

**구현 예시:**
```yaml
# .github/workflows/deploy-catalog.yml
jobs:
  deploy:
    steps:
      - name: Run migrations
        run: nx run catalog-service:prisma:migrate:deploy
        env:
          CATALOG_DB_URL: ${{ secrets.CATALOG_DB_URL }}

      - name: Build application
        run: nx build catalog-service

      - name: Deploy
        # ... 배포 단계 ...
```

**참고:**
- 마이그레이션 타겟: `nx run catalog-service:prisma:migrate:deploy`
- 개발 DB는 로컬에서만 사용하므로 CI에서는 운영 환경만 고려

---

### 5. Review Service 캐시 설정

**현재 상태:**
- **위치**: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/infrastructure/config/CacheConfig.kt`
- 인메모리 캐시만 사용 중 (`ConcurrentMapCacheManager`)
- `application.yml`에서 `cache.type: simple` 설정과 일치
- 프로덕션 환경에서는 Redis 등 외부 캐시로 전환 고려 필요
- 현재는 개발 환경용 설정으로 적절

**분석:**
- `ConcurrentMapCacheManager`는 단일 인스턴스 내에서만 동작
- 서버 재시작 시 캐시 데이터 손실
- 여러 인스턴스 간 캐시 공유 불가
- 개발 환경에서는 충분하나, 프로덕션 환경에서는 제한적

**영향:**
- 프로덕션 환경에서 수평 확장 시 각 인스턴스별로 캐시가 분리됨
- 캐시 무효화가 인스턴스별로 개별적으로 처리되어야 함
- 메모리 사용량이 인스턴스별로 증가

**권장 방향:**
- **현재**: 개발 환경용 설정으로 적절하므로 유지
- **향후 프로덕션 전환 시**: Redis 등 외부 캐시로 전환 고려
  - Spring Cache Abstraction을 사용 중이므로 `RedisCacheManager`로 전환 용이
  - `application.yml`에서 `cache.type: redis` 설정 변경
  - Redis 연결 설정 추가
  - Health Check에 Redis 체크 추가 (2번 항목 참고)

**구현 예시 (향후 프로덕션 전환 시):**
```yaml
# application.yml
spring:
  cache:
    type: redis
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
```

**기대 효과:**
- 프로덕션 환경에서 수평 확장 시 캐시 공유 가능
- 중앙 집중식 캐시 관리로 일관성 향상
- 캐시 무효화가 모든 인스턴스에 일괄 적용

**참고:**
- 현재 설정 파일: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/infrastructure/config/CacheConfig.kt`
- Catalog Service는 이미 Redis 캐시 사용 중 (참고 가능)

---

### 6. 내부 서비스 API 설정 구조 공통화

**현재 상태:**
- 각 서비스별로 개별 `{Service}ApiProperties` 클래스를 사용 중
- 예: `CatalogApiProperties` (Review Service에서 Catalog 호출 시)
- 설정 구조는 일관되지만 (`{service}.api.base-url`, `{service}.api.timeout`), 코드 레벨에서 공통화되지 않음
- 향후 다른 내부 서비스(추천, 분석 등) 추가 시 동일한 패턴 반복 예상

**영향:**
- 서비스가 늘어날수록 중복 코드 증가 가능성
- 공통 필드(`baseUrl`, `timeout`, `connectTimeout`)가 반복될 확률 높음
- 설정 구조는 표준화되어 있으나, 코드 레벨 공통화 부재

**권장 방향:**

#### 6-1. 공통 타입 정의 (선택사항)

**구현 내용:**
- 공통 `ServiceApiProperties` data class 정의
- 각 서비스별 Properties는 공통 타입을 확장하거나 동일한 구조 유지
- 실제 필요 시점에 도입 (서비스가 2~3개 이상일 때)

**구현 예시:**
```kotlin
// 공통 타입 (선택사항)
data class ServiceApiProperties(
    val baseUrl: String,
    val timeout: Duration = Duration.ofSeconds(5),
    val connectTimeout: Duration = Duration.ofSeconds(5),
)

// 각 서비스별 Properties는 그대로 유지
@ConfigurationProperties("catalog.api")
data class CatalogApiProperties(
    val baseUrl: String,
    val timeout: Duration = Duration.ofSeconds(5),
    val connectTimeout: Duration = Duration.ofSeconds(5),
)
```

#### 6-2. 공통 인터페이스/추상 클래스 도입 (장기)

**시점:**
- 서비스가 2~3개 이상 추가되고, 공통 팩토리 패턴이 필요할 때
- 여러 서비스 클라이언트를 하나의 공통 팩토리에서 생성하는 경우

**구현 내용:**
- 공통 인터페이스 또는 추상 클래스 정의
- 서비스별 클라이언트 팩토리에서 공통 구조 활용
- 설정 구조는 이미 표준화되어 있으므로, 코드 레벨 공통화에 집중

**기대 효과:**
- 서비스 추가 시 설정 구조 일관성 유지
- 중복 코드 감소
- 유지보수성 향상

**참고:**
- 현재 설정 구조 표준: `docs/guides/new-service.md`의 "외부 API 클라이언트" 섹션
- 현재 구현: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/infrastructure/catalog/CatalogApiProperties.kt`

---

### 7. 서비스 간 통신 스펙 검증 개선 (장기)

**현재 상태:**
- **프론트엔드**: MSW로 `/api/v1/search`(카탈로그), `/api/v1/reviews/*`(리뷰) 모킹
  - 핸들러는 프론트엔드 내부에만 존재 (`reelnote-frontend/src/lib/msw/handlers.ts`)
- **리뷰 서비스**: MockK로 서비스 레이어 모킹
  - `ReviewControllerTest`에서 `ReviewQueryService`를 `@MockkBean(relaxed = true)`로 모킹
  - `ReviewQueryService`는 `CatalogClient`를 사용하지만, `CatalogClient`를 직접 모킹하는 테스트 없음
- **계약 테스트**: 없음 (Pact 등 관련 파일 없음)
- **MSW 핸들러 공유**: 없음 (프론트엔드 전용)

**문제 인식:**
- **핵심 문제**: "중복 모킹"이 아니라 **"공유 기준(소스 오브 트루스) 부재"**
- 프론트 MSW와 백엔드 MockK는 테스트 레벨/책임이 다름
  - 프론트 MSW: 사용자 관점에서 프론트-백엔드 통신 검증
  - 백엔드 MockK: 리뷰 서비스 내부 레이어 간 협력 검증
- 문제는 "각자 제멋대로 모킹"이며, **카탈로그 스펙을 기준으로 검증하는 테스트가 없음**
- 카탈로그 API 변경 시 프론트엔드 MSW 핸들러와 리뷰 서비스 테스트를 수동으로 업데이트해야 함
- 서비스 간 통신 스펙의 일관성 보장 메커니즘 부재

**영향:**
- 서비스 간 통신 스펙 불일치 가능성
- API 변경 시 수동 동기화 부담
- 개발 효율 저하 (서비스 교체 시 각 레이어에서 모킹 재구성 필요)
- 통합 테스트에서 실제 HTTP 호출 검증 부재

**권장 방향:**

#### 7-1. 단기: CatalogClient HTTP 기준 통합 테스트 추가

**구현 내용:**
1. **CatalogClient 전용 테스트 추가**
   - WebClient가 가리키는 URL을 MockWebServer 또는 WireMock으로 지정
   - 정상 응답 / 오류 응답 / 타임아웃 / 4xx/5xx 매핑 등 검증
   - 에러 처리 및 예외 변환 검증

2. **ReviewQueryService + CatalogClient 통합 테스트**
   - CatalogClient는 실제 HTTP 클라이언트로 두고
   - 외부 카탈로그는 MockWebServer/WireMock으로 응답
   - "리뷰 서비스가 카탈로그를 어떤 식으로 사용하고, 에러를 어떻게 번역하는지"를 실제 HTTP 기준으로 검증

**구현 예시:**
```kotlin
// CatalogClientTest.kt 예시
@SpringBootTest
class CatalogClientTest {
    @Test
    fun `카탈로그 검색 성공 시 응답 변환 검증`() {
        // MockWebServer로 카탈로그 응답 모킹
        // CatalogClient가 실제 HTTP 호출하여 응답 처리 검증
    }

    @Test
    fun `카탈로그 404 응답 시 예외 변환 검증`() {
        // MockWebServer로 404 응답 모킹
        // ExternalApiException으로 변환되는지 검증
    }
}
```

**필요 의존성:**
```kotlin
testImplementation("com.squareup.okhttp3:mockwebserver")
// 또는
testImplementation("org.wiremock:wiremock")
```

**기대 효과:**
- 리뷰 서비스가 카탈로그와 실제로 통신하는지 검증
- HTTP 레벨에서의 에러 처리 및 예외 변환 검증
- 현재 구조에서 가장 큰 구멍 하나 메꿔짐

#### 7-2. 단기~중기: 카탈로그 API 계약/예제 페이로드 패키지 분리

**구현 내용:**
1. **공유 패키지 생성**
   - `@reelnote/catalog-contracts` 또는 `packages/catalog-contracts` 같은 공유 패키지
   - 포함 내용:
     - OpenAPI 스키마 (카탈로그 서비스에서 생성)
     - 타입 정의 (TypeScript)
     - 예제 JSON 페이로드

2. **프론트엔드 MSW 핸들러 개선**
   - MSW 핸들러는 공유 패키지의 예제 JSON을 참조하여 응답 구성
   - 스키마 변경 시 타입 에러로 조기 감지

3. **리뷰 서비스 통합 테스트 개선**
   - MockWebServer/WireMock 응답을 공유 패키지의 예제 JSON으로 구성
   - 스키마 변경 시 테스트 실패로 조기 감지

**핵심 원칙:**
- **공유 단위는 프레임워크(MSW)가 아니라 도메인 계약/데이터**
- JVM 테스트는 MockWebServer/WireMock 사용 (MSW 아님)
- 프론트엔드는 MSW, 백엔드는 Mock 서버를 사용하되, **같은 예제 데이터를 참조**

**구현 예시:**
```
packages/catalog-contracts/
├── openapi.json              # 카탈로그 서비스에서 생성
├── examples/
│   ├── search-response.json  # 예제 JSON 페이로드
│   └── movie-response.json
├── types/
│   └── catalog-api.ts       # TypeScript 타입 정의
└── README.md
```

**기대 효과:**
- 카탈로그 API 스펙 변경 시 프론트엔드와 백엔드 모두 자동으로 영향 받음
- 예제 데이터 기반으로 일관된 모킹 응답 보장
- 스키마 변경 시 타입/테스트 실패로 조기 감지

#### 7-3. 중기: OpenAPI 기반 계약 검증

**구현 내용:**
1. **OpenAPI 스키마를 소스 오브 트루스로 확립**
   - 카탈로그 서비스에서 OpenAPI 스키마 생성
   - 리뷰 서비스, 프론트엔드가 스키마를 가져다가 클라이언트/타입 생성

2. **CI에서 계약 깨짐 감지**
   - 스키마 변경 시 소비자 쪽 타입/클라이언트 코드 빌드가 깨지도록 구성
   - OpenAPI 스키마 생성 CI 통합 (이미 `improvements.md` 3번 항목에 계획됨)
   - 스키마 변경 시 소비자 빌드 실패로 조기 감지

**구현 예시:**
```yaml
# CI 워크플로우 예시
jobs:
  validate-contracts:
    steps:
      - name: Generate OpenAPI schemas
        run: pnpm api-schema:generate

      - name: Generate TypeScript types
        run: |
          # OpenAPI 스키마에서 TypeScript 타입 생성
          openapi-typescript packages/api-schema/generated/catalog-service-openapi.json

      - name: Build consumers
        run: |
          # 프론트엔드, 리뷰 서비스 빌드
          # 타입 불일치 시 빌드 실패
```

**기대 효과:**
- API 스펙 변경 시 자동으로 소비자 코드 빌드 실패
- 계약 불일치 조기 감지
- 수동 동기화 부담 감소

#### 7-4. 장기: Consumer-driven Contract Test 도입 검토

**구현 내용:**
- 서비스가 더 늘어나고 여유가 생기면 Pact 등 Consumer-driven Contract Test 도입 검토
- OpenAPI 기반 검증만으로도 충분한 효과가 있으므로, 필요 시점에 도입

**기대 효과:**
- 소비자 관점에서 계약 정의 및 검증
- 프로바이더와 소비자 간 계약 불일치 방지

**참고:**
- 프론트엔드 MSW 핸들러: `reelnote-frontend/src/lib/msw/handlers.ts`
- 리뷰 서비스 CatalogClient: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/infrastructure/catalog/CatalogClient.kt`
- ReviewQueryService: `reelnote-api/review-service/src/main/kotlin/app/reelnote/review/application/ReviewQueryService.kt`

**기대 효과:**
- 서비스 간 통신 스펙의 일관성 보장
- API 변경 시 자동 감지 및 동기화
- 개발 효율 향상 (서비스 교체 시 모킹 재구성 부담 감소)
- 통합 테스트에서 실제 HTTP 호출 검증으로 신뢰성 향상

---

## 📝 참고 사항

- 각 개선 사항은 구현 전에 별도의 이슈/태스크로 분리하여 작업 계획을 수립하는 것을 권장합니다
- 우선순위는 프로젝트 상황에 따라 변경될 수 있습니다
- 개선 사항 구현 시 이 문서의 해당 항목을 roadmap.md의 완료 항목으로 이동하는 것을 고려하세요

