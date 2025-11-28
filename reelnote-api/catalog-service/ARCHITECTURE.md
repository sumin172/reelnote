# Catalog Service 아키텍처

> Review Service와 동일한 다층 Port/Adapter 언어로 정리된 Catalog Service 아키텍처 가이드

## 1. 개요

- **목적**: ReelNote 전반에서 사용할 영화 메타데이터의 권위 소스(Source of Truth)를 제공
- **패턴**: Hexagonal Architecture (Port/Adapter) + Resilience Layer
- **핵심 기능**: Lazy Hydration, Warm Pool, 다층 캐시, TMDB 연동 보호

## 2. 레이어 & 포트/어댑터

| 계층             | 폴더                                                                                                                   | 책임                           | 예시 포트/어댑터                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| Domain           | `movies/domain`                                                                                                        | 엔티티, 값 객체, 도메인 서비스 | `Movie`, `MovieFactory`                                          |
| Application      | `movies/application`                                                                                                   | UseCase, Facade, Port 정의     | `GetMovieUseCase`, `MovieExternalPort`                           |
| Inbound Adapter  | `movies/movies.controller.ts`, `search/search.controller.ts`, `sync/sync.controller.ts`, `health/health.controller.ts` | HTTP/Batch/헬스 진입점         | NestJS Controller                                                |
| Outbound Adapter | `movies/infrastructure/*`, `tmdb/`, `cache/`, `database/`                                                              | 외부 시스템 연결               | `TmdbMovieGateway`, `MovieCacheAdapter`, `CatalogPrismaAccessor` |

- **Port 계약**은 애플리케이션 계층에 위치하고, Adapter는 해당 계약을 구현합니다.
- Review Service의 `domain/application/infrastructure/interfaces` 구조와 1:1로 매칭됩니다.

## 3. Resilience Layer

### 3.1 Rate & Concurrency Control

- `p-limit`으로 동시 TMDB 호출 수를 제한 (`TMDB_API_MAX_CONCURRENCY`, 기본 10)
- ESM 모듈 로딩 실패 시 커스텀 Fallback limiter로 자동 대체해 안전 운용

### 3.2 Retry 전략

- `axios-retry` 지수 백오프 (1s → 2s → 4s) + 지터
- 재시도 대상: 네트워크 오류, 타임아웃, 5xx, 429

### 3.3 Circuit Breaker

- `opossum` 기반 상태 관리 (CLOSED ↔ OPEN ↔ HALF_OPEN)
- 임계값: 실패율 50% 이상, 최소 요청 수 10, 타임아웃 `TMDB_API_TIMEOUT + 1000`
- 이벤트 로그는 모니터링 대시보드에서 추적 가능

### 3.4 학습 모드 팁

- 실습 중 호출 흐름을 추적하고 싶다면 `MOVIE_IMPORT_CONCURRENCY=1`, `WARM_POOL_SIZE=20`으로 조정해 거의 직렬 처리 형태를 만들 수 있습니다.
- 운영 또는 퍼포먼스 검증 시에는 기본값(동시성 5~10, Warm Pool 100 이상)으로 가동합니다.

## 4. 데이터 전략

### 4.1 Lazy Hydration

- 캐시 → DB → TMDB 순으로 조회
- 미존재 시 TMDB에서 동기화 후 DB/캐시에 저장
- 스테일 데이터 허용: 기본 7일 (`MOVIE_STALE_THRESHOLD_DAYS`)

### 4.2 Warm Pool

- 인기/트렌딩 Top N(`WARM_POOL_SIZE`)을 주기적으로 미리 적재
- 트리거: `POST /api/v1/sync/trending`, `POST /api/v1/sync/popular`, 또는 스케줄러
- 큐 임계치(`MOVIE_IMPORT_QUEUE_THRESHOLD`)를 넘으면 Job으로 전환되어 백그라운드에서 처리

### 4.3 캐싱

- **L1**: Redis (또는 기타 Key-Value 스토어)
- **L2**: In-memory fallback
- TTL: 기본 1시간 (`CACHE_TTL_SECONDS`, `MOVIE_CACHE_TTL_SECONDS`)
- `CacheModule`은 `cache-manager` v7 기반으로 ioredis 스토어를 직접 구현하고, Redis 연결 실패 시 자동으로 인메모리 모드로 전환합니다.

### 4.4 검색 결과 캐시

- 검색 Aggregator는 로컬 DB & TMDB를 병합한 검색 결과를 60초 TTL로 캐싱합니다.
- 캐시 키: `search:<query>:<page>:<language>`
- 캐시 히트 시 TMDB 호출 없이 로컬 응답을 즉시 반환합니다.

## 5. 환경 변수 관리 & 검증 전략

### 5.1 검증 전략 개요

Catalog Service는 **시작 시점 환경 변수 검증**을 통해 잘못된 설정으로 인한 런타임 오류를 조기에 방지합니다. 이는 Review Service의 `@ConfigurationProperties` 패턴과 동일한 철학을 따릅니다.

