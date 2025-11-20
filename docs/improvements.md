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

### 3. 테스트 커버리지 개선 (단계적)

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

### 3. 테스트 커버리지 개선 (장기)

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

## 📝 참고 사항

- 각 개선 사항은 구현 전에 별도의 이슈/태스크로 분리하여 작업 계획을 수립하는 것을 권장합니다
- 우선순위는 프로젝트 상황에 따라 변경될 수 있습니다
- 개선 사항 구현 시 이 문서의 해당 항목을 roadmap.md의 완료 항목으로 이동하는 것을 고려하세요

