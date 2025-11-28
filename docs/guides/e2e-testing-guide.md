# E2E 테스트 가이드

> ReelNote 프로젝트의 End-to-End 테스트 전략 및 실행 가이드

## 📋 목차

- [개요](#개요)
- [테스트 전략](#테스트-전략)
- [도커 환경 구성](#도커-환경-구성)
- [프론트엔드 단독 테스트](#프론트엔드-단독-테스트)
- [크로스 서비스 E2E 테스트](#크로스-서비스-e2e-테스트)
- [실행 방법](#실행-방법)
- [참고 문서](#참고-문서)

---

## 개요

ReelNote 프로젝트는 다음과 같은 E2E 테스트 전략을 사용합니다:

1. **프론트엔드 단독 테스트** (`e2e-frontend`): UI 동작, 상태 흐름, 컴포넌트/페이지 위주 검증
2. **크로스 서비스 E2E 테스트** (`e2e-cross`): 프론트엔드 → 백엔드 서비스 전체 플로우 검증
3. **백엔드 서비스 단독 테스트** (`e2e-catalog`, `e2e-review`): 각 서비스의 API 엔드포인트 검증

### 핵심 원칙

- **도커에는 API 서버 + 테스트용 DB만 올린다**
  - 예: `catalog-service-e2e`, `review-service-e2e`, `db-e2e` (서비스별 DB는 논리적 분리)
  - 프론트엔드는 도커 안에 포함하지 않음
- **프론트엔드는 Playwright `webServer`로 실행한다**
  - 로컬에서 Next.js 앱을 자동으로 실행
- **프론트엔드 단독 테스트에서는 API를 모킹한다**
  - Playwright `page.route()` 또는 MSW 사용
- **크로스 E2E 테스트에서는 실제 도커 API를 호출한다**
  - 프론트엔드의 `API_BASE_URL`을 도커 포트로 설정
  - `globalSetup`에서 도커 API 서버 헬스 체크 후 테스트 시작

---

## 테스트 전략

### 테스트 타입별 비교

| 테스트 타입 | 프론트엔드 | 백엔드 API | 목적 |
|------------|-----------|-----------|------|
| **프론트엔드 단독** (`e2e-frontend`) | ✅ Playwright webServer | ❌ 모킹 (page.route/MSW) | UI 동작, 상태 흐름 검증 |
| **크로스 서비스** (`e2e-cross`) | ✅ Playwright webServer | ✅ 도커 컨테이너 | 전체 플로우 검증 |
| **백엔드 단독** (`e2e-catalog`, `e2e-review`) | ❌ | ✅ 도커 컨테이너 | API 엔드포인트 검증 |

### 테스트 프로젝트 구조

```
tests/
├── e2e-frontend/          # 프론트엔드 단독 테스트 (Playwright)
│   ├── playwright.config.ts
│   └── tests/
├── e2e-cross/             # 크로스 서비스 E2E 테스트 (Playwright)
│   ├── playwright.config.ts
│   ├── src/support/global-setup.ts
│   └── tests/
├── e2e-catalog/            # 카탈로그 서비스 E2E 테스트 (Jest)
│   └── src/
└── e2e-review/             # 리뷰 서비스 E2E 테스트 (Kotlin/Gradle)
    └── src/
```

---

## 도커 환경 구성

### 도커 Compose 프로필

도커에는 **API 서버 + 테스트용 DB만** 올립니다. 프론트엔드는 포함하지 않습니다.

```bash
# 프론트엔드만 (실제로는 프론트엔드 없음, 백엔드만)
pnpm up:front

# 카탈로그 서비스만
pnpm up:catalog

# 리뷰 서비스만
pnpm up:review

# 모든 서비스 통합 기동
pnpm up:all

# 종료 및 볼륨 정리
pnpm down
```

### 서비스 포트

각 서비스는 다음 포트로 노출됩니다:

- **Catalog Service**: `http://localhost:4100`
- **Review Service**: `http://localhost:5100`
- **Frontend**: `http://localhost:3100` (Playwright webServer로 실행)

### 환경 변수

E2E 테스트는 `tests/.env.e2e` 파일을 자동으로 로드합니다:

```env
# tests/.env.e2e
CATALOG_BASE_URL=http://localhost:4100
REVIEW_BASE_URL=http://localhost:5100
FRONT_BASE_URL=http://localhost:3100
```

> **참고**: `.env.e2e` 파일이 없는 경우 `tests/.env.e2e.example` 파일을 복사하여 생성하세요.

---

## 프론트엔드 단독 테스트

### 목적

- **UI 동작 검증**: 컴포넌트 렌더링, 사용자 인터랙션, 상태 변화
- **상태 흐름 검증**: React Query 캐싱, 에러 처리, 로딩 상태
- **페이지 네비게이션**: 라우팅, 폼 제출, 데이터 표시

### 구성

프론트엔드는 **Playwright `webServer`로 자동 실행**되며, API는 **모킹**합니다.

```typescript
// tests/e2e-frontend/playwright.config.ts
export default defineConfig({
  webServer: {
    command: "pnpm next dev -p 3100",
    cwd: resolve(__dirname, "../../reelnote-frontend"),
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### API 모킹 방법

#### 방법 1: Playwright `page.route()` (권장)

```typescript
// tests/e2e-frontend/tests/catalog.spec.ts
test("카탈로그 검색 결과가 표시된다", async ({ page }) => {
  // API 요청 모킹
  await page.route("**/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") ?? "";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        page: 1,
        query,
        local: [{ tmdbId: 1, title: `${query} 영화`, year: 2024 }],
        tmdb: [],
      }),
    });
  });

  await page.goto("/catalog");
  await page.getByPlaceholder("영화 제목을 입력하세요").fill("inception");
  // ... 테스트 계속
});
```

#### 방법 2: MSW (Mock Service Worker)

개발 환경에서 사용하는 MSW를 E2E 테스트에서도 활용할 수 있습니다. 단, Playwright의 `page.route()`가 더 간단하고 직관적입니다.

### 실행 방법

```bash
# E2E 테스트 실행
nx e2e e2e-frontend

# 또는 직접 실행
pnpm nx run e2e-frontend:e2e
```

### 특징

- ✅ 프론트엔드 서버 자동 실행 (Playwright가 관리)
- ✅ API 모킹으로 빠른 테스트 실행
- ✅ 백엔드 서버 불필요
- ✅ UI/UX 중심 검증에 최적화

---

## 크로스 서비스 E2E 테스트

### 목적

- **전체 플로우 검증**: 프론트엔드 → 백엔드 서비스 전체 시나리오
- **실제 API 통신 검증**: 도커에 올라간 실제 백엔드 서비스와 통신
- **서비스 간 연동 검증**: 프론트엔드 → 카탈로그 → 리뷰 서비스 플로우

### 구성

1. **프론트엔드**: Playwright `webServer`로 자동 실행
2. **백엔드 서비스**: 도커 컨테이너에서 실행 (사전에 `pnpm up:all` 등으로 실행)
3. **헬스 체크**: `globalSetup`에서 도커 API 서버가 준비될 때까지 대기

```typescript
// tests/e2e-cross/playwright.config.ts
export default defineConfig({
  webServer: {
    command: "pnpm next dev -p 3100",
    cwd: resolve(__dirname, "../../reelnote-frontend"),
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  globalSetup: require.resolve("./src/support/global-setup.ts"),
  globalTeardown: require.resolve("./src/support/global-teardown.ts"),
});
```

### Global Setup (헬스 체크)

```typescript
// tests/e2e-cross/src/support/global-setup.ts
import { createConnection } from "net";

async function waitForPortOpen(port: number, host: string = "localhost"): Promise<void> {
  return new Promise((resolve, reject) => {
    const maxAttempts = 60;
    let attempts = 0;
    const interval = 1000;

    const tryConnect = () => {
      const socket = createConnection(port, host);
      socket.on("connect", () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error(`Port ${port} did not open within ${maxAttempts} seconds`));
        } else {
          setTimeout(tryConnect, interval);
        }
      });
    };
    tryConnect();
  });
}

