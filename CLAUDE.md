# Claude Code Guidelines for ReelNote

> Claude Code가 ReelNote 프로젝트에서 작업할 때 참조하는 가이드입니다.

## 🎯 작업 원칙

### 워크플로우
1. **이해** → 요구사항 파악, 관련 파일 탐색 (병렬 Read/Grep, Nx 도구 활용)
2. **계획** → 작업 계획 제안, **사용자 동의 필수** (추가 수정 시 재동의)
3. **실행** → 복잡한 작업은 TodoWrite로 추적, 단계별 구현
4. **검증** → 린트, 테스트 실행

### 커뮤니케이션
- **응답/주석**: 한국어
- **변수/함수/클래스명**: 영어
- 요청된 기능만 구현, Over-engineering 지양

## 📦 프로젝트 컨텍스트

**ReelNote** - 영화 리뷰 플랫폼 (Nx 모노레포 + 마이크로서비스)

- **review-service**: Kotlin + Spring Boot 3.5.7 + PostgreSQL + Flyway + JPA
- **catalog-service**: NestJS + TypeScript + Prisma + PostgreSQL
- **frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **api-schema**: 공유 API 스키마 (TypeScript)
- **환경**: Nx 22.0.3, pnpm (>=10.0.0), Node.js (>=24.0.0), Gradle, PostgreSQL

## ✏️ 코딩 규칙

### 기본
- **들여쓰기**: TS/JS/JSON/YAML 2 spaces, Kotlin/Gradle 4 spaces (탭 금지)
- **명명**: PascalCase (클래스/타입), camelCase (함수/변수), UPPER_SNAKE_CASE (상수)
- **파일명**: TS (kebab-case), Kotlin (PascalCase)

### 기술별
- **TypeScript/NestJS**: ES Modules, 명시적 타입 (any 금지), 생성자 주입, `@Injectable()`
  → 라이브러리/툴링 호환성 이슈 시 CommonJS 전환 가능 (사유 명시)
- **Next.js**: App Router, Server Components 우선, React Query + Zod
  → 복잡한 클라이언트 상태 관리 필요 시 Client Boundary 명시적 허용
- **Kotlin/Spring Boot**: DDD 계층 분리, `@Service`, `@Transactional`
  → 트랜잭션 범위는 유스케이스 단위의 일관성 경계로 정의
- **DB**: catalog-service (Prisma), review-service (Flyway)

### 필수 패턴
1. **TraceId 전파** (⚠️ 최우선)
   - `X-Trace-Id` 헤더 수동 추가 금지, 인터셉터 기반 자동 처리
   - HTTP, 비동기 작업, 이벤트/메시지 전파 시 동일 TraceId 유지, 모든 로그 포함
   → 테스트·3rd-party 연동 등 특수 상황은 공용 헬퍼 사용 시 예외 허용

2. **에러 처리**
   - `ErrorDetail` 스키마 준수 (`code`, `message`, `traceId`), 확장 필드(`details`, `fieldErrors` 등) 옵션
   - 공통 예외는 `BaseAppException` 계열로 매핑
   → 외부 예외는 최종 응답 단계에서 `ErrorDetail`로 변환

3. **API 문서화**
   - OpenAPI 어노테이션/데코레이터 사용, 스키마 생성 결과는 CI에서 검증
   → 문서화 대상은 외부/공개 API를 우선으로 함

4. **트랜잭션**
   - 데이터 변경 시 트랜잭션 적용
   - 트랜잭션 내부에서 외부 API 호출, 메시지 직접 발행 금지
   → 이벤트 발행은 outbox 등 비동기 패턴 우선 고려

5. **테스트**
   - 예외 처리, TraceId 전파, ErrorDetail 형식 검증 포함
   - 공통 검증은 헬퍼/커스텀 matcher로 추상화
   → 유닛 테스트는 로직 중심, 형식 검증은 통합/E2E에서 집중

## 📚 참조 문서
- [개발 표준 가이드](docs/guides/development-standards.md) - 백엔드 필수
- [프론트엔드 개발 표준](docs/guides/frontend-development-standards.md) - 프론트엔드 필수
- [신규 서비스 체크리스트](docs/guides/new-service.md) - 새 서비스 추가 시

---
