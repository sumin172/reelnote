# Reelnote Roadmap

- 생성일: 2025년 기준
- 마지막 업데이트: Catalog Service 배포 준비 점검 중

---

## ✅ 완료된 작업

- Catalog Service 골격 구축 (NestJS, Prisma, Redis 통합)
- Catalog Service 문서화 (`README.md`, `ARCHITECTURE.md`, `ENV.EXAMPLE`)
- 도구 설정 공통화 (`tools/ts/*`, 루트 `tsconfig.base.json` 상속 구조)
- 루트 `.editorconfig`, `.gitattributes` 정비
- Nx + pnpm 기반 워크스페이스 정리
- Catalog·Review API 버전 전략 정비 (`/api/v1` URI 통일, 호출부에서 버전 관리)
- 프론트엔드 환경 변수 및 API 클라이언트 재정비 (`NEXT_PUBLIC_REVIEW_API_BASE_URL`, `NEXT_PUBLIC_CATALOG_API_BASE_URL`)
- Catalog ↔ Review 연동 안정성 강화 (WebClient 타임아웃, 공통 base URL 적용)

## 🚧 진행 중인 작업

### Catalog Service 마무리

- `.env` 생성 및 환경 변수 값 채우기 (`CATALOG_DB_URL`, `TMDB_API_KEY`, `REDIS_URL` 등)
- `pnpm install`, `nx run catalog-service:prisma:*` 실행으로 스키마 반영
- PostgreSQL 인스턴스 연결 및 마이그레이션 확인
- `nx serve catalog-service` 실행 테스트 및 TMDB 연동 검증
- 캐시 레이어(REDIS) 동작 확인 및 헬스체크 엔드포인트 점검

### 테스트 & 품질

- 서비스별 테스트 전략 수립 (Testcontainers, E2E 포함)
- CI 캐시 전략 및 매트릭스 구성 보완
- 관측성(로그, 트레이싱, 메트릭) 최소 기준 확립

## 🗂️ 향후 계획

- 신규 마이크로서비스 추가를 위한 공통 체크리스트 유지 (`docs/checklists/new-service.md`)
- Docker 기반 로컬 개발 환경 정비 (`infra/dev.compose.yml` 등)
- Renovate 도입 및 언어별 버전 고정 정책 확립
- GitHub Actions 워크플로우 최적화 및 병렬화

---

> 진행 상황이 변경되면 이 문서를 업데이트하고, 상세 체크리스트는 각 문서에서 유지합니다.

