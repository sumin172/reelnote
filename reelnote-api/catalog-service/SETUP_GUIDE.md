# Catalog Service 설정 가이드

## 빠른 시작

### 1단계: 의존성 설치

```bash
# 루트에서 실행
pnpm install
```

### 2단계: 환경 변수 설정

`reelnote-api/catalog-service/.env` 파일을 생성하고 다음 내용을 입력:

```bash
# 필수
DATABASE_URL="postgresql://user:password@localhost:5432/catalog_db?schema=public"
TMDB_API_KEY=your_tmdb_api_key_here

# 선택
REDIS_URL=redis://localhost:6379
PORT=3001
```

### 3단계: PostgreSQL 데이터베이스 준비

### 4단계: Prisma 설정

```bash
# Prisma 클라이언트 생성
nx prisma:generate catalog-service

# 마이그레이션 실행
nx prisma:migrate catalog-service
```

### 5단계: 서비스 실행

```bash
# 서비스 시작
nx serve catalog-service
```

서비스가 시작되면:
- ✅ API: `http://localhost:3001/api`
- ✅ Swagger: `http://localhost:3001/api/docs`
- ✅ 헬스체크: `http://localhost:3001/api/health`

## 테스트

### 헬스체크

```bash
curl http://localhost:3001/api/health
```

### 영화 조회 (Lazy Hydration)

```bash
# TMDB ID 550 (파이트 클럽) 조회
curl http://localhost:3001/api/movies/550
```

### 트렌딩 영화 동기화

```bash
curl -X POST http://localhost:3001/api/sync/trending
```

## 문제 해결

### Prisma 클라이언트 생성 오류

```bash
# Prisma CLI가 설치되어 있는지 확인
pnpm exec prisma --version

# 없으면 설치
pnpm add -D prisma
```

