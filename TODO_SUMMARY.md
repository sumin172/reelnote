# 프로젝트 진행 상황 정리

생성일: 2025년 현재 시점
최종 업데이트: Catalog Service 완성 작업 진행 중 (헬스체크, 문서화 완료)

---

## ✅ 완료된 작업

### 1. Catalog Service 기본 구조 (Micro Service 추가)
- [x] NestJS 프로젝트 생성 (`catalog-service`)
- [x] Prisma 스키마 정의 (`prisma/schema.prisma`)
- [x] 기본 모듈 구조 생성:
  - [x] Database 모듈 (Prisma)
  - [x] Cache 모듈 (Redis + 인메모리 폴백)
  - [x] TMDB 모듈 (서킷브레이커, 레이트리밋, 리트라이)
  - [x] Movies 모듈 (Lazy Hydration, 동기화)
  - [x] Sync 모듈 (Warm Pool)
  - [x] Search 모듈
- [x] API 엔드포인트 구현:
  - [x] GET /api/movies/:tmdbId
  - [x] POST /api/movies/import
  - [x] POST /api/sync/trending
  - [x] POST /api/sync/popular
  - [x] GET /api/search
- [x] Swagger 설정
- [x] 문서화 (README.md, ARCHITECTURE.md)

### 2. Tools 구조 마이그레이션
- [x] `tools/ts/` 디렉토리 생성
- [x] 설정 파일 이동:
  - [x] `tsconfig.base.json`
  - [x] `jest.config.ts`
  - [x] `jest.preset.js`
  - [x] `eslint.config.mjs`
- [x] 모든 경로 참조 업데이트
- [x] 루트 `tsconfig.json`에 frontend 추가
- [x] frontend `tsconfig.json`에 base 상속 추가

### 3. 기본 설정 파일 표준화
- [x] 루트 `.editorconfig` 생성 (인코딩, 줄바꿈, 들여쓰기 규칙)
- [x] 루트 `.gitattributes` 생성 (LF 줄바꿈, 바이너리 파일 처리)

### 4. Pre-commit 훅 설정
- [x] Husky 설치 및 초기화
- [x] `.husky/pre-commit` 스크립트 작성 (Node.js 기반, 크로스 플랫폼):
  - [x] 공통 훅만 실행 (로컬 환경 의존성 최소화):
    - [x] Trailing whitespace 자동 제거
    - [x] End of file 수정
    - [x] Private key 검사
  - [x] 언어별 린팅/포맷팅은 CI로 이동 (GitHub Actions)
- [x] `.husky/commit-msg` 스크립트 작성:
  - [x] Conventional Commits 형식 검증 (commitlint)
  - [x] 커밋 메시지 타입 검사
- [x] 문서화 (`.husky/README.md`)
- [x] CI 워크플로우 설정:
  - [x] `.github/workflows/lint.yml`: TypeScript/JavaScript (ESLint, Prettier), Kotlin (ktlint)
  - [x] `.github/workflows/commitlint.yml`: PR 제목 검증

---

## 🚧 진행 중 / 미완료 작업

### 1. Catalog Service 구현 완료 필요

#### 환경 설정
- [ ] `.env` 파일 생성 (`.env.example` 참고)
- [ ] 환경 변수 설정:
  - [ ] `DATABASE_URL` (PostgreSQL)
  - [ ] `TMDB_API_KEY`
  - [ ] `REDIS_URL` (선택사항)
  - [ ] 기타 설정

#### 의존성 설치
- [ ] `pnpm install` 실행하여 의존성 설치
- [ ] Prisma 클라이언트 생성: `pnpm exec prisma generate`
- [ ] Prisma 마이그레이션 실행: `pnpm exec prisma migrate dev`

#### 데이터베이스 설정
- [ ] PostgreSQL 데이터베이스 생성
- [ ] 연결 테스트
- [ ] 초기 마이그레이션 적용

