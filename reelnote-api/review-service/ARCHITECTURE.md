# Review Service 아키텍처

> Catalog Service와 동일한 다층 Port/Adapter 언어로 정리된 Review Service 아키텍처 가이드

## 1. 개요

- **목적**: 사용자별 영화 리뷰를 관리하고, Catalog Service와 연동하여 영화 메타데이터를 활용하는 마이크로서비스
- **패턴**: Hexagonal Architecture (Port/Adapter) + DDD + CQRS
- **핵심 기능**: 멀티테넌시 지원, 소프트 삭제, 이벤트 발행 추적, Catalog Service 연동

## 2. 레이어 & 포트/어댑터

| 계층               | 폴더                                                  | 책임                 | 예시 포트/어댑터                              |
|------------------|-----------------------------------------------------|--------------------|----------------------------------------|
| Domain           | `domain/`                                           | 엔티티, 값 객체, 도메인 서비스 | `Review`, `Rating`, `ReviewRepository` |
| Application      | `application/`                                      | UseCase, Port 정의   | `ReviewService`, `ReviewQueryService`  |
| Inbound Adapter  | `interfaces/rest/`                                  | HTTP 진입점           | `ReviewController`                     |
| Outbound Adapter | `infrastructure/catalog/`, `infrastructure/config/` | 외부 시스템 연결          | `CatalogClient`, `CatalogClientConfig` |

- **Port 계약**은 애플리케이션 계층에 위치하고, Adapter는 해당 계약을 구현합니다.
- Catalog Service의 `domain/application/infrastructure/interfaces` 구조와 1:1로 매칭됩니다.
- CQRS 패턴: `ReviewService`(명령), `ReviewQueryService`(조회)

## 3. 도메인 모델

### 3.1 엔티티

**Review**
- 사용자별 영화 리뷰를 표현하는 애그리게이트 루트
- `BaseEntity`를 상속받아 공통 메타데이터(생성일시, 수정일시, 버전, 감사 정보, 소프트 삭제, 이벤트 발행 추적)를 자동 관리
- 팩토리 메서드 `Review.create()`를 통해 비즈니스 규칙 검증 후 생성
- `updateContent()` 메서드로 더티 체킹 기반 수정

**Rating (값 객체)**
- 평점을 표현하는 불변 값 객체
- 1-5 범위 검증을 생성자에서 수행
- `@Embeddable`로 Review 엔티티에 임베딩

### 3.2 리포지토리

**ReviewRepository**
- JPA 기반 리포지토리 인터페이스
- 복잡한 쿼리는 `@Query`로 JPQL 작성
- `@SQLRestriction("deleted = false")`로 소프트 삭제된 레코드 자동 제외
- 필터링을 위한 커스텀 쿼리 메서드 제공 (`findMyReviewsWithFilters`, `findMovieReviewsWithFilters`)

## 4. CQRS 패턴

### 4.1 명령 측 (ReviewService)

- **책임**: 리뷰 생성, 수정, 삭제
- **트랜잭션**: `@Transactional`로 데이터 일관성 보장
- **캐시 무효화**: `@CacheEvict`로 변경 시 관련 캐시 자동 제거
- **권한 검증**: 사용자별 데이터 격리 (멀티테넌시)

### 4.2 조회 측 (ReviewQueryService)

- **책임**: 리뷰 조회, 검색, 통계
- **읽기 전용**: `@Transactional(readOnly = true)`로 성능 최적화
- **캐싱**: `@Cacheable`로 자주 조회되는 데이터 캐싱
- **Catalog 연동**: 영화 제목 검색 시 Catalog Service 호출하여 movieId 변환

## 5. Catalog Service 연동

### 5.1 현재 구현

- **WebClient**: Spring WebFlux 기반 비동기 HTTP 클라이언트
- **타임아웃 설정**: Connect/Read/Write 타임아웃 구성 (`CatalogClientConfig`)
- **에러 처리**: `ExternalApiException`으로 래핑하여 일관된 예외 처리
- **사용 사례**: `ReviewQueryService.searchMyReviews()`에서 영화 제목으로 movieId 검색

### 5.2 향후 개선 계획 (Resilience Layer)

