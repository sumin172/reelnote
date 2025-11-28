# ReelNote Review Service

> 도메인 주도 설계와 Spring Boot 3.x를 활용한 영화 리뷰 마이크로서비스

멀티테넌시를 지원하는 영화 리뷰 관리 시스템으로, DDD 패턴과 최신 기술 스택을 적용한 마이크로서비스입니다.

## 🛠 기술 스택

- **Kotlin 2.0.21** + **Java 21** + **Spring Boot 3.5.7**
- **JPA 3.x** + **PostgreSQL 42.7.8** + **Flyway 11.17.0**
- **WebClient** + **SpringDoc OpenAPI 2.8.7**
- **JUnit 5** + **MockK 1.14.5** + **SpringMockK 4.0.2** + **Testcontainers 1.20.3**

## 📁 프로젝트 구조

```
src/main/kotlin/app/reelnote/review/
├── domain/                   # 도메인 계층
│   ├── Review.kt             # 리뷰 엔티티
│   ├── BaseEntity.kt         # 공통 메타데이터 클래스
│   └── ReviewRepository.kt   # 리포지토리 인터페이스
├── application/              # 애플리케이션 계층
│   ├── ReviewService.kt      # 리뷰 서비스 (생성/수정/삭제)
│   └── ReviewQueryService.kt # 리뷰 조회 서비스 (읽기 전용)
├── infrastructure/           # 인프라 계층
│   ├── catalog/              # Catalog 서비스 클라이언트
│   │   ├── CatalogClient.kt
│   │   ├── CatalogClientConfig.kt
│   │   └── CatalogApiProperties.kt
│   └── config/               # 설정 클래스들
│       ├── AuditingConfig.kt
│       ├── CacheConfig.kt
│       ├── SecurityConfig.kt
│       ├── SecurityAuditorAware.kt
│       ├── SoftDeleteConfig.kt
│       ├── DirectionConverter.kt
│       └── SortByConverter.kt
├── interfaces/               # 인터페이스 계층
│   ├── rest/                 # REST 컨트롤러
│   └── dto/                  # 데이터 전송 객체
└── shared/                   # 공통 모듈
    ├── exception/            # 예외 처리
    ├── message/              # 응답 메시지
    └── response/             # 공통 응답 형식
```

## 🏗️ 아키텍처 & 설계

