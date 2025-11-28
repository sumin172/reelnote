# Catalog Service

> Hexagonal Architecture와 Resilience 패턴으로 구성된 ReelNote의 영화 메타데이터 마이크로서비스

Catalog Service는 TMDB API를 통해 영화 메타데이터를 수집·정제해 플랫폼 전반의 **Source of Truth**를 제공합니다. Review Service와 동일한 포트/어댑터 언어를 사용하여 학습 경험을 자연스럽게 이어가도록 구성했습니다.

## 🛠 기술 스택

- **Runtime**: Node.js 24 LTS + TypeScript 5.9 (ESM 모듈)
- **Framework**: NestJS 11 + `@nestjs/cache-manager`
- **Persistence**: PostgreSQL + Prisma ORM 6.x
- **Cache**: `cache-manager` v7 + ioredis(`Redis`) + 인메모리 폴백
- **Resilience**: Axios + `axios-retry` 4.x + `opossum` 9.x + `p-limit` 7.x
- **Tooling**: Nx 21 Workspace + pnpm 10

## 📁 프로젝트 구조

```
src/
├── main.ts                 # 애플리케이션 진입점
├── app/                    # 루트 모듈
├── cache/                  # cache-manager v7 + Redis(ioredis) 스토어
├── config/                 # CORS 등 공통 설정
├── database/               # Prisma 모듈 및 서비스
├── health/                 # 헬스/레디니스/라이브니스 엔드포인트
├── infrastructure/         # 공용 인프라 어댑터 (예: Prisma Accessor)
├── movies/                 # 도메인, 애플리케이션, 인프라, 파사드/컨트롤러
│   ├── application/        # UseCase, Facade, Port, Job Service
│   ├── domain/             # 엔티티/팩토리
│   ├── dto/                # DTO & 프레젠터
│   └── infrastructure/     # 캐시/외부/퍼시스턴스 어댑터
├── scripts/                # OpenAPI 생성 스크립트
├── search/                 # 로컬+TMDB 검색 Aggregator 및 어댑터
├── sync/                   # Warm Pool 배치/트리거 서비스
└── tmdb/                   # TMDB 클라이언트 + Resilience Layer
```

## 🏗 아키텍처 & 설계

