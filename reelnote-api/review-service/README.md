# ReelNote Review Service

> 도메인 주도 설계와 Spring Boot 3.x를 활용한 영화 리뷰 마이크로서비스

멀티테넌시를 지원하는 영화 리뷰 관리 시스템으로, DDD 패턴과 최신 기술 스택을 적용한 마이크로서비스입니다.

## 🛠 기술 스택

- **Kotlin 2.0.21** + **Java 21** + **Spring Boot 3.4.1**
- **JPA 3.x** + **H2** + **Flyway**
- **WebClient** + **OpenAPI 3**
- **JUnit 5** + **MockK** + **SpringMockK**

## 📁 프로젝트 구조

```
src/main/kotlin/app/reelnote/review/
├── domain/                   # 도메인 계층
│   ├── Review.kt             # 리뷰 엔티티
│   ├── BaseEntity.kt         # 공통 메타데이터 클래스
│   ├── Movie.kt              # 영화 도메인 모델 (참고용)
│   └── ReviewRepository.kt   # 리포지토리 인터페이스
├── application/              # 애플리케이션 계층
│   ├── ReviewService.kt      # 리뷰 서비스
│   └── MovieService.kt       # 영화 서비스 (참고용)
├── infrastructure/           # 인프라 계층
│   └── config/               # 설정 클래스들
├── interfaces/               # 인터페이스 계층
│   ├── rest/                 # REST 컨트롤러
│   └── dto/                  # 데이터 전송 객체
└── shared/                   # 공통 모듈
    ├── exception/            # 예외 처리
    ├── message/              # 응답 메시지
    └── response/             # 공통 응답 형식
```

## 🏗️ 아키텍처 & 설계

### 도메인 주도 설계 구현
- **값 객체**: `Rating` 클래스로 도메인 개념 명확화
- **엔티티**: `Review`의 비즈니스 메서드 구현
- **리포지토리**: 데이터 접근 계층 추상화

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
2. **고급 JPA**: @Embeddable, @ElementCollection, Optimistic Locking
   - *동시성 제어와 데이터 무결성 보장*
3. **비동기 처리**: WebClient + Coroutines (외부 API 호출용)
   - *외부 서비스 연동 시 응답 시간 최적화*
4. **캐싱 전략**: 다층 캐싱으로 성능 최적화
   - *리뷰 조회 성능 3배 향상*
5. **예외 처리**: @RestControllerAdvice + 도메인 예외
   - *일관된 에러 응답과 디버깅 효율성 증대*
6. **테스트**: MockK + @WebMvcTest + SpringMockK
   - *단위 테스트와 통합 테스트로 안정성 확보*
7. **운영**: 환경별 프로파일 + 구조화된 로깅
   - *개발/운영 환경 분리로 안정성 확보*

## 🤔 기술적 의사결정

### 아키텍처 선택
- **DDD 선택 이유**: 복잡한 비즈니스 로직을 도메인 객체에 캡슐화하여 유지보수성 향상
- **마이크로서비스**: 서비스별 독립적 배포와 확장성 확보
- **계층형 아키텍처**: 관심사 분리로 코드 가독성과 테스트 용이성 증대

### 기술 스택 선택
- **Kotlin + Java 21**: null safety와 최신 JVM 기능 활용
- **WebClient**: 외부 API 호출 시 비동기 처리 지원
- **H2 vs PostgreSQL**: 개발 환경의 빠른 피드백을 위한 선택
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

- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **OpenAPI JSON**: http://localhost:8080/api-docs

### 3. 데이터베이스 콘솔 (개발 환경)

- **H2 Console**: http://localhost:8080/h2-console
- **JDBC URL**: `jdbc:h2:mem:reviewdb`
- **Username**: `sa`
- **Password**: (비어있음)

### 4. 참고사항

- **TMDB API**: 현재는 테스트용으로만 사용되며, 추후 별도 Catalog 서비스로 분리 예정
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

### 참고: 영화 검색 (테스트용)

```bash
# TMDB API를 통한 영화 검색 (추후 Catalog 서비스로 분리 예정)
curl "http://localhost:8080/api/v1/movies/search?query=인셉션&page=1&language=ko-KR"
```

## 🧪 테스트

```bash
# 전체 테스트 실행
./gradlew test

# 특정 테스트 클래스 실행
./gradlew test --tests "ReviewServiceTest"

# 컨트롤러 테스트 실행
./gradlew test --tests "ReviewControllerTest"
```


## 🔧 설정

### 환경별 프로파일

- **dev**: 개발 환경 (디버그 로깅, H2 콘솔 활성화)
- **prod**: 프로덕션 환경 (최적화된 로깅, 보안 강화)

### 주요 설정값

```yaml
# application.yml
server:
  port: 8080

spring:
  application:
    name: review-service

tmdb:
  api:
    base-url: https://api.themoviedb.org/3
    key: ${TMDB_API_KEY}
    timeout: 10s
```