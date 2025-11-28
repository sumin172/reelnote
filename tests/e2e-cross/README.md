# Cross-Service E2E

프런트엔드 → 카탈로그 → 리뷰 서비스로 이어지는 통합 시나리오를 구현하는 E2E 테스트 프로젝트입니다.

> **📖 상세 가이드**: [E2E 테스트 가이드](../../docs/guides/e2e-testing-guide.md)를 참고하세요.

## 핵심 구성

- **프론트엔드**: Playwright `webServer`로 자동 실행 (포트 3100)
- **백엔드 서비스**: 도커 컨테이너에서 실행 (사전에 `pnpm up:all` 실행 필요)
- **헬스 체크**: `globalSetup`에서 도커 API 서버가 준비될 때까지 대기

## 실행 방법

```bash
# 1. 도커 컨테이너 실행 (백엔드 서비스 + DB)
pnpm up:all

# 2. E2E 테스트 실행 (프론트엔드는 자동 실행)
nx e2e e2e-cross
```

## 특징

- `implicitDependencies`는 세 앱과 `api-schema`에 연결되어 있어 세 도메인 중 하나라도 변경되면 `nx affected --target=e2e` 범위에 포함됩니다.
- 실제 백엔드 서비스와 통신하여 전체 플로우를 검증합니다.

