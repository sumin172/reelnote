# Reelnote

영화 리뷰와 메타데이터를 관리하는 멀티 서비스 모노레포입니다. `Nx` + `pnpm`을 사용해 백엔드와 프론트엔드를 함께 운영합니다.

## Monorepo 구조

- `reelnote-api/`
  - `catalog-service/` – NestJS 기반 영화 메타데이터 서비스
  - `review-service/` – Spring Boot 기반 리뷰 서비스
- `reelnote-frontend/` – Next.js 기반 웹 애플리케이션
- `tools/` – 언어별 공용 설정 (TypeScript 등)
- `docs/` – 프로젝트 문서 (공통 스펙, 개발 가이드, 체크리스트 등)

## 시작하기

1. 의존성 설치
   ```bash
   pnpm install
   ```
2. 프로젝트 그래프 확인 (선택)
   ```bash
   pnpm nx graph
   ```
3. 서비스 실행 예시
   ```bash
   pnpm nx serve catalog-service
   pnpm nx serve review-service
   pnpm nx serve reelnote-frontend
   ```
4. 환경 변수 템플릿은 각 패키지의 `env.example` 또는 README 문서를 참고하세요.

## 테스트 & 린트 가이드

- TypeScript 서비스 (catalog-service, frontend)
  ```bash
  pnpm lint:ts          # Prettier 검사 + ESLint (검사만)
  pnpm format:ts        # Prettier (포맷팅)
  pnpm format:ts:check  # Prettier (검사만)
  ```
- 리뷰 서비스 (Kotlin, Gradle 기반)
  ```bash
  pnpm lint:kotlin    # ktlintCheck + detekt (검사만)
  pnpm format:kotlin  # ktlintFormat (포맷팅)
  ```
- 프론트엔드 Playwright E2E
  ```bash
  pnpm nx run e2e-frontend:e2e
  pnpm nx run e2e-frontend:lint         # lint 태스크 (Prettier 검사 + ESLint)
  pnpm nx run e2e-frontend:lint-fix     # Prettier 포맷팅
  ```
- 카탈로그 서비스 E2E (Jest)
  ```bash
  pnpm nx run e2e-catalog:e2e
  pnpm nx run e2e-catalog:lint        # lint 태스크 (Prettier 검사 + ESLint)
  pnpm nx run e2e-catalog:lint-fix    # Prettier 포맷팅
  ```
- 리뷰 서비스 E2E (Kotlin, Gradle 기반)
  ```bash
  pnpm nx run e2e-review:e2e
  pnpm nx run e2e-review:lint        # lint 태스크 (ktlintCheck + detekt)
  pnpm nx run e2e-review:lint-fix    # ktlintFormat
  ```

## API 스키마 산출 및 공유

- 공통 스키마는 `packages/api-schema/generated/`에 저장됩니다.
- 스키마 갱신:
  ```bash
  pnpm api-schema:generate   # catalog swagger + review openapi 생성
  ```
- 산출물 정리:
  ```bash
  pnpm api-schema:clean
  ```
- 서비스별 변경 후 `nx affected --target=e2e`를 실행하면 `api-schema`에 의존하는 테스트가 자동으로 재실행됩니다.

## E2E 통합 환경 기동

> **📖 상세 가이드**: [E2E 테스트 가이드](docs/guides/e2e-testing-guide.md)를 참고하세요.

### 핵심 원칙

- **도커에는 API 서버 + 테스트용 DB만 올린다** (프론트엔드는 제외)
- **프론트엔드는 Playwright `webServer`로 실행한다**
- **프론트엔드 단독 테스트**: API 모킹 사용 (Playwright `page.route()` 또는 MSW)
- **크로스 E2E 테스트**: 실제 도커 API 호출 (`globalSetup`에서 헬스 체크)

### Docker Compose 프로필별 기동 (개발 중)

```bash
# 전체 서비스 기동 (DB + Redis + Catalog + Review)
pnpm up

# DB + Redis만 기동 (로컬 서버와 함께 사용)
pnpm up:db

# 종료 및 볼륨 정리
pnpm down
```

### 서비스 포트

- **Catalog**: `http://localhost:4100`
- **Review**: `http://localhost:5100`
- **Frontend**: `http://localhost:3100` (Playwright `webServer`로 자동 실행)

### E2E 테스트 실행

```bash
# 프론트엔드 단독 테스트 (백엔드 서버 불필요)
nx e2e e2e-frontend

# 크로스 서비스 E2E 테스트 (로컬 E2E or 도커 컨테이너 사전 실행 필요)
pnpm up
nx e2e e2e-cross
```

E2E 타깃은 `.env.e2e`를 자동으로 로드하므로 별도 export 없이 바로 실행할 수 있습니다.

## 문서

- [docs/README.md](docs/README.md) – 프로젝트 문서 인덱스 및 시작 가이드
- **공통 스펙**: `docs/specs/` 폴더 참조
  - [에러 처리 스펙](docs/specs/error-handling.md) – 에러 응답 형식 및 예외 처리 가이드
  - [헬스 체크 스펙](docs/specs/health-check.md) – Health Check 응답 형식 및 엔드포인트
- **가이드**: `docs/guides/` 폴더 참조
  - [Micro Service 개발 표준 가이드](docs/guides/development-standards.md) ⭐ **실시간 참조** – 기능 추가/개선 시 항상 고려할 표준 (TraceId, 에러 처리, 로깅 등)
  - [Frontend 개발 표준 가이드](docs/guides/frontend-development-standards.md) ⭐ **실시간 참조** – 기능 추가/개선 시 항상 고려할 표준 (React Query 패턴, 에러 처리, API 통신 등)
  - [로깅 가이드](docs/guides/logging.md) – 로그 레벨 매핑, 구조화 로깅, TraceId 전파 등 로깅 표준
  - [TraceId 가이드](docs/guides/trace-id-guide.md) – HTTP 요청 단위 분산 추적 ID 관리 가이드
  - [ActionId 가이드](docs/guides/action-id-guide.md) – 사용자 액션 단위 상관관계 ID 관리 가이드
  - [신규 서비스 체크리스트](docs/guides/new-service.md) – 새 서비스 추가 시 체크리스트
- 서비스별 상세 가이드는 각 디렉터리의 `README.md`를 참조하세요.
- CI 파이프라인 (로컬 개발 중):
  - `E2E PR Pipeline` – PR 변경분에 따라 Compose 환경을 올리고 필요한 E2E만 실행
  - `Nightly E2E Suite` – 매일 전체 E2E/통합 시나리오 실행, 산출물은 GitHub Artifacts 보관
- `contract-frontend-catalog`, `e2e-cross` 프로젝트는 구조만 마련된 상태이며, 스크립트는 TODO 메시지를 출력합니다. 향후 계약/크로스 테스트 작성 시 해당 디렉터리에서 작업하세요.