async function waitForHealthCheck(url: string): Promise<void> {
  const maxAttempts = 60;
  let attempts = 0;
  const interval = 1000;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        console.log(`✅ ${url} is healthy`);
        return;
      }
    } catch (error) {
      // 서버가 아직 준비되지 않음
    }
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`${url} did not become healthy within ${maxAttempts} seconds`);
}

module.exports = async function globalSetup() {
  const catalogUrl = process.env.CATALOG_BASE_URL ?? "http://localhost:4000";
  const reviewUrl = process.env.REVIEW_BASE_URL ?? "http://localhost:5000";

  console.log(`\nWaiting for backend services...`);
  console.log(`Catalog service: ${catalogUrl}`);
  console.log(`Review service: ${reviewUrl}\n`);

  // 헬스 체크로 서버 준비 상태 확인
  await Promise.all([
    waitForHealthCheck(catalogUrl),
    waitForHealthCheck(reviewUrl),
  ]);

  console.log("✅ All backend services are ready\n");
};
```

### 환경 변수 설정

프론트엔드의 API Base URL을 도커 포트로 설정합니다:

```env
# .env.e2e (크로스 테스트용)
NEXT_PUBLIC_CATALOG_API_BASE_URL=http://localhost:4100/api
NEXT_PUBLIC_REVIEW_API_BASE_URL=http://localhost:5100/api
FRONT_BASE_URL=http://localhost:3100
```

또는 테스트 실행 시 환경 변수로 전달:

```bash
NEXT_PUBLIC_CATALOG_API_BASE_URL=http://localhost:4100/api \
NEXT_PUBLIC_REVIEW_API_BASE_URL=http://localhost:5100/api \
nx e2e e2e-cross
```

### 실행 방법

```bash
# 1. 도커 컨테이너 실행 (백엔드 서비스 + DB)
pnpm up:all