Catalog Service의 Resilience Layer를 참고하여 다음 기능 추가 예정:

- **Retry 전략**: 지수 백오프 + 지터로 일시적 오류 복구
- **Circuit Breaker**: Catalog Service 장애 시 빠른 실패로 리소스 보호
- **Rate Limiting**: Catalog Service 호출 빈도 제한
- **Fallback**: Catalog Service 실패 시 기본값 반환 또는 부분 기능 제공

현재는 타임아웃만 설정되어 있으며, Catalog Service 장애 시 전체 요청이 실패할 수 있습니다.

## 6. 데이터 전략

### 6.1 소프트 삭제

- **@SQLDelete**: 실제 DELETE 대신 `deleted = true`, `deleted_at = NOW()` 업데이트
- **@SQLRestriction**: JPQL 쿼리에서 `deleted = false` 조건 자동 추가
- **장점**: 데이터 복구 가능, 감사 추적, 이벤트 발행 이력 유지

### 6.2 캐싱 전략

- **Spring Cache**: `@Cacheable`, `@CacheEvict` 어노테이션 기반
- **캐시 키**: `reviews`, `popularTags`, `ratingStats`, `recentReviews`
- **캐시 무효화**: 리뷰 생성/수정/삭제 시 관련 캐시 자동 제거
- **현재 구현**: Simple Cache (인메모리), 향후 Redis 연동 예정

### 6.3 Optimistic Locking

- **@Version**: `BaseEntity.version` 필드로 동시성 제어
- **동작**: 수정 시 버전 체크, 충돌 시 `OptimisticLockingFailureException` 발생
- **장점**: 비관적 락보다 성능 우수, 읽기 성능 저하 없음

## 7. 데이터베이스 스키마

```
reviews (app.reviews)
├── 기본 정보: id, user_seq, movie_id, rating_value, reason, watched_at
├── 공통 메타데이터: created_at, updated_at, version
├── 감사 메타데이터: created_by, updated_by, deleted, deleted_at
└── 이벤트 추적: event_published, event_published_at

review_tags (app.review_tags)
├── review_id (FK → reviews.id)
└── tag (VARCHAR(50))

인덱스:
- idx_reviews_user_seq: 사용자별 조회 최적화
- idx_reviews_movie_id: 영화별 조회 최적화
- idx_reviews_rating: 평점 필터링 최적화
- idx_reviews_watched_at: 시청일 필터링 최적화
- idx_reviews_deleted: 소프트 삭제 필터링 최적화
- idx_reviews_event_published: 이벤트 발행 추적 최적화
- idx_reviews_movie_rating: 영화+평점 복합 조회 최적화
- idx_reviews_user_deleted: 사용자+삭제 상태 복합 조회 최적화
- idx_reviews_movie_deleted: 영화+삭제 상태 복합 조회 최적화
- idx_reviews_tag: 태그 검색 최적화
```

## 8. 모듈 상호작용

- **Review 모듈**: HTTP 진입점이자 도메인 UseCase 실행 위치
- **Catalog Client**: ReviewQueryService에서 영화 제목 검색 시 Catalog Service 호출
- **Database 모듈**: JPA + Flyway로 스키마 관리 및 데이터 접근
- **Cache 모듈**: Spring Cache로 조회 성능 최적화
- **Exception 모듈**: `GlobalExceptionHandler`로 일관된 에러 응답 제공

## 9. 예외 처리

### 9.1 예외 계층

- **ReviewException**: 비즈니스 예외 베이스 클래스
- **ReviewNotFoundException**: 리뷰 미존재 예외
- **ExternalApiException**: 외부 API 호출 실패 예외

### 9.2 글로벌 예외 처리

- **@RestControllerAdvice**: 모든 컨트롤러 예외를 일관된 형식으로 변환
- **ErrorDetail**: 표준 에러 스키마 (code, message, details, traceId)
- **TraceId**: 요청 추적을 위한 고유 식별자 (X-Trace-Id 헤더 또는 자동 생성)

### 9.3 예외 매핑

