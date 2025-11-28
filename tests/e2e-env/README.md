# E2E 환경 오케스트레이션

E2E 테스트를 위한 서버 환경을 관리하는 프로젝트입니다.

## 📋 개요

이 프로젝트는 E2E 테스트 실행에 필요한 서버 환경(catalog-service, review-service, 데이터베이스 등)을 자동으로 구성하고 실행합니다.

### 핵심 원칙

1. **단일 PostgreSQL 인스턴스**: 하나의 PostgreSQL을 사용하며, DB로 논리적 분리
   - Catalog Service: `catalog_e2e_db` 데이터베이스, `app` 스키마
   - Review Service: `review_e2e_db` 데이터베이스, `app` 스키마
2. **로컬 우선**: 로컬 실행 환경을 먼저 완성한 후 도커로 이식
3. **환경 변수 통합 관리**: base + override 패턴으로 설정 드리프트 방지

## 🏗️ 구조

```
tests/e2e-env/
├── config/
│   ├── base.env                    # 공통 기본값
│   ├── e2e.docker.override.env     # 도커 실행 오버라이드
│   └── merge-env.mjs                # 환경 변수 병합 스크립트
├── scripts/
│   ├── start-local.mjs              # 로컬 실행
│   ├── stop-local.mjs               # 로컬 종료
│   ├── start-docker.mjs             # 도커 실행
│   ├── stop-docker.mjs              # 도커 종료
│   ├── wait-for-services.mjs        # 헬스체크 대기
│   └── setup-db.mjs                 # DB 마이그레이션
├── docker/                          # Docker Compose 설정
│   ├── docker-compose.yml
│   └── init/postgres/00-bootstrap.sh
├── project.json
├── package.json
└── README.md
```

## 🚀 사용 방법

### 단축 명령어 (추천)

루트 디렉토리에서 다음 명령어를 사용할 수 있습니다:

```bash
# 도커 환경
pnpm e2e:docker:up      # 도커 시작
pnpm e2e:docker:down    # 도커 종료

# 로컬 환경
pnpm e2e:local:start    # 로컬 시작
pnpm e2e:local:stop     # 로컬 종료
```

### 상세 명령어

#### 로컬 실행

```bash
# E2E 환경 시작 (서비스 + DB + Redis)
nx run e2e-env:start:local

# 또는 루트에서
pnpm nx run e2e-env:start:local
```

실행 순서:
1. 환경 변수 병합 (`base.env` → `tests/.env.e2e`)
2. 데이터베이스 마이그레이션 (Prisma + Flyway)
3. Catalog Service 실행 (포트 4100)
4. Review Service 실행 (포트 5100)
5. 헬스체크 대기 (`/health/ready`)

#### 로컬 종료

```bash
# E2E 환경 종료
nx run e2e-env:stop:local

# 또는 루트에서
pnpm nx run e2e-env:stop:local
```

#### 도커 실행

```bash
# 도커 환경 시작 (PostgreSQL + Redis)
nx run e2e-env:start:docker

# 또는 루트에서
pnpm nx run e2e-env:start:docker
```

실행 순서:
1. 환경 변수 병합 (`base.env` + `e2e.docker.override.env` → `.env.e2e`)
2. Docker Compose 시작 (PostgreSQL, Redis)

#### 도커 종료

```bash
# 도커 환경 종료
nx run e2e-env:stop:docker

# 또는 루트에서
pnpm nx run e2e-env:stop:docker
```

### 환경 변수 병합만 수행

```bash
nx run e2e-env:merge-env
```

## ⚙️ 환경 변수 관리

### Base + Override 패턴

환경 변수는 다음 순서로 병합됩니다:

1. `config/base.env`: 모든 환경에서 공통으로 사용되는 기본값
   - 서비스 포트 (4100, 5100, 3100)
   - 서비스 Base URL
   - 데이터베이스 연결 정보
   - 공통 설정

2. `config/e2e.docker.override.env`: 도커 실행 시에만 사용되는 오버라이드
   - 현재는 base.env와 동일하므로 비어있습니다
   - 필요 시에만 여기에 도커 전용 설정을 추가하세요
   - 예: 데이터베이스 호스트명 (`localhost` → `postgres-e2e`)

3. 최종 결과: `tests/.env.e2e` 파일 생성

**참고**:
- 로컬 모드는 `base.env`만 사용합니다
- 도커 모드는 `base.env` + `e2e.docker.override.env`를 병합합니다
- 현재는 로컬과 도커의 차이가 없으므로, 모든 설정은 `base.env`에 있습니다
- **환경 변수 전달 방식**: `tests/.env.e2e` 파일이 생성되지만, 실제 서비스 실행 시에는 이 파일을 읽는 것이 아니라 환경 변수로 직접 전달됩니다 (`start-local.mjs` 참고)
- **NODE_ENV**: Catalog Service는 `NODE_ENV`를 설정하지 않으면 기본값 `development`로 동작합니다. e2e 테스트 환경에서는 별도의 `NODE_ENV=e2e` 설정이 필요하지 않으며, `development` 모드의 CORS 정책(localhost 허용)이 적용됩니다