#### 기능 구현 ✅ **완료**
- [x] 헬스체크 모듈 추가 (`/health`, `/health/ready`, `/health/live`)
- [x] HealthController, HealthService 구현
- [x] AppModule에 HealthModule 추가
- [x] Nx 타겟 추가 (`prisma:generate`, `prisma:migrate`, `prisma:studio`)
- [x] README.md 업데이트 (환경 설정, 실행 방법, API 엔드포인트)
- [x] SETUP_GUIDE.md 생성 (상세 설정 가이드)
- [x] Cast/Crew 저장 로직 주석 개선 (별도 엔드포인트 필요시 구현)

#### 테스트 및 검증
- [ ] 서비스 실행 테스트: `nx serve catalog-service`
- [ ] API 엔드포인트 테스트
- [ ] TMDB API 연동 테스트
- [ ] 캐시 동작 테스트
- [ ] 헬스체크 엔드포인트 테스트

#### 추가 개선 (선택사항)
- [ ] 에러 핸들링 개선
- [ ] 로깅 설정 개선
- [ ] Cast/Crew 저장 로직 구현 (TMDB credits API 연동)

---

### 2. 고려사항 리스트 (미적용)

#### 2) 코드 스타일 & 훅 통합 ✅ **완료**
- [x] Pre-commit 훅 설정 (로컬 환경 의존성 최소화 정책)
  - [x] Husky 설치 및 초기화
  - [x] Pre-commit 스크립트 작성 (Node.js, 크로스 플랫폼)
  - [x] 공통 훅만 실행 (trailing whitespace, end of file, private key)
  - [x] 언어별 포맷/린트는 CI로 이동:
    - [x] TypeScript/JavaScript: ESLint + Prettier (`.github/workflows/lint.yml`)
    - [x] Kotlin: ktlint (`.github/workflows/lint.yml`)
    - [ ] Python: ruff + black (추후)
    - [ ] Go: golangci-lint + goimports (추후)
- [x] Commit 메시지 규칙 (Conventional Commits) ✅
  - [x] commitlint 설정
  - [x] PR 제목 검증 워크플로우 (`.github/workflows/commitlint.yml`)

#### 3) 테스트 전략 ⚠️ **미적용**
- [ ] 테스트 전략 문서화
- [ ] Testcontainers 설정:
  - [ ] Spring Boot (review-service)
  - [ ] Node.js (catalog-service)
  - [ ] Python (추후)
  - [ ] Go (추후)
- [ ] E2E docker-compose 설정
- [ ] Pact 설정 (catalog ↔ review)

#### 4) CI/CD 간소화 + 캐시 ⚠️ **미적용**
- [ ] GitHub Actions 매트릭스 설정
- [ ] 캐시 전략 추가:
  - [ ] TS: pnpm 캐시
  - [ ] Kotlin: Gradle 캐시
  - [ ] Python: Poetry 캐시 (추후)
  - [ ] Go: 모듈 캐시 (추후)
- [ ] 워크스페이스 병렬 실행
- [ ] docker-compose 프로필 설정

#### 5) 패키지/버전 고정 ⚠️ **부분 완료**
- [x] TS: pnpm-workspace.yaml
- [ ] Kotlin: libs.versions.toml (Gradle Version Catalogs)
- [ ] Python: Poetry + poetry.lock (추후)
- [ ] Go: go.mod (추후)
- [ ] Renovate 설정 (주 1회 배치)

#### 6) 설정 표준화 파일 ✅ **완료**
- [x] 루트 `.editorconfig` 생성 (에디터 자동 포맷팅, Pre-commit과 보완적)
- [x] 루트 `.gitattributes` 생성 (`* text=auto eol=lf`, Git 저장소 일관성)
- [x] `tools/ts/` 디렉토리 구조:
  - [x] `tsconfig.base.json`: 공유 TypeScript 설정
  - [x] `eslint.config.mjs`: 공유 ESLint 설정 (Nx 모듈 경계 규칙 포함)
  - [x] `jest.config.ts`, `jest.preset.js`: Jest 프로젝트 설정
