# Contributing Guide

## 1. 개발 환경

- **Node.js 22**, **pnpm 10** (루트 `pnpm install` 수행)
- **Java 21** (리뷰 서비스 및 Kotlin E2E용)
- Docker / Docker Compose (E2E 통합 환경, CI와 동일한 흐름)

### 로컬 개발 플로우

| 상황            | 권장 명령                     | 비고                          |
|---------------|---------------------------|-----------------------------|
| 빠른 단일 서비스 개발  | `pnpm nx serve <project>` | 예: `pnpm nx serve frontend` |
| 통합 E2E 검증용 환경 | `pnpm up:<front           | catalog                     |review|all>` | `.env.e2e` 값이 자동 주입됨 |
| Compose 종료    | `pnpm down`               | 볼륨 포함 정리                    |

`.env.e2e` 파일에는 통합 테스트에 필요한 베이스 URL, 모니터 계정 등이 정의되어 있습니다. 필요 시 값을 편집하고, CI도 동일한 파일을 로드합니다.

## 2. 테스트 실행

| 종류                         | 명령                             | 비고                                  |
|----------------------------|--------------------------------|-------------------------------------|
| Unit / 기본 테스트              | `pnpm nx run <project>:test`   | 프로젝트별 설정 참고                         |
| Frontend E2E               | `pnpm nx run e2e-frontend:e2e` | Playwright, `.env.e2e` 자동 로드        |
| Catalog Service E2E        | `pnpm nx run e2e-catalog:e2e`  | Jest, HTTP 기반                       |
| Review Service E2E         | `pnpm nx run e2e-review:e2e`   | Kotlin/Gradle, `REVIEW_BASE_URL` 사용 |
| Cross, Contract (scaffold) | TBD                            | 현재는 TODO 메시지만 출력, 향후 구현 예정          |

CI 파이프라인:

- **E2E PR Pipeline** – PR 변경분에 해당하는 E2E만 실행 (`pnpm nx affected --target=e2e`)
- **Nightly E2E Suite** – 매일 전체 E2E/통합 시나리오 실행, 결과는 GitHub Artifacts 보관

## 3. Lint & 코드 규칙

- **TypeScript/Playwright/Jest**: `pnpm nx run e2e-frontend:lint`, `pnpm nx run e2e-catalog:lint` (Prettier 검사 + ESLint), `lint-fix`로 auto-format 가능
- **Kotlin E2E**: `pnpm nx run e2e-review:lint` (ktlint + detekt), `lint-fix`로 auto-format 가능
- **앱 내부 import 금지**: `eslint.config.mjs`의 `no-restricted-imports`가 `tests/**`에서 `apps/**` 경로 의존을 차단합니다. 공통 코드는 `packages/test-*` 또는 `packages/api-schema`를 통해 노출하세요.
- PR 전에 `pnpm nx affected --target=lint` 또는 프로젝트별 lint를 실행하여 규칙 위반을 사전에 방지합니다.

## 4. API 스키마 관리

- 공통 스키마는 `packages/api-schema/generated/`에 저장됩니다.
- 변경 시:
  ```bash
  pnpm api-schema:generate   # 스키마 생성
  pnpm api-schema:clean      # 산출물 초기화
  ```
- `nx affected --target=e2e` 실행 시 `api-schema`에 의존하는 테스트(E2E/계약 등)가 자동으로 포함됩니다.

## 5. 계약/성능/크로스 테스트

- `tests/contract-frontend-catalog/`, `tests/e2e-cross/`는 구조만 마련되어 있습니다.
- 스크립트는 현재 TODO 메시지를 출력하며, 추후 Pact, 통합 시나리오 등으로 교체하세요.
- CI 야간 파이프라인에 단계적으로 통합할 계획이므로, 테스트 작성 시 산출물 경로와 실행 시간을 고려해 주세요.

## 6. PR 체크리스트 예시

- [ ] `pnpm install` / `pnpm nx run <target>` 명령이 성공하는지 확인
- [ ] 필요한 경우 `pnpm api-schema:generate` 실행 후 산출물 커밋
- [ ] E2E/통합 테스트는 Compose 환경(`pnpm up:all`)에서 검증
- [ ] 문서/README/Contributing 관련 변경이 필요한지 검토
- [ ] CI(E2E PR Pipeline, Nightly)에서 실패 시 아티팩트 확인 후 재실행

이 가이드는 지속적으로 발전합니다. 개선 제안은 PR 또는 이슈로 남겨 주세요.