### 환경 변수 예시

```env
# base.env
CATALOG_BASE_URL=http://localhost:4100
REVIEW_BASE_URL=http://localhost:5100
PORT=4100

# 데이터베이스 설정
CATALOG_DB_URL=postgresql://postgres:postgres@localhost:5434/catalog_e2e_db?schema=app
REVIEW_DB_URL=jdbc:postgresql://localhost:5434/review_e2e_db
REVIEW_DB_USERNAME=postgres
REVIEW_DB_PASSWORD=postgres
REVIEW_DB_SCHEMA=app

# Redis 설정
REDIS_URL=redis://localhost:6380
```

## 🗄️ 데이터베이스 구성

### 단일 PostgreSQL 인스턴스

하나의 PostgreSQL 인스턴스를 사용하며, DB로 논리적 분리:

- **Catalog Service**: `catalog_e2e_db` 데이터베이스, `app` 스키마
- **Review Service**: `review_e2e_db` 데이터베이스, `app` 스키마

**참고**: 두 서비스 모두 `app` 스키마를 사용합니다. Prisma는 기본적으로 `public` 스키마를 사용하지만, E2E 환경에서는 명시적으로 `app` 스키마를 지정합니다.

### 마이그레이션

- **Catalog Service**: Prisma Migrate 사용 (`prisma migrate deploy`)
- **Review Service**: Flyway 사용 (Spring Boot 시작 시 자동 실행)

### Docker Compose에서의 자동 설정

Docker Compose를 사용할 경우, `docker/init/postgres/00-bootstrap.sh` 스크립트가 다음을 자동으로 수행합니다:
- `catalog_e2e_db` 및 `review_e2e_db` 데이터베이스 생성
- 각 데이터베이스에 `app` 스키마 생성
- `catalog_app` 및 `review_app` 역할 생성 및 권한 설정
- Catalog Service용 `vector` 확장 설치

## 🔍 헬스체크

서비스 준비 상태는 다음 엔드포인트로 확인합니다:

- **Catalog Service**: `GET /health/ready`
- **Review Service**: `GET /health/ready`

헬스체크는 포트가 열린 후 실제 서비스 준비 상태(DB 연결 등)를 확인합니다.

## 📝 주의사항

### 로컬 실행 전 요구사항

1. **PostgreSQL**:
   - 포트: 5434
   - 데이터베이스: `catalog_e2e_db`, `review_e2e_db` (sh로 자동 생성)
   - 사용자: `postgres` / 비밀번호: `postgres` (기본값, 변경 가능)

2. **Redis** (선택사항): 캐시를 사용하는 경우 로컬에 Redis가 필요합니다
   - 포트: 6380 (E2E 환경 전용 포트, 기본 6379와 충돌 방지)

3. **TMDB API Key**: Catalog Service에 실제 TMDB API Key가 필요합니다
   - **자동 폴백**: `tests/.env.e2e`에 `TMDB_API_KEY`가 없으면, Catalog Service는 `reelnote-api/catalog-service/.env.local` 또는 `.env` 파일에서 자동으로 읽습니다
   - **우선순위**: `process.env` → `.env.local` → `.env` 순서로 로드되며, 나중에 읽은 값이 우선합니다
   - **명시적 설정**: E2E 전용 키를 사용하려면 `tests/.env.e2e` 파일에 직접 추가하거나, `base.env`의 주석을 해제하고 값을 설정하세요

### 데이터베이스 생성

로컬 PostgreSQL에서 다음을 수동으로 생성해야 합니다:

```sql
-- 데이터베이스 생성
CREATE DATABASE catalog_e2e_db;
CREATE DATABASE review_e2e_db;

-- 각 데이터베이스에 app 스키마 생성
\c catalog_e2e_db
CREATE SCHEMA app;

\c review_e2e_db
CREATE SCHEMA app;
```

또는 Docker Compose를 사용하면 자동으로 생성됩니다 (포트 5434 사용).

## 🐳 Docker Compose

### 서비스 구성

현재는 **DB와 Redis만** 올리는 초안입니다:

- **PostgreSQL**: 포트 5434 (호스트) → 5432 (컨테이너), 인스턴스 1개
  - `catalog_e2e_db`, `review_e2e_db` 데이터베이스 자동 생성
  - 각 데이터베이스에 `app` 스키마 자동 생성
  - `vector` 확장 자동 설치 (Catalog Service용)
- **Redis**: 포트 6380 (호스트) → 6379 (컨테이너)

나중에 e2e 서버와 합칠 예정입니다.

### 수동 실행

```bash
# Docker Compose 디렉토리로 이동
cd tests/e2e-env/docker

# 시작
docker compose up -d

# 종료
docker compose down

# 로그 확인
docker compose logs -f

# 상태 확인
docker compose ps
```

### 볼륨 관리

데이터를 완전히 삭제하려면:

```bash
docker compose down -v
```

## 📚 참고 문서

- [E2E 테스트 가이드](../../docs/guides/e2e-testing-guide.md)
- [Catalog Service README](../../reelnote-api/catalog-service/README.md)
- [Review Service README](../../reelnote-api/review-service/README.md)

