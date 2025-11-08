# 신규 마이크로서비스 체크리스트

새로운 서비스를 추가할 때 아래 항목을 순차적으로 점검하세요.

## 1. 프로젝트 구조 등록

- [ ] `reelnote-api/` 등 적절한 디렉터리에 서비스 생성
- [ ] `nx.json` 또는 `project.json`에 프로젝트와 태그 정의
- [ ] `pnpm-workspace.yaml`에 패키지 경로 추가 (Node.js 기반일 경우)
- [ ] 주요 Nx 타깃(`build`, `serve`, `test` 등) 설정

## 2. 코드 스타일 & 린팅

- [ ] `.editorconfig`, `.gitattributes`에 필요한 언어 규칙 반영
- [ ] 서비스 전용 `eslint.config.mjs`, `ktlint`, `ruff`, `golangci-lint` 등 설정 파일 생성
- [ ] CI 워크플로우에 린트 작업 추가 또는 업데이트

## 3. 설정 파일

- [ ] `.env.example` 작성 및 필수 환경 변수 문서화
- [ ] `.gitignore` 업데이트
- [ ] 서비스 README에 기술 스택, 구조, 실행 방법, API 문서 링크 정리

## 4. 테스트 설정

- [ ] 단위/통합 테스트 프레임워크 설정 (Jest, Vitest, JUnit, pytest 등)
- [ ] 필요 시 `*-e2e` 프로젝트와 시나리오 정의
- [ ] `nx.json`의 `targetDefaults.test`와 호환되는지 확인

## 5. CI/CD

- [ ] `build`/`test` 타깃이 CI에서 동작하도록 설정
- [ ] 필요한 환경 변수/시크릿 문서화 및 등록
- [ ] 배포 워크플로우(컨테이너 빌드, 배포 프로세스)가 있다면 문서화

## 6. 컨테이너 & 로컬 개발

- [ ] 멀티스테이지 `Dockerfile`과 `.dockerignore` 작성
- [ ] 로컬 개발용 `docker-compose` 서비스 추가 (필요 시)
- [ ] 헬스체크 엔드포인트 구현 (`/health`, `/actuator/health` 등)

## 7. 관측성

- [ ] 구조화된 로깅 포맷 정의
- [ ] 메트릭/트레이싱(OpenTelemetry, Jaeger 등) 도입 여부 결정
- [ ] 상관관계 ID 미들웨어/필터 구현

## 8. 보안 및 시크릿

- [ ] 의존성 취약점 스캔 도구 설정 (Dependabot, Renovate 등)
- [ ] 환경 변수 검증 스키마 정의
- [ ] 인증/인가, CORS 등 보안 설정 검토

## 9. 운영 모니터링

- [ ] 헬스체크 및 경고 시스템 구성
- [ ] 로그 집계/관찰 도구(Loki, ELK 등) 연동 여부 검토
- [ ] 장애 대응 및 알림 흐름 정리

---

필요시 항목을 자유롭게 확장하고, 서비스 README 또는 운영 문서와 연동해 최신 상태를 유지하세요.

