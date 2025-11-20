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

> **상세 아키텍처 문서**: [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요. Catalog Service와 동일한 Port/Adapter 언어로 작성되어 있어 두 서비스를 비교하며 학습할 수 있습니다.

### 도메인 주도 설계 구현
- **값 객체**: `Rating` 클래스로 도메인 개념 명확화
- **엔티티**: `Review`의 비즈니스 메서드 구현
- **리포지토리**: 데이터 접근 계층 추상화
- **CQRS 패턴**: `ReviewService`(명령)와 `ReviewQueryService`(조회) 분리로 성능 최적화

```kotlin
// 값 객체: 불변성과 유효성 검증
@Embeddable
data class Rating(val value: Int) {
    init {
        require(value in 1..5) { "평점은 1-5 사이여야 합니다" }
    }
    companion object {
        fun of(value: Int) = Rating(value)  // 팩토리 메서드
    }
}
```

### 마이크로서비스 패턴
- **멀티테넌시 지원**: 사용자별 데이터 격리
- **이벤트 기반 연동**: 다른 서비스와의 느슨한 결합
- **독립적 배포**: 서비스별 독립적인 개발/배포

## 💡 핵심 구현 특징

1. **DDD 패턴**: 값 객체의 불변성과 유효성 검증
   - *비즈니스 규칙을 도메인 객체에 캡슐화하여 유지보수성 향상*
2. **CQRS 패턴**: 명령과 조회 분리
   - *ReviewService(명령)와 ReviewQueryService(조회)로 읽기/쓰기 최적화*
3. **고급 JPA**: @Embeddable, @ElementCollection, Optimistic Locking
   - *동시성 제어와 데이터 무결성 보장*
4. **카탈로그 연동**: WebClient + Reactor (Catalog 서비스 호출)
   - *영화 메타데이터는 Catalog 서비스에서 일괄 관리*
   - *타임아웃 및 연결 설정으로 안정성 확보*
5. **캐싱 전략**: 다층 캐싱으로 성능 최적화
   - *리뷰 조회 성능 향상*
6. **예외 처리**: @RestControllerAdvice + 도메인 예외
   - *일관된 에러 응답과 디버깅 효율성 증대*
7. **테스트**: MockK + @WebMvcTest + SpringMockK + Testcontainers
   - *단위 테스트와 통합 테스트로 안정성 확보*
   - *Testcontainers로 실제 PostgreSQL 환경에서 검증*
8. **운영**: 환경별 프로파일 + 구조화된 로깅
   - *개발/운영 환경 분리로 안정성 확보*
9. **이벤트 발행**: BaseEntity에 이벤트 발행 추적 기능 포함
   - *도메인 이벤트 추적 및 재발행 지원*

## 🔧 구현 예시

### 소프트 삭제: @SQLDelete + @SQLRestriction

```kotlin
@Entity
@Table(name = "reviews", schema = "app")
@SQLDelete(sql = "UPDATE app.reviews SET deleted = true, deleted_at = NOW(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted = false")
data class Review(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "deleted", nullable = false)
    val deleted: Boolean = false,

    @Column(name = "deleted_at")
    val deletedAt: LocalDateTime? = null
) : BaseEntity()

// 서비스에서 사용
fun deleteReview(id: Long, userSeq: Long) {
    val review = reviewRepository.findById(id)
        .orElseThrow { exceptionFactory.notFound(id) }

    // @SQLDelete 어노테이션이 자동으로 soft delete 처리
    reviewRepository.delete(review)
}
```

**장점:**
- **@SQLRestriction**: JPQL 쿼리에서 `deleted = false` 조건 자동 추가로 성능 최적화
- **@SQLDelete**: 실제 삭제 대신 플래그 업데이트로 데이터 복구 가능
- **Optimistic Locking**: 동시 삭제 요청 시 데이터 무결성 보장

### BaseEntity: 공통 메타데이터 관리

모든 엔티티가 상속받는 `BaseEntity`는 다음 기능을 제공합니다:

```kotlin
@MappedSuperclass
abstract class BaseEntity {
    var createdAt: Instant          // 생성일시
    var updatedAt: Instant          // 수정일시
    var version: Long               // Optimistic Locking용 버전
    var createdBy: Long            // 생성자 ID
    var updatedBy: Long?           // 수정자 ID
    var deleted: Boolean           // 삭제 여부
    var deletedAt: Instant?        // 삭제일시
    var eventPublished: Boolean    // 이벤트 발행 여부
    var eventPublishedAt: Instant? // 이벤트 발행일시

    fun markEventAsPublished()     // 이벤트 발행 완료 표시
    fun restore()                  // 삭제 취소
}
```

**특징:**
- **자동 감사(Auditing)**: `@CreatedBy`, `@LastModifiedBy`로 생성자/수정자 자동 추적
- **이벤트 추적**: 도메인 이벤트 발행 상태를 추적하여 재발행 지원
- **소프트 삭제**: `deleted` 플래그와 `deletedAt`으로 삭제 추적
- **Optimistic Locking**: `@Version`으로 동시성 제어

## 🤔 기술적 의사결정

### 아키텍처 선택
- **DDD 선택 이유**: 복잡한 비즈니스 로직을 도메인 객체에 캡슐화하여 유지보수성 향상
- **마이크로서비스**: 서비스별 독립적 배포와 확장성 확보
- **계층형 아키텍처**: 관심사 분리로 코드 가독성과 테스트 용이성 증대

### 기술 스택 선택
- **Kotlin + Java 21**: null safety와 최신 JVM 기능 활용
- **WebClient**: 외부 API 호출 시 비동기 처리 지원
- **PostgreSQL**: 프로덕션과 동일한 데이터베이스 사용으로 환경 차이 최소화
- **Testcontainers**: 통합 테스트에서 실제 PostgreSQL 사용으로 방언/타입/DDL 검증
- **MockK vs Mockito**: Kotlin의 null safety와 더 나은 통합

### 성능 최적화
- **캐싱 전략**: 자주 조회되는 데이터의 메모리 캐싱으로 DB 부하 감소
- **지연 로딩**: JPA FetchType.LAZY로 불필요한 데이터 로딩 방지
- **페이지네이션**: 대용량 데이터의 효율적 처리

## 🚀 실행 방법

### 1. 애플리케이션 실행

```bash
# 개발 환경
./gradlew bootRun --args='--spring.profiles.active=dev'

# 프로덕션 환경
./gradlew bootRun --args='--spring.profiles.active=prod'
```

### 2. API 문서 확인

- **Swagger UI**: http://localhost:8080/api/docs
- **OpenAPI JSON**: http://localhost:8080/api/docs-json

### 3. 데이터베이스 연결 (개발 환경)

- **PostgreSQL**: `localhost:5433/review_db`
- **Username**: `review_app`
- **Password**: `review_1106`
- **Schema**: `app`

> **참고**: 개발 환경에서는 Docker Compose로 PostgreSQL을 실행합니다.

### 4. 참고사항

- **Catalog 연동**: 영화 메타데이터는 `catalog-service`에서 조회합니다.
- **사용자 인증**: 현재는 `X-User-Seq` 헤더로 사용자 식별 (추후 인증 서비스 연동 예정)

## 📚 API 사용법

### 리뷰 생성

```bash
curl -X POST http://localhost:8080/api/v1/reviews \
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
curl "http://localhost:8080/api/v1/reviews?page=0&size=20&sortBy=createdAt&sortDirection=desc"

# 특정 사용자의 리뷰 조회
curl "http://localhost:8080/api/v1/reviews?userSeq=1"

# 특정 영화의 리뷰 조회
curl "http://localhost:8080/api/v1/reviews?movieId=12345"

# 태그로 필터링
curl "http://localhost:8080/api/v1/reviews?tag=액션"
```

### 리뷰 수정

```bash
curl -X PUT http://localhost:8080/api/v1/reviews/1 \
  -H "Content-Type: application/json" \
  -H "X-User-Seq: 1" \
  -d '{
    "rating": 4,
    "reason": "수정된 리뷰 내용"
  }'
```

### 리뷰 삭제

```bash
curl -X DELETE http://localhost:8080/api/v1/reviews/1 \
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


## 🔧 설정

### 환경별 프로파일

- **dev**: 개발 환경 (디버그 로깅, PostgreSQL 연결)
- **test**: 테스트 환경 (Testcontainers PostgreSQL, ddl-auto: create-drop)
- **prod**: 프로덕션 환경 (최적화된 로깅, 보안 강화, Flyway 마이그레이션)

### 주요 설정값

```yaml
# application.yml
server:
  port: 8080

spring:
  application:
    name: review-service

catalog:
  api:
    base-url: http://localhost:3001/api
    timeout: 5s
    connect-timeout: 5s
```