**핵심 원칙:**

- **조기 실패 (Fail Fast)**: 애플리케이션 시작 시점에 잘못된 설정 감지
- **타입 안전성**: TypeScript 타입과 런타임 검증 결합
- **명시적 검증 규칙**: `class-validator` 데코레이터로 검증 규칙 명시
- **구조화된 설정 접근**: Config Provider 패턴으로 중앙화된 설정 관리

### 5.2 검증 레이어 구조

```
src/config/
├── env.validation.ts      # 환경 변수 검증 DTO 및 validate 함수
├── tmdb.config.ts         # TMDB 설정 Provider
├── cache.config.ts        # Cache 설정 Provider
├── movie.config.ts        # Movie 설정 Provider
├── sync.config.ts         # Sync 설정 Provider
└── application.config.ts  # Application 설정 Provider
```

**검증 흐름:**

1. `ConfigModule.forRoot({ validate })`에서 `env.validation.ts`의 `validate` 함수 호출
2. `EnvironmentVariables` DTO에 정의된 검증 규칙 적용
3. 검증 실패 시 애플리케이션 시작 중단 및 명확한 에러 메시지 제공

### 5.3 Config Provider 패턴

각 모듈은 **Config Provider**를 통해 타입 안전하게 설정에 접근합니다.

**예시: TmdbConfig**

```typescript
@Injectable()
export class TmdbConfig {
  constructor(private readonly configService: ConfigService) {}

  get apiKey(): string {
    return this.configService.get<string>("TMDB_API_KEY", { infer: true })!;
  }

  get timeout(): number {
    return (
      this.configService.get<number>("TMDB_API_TIMEOUT", { infer: true }) ??
      10000
    );
  }
}
```

**사용 방법:**

```typescript
@Injectable()
export class TmdbClient {
  constructor(
    private readonly tmdbConfig: TmdbConfig, // Config Provider 주입
  ) {
    this.apiKey = this.tmdbConfig.apiKey; // 타입 안전한 접근
  }
}
```

**장점:**

- 타입 안전성: IDE 자동완성 및 컴파일 타임 체크
- 중앙화: 설정 로직이 Config Provider에 집중
- 테스트 용이성: Config Provider를 Mock으로 대체 가능
- 일관성: Review Service의 `@ConfigurationProperties`와 유사한 패턴

### 5.4 새로운 설정 추가 가이드

새로운 환경 변수를 추가할 때는 다음 단계를 따릅니다:

**1단계: env.validation.ts에 검증 규칙 추가**

```typescript
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  NEW_ENV_VAR!: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  OPTIONAL_NUMBER?: number;
}
```

**2단계: Config Provider 생성 또는 기존 Provider에 추가**

```typescript
@Injectable()
export class NewConfig {
  constructor(private readonly configService: ConfigService) {}

  get newEnvVar(): string {
    return this.configService.get<string>("NEW_ENV_VAR", { infer: true })!;
  }
}
```

**3단계: 모듈에 Provider 등록**

```typescript
@Module({
  providers: [NewConfig /* ... */],
})
export class NewModule {}
```

**4단계: 서비스에서 Config Provider 주입 사용**

```typescript
@Injectable()
export class NewService {
  constructor(private readonly newConfig: NewConfig) {
    // 타입 안전한 설정 접근
  }
}
```

### 5.5 Review Service와의 일관성

Catalog Service와 Review Service는 **동일한 설정 관리 철학**을 공유합니다:

| 항목        | Review Service           | Catalog Service              | 일관성 |
| ----------- | ------------------------ | ---------------------------- | ------ |
| 검증 시점   | 시작 시점 (Spring Boot)  | 시작 시점 (NestJS)           | ✅     |
| 타입 안전성 | Kotlin data class        | TypeScript + class-validator | ✅     |
| 설정 구조화 | @ConfigurationProperties | Config Provider              | ✅     |
| 검증 명시성 | Spring 기본 검증         | class-validator 명시적 규칙  | ✅     |
| 접근 방식   | 의존성 주입              | 의존성 주입                  | ✅     |

**차이점 (프레임워크 특성):**

- Review Service: Spring Boot의 `@ConfigurationProperties` 자동 바인딩
- Catalog Service: NestJS의 `class-validator` 기반 명시적 검증

두 서비스 모두 **"시작 시점 검증 + 타입 안전한 설정 접근"** 원칙을 따르므로, 개발자는 동일한 사고 모델로 두 서비스를 이해할 수 있습니다.

### 5.6 베스트 프랙티스

**✅ 권장 사항:**

- 모든 설정은 Config Provider를 통해 접근
- 필수 설정은 `@IsNotEmpty()` 데코레이터로 명시
- 숫자 범위는 `@Min()`, `@Max()` 데코레이터로 제한
- URL 형식은 커스텀 검증 로직으로 처리 (postgresql, redis 프로토콜 지원)
- 선택적 설정은 `@IsOptional()` 데코레이터 사용