- [x] ESLint 설정 통합:
  - [x] Frontend ESLint가 `tools/ts/eslint.config.mjs` 상속 (Next.js 규칙 유지)

#### 7) 컨테이너/로컬 개발 ⚠️ **미적용**
- [ ] 각 서비스 Dockerfile (멀티스테이지)
- [ ] `infra/dev.compose.yml` 생성:
  - [ ] postgres
  - [ ] mongodb (필요시)
  - [ ] rabbitmq (필요시)
  - [ ] jaeger/tempo (관측성)
  - [ ] loki/grafana (관측성)
- [ ] 프로필 설정
- [ ] VS Code Dev Containers (선택적)

#### 8) 관측성 최소 공통 규격 ⚠️ **미적용**
- [ ] 상관관계 ID 미들웨어:
  - [ ] NestJS 인터셉터
  - [ ] Spring 필터
  - [ ] FastAPI 미들웨어 (추후)
  - [ ] Go context (추후)
- [ ] OpenTelemetry SDK 설정
- [ ] Jaeger 연동
- [ ] 구조화된 로깅 (JSON)

#### 9) 시크릿/구성 ⚠️ **부분 완료**
- [x] `.env.example` 파일들 (일부)
- [ ] 루트 `.env.example` 템플릿
- [ ] GitHub Secrets 설정 가이드
- [ ] 환경 변수 검증 스키마

---

### 3. 기타 누락 사항

#### 문서화
- [ ] 전체 프로젝트 README 업데이트
- [ ] 각 서비스별 실행 가이드
- [ ] 개발 환경 설정 가이드
- [ ] 배포 가이드 (추후)

#### 리팩토링 필요
- [ ] catalog-service 의존성 설치 및 테스트
- [ ] 코드 품질 검증
- [ ] 성능 테스트

---

## 📋 우선순위별 작업 계획

### 즉시 해야 할 작업 (High Priority)

1. **Catalog Service 완성** ⚠️ **미완료**
   - [ ] 의존성 설치
   - [ ] 환경 변수 설정
   - [ ] Prisma 마이그레이션
   - [ ] 기본 실행 테스트

2. **기본 설정 파일** ✅ **완료**
   - [x] `.editorconfig` 생성 (에디터 자동 포맷팅)
   - [x] `.gitattributes` 생성 (Git 저장소 일관성)
   - [x] `tools/ts/` 디렉토리 구조 정리 (공유 설정)

3. **Pre-commit 훅 및 CI 린팅** ✅ **완료**
   - [x] Husky 설치 및 초기화
   - [x] Pre-commit 스크립트 (공통 훅만, Node.js 기반)
   - [x] Commit-msg 스크립트 (Conventional Commits)
   - [x] CI 워크플로우 설정 (언어별 린팅/포맷팅)
   - [x] 로컬 환경 의존성 최소화 정책 적용

### 중기 작업 (Medium Priority)

4. **CI/CD 개선**
   - [ ] 캐시 전략 적용
   - [ ] 매트릭스 설정
   - [ ] 워크플로우 최적화

5. **테스트 인프라**
   - [ ] Testcontainers 설정
   - [ ] E2E docker-compose
   - [ ] 테스트 전략 문서화

### 장기 작업 (Low Priority)

6. **관측성**
   - [ ] OpenTelemetry 설정
   - [ ] 로깅 표준화
   - [ ] 메트릭 수집

7. **컨테이너화**
   - [ ] Dockerfile 작성
   - [ ] docker-compose 설정
   - [ ] 개발 환경 표준화

---

## 🔄 새로운 마이크로서비스 전체 체크리스트

새로운 서비스를 추가할 때 다음 사항들을 확인하세요:

### 1. 프로젝트 구조 및 등록
- [ ] `reelnote-api/` 또는 적절한 디렉토리에 서비스 생성
- [ ] `nx.json`의 `projects` 섹션에 프로젝트 추가
- [ ] `pnpm-workspace.yaml`에 패키지 경로 추가 (Node.js 기반인 경우)
- [ ] `project.json` 생성 및 타겟 설정 (build, serve, test 등)
- [ ] 서비스별 태그 추가 (`tags: ["backend", "language", "framework"]`)

