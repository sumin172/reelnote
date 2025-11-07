# Catalog Service

ReelNote의 영화 메타데이터 관리 마이크로서비스입니다.

## 개요

Catalog Service는 TMDB API를 통해 영화 데이터를 관리하고, 내부 서비스들이 사용할 수 있는 권위 소스(Source of Truth) 역할을 합니다.

### 주요 기능

- **Lazy Hydration**: 요청 시 TMDB에서 데이터를 가져와 로컬 DB에 저장
- **Warm Pool**: 트렌딩/인기 영화 주기적 동기화
- **캐싱**: Redis를 통한 빠른 응답 (p95 ≤ 120ms)
- **신뢰성**: 서킷브레이커, 레이트리밋, 리트라이, 스테일 데이터 허용

## 기술 스택

- **Framework**: NestJS
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **External API**: TMDB API

## 프로젝트 구조

```
src/
├── main.ts                 # 애플리케이션 진입점
├── app/
│   └── app.module.ts      # 루트 모듈
├── database/              # Prisma 서비스
├── cache/                 # Redis 캐싱 모듈
├── tmdb/                  # TMDB API 클라이언트 (레이트리밋, 리트라이, 서킷브레이커)
├── movies/                # 영화 관리 모듈
├── sync/                  # 동기화 모듈
└── search/                # 검색 모듈
```

## 환경 설정

### 환경 변수 파일 생성

`reelnote-api/catalog-service/.env` 파일을 생성하고 다음 내용을 설정하세요:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/catalog_db?schema=public"

# TMDB API
TMDB_API_KEY=your_tmdb_api_key_here
TMDB_API_BASE_URL=https://api.themoviedb.org/3
TMDB_API_TIMEOUT=10000

# Redis (선택사항)
# REDIS_URL=redis://localhost:6379
REDIS_URL=

# Application
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Catalog Service Settings
MOVIE_STALE_THRESHOLD_DAYS=7
WARM_POOL_SIZE=100
```

**필수 환경 변수:**
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `TMDB_API_KEY`: TMDB API 키

**선택 환경 변수:**
- `REDIS_URL`: Redis 연결 URL (없으면 인메모리 캐시 사용)
- `PORT`: 서비스 포트 (기본값: 3001)

## 데이터베이스 설정

### Prisma 마이그레이션

```bash
# Prisma 클라이언트 생성
pnpm exec prisma generate

# 마이그레이션 실행
pnpm exec prisma migrate dev --name init
```

### 스키마 구조

- `movie`: 영화 메인 테이블 (TMDB 원본 데이터)
- `genre`, `keyword`, `person`: 메타데이터 테이블
- `movie_genre`, `movie_keyword`, `movie_cast`, `movie_crew`: 관계 테이블
- `movie_feature`: Feature Store (추천 서비스용, 추후 Analysis Service에서 업데이트)
- `user_profile`: 사용자 프로필 (추천 서비스용)

## API 엔드포인트

### 영화 관리

- `GET /api/movies/:tmdbId` - 영화 상세 조회 (Lazy Hydration)
- `POST /api/movies/import` - 영화 일괄 인입

### 동기화

- `POST /api/sync/trending` - 트렌딩 영화 동기화
- `POST /api/sync/popular` - 인기 영화 동기화

### 검색

- `GET /api/search?q=...` - 영화 검색

### 문서

- `GET /api/docs` - Swagger API 문서

> 참고: Nest 초기 스캐폴딩에서 제공되던 루트 라우트(`/api`)는 제거되어 있으며, 모든 HTTP 인터페이스는 도메인 모듈(`movies`, `sync`, `search`, `health`)을 통해서만 노출됩니다.

## 실행

### 전제 조건

1. PostgreSQL 데이터베이스 준비
2. 환경 변수 설정 (`.env` 파일)
3. Prisma 클라이언트 생성 및 마이그레이션 완료

### 개발 모드 실행

```bash
# 기본 실행 방법
nx serve catalog-service

# 또는 catalog-service 디렉토리에서
cd reelnote-api/catalog-service
pnpm dev
```

**파일 변경 시 자동 재시작:**

NX Daemon이 실행 중이어야 파일 변경 시 자동 재시작이 작동합니다.
만약 "NX Daemon is not running" 메시지가 나타나면:

```bash
# 워크스페이스 루트에서 Daemon 수동 시작
cd c:\Dev\Project\reelnote
npx nx daemon --start

# 그 다음 서비스 실행
nx serve catalog-service
```

**참고**: Daemon은 3시간 이상 비활성 상태면 자동으로 종료될 수 있습니다.
자동 재시작이 필요하면 위 명령으로 Daemon을 먼저 시작하세요.

서비스가 시작되면:
- API: `http://localhost:3001/api`
- Swagger 문서: `http://localhost:3001/api/docs`
- 헬스체크: `http://localhost:3001/api/health`

### 프로덕션 빌드

```bash
nx build catalog-service
```

## 성능 목표

- **응답 시간**: p95 ≤ 120ms (캐시 히트 시)
- **캐시 히트율**: > 80%
- **TMDB API 호출 실패율**: < 1%

## 아키텍처 고려사항

### 추후 추가될 서비스와의 연동

- **Analysis Service**: `movie.feature.updated`, `user.profile.updated` 이벤트 발행 예정
- **Reco Service**: Feature Store를 통해 영화 추천 서비스
- **Review Service**: 외부 영화 조회 기능을 Catalog Service로 마이그레이션 예정

### 이벤트 기반 아키텍처 (추후 구현)

- `movie.synced`: 영화 동기화 완료 이벤트
- `movie.feature.updated`: 영화 Feature 업데이트 이벤트 (Analysis Service →)
- `user.profile.updated`: 사용자 프로필 업데이트 이벤트 (Analysis Service →)

### 분석/추천 서비스를 위한 Prisma 스키마 위치

- `MovieCast`, `MovieCrew`: TMDB 인물 관계를 유지해 향후 분석·추천 파이프라인에서 캐스팅/스태프 기반 피처를 계산할 때 사용합니다.
- `MovieFeature`: Analysis Service가 `movie.feature.updated` 이벤트로 최신 임베딩과 태그 가중치를 저장하는 Feature Store 테이블입니다.
- `UserProfile`: 사용자의 취향 벡터를 `user.profile.updated` 이벤트로 업데이트하는 개인화 프로필 저장소입니다.

위 모델은 현재 Catalog Service에서 직접 소비하지 않지만, 상기 서비스 확장 로드맵에 따라 유지되며, 세부 데이터 흐름은 `[ARCHITECTURE.md](./ARCHITECTURE.md)`에 정리해 두었습니다.