> **📖 상세 아키텍처 문서**: [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요.
>
> Review Service는 **Hexagonal Architecture (Port/Adapter)** + **DDD** + **CQRS** 패턴을 적용했습니다. Catalog Service와 동일한 Port/Adapter 언어로 작성되어 있어 두 서비스를 비교하며 학습할 수 있습니다.

### 핵심 아키텍처 패턴

- **Hexagonal Architecture**: 도메인 중심 설계로 인프라 의존성 제거
- **Domain-Driven Design**: 도메인 모델 중심의 비즈니스 로직 캡슐화
- **CQRS**: 명령(`ReviewService`)과 조회(`ReviewQueryService`) 분리로 성능 최적화
- **멀티테넌시**: 사용자별 데이터 격리 및 독립적 배포

### 주요 특징

- 값 객체(`Rating`)를 통한 도메인 개념 명확화
- BaseEntity를 통한 공통 메타데이터 자동 관리 (소프트 삭제, Optimistic Locking, 이벤트 추적)
- Catalog Service 연동을 통한 영화 메타데이터 관리
- 캐싱 전략으로 조회 성능 최적화

## 🚀 실행 방법

### 1. 애플리케이션 실행

```bash
# 개발 환경
./gradlew bootRun --args='--spring.profiles.active=dev'

# 프로덕션 환경
./gradlew bootRun --args='--spring.profiles.active=prod'
```

### 2. API 문서 확인

- **Swagger UI**: http://localhost:5000/api/docs
- **OpenAPI JSON**: http://localhost:5000/api/docs-json

### 2-1. 모니터링 엔드포인트

- **Health Check** (인증 없음):
  - `GET /health/live` - Liveness 체크
  - `GET /health/ready` - Readiness 체크
- **Actuator** (ADMIN 권한 필요):
  - `GET /actuator/health` - 상세 Health 정보
  - `GET /actuator/prometheus` - Prometheus 메트릭
  - `GET /actuator/metrics` - 메트릭 목록
  - `GET /actuator/info` - 애플리케이션 정보

> **참고**: Actuator 엔드포인트는 Basic Authentication 필요 (username: `admin`, password: `admin123`)

### 3. 데이터베이스 연결 (개발 환경)

- **PostgreSQL**: `localhost:5433/review_db`
- **Username**: `review_app`
- **Password**: `review_1106`
- **Schema**: `app`

> **참고**: 개발 환경에서는 Docker Compose로 PostgreSQL을 실행합니다.

### 3-1. 데이터베이스 마이그레이션

Review Service는 **Flyway**를 사용하여 데이터베이스 마이그레이션을 관리합니다.

**특징:**
- 애플리케이션 시작 시 자동으로 마이그레이션 실행
- 마이그레이션 파일: `src/main/resources/db/migration/V*.sql`
- 모든 스키마 변경은 버전 관리된 마이그레이션 파일을 통해서만 수행

**마이그레이션 파일 구조:**
```
src/main/resources/db/migration/
└── V1__Create_reviews_table.sql  # 버전_설명.sql 형식
```

**새 마이그레이션 추가:**
```bash
# 마이그레이션 파일 직접 생성
# src/main/resources/db/migration/V2__Add_index_to_reviews.sql
```

> **⚠️ 중요 규칙**
>
> - JPA `ddl-auto`는 `none`으로 설정 (자동 DDL 생성 금지)
> - 모든 스키마 변경은 Flyway 마이그레이션 파일로 관리
> - 마이그레이션 파일은 버전 관리에 포함되어야 함

**환경별 동작:**
- **모든 환경**: 애플리케이션 시작 시 Flyway가 자동으로 마이그레이션 실행
- **마이그레이션 실패 시**: 애플리케이션 시작 실패 (Fail Fast)

**자세한 내용:**
- 공통 가이드: [docs/guides/new-service.md](../../docs/guides/new-service.md)

### 4. 참고사항

- **Catalog 연동**: 영화 메타데이터는 `catalog-service`에서 조회합니다.
- **사용자 인증**: 현재는 `X-User-Seq` 헤더로 사용자 식별 (추후 인증 서비스 연동 예정)

## 📚 API 사용법

### 리뷰 생성

```bash
curl -X POST http://localhost:5000/api/v1/reviews \
  -H "Content-Type: application/json" \
  -H "X-User-Seq: 1" \
  -d '{
    "movieId": 12345,
    "rating": 5,
    "reason": "정말 재미있는 영화였습니다",
    "tags": ["SF", "액션", "스릴러"],
    "watchedAt": "2024-01-15"
  }'
```

### 리뷰 목록 조회

```bash
# 전체 리뷰 조회
curl "http://localhost:5000/api/v1/reviews?page=0&size=20&sortBy=createdAt&sortDirection=desc"

# 특정 사용자의 리뷰 조회
curl "http://localhost:5000/api/v1/reviews?userSeq=1"

# 특정 영화의 리뷰 조회
curl "http://localhost:5000/api/v1/reviews?movieId=12345"

# 태그로 필터링
curl "http://localhost:5000/api/v1/reviews?tag=액션"
```

### 리뷰 수정

```bash
curl -X PUT http://localhost:5000/api/v1/reviews/1 \
  -H "Content-Type: application/json" \
  -H "X-User-Seq: 1" \
  -d '{
    "rating": 4,
    "reason": "수정된 리뷰 내용"
  }'
```

### 리뷰 삭제

```bash
curl -X DELETE http://localhost:5000/api/v1/reviews/1 \
  -H "X-User-Seq: 1"
```

## 🧪 테스트

### 테스트 전략

- **단위 테스트**: `ReviewServiceTest`, `ReviewQueryServiceTest`, `ReviewControllerTest` - MockK를 사용한 비즈니스 로직 검증
- **통합 테스트**: `SoftDeleteIntegrationTest` - Testcontainers로 실제 PostgreSQL 사용

### Testcontainers 설정

통합 테스트는 Testcontainers를 사용하여 실제 PostgreSQL 환경에서 실행됩니다:

```kotlin
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SoftDeleteIntegrationTest {
    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:16-alpine").apply {
            withReuse(true)  // 컨테이너 재사용으로 속도 향상
        }

        @DynamicPropertySource
        @JvmStatic
        fun props(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url") { postgres.jdbcUrl }
            registry.add("spring.datasource.username") { postgres.username }
            registry.add("spring.datasource.password") { postgres.password }
        }
    }
}
```

**장점:**
- 실제 PostgreSQL 방언/타입/DDL 검증
- 프로덕션 환경과 동일한 데이터베이스 동작 확인
- 컨테이너 재사용으로 테스트 속도 향상

### 테스트 실행

```bash
# 전체 테스트 실행
./gradlew test

# 특정 테스트 클래스 실행
./gradlew test --tests "ReviewServiceTest"

# 컨트롤러 테스트 실행
./gradlew test --tests "ReviewControllerTest"

# 통합 테스트 실행 (Testcontainers 사용)
./gradlew test --tests "SoftDeleteIntegrationTest"
```

### 테스트 커버리지

JaCoCo를 사용하여 테스트 커버리지를 측정합니다. 테스트 실행 후 자동으로 커버리지 리포트가 생성됩니다.

```bash
# 테스트 실행 및 커버리지 리포트 생성
./gradlew test

# 커버리지 리포트만 생성 (테스트가 이미 실행된 경우)
./gradlew jacocoTestReport
```

**커버리지 리포트 위치:**
- HTML 리포트: `test-output/jacoco/coverage/html/index.html`
- XML 리포트: `test-output/jacoco/coverage/jacocoTestReport.xml`

브라우저에서 HTML 리포트를 열어 커버리지 상세 정보를 확인할 수 있습니다.

### 테스트 DB 초기화 전략

현재는 **트랜잭션 롤백 방식**을 사용합니다.

**구조**:
- Testcontainers를 사용하여 로컬 개발 DB와 완전히 분리된 격리된 PostgreSQL 컨테이너 사용
- 스키마는 `TestcontainersConfig.init`에서 한 번만 생성 (`CREATE SCHEMA IF NOT EXISTS`)
- `ddl-auto: create` 설정으로 테이블은 자동 생성 (테스트용이므로 안전, 데이터는 트랜잭션 롤백으로 정리)
- 각 테스트는 트랜잭션 내에서 실행되고, 테스트 후 자동 롤백됨

**장점**:
- ✅ 성능: 스키마 재생성 오버헤드 없음
- ✅ 신뢰성: 각 테스트가 깨끗한 상태에서 시작 (트랜잭션 롤백)
- ✅ 격리: 로컬 개발 DB에 전혀 영향 없음
- ✅ 구조적 적합성: Testcontainers 컨테이너는 유지, 데이터만 롤백하는 자연스러운 구조

**CI/Local 분리**:
- 로컬: 컨테이너 재사용 (`withReuse(true)`) + 병렬 실행
- CI: 컨테이너 재사용 비활성화 (`withReuse(false)`) + 순차 실행 (`-Pci` 프로퍼티 사용)


## 🔧 설정

### 환경별 프로파일

- **dev**: 개발 환경 (디버그 로깅, PostgreSQL 연결, Flyway 자동 마이그레이션)
- **test**: 테스트 환경 (Testcontainers PostgreSQL, Flyway 비활성화, ddl-auto: none, 트랜잭션 롤백)
- **prod**: 프로덕션 환경 (최적화된 로깅, 보안 강화, Flyway 자동 마이그레이션)

### Flyway 설정

**기본 설정** (`application.yml`):
```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    default-schema: app
```

**중요 설정:**
- **JPA `ddl-auto: none`**: JPA 자동 DDL 생성 비활성화 (마이그레이션으로만 관리)
- **Flyway 자동 실행**: 애플리케이션 시작 시 자동으로 마이그레이션 실행
- **마이그레이션 실패 시**: 애플리케이션 시작 실패 (Fail Fast)

### 주요 설정값

```yaml
# application.yml
server:
  port: 5000

spring:
  application:
    name: review-service

catalog:
  api:
    base-url: http://localhost:4000/api
    timeout: 5s
    connect-timeout: 5s
```