### 2. 코드 스타일 및 린팅
- [ ] `.editorconfig`에 언어별 설정 추가 (indent_size, indent_style 등)
- [ ] `.gitattributes`에 파일 확장자 추가 (line ending 설정)
- [ ] CI 워크플로우 업데이트:
  - [ ] `.github/workflows/lint.yml`에 언어별 린팅 작업 추가
    - TypeScript/JavaScript: ESLint + Prettier
    - Kotlin: ktlint
    - Python: ruff + black (추후)
    - Go: golangci-lint + goimports (추후)
- [ ] 언어별 린팅 도구 설정 파일 생성:
  - TypeScript: `eslint.config.mjs` (필요시 `tools/ts/eslint.config.mjs` 상속)
  - Kotlin: `ktlint` 설정 (또는 Gradle 통합)
  - Python: `pyproject.toml` (ruff, black 설정)
  - Go: `.golangci.yml`

### 3. 설정 파일
- [ ] `.env.example` 파일 생성 (환경 변수 템플릿)
- [ ] `.gitignore` 업데이트 (언어별 빌드 산출물, 의존성 등)
- [ ] 서비스별 README.md 작성:
  - [ ] 기술 스택 설명
  - [ ] 프로젝트 구조
  - [ ] 실행 방법
  - [ ] API 문서 링크 (Swagger/OpenAPI 등)

### 4. 테스트 설정
- [ ] 테스트 프레임워크 설정:
  - TypeScript: Jest 또는 Vitest
  - Kotlin: JUnit 5 + MockK
  - Python: pytest (추후)
  - Go: testing 패키지 (추후)
- [ ] 테스트 타겟이 `nx.json`의 `targetDefaults.test`와 호환되는지 확인
- [ ] E2E 테스트 설정 (필요시):
  - [ ] `*-e2e` 프로젝트 생성
  - [ ] `.github/workflows/*-e2e.yml` 워크플로우 추가

### 5. CI/CD 워크플로우
- [ ] 빌드 워크플로우 확인/추가:
  - [ ] `build` 타겟이 정상 동작하는지 확인
  - [ ] 필요한 환경 변수/시크릿 설정
- [ ] 테스트 워크플로우 확인:
  - [ ] `test` 타겟이 정상 동작하는지 확인
  - [ ] 테스트 커버리지 수집 (필요시)
- [ ] 배포 워크플로우 (필요시):
  - [ ] Docker 이미지 빌드
  - [ ] 배포 환경 설정

### 6. Docker 및 컨테이너화
- [ ] `Dockerfile` 작성 (멀티스테이지 빌드 권장)
- [ ] `.dockerignore` 파일 생성
- [ ] `docker-compose.yml`에 서비스 추가 (로컬 개발용)
- [ ] 헬스체크 엔드포인트 구현 (`/health` 또는 `/actuator/health`)

### 7. 문서화
- [ ] 서비스 README.md 업데이트
- [ ] API 문서 생성 (Swagger/OpenAPI 등)
- [ ] 아키텍처 다이어그램 (필요시)
- [ ] 루트 README.md에 서비스 추가

### 8. 관측성 (Observability)
- [ ] 로깅 설정 (구조화된 로깅 권장)
- [ ] 메트릭 수집 설정 (Prometheus 등)
- [ ] 트레이싱 설정 (OpenTelemetry, Jaeger 등)
- [ ] 상관관계 ID 미들웨어 구현

### 9. 보안
- [ ] 의존성 취약점 스캔 (GitHub Dependabot 등)
- [ ] 환경 변수 검증 스키마
- [ ] 인증/인가 설정 (필요시)
- [ ] CORS 설정 (필요시)

### 10. 모니터링 및 알림
- [ ] 헬스체크 엔드포인트 구현
- [ ] 알림 설정 (서비스 다운 등)
- [ ] 로그 집계 설정 (Loki, ELK 등)

---
