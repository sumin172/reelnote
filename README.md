# Reelnote

영화 리뷰와 메타데이터를 관리하는 멀티 서비스 모노레포입니다. `Nx` + `pnpm`을 사용해 백엔드와 프론트엔드를 함께 운영합니다.

## Monorepo 구조

- `reelnote-api/`
  - `catalog-service/` – NestJS 기반 영화 메타데이터 서비스
  - `review-service/` – Spring Boot 기반 리뷰 서비스
- `reelnote-frontend/` – Next.js 기반 웹 애플리케이션
- `tools/` – 언어별 공용 설정 (TypeScript 등)
- `docs/` – 진행 현황 및 체크리스트 문서

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
4. 환경 변수 템플릿은 각 패키지의 `ENV.EXAMPLE` 또는 README 문서를 참고하세요.

## 문서

- 진행 상황 요약: `docs/roadmap.md`
- 신규 서비스 체크리스트: `docs/checklists/new-service.md`
- 서비스별 상세 가이드는 각 디렉터리의 `README.md`를 참조하세요.