**❌ 피해야 할 사항:**

- `ConfigService.get()` 직접 호출 (Config Provider 사용)
- `process.env` 직접 접근 (검증 우회)
- 런타임에만 검증되는 설정 (시작 시점 검증 우회)
- 분산된 검증 로직 (Config Provider에 집중)

## 6. 데이터베이스 스키마

```
movie (tmdb_id PK)
├── 기본 정보: title, original_title, year, runtime, language, country
├── 메타데이터: poster_path, popularity, vote_avg, vote_cnt
├── 원본 데이터: raw_json (JSONB)
└── 동기화: synced_at

genre / movie_genre (Many-to-Many)
keyword / movie_keyword (Many-to-Many)
person / movie_cast / movie_crew (Many-to-Many)
```

### Feature Store (선행 준비)

```
movie_feature (tmdb_id PK)
├── tags_weight (JSONB)
├── embedding (vector)
└── sentiment_stats (JSONB)

user_profile (user_id PK)
├── tag_pref (JSONB)
└── embedding (vector)
```

- Analysis/Reco 서비스 연동을 위해 마련된 스키마이며, Review Service와 동일한 용어 체계를 따릅니다.

## 7. 모듈 상호작용

- **Movies 모듈**: HTTP 진입점이자 도메인 UseCase 실행 위치
- **Cache 모듈**: 조회 흐름에서 1차 필터, 업데이트 시에도 Port를 통해 추상화
- **Database 모듈**: `CatalogPrismaAccessor`가 트랜잭션 경계를 관리
- **TMDB 모듈**: 외부 API Adapter이면서 Resilience Layer의 중심
- **Sync 모듈**: Warm Pool 스케줄링 및 Import Job 연계
- **Search 모듈**: 로컬 결과와 TMDB 검색을 Aggregator에서 병합하고 CacheService로 TTL 제어
- **Health 모듈**: 기본/레디니스/라이브니스 세 가지 엔드포인트를 제공해 배포/오케스트레이션 파이프라인에 적합

## 8. 확장 로드맵

- **이벤트 발행**: `movie.synced`, `movie.feature.updated`, `user.profile.updated`
- **Analysis Service**: 리뷰 분석 결과를 Feature Store에 반영
- **Reco Service**: 임베딩 기반 추천 및 ANN 탐색으로 확장
- **Review Service**: Catalog의 Resilience Layer를 참고해 WebClient 호출 안정화

## 9. 모니터링 & 운영

- **카탈로그 지표**: 캐시 히트율, 동기화 지연, 응답 시간(p50/p95/p99)
- **Resilience 지표**: 재시도 횟수, 서킷브레이커 상태 이벤트, 레이트리밋 대기 시간
- **헬스체크**: `/health/live` (Liveness), `/health/ready` (Readiness) - K8s 프로브용
- **메트릭**: Prometheus 메트릭 엔드포인트 `/metrics`, 헬스 체크 실패 카운터 (`health_check_failures_total`)
- **배포 고려사항**: Prisma Migrate, Redis 고가용성, PostgreSQL 리드 리플리카
- **CORS 정책**: `NODE_ENV=development`에서는 localhost 허용, 운영/테스트는 `CORS_ORIGINS`로 명시적 제어

### 9.1 메트릭 컨벤션

메트릭 컨벤션은 [Health Check 표준 스펙](../../docs/specs/health-check.md#4-5-로깅-및-메트릭)을 참고하세요.

## 10. 공용 용어 (Review ↔ Catalog)

| 용어                 | 정의                                                       | 비고                                                   |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| **Port**             | 애플리케이션 계층에서 정의한 외부 의존성 계약              | 인터페이스, 추상클래스 포함                            |
| **Adapter**          | Port를 구현해 실제 시스템과 연결하는 계층                  | TMDB, Prisma, Redis 등                                 |
| **Resilience Layer** | Retry, Circuit Breaker, Rate Limiter 등 보호 메커니즘 묶음 | Review Service의 WebClient Resilience 전략과 동일 개념 |
| **Warm Pool**        | 인기/트렌딩 N건을 미리 적재하는 배치 파이프라인            | `sync` 모듈 담당                                       |
| **Lazy Hydration**   | 요청 시에만 데이터를 가져와 저장하는 전략                  | Review의 Lazy Load 패턴과 연결                         |
| **Feature Store**    | 추천/분석을 위한 확장 스키마                               | Analysis/Reco 연동 예정                                |
| **Config Provider**  | 타입 안전한 설정 접근을 위한 Provider 패턴                 | Review의 @ConfigurationProperties와 동일 철학          |

이 가이드는 Review Service와 동일한 문체로 작성되어 있으므로, 두 문서를 교차 검토하며 헥사고날 아키텍처와 Resilience 패턴을 학습할 수 있습니다.