# 2. E2E 테스트 실행 (프론트엔드는 자동 실행)
nx e2e e2e-cross

# 또는 직접 실행
pnpm nx run e2e-cross:e2e
```

### 특징

- ✅ 실제 백엔드 서비스와 통신
- ✅ 전체 플로우 검증 가능
- ✅ 서비스 간 연동 검증
- ⚠️ 도커 컨테이너 사전 실행 필요
- ⚠️ 테스트 실행 시간이 상대적으로 김

---

## 실행 방법

### 전체 E2E 테스트 실행

```bash
# 모든 E2E 테스트 실행
nx run-many --target=e2e --projects=e2e-frontend,e2e-cross,e2e-catalog,e2e-review
```

### 개별 테스트 실행

```bash
# 프론트엔드 단독 테스트
nx e2e e2e-frontend

# 크로스 서비스 E2E 테스트
pnpm up:all  # 도커 컨테이너 먼저 실행
nx e2e e2e-cross

# 카탈로그 서비스 E2E 테스트
pnpm up:catalog  # 도커 컨테이너 먼저 실행
nx e2e e2e-catalog

# 리뷰 서비스 E2E 테스트
pnpm up:review  # 도커 컨테이너 먼저 실행
nx e2e e2e-review
```

### CI/CD 환경

CI 환경에서는 `.env.e2e` 파일이 자동으로 로드되며, 도커 컨테이너는 CI 파이프라인에서 관리됩니다.

```yaml
# 예시: GitHub Actions
- name: Start Docker containers
  run: pnpm up:all

- name: Run E2E tests
  run: nx e2e e2e-cross
```

---

## 참고 문서

### 프로젝트 문서

- [프론트엔드 README](../../reelnote-frontend/README.md) - 프론트엔드 프로젝트 개요
- [MSW 가이드](../../reelnote-frontend/src/lib/msw/README.md) - MSW 사용법
- [환경 변수 가이드](../../reelnote-frontend/src/lib/env/README.md) - 환경 변수 설정

### 테스트 프로젝트

- [e2e-frontend](../../tests/e2e-frontend) - 프론트엔드 단독 테스트
- [e2e-cross](../../tests/e2e-cross) - 크로스 서비스 E2E 테스트
- [e2e-catalog](../../tests/e2e-catalog) - 카탈로그 서비스 E2E 테스트
- [e2e-review](../../tests/e2e-review) - 리뷰 서비스 E2E 테스트

### 관련 가이드

- [Frontend 개발 표준 가이드](frontend-development-standards.md) - React Query 패턴, API 통신 등
- [Micro Service 개발 표준 가이드](development-standards.md) - 백엔드 개발 표준

---

## FAQ

### Q: 프론트엔드 단독 테스트에서 백엔드 서버가 필요한가요?

**A:** 아니요. 프론트엔드 단독 테스트는 API를 모킹하므로 백엔드 서버가 필요 없습니다.

### Q: 크로스 테스트에서 프론트엔드를 도커에 올려야 하나요?

**A:** 아니요. 프론트엔드는 Playwright `webServer`로 로컬에서 실행됩니다. 도커에는 백엔드 서비스만 올립니다.

### Q: 크로스 테스트에서 도커 컨테이너가 준비되지 않았습니다.

**A:** `globalSetup`에서 헬스 체크를 수행하지만, 도커 컨테이너가 완전히 시작되지 않았을 수 있습니다. 다음을 확인하세요:
1. `pnpm up:all` 명령이 성공적으로 완료되었는지 확인
2. `docker ps`로 컨테이너가 실행 중인지 확인
3. 각 서비스의 `/health` 엔드포인트가 정상 응답하는지 확인

---

## 요약

### 핵심 원칙

1. **도커에는 API 서버 + 테스트용 DB만 올린다**
2. **프론트엔드는 Playwright `webServer`로 실행한다**
3. **프론트엔드 단독 테스트에서는 API를 모킹한다** (Playwright `page.route()` 또는 MSW)
4. **크로스 E2E 테스트에서는 실제 도커 API를 호출한다** (`globalSetup`에서 헬스 체크)

### 테스트 타입별 선택 가이드

- **UI/UX 검증이 목적** → 프론트엔드 단독 테스트 (`e2e-frontend`)
- **전체 플로우 검증이 목적** → 크로스 서비스 E2E 테스트 (`e2e-cross`)
- **API 엔드포인트 검증이 목적** → 백엔드 단독 테스트 (`e2e-catalog`, `e2e-review`)