> **📖 상세 아키텍처 문서**: [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요.
>
> Catalog Service는 **Hexagonal Architecture (Port/Adapter)** + **Resilience Layer** 패턴을 적용했습니다. Review Service와 동일한 포트/어댑터 언어를 사용하여 학습 경험을 자연스럽게 이어가도록 구성했습니다.

### 핵심 아키텍처 패턴

- **Hexagonal Architecture**: 도메인 중심 설계로 외부 시스템 의존성 제거
- **Resilience Layer**: Retry, Circuit Breaker, Rate Limiter로 TMDB API 호출 보호
- **Lazy Hydration**: 캐시 → DB → TMDB 순서로 조회하여 성능 최적화
- **Warm Pool**: 인기/트렌딩 콘텐츠를 미리 적재하는 배치 파이프라인

### 주요 특징

- 다층 캐싱 (Redis + 인메모리 폴백)으로 조회 성능 최적화
- 비동기 임포트 큐를 통한 대량 데이터 처리
- 로컬 DB + TMDB 하이브리드 검색 Aggregator
- 타입 안전한 설정 관리 (시작 시점 검증으로 조기 실패 보장)

## 🔐 환경 변수

`.env` 파일을 `reelnote-api/catalog-service` 루트에 생성하고 아래 값을 채웁니다.

> **⚠️ 중요**: Catalog Service는 **시작 시점 환경 변수 검증**을 수행합니다. 잘못된 설정이 있으면 애플리케이션이 시작되지 않으며, 명확한 에러 메시지를 제공합니다. 이는 Review Service의 `@ConfigurationProperties` 패턴과 동일한 철학을 따릅니다. 자세한 내용은 `ARCHITECTURE.md` 섹션 5를 참고하세요.

### 필수

- `CATALOG_DB_URL`: PostgreSQL 연결 문자열 (형식: `postgresql://user:password@host:port/database?schema=public`)
- `TMDB_API_KEY`: TMDB API Key

### 선택 (주요 항목)

- `TMDB_API_BASE_URL` (기본값 `https://api.themoviedb.org/3`)
- `TMDB_API_TIMEOUT` (기본값 `10000`)
- `TMDB_API_MAX_CONCURRENCY`, `TMDB_API_MAX_RETRY`
- `TMDB_BREAKER_TIMEOUT`, `TMDB_BREAKER_RESET_TIMEOUT`, `TMDB_BREAKER_ERROR_PERCENTAGE`, `TMDB_BREAKER_VOLUME_THRESHOLD`
- `MOVIE_IMPORT_CONCURRENCY`, `MOVIE_IMPORT_QUEUE_THRESHOLD`, `MOVIE_IMPORT_CHUNK_SIZE`
- `WARM_POOL_SIZE`, `MOVIE_STALE_THRESHOLD_DAYS`, `MOVIE_CACHE_TTL_SECONDS`
- `CACHE_TTL_SECONDS`, `CACHE_NAMESPACE`, `REDIS_URL`
- `PORT`, `NODE_ENV`, `CORS_ORIGINS`

```bash
# 예시
CATALOG_DB_URL="postgresql://user:password@localhost:5432/catalog_db?schema=public"
TMDB_API_KEY=your_tmdb_api_key
WARM_POOL_SIZE=100
MOVIE_IMPORT_CONCURRENCY=5
```

> **학습 팁**
> 실습/테스트 환경에서는 `MOVIE_IMPORT_CONCURRENCY=1`, `MOVIE_IMPORT_QUEUE_THRESHOLD=20`, `WARM_POOL_SIZE=20`처럼 값의를 낮추면 흐름을 눈으로 추적하기 쉽습니다. 운영(또는 퍼포먼스 테스트)에는 기본값 이상을 사용해 병렬 처리 이점을 누리세요.

전체 목록과 기본값 설명은 `ARCHITECTURE.md` 및 `env.example`을 참고하세요.

## 🚀 실행 방법

### 1. 의존성 설치

```bash
pnpm install
```

### 2. Prisma 준비

```bash
# 서비스 디렉터리에서
cd reelnote-api/catalog-service
pnpm exec prisma generate

# 또는 Nx 타깃 사용
nx run catalog-service:prisma:generate
```

### 2-1. 데이터베이스 마이그레이션 적용

```bash
# Local 개발: 마이그레이션 생성 및 적용
nx run catalog-service:prisma:migrate -- --name migration_name

# Dev/Stage/Prod: 마이그레이션만 적용 (기존 히스토리 재생)
nx run catalog-service:prisma:migrate:deploy
```

> **⚠️ 중요 규칙**
>
> - 운영 계열 DB에는 `prisma db push` 사용 금지
> - 모든 DB 변경은 마이그레이션 파일을 통해서만 수행

### 2-2. Seeding (선택)

```bash
# Local/Dev 환경: 레퍼런스 데이터 삽입
nx run catalog-service:prisma:seed
```

> **⚠️ Seeding 정책**
>
> - **Local/Dev 환경**: Seeding 허용 (기본 장르 데이터 등)
> - **Stage/Prod 환경**: Seeding 금지 (운영 데이터는 애플리케이션 로직으로만 생성)

### 3. 서비스 실행

```bash
nx serve catalog-service
```

### 4. 동작 확인

```bash
# 헬스 체크 (K8s 프로브용)
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready

# API 테스트
curl http://localhost:4000/api/v1/movies/550
curl -X POST http://localhost:4000/api/v1/sync/trending
```

**NX Daemon**이 꺼져 있으면 먼저 시작해야 파일 변경 감지가 정상 동작합니다.

```bash
npx nx daemon --start
```

### 5. 프로덕션 빌드

```bash
nx build catalog-service
```

## 📡 API 개요

- `GET /api/v1/movies/:tmdbId` : Lazy Hydration 기반 상세 조회
- `POST /api/v1/movies/import` : 온디맨드 일괄 인입 (큐 임계치에 따라 Job 전환)
- `GET /api/v1/movies/import/jobs/:jobId` : 비동기 임포트 작업 진행 상황 조회
- `POST /api/v1/sync/trending` : 트렌딩 Warm Pool 동기화
- `POST /api/v1/sync/popular` : 인기 Warm Pool 동기화
- `GET /api/v1/search` : 로컬 DB + TMDB 하이브리드 검색
- `GET /health/live` : Liveness 체크 (K8s 프로브용)
- `GET /health/ready` : Readiness 체크 (K8s 프로브용)
- `GET /metrics` : Prometheus 메트릭 엔드포인트
- `GET /api/docs` : Swagger UI 문서
- `GET /api/docs-json` : OpenAPI JSON 스펙

## 🗂 데이터베이스 & 스키마

- `movie` 및 관계 테이블로 TMDB 원본 데이터 보관
- `movie_feature`, `user_profile` 등 Feature Store 테이블은 추천/분석 서비스용
- Prisma 구조 및 마이그레이션 관리는 `prisma/` 디렉터리에 위치
- 모든 스키마 변경은 버전 관리된 마이그레이션 파일을 통해서만 수행 (`prisma/migrations/`)

**마이그레이션 관리:**

- 환경별 명령어 및 정책: 위의 "데이터베이스 마이그레이션 적용" 섹션 참고

## 🧪 테스트

### 테스트 실행

```bash
# 전체 테스트 실행
nx test catalog-service
# 또는
pnpm test
```

### 테스트 커버리지

Jest를 사용하여 테스트 커버리지를 측정합니다. 테스트 실행 시 자동으로 커버리지 리포트가 생성됩니다.

```bash
# 테스트 실행 및 커버리지 리포트 생성
nx test catalog-service
```

**커버리지 리포트 위치:**

- HTML 리포트: `test-output/jest/coverage/index.html`
- LCOV 리포트: `test-output/jest/coverage/lcov.info`
- JSON 리포트: `test-output/jest/coverage/coverage-final.json`

브라우저에서 HTML 리포트를 열어 커버리지 상세 정보를 확인할 수 있습니다.

## 🎯 성능 & 운영 목표

- 응답 시간: 캐시 히트 시 p95 ≤ 120ms
- TMDB API 실패율: < 1% (Resilience Layer로 보완)
- Warm Pool Top N = `WARM_POOL_SIZE`
- 모니터링 지표: 캐시 히트율, TMDB 실패율, 동기화 지연, Resilience 이벤트

## 🔄 서비스 연동 & 로드맵

- **Review Service**: Catalog의 Port/Adapter 용어와 동일한 언어로 연동
- **Analysis Service**: `movie.feature.updated` 이벤트 플로우 예정
- **Reco Service**: Feature Store 기반 추천 파이프라인 예정

## 📚 학습 노트 & 공용 용어

- **Port**: 도메인/애플리케이션 계층에서 외부 의존성을 추상화한 계약 (인터페이스)
- **Adapter**: Port 계약을 만족하는 구현. `tmdb`, `cache`, `database` 등
- **Resilience Layer**: Retry, Circuit Breaker, Rate Limiter를 통합한 보호 계층
- **Warm Pool**: 인기/트렌딩 Top N을 사전 적재하는 배치 파이프라인
- **Lazy Hydration**: 요청 시점에 외부 데이터를 당겨와 DB에 저장하는 전략

Review Service README에서도 동일한 용어를 사용하므로, 두 서비스를 오가며 헥사고날 패턴과 Resilience 전략을 비교하며 학습할 수 있습니다.
