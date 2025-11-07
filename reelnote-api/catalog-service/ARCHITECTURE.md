# Catalog Service 아키텍처 문서

## 1. 개요

Catalog Service는 ReelNote 플랫폼의 영화 메타데이터 관리 마이크로서비스입니다. TMDB API를 통해 영화 데이터를 가져와 내부 서비스들이 사용할 수 있는 권위 소스(Source of Truth) 역할을 합니다.

## 2. 핵심 설계 원칙

### 2.1 Lazy Hydration
- **목적**: 메모리 효율성과 초기 로딩 시간 단축
- **구현**: `GET /movies/{id}` 요청 시 로컬 캐시(Redis/인메모리) → DB → TMDB 순서로 조회
- **장점**: 사용자가 실제로 조회한 영화만 DB에 저장

### 2.2 Warm Pool (예열 풀)
- **목적**: 인기 컨텐츠에 대한 빠른 응답 제공
- **구현**: 트렌딩/인기 Top N 영화를 주기적으로 동기화
- **트리거**: `POST /sync/trending`, `POST /sync/popular` API 또는 스케줄러

### 2.3 스테일 데이터 허용 (Stale Data Tolerance)
- **목적**: 가용성 향상
- **구현**: `synced_at` 기준 N일(기본 7일) 지난 데이터도 응답하며, 백그라운드에서 리프레시
- **장점**: TMDB API 장애 시에도 서비스 지속 가능

### 2.4 캐싱 전략
- **L1 Cache**: Redis (분산 캐시)
- **L2 Cache**: 인메모리 캐시 (Redis 미사용 시)
- **TTL**: 1시간 (캐시 히트 시 p95 ≤ 120ms 목표)

## 3. 신뢰성 메커니즘

### 3.1 서킷브레이커
- **상태**: CLOSED → OPEN → HALF_OPEN → CLOSED
- **임계값**: 연속 5회 실패 시 OPEN
- **복구**: 1분 후 HALF_OPEN으로 전환, 성공 시 CLOSED

### 3.2 레이트리밋 (토큰 버킷)
- **제한**: 초당 40개 요청 (TMDB API 제한)
- **알고리즘**: 토큰 버킷 알고리즘
- **대기**: 토큰이 없으면 최대 100ms 간격으로 대기

### 3.3 리트라이 (지수 백오프)
- **최대 재시도**: 3회
- **지연**: 1초, 2초, 4초 (최대 10초)
- **대상**: 네트워크 오류, 타임아웃

## 4. 데이터베이스 스키마

### 4.1 핵심 테이블

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

### 4.2 Feature Store (추후 사용)

```
movie_feature (tmdb_id PK)
├── tags_weight (JSONB): { genre, keyword, auto, user }
├── embedding (vector): pgvector 타입
└── sentiment_stats (JSONB)

user_profile (user_id PK)
├── tag_pref (JSONB)
└── embedding (vector)
```

## 5. API 엔드포인트

### 5.1 영화 관리
- `GET /api/movies/:tmdbId` - 영화 상세 조회 (Lazy Hydration)
- `POST /api/movies/import` - 영화 일괄 인입

### 5.2 동기화
- `POST /api/sync/trending?timeWindow=day|week` - 트렌딩 영화 동기화
- `POST /api/sync/popular` - 인기 영화 동기화

### 5.3 검색
- `GET /api/search?q={query}&page={page}&language={lang}` - 영화 검색

## 6. 성능 목표

- **응답 시간**: p95 ≤ 120ms (캐시 히트 시)
- **캐시 미스 시**: p95 ≤ 400ms
- **캐시 히트율**: > 80%
- **TMDB API 호출 실패율**: < 1%

## 7. 추후 확장 계획

### 7.1 이벤트 기반 아키텍처
- `movie.synced`: 영화 동기화 완료 시 발행 (Analysis Service 구독)
- `movie.feature.updated`: 영화 Feature 업데이트 시 발행 (Reco Service 구독)
- `user.profile.updated`: 사용자 프로필 업데이트 시 발행 (Reco Service 구독)

### 7.2 Analysis Service 연동
- 리뷰 NLP 분석 결과를 `movie_feature`에 저장
- 태그 정규화 및 TMDB keyword 매핑
- 사용자 프로필 업데이트

### 7.3 Reco Service 연동
- Feature Store를 통한 영화 추천
- ANN(Approximate Nearest Neighbor) 검색을 위한 임베딩 활용
- 콘텐츠 기반 → 협업 필터링 점진적 전환

## 8. 환경 변수

```bash
# 필수
DATABASE_URL=postgresql://user:password@localhost:5432/catalog_db
TMDB_API_KEY=your_api_key

# 선택 (없으면 기본값 사용)
REDIS_URL=redis://localhost:6379
PORT=3001
MOVIE_STALE_THRESHOLD_DAYS=7
WARM_POOL_SIZE=100
TMDB_API_TIMEOUT=10000
CORS_ORIGIN=http://localhost:3000
```

## 9. 모니터링 메트릭

### 9.1 카탈로그 서비스
- 캐시 히트율
- TMDB API 호출 실패율
- 동기화 지연 시간
- 응답 시간 (p50, p95, p99)

### 9.2 TMDB 클라이언트
- 서킷브레이커 상태 변화
- 레이트리밋 대기 시간
- 리트라이 횟수 및 성공률

## 10. 배포 고려사항

- **데이터베이스 마이그레이션**: Prisma Migrate 사용
- **Redis 고가용성**: Redis Cluster 또는 AWS ElastiCache
- **PostgreSQL**: 읽기 전용 복제본 활용 가능 (읽기 부하 분산 시)
- **헬스체크**: `/api/health` 엔드포인트 (추가 구현 필요)

