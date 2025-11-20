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

## 🟢 낮은 우선순위

### (향후 추가 예정)

---

## 📝 참고 사항

- 각 개선 사항은 구현 전에 별도의 이슈/태스크로 분리하여 작업 계획을 수립하는 것을 권장합니다
- 우선순위는 프로젝트 상황에 따라 변경될 수 있습니다
- 개선 사항 구현 시 이 문서의 해당 항목을 roadmap.md의 완료 항목으로 이동하는 것을 고려하세요