| 예외 타입                           | HTTP 상태 코드 | Error Code         |
|---------------------------------|------------|--------------------|
| ReviewNotFoundException         | 404        | NOT_FOUND          |
| MethodArgumentNotValidException | 400        | VALIDATION_ERROR   |
| IllegalArgumentException        | 422        | VALIDATION_ERROR   |
| ExternalApiException            | 502        | EXTERNAL_API_ERROR |
| Exception (기타)                  | 500        | INTERNAL_ERROR     |

## 10. 확장 로드맵

- **Resilience Layer**: Catalog Service 호출 안정화 (Retry, Circuit Breaker, Rate Limiting)
- **이벤트 발행**: `eventPublished` 플래그 기반 도메인 이벤트 발행 (Analysis Service 연동)
- **Redis 캐싱**: 현재 Simple Cache를 Redis로 전환하여 분산 캐싱 지원
- **X-Trace-Id 전파**: 서비스 간 호출 시 TraceId 자동 전파
- **관측성 강화**: OpenTelemetry 연동, 구조화된 로깅, 메트릭 수집

## 11. 모니터링 & 운영

- **헬스체크**: `/health/live`, `/health/ready`
- **Actuator**: `/actuator/health`, `/actuator/prometheus`, `/actuator/metrics` (인증 필요)
- **메트릭**: 헬스 체크 실패 카운터 (`health_check_failures_total`)
- **로깅**: 구조화된 로깅 (SLF4J + Logback), 헬스 체크 실패 시에만 로그 기록
- **TraceId**: 모든 로그에 traceId 포함 (MDC 활용)
- **배포 고려사항**: Flyway 마이그레이션, PostgreSQL 연결 풀 설정, 환경별 프로파일

### 11.0 API 경로 Prefix 규칙

`WebMvcConfig`의 `addPathPrefix("/api")`는 `@RestController` 컨트롤러와 Springdoc `api-docs`에만 적용됩니다.

#### 경로 매핑 요약

| 항목 | 설정 파일 경로 | 실제 접근 경로 |
|------|--------------|--------------|
| `@RestController` 컨트롤러 | `/v1/reviews` | `/api/v1/reviews` |
| Health Check | `/health/ready` | `/health/ready` |
| Springdoc api-docs | `/docs-json` | `/api/docs-json` |
| Actuator | 생략 (기본값 `/actuator`) | `/actuator/**` |
| Springdoc swagger-ui | `/api/docs` | `/api/docs` |

#### 설정 파일 작성 규칙

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus

springdoc:
  api-docs:
    path: /docs-json  # → /api/docs-json
  swagger-ui:
    path: /api/docs   # → /api/docs
```

**주의**: `api-docs`에 `/api`를 포함하면 `/api/api/docs-json`이 됩니다.

### 11.1 메트릭 컨벤션

메트릭 컨벤션은 [Health Check 표준 스펙](../../docs/specs/health-check.md#4-5-로깅-및-메트릭)을 참고하세요.

## 12. 공용 용어 (Review ↔ Catalog)

| 용어                     | 정의                                                | 비고                                            |
|------------------------|---------------------------------------------------|-----------------------------------------------|
| **Port**               | 애플리케이션 계층에서 정의한 외부 의존성 계약                         | 인터페이스, 추상클래스 포함                               |
| **Adapter**            | Port를 구현해 실제 시스템과 연결하는 계층                         | CatalogClient, JPA Repository 등               |
| **Resilience Layer**   | Retry, Circuit Breaker, Rate Limiter 등 보호 메커니즘 묶음 | Review Service는 향후 Catalog Service 참고하여 구현 예정 |
| **CQRS**               | 명령과 조회를 분리하는 패턴                                   | ReviewService(명령) vs ReviewQueryService(조회)   |
| **소프트 삭제**             | 실제 삭제 대신 플래그로 삭제 상태를 관리하는 전략                      | `@SQLDelete` + `@SQLRestriction` 활용           |
| **Optimistic Locking** | 버전 필드로 동시성 제어하는 전략                                | `@Version` 어노테이션 활용                           |

이 가이드는 Catalog Service와 동일한 문체로 작성되어 있으므로, 두 문서를 교차 검토하며 헥사고날 아키텍처와 Resilience 패턴을 학습할 수 있습니다.

