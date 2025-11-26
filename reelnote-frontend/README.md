# ReelNote Frontend

> Next.js 16과 최신 React 생태계를 활용한 영화 리뷰 플랫폼 프론트엔드

마이크로서비스 백엔드와 연동하는 현대적인 웹 애플리케이션으로, 타입 안전성과 개발자 경험을 중시한 프론트엔드 아키텍처를 구현했습니다.

## 🛠 기술 스택

- **Next.js 16.0.1** (App Router) + **React 19.2.0** + **TypeScript 5.9.3**
- **Tailwind CSS 4.1.17** + **shadcn/ui** (Radix UI 기반)
- **React Query 5** (@tanstack/react-query)
- **React Hook Form** + **Zod** (폼 관리 및 검증)
- **MSW 2.12.1** (Mock Service Worker) - 개발 환경 모킹
- **Vitest 4.0.8** + **Testing Library** + **Playwright 1.56.1** (테스트)

## 📁 프로젝트 구조

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # 루트 레이아웃 (Providers, Header)
│   ├── providers.tsx         # 전역 Provider 설정
│   ├── page.tsx              # 홈 페이지
│   ├── (desktop)/            # 데스크톱 레이아웃 그룹
│   │   └── layout.tsx        # 데스크톱 레이아웃
│   ├── (mobile)/             # 모바일 레이아웃 그룹
│   │   └── layout.tsx        # 모바일 레이아웃
│   ├── reviews/              # 리뷰 관련 페이지
│   │   ├── page.tsx          # 리뷰 목록 페이지
│   │   ├── ReviewsList.tsx   # 리뷰 목록 컴포넌트
│   │   └── new/              # 리뷰 작성 페이지
│   │       ├── page.tsx      # 리뷰 작성 페이지
│   │       └── ReviewCreateForm.tsx # 리뷰 작성 폼 컴포넌트
│   └── catalog/              # 카탈로그 관련 페이지
│       ├── page.tsx          # 카탈로그 검색 페이지
│       └── CatalogSearch.tsx # 카탈로그 검색 컴포넌트
├── lib/                      # 공통 라이브러리
│   ├── api/                  # API 클라이언트
│   │   └── client.ts         # apiFetch 유틸리티
│   ├── env/                  # 환경 변수 관리
│   │   └── index.ts          # 환경 변수 설정
│   ├── msw/                  # MSW 설정
│   │   ├── index.ts          # MSW 인터페이스
│   │   ├── manager.ts        # MSW 초기화 로직
│   │   └── handlers.ts       # API 핸들러 정의
│   └── utils.ts              # 공통 유틸리티 함수
├── components/               # 공통 UI 컴포넌트
│   └── ui/                   # shadcn/ui 컴포넌트
├── domains/                  # 도메인별 모듈
│   └── shared/               # 공유 도메인
│       └── components/       # 공유 컴포넌트
│           └── layout/       # 레이아웃 컴포넌트
│               └── Header.tsx
└── hooks/                    # 커스텀 React 훅
```

## 🏗️ 아키텍처 & 설계

> **📖 상세 아키텍처 문서**: [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요.
>
> 프론트엔드는 **Domain-Driven Design** + **Layered Architecture** + **React Query 패턴**을 적용했습니다. 백엔드 서비스와 일관된 아키텍처 개념을 사용하여 전체 시스템을 이해하기 쉽도록 구성했습니다.

### 핵심 아키텍처 패턴

- **Domain-Driven Design**: 도메인별 모듈 분리 (`domains/review`, `domains/catalog`, `domains/shared`)
- **Layered Architecture**: Presentation (`app/`) → Domain/Application (`domains/`) → Infrastructure (`lib/`) 레이어 분리
- **React Query 패턴**: 계층적 QueryKey + 서비스 레이어 + ESLint 제한 (자세한 가이드는 `docs/guides/frontend-development-standards.md`)

### 주요 특징

- API 통신 중앙 관리 및 타입 안전한 환경 변수 관리
- MSW를 통한 개발 환경 독립성 확보
- 계층화된 에러 처리 아키텍처
- React Query (서버 상태) + 도메인 서비스 레이어로 상태 제어 (ESLint로 강제)

## 💡 핵심 구현 특징

1. **타입 안전한 API 통신**: TypeScript + 공통 응답 래핑 처리
   - _API 응답 형식 일관성과 타입 안전성 확보_
2. **환경 변수 관리**: 중앙화된 설정 관리 + 기본값 기반 경고
   - _환경별 설정 관리와 누락된 변수 자동 감지_
3. **MSW 기반 모킹**: 개발 환경 독립성 확보
   - _백엔드 서비스 없이도 프론트엔드 개발 가능_
4. **React Query 통합**: 서버 상태 관리 및 캐싱
   - _자동 리패칭, 에러 처리, 로딩 상태 관리_
5. **테마 지원**: next-themes를 통한 다크모드 지원
   - _사용자 선호도 기반 테마 전환_
6. **폼 관리**: React Hook Form + Zod 스키마 검증
   - _타입 안전한 폼 검증과 성능 최적화_
7. **테스트 전략**: Vitest + Testing Library + Playwright
   - _단위 테스트, 통합 테스트, E2E 테스트로 안정성 확보_

## 🚀 실행 방법

### 1. 환경 변수 설정

환경 변수 목록, 환경별 샘플 `.env` 파일, MSW 기본 동작 등 자세한 설명은 `src/lib/env/README.md`를 참고하세요. 개발 환경에서 빠르게 시작하려면 위 문서를 따라 `.env.local`을 생성하면 됩니다.

### 2. 개발 서버 실행

```bash
# Nx를 통한 실행
nx serve frontend

# 또는 직접 실행
pnpm dev
```

개발 서버가 실행되면 [http://localhost:3000](http://localhost:3000)에서 애플리케이션을 확인할 수 있습니다.

### 3. MSW 설정 (개발 환경)

```bash
# MSW Service Worker 초기화
npx msw init public/ --save
```

개발 환경에서 `NEXT_PUBLIC_ENABLE_MSW=true`로 설정하면 MSW가 자동으로 활성화되어 API 요청이 모킹됩니다.

### 4. 빌드 및 배포

```bash
# 프로덕션 빌드
nx build frontend
# 또는
pnpm build

# 프로덕션 서버 실행
pnpm start
```

## 🧪 테스트

```bash
# 단위 테스트 실행
nx test frontend
# 또는
pnpm test

# 테스트 감시 모드
pnpm test:watch

# E2E 테스트 실행
# Playwright가 자체적으로 개발 서버(`pnpm dev`)를 구동하므로 별도 `pnpm start` 없이 바로 실행하면 됩니다.
pnpm test:e2e

# CI 등에서 이미 서버가 떠 있다면 `playwright.config.ts`의 `reuseExistingServer` 설정이 활성화되어 있어 같은 포트를 그대로 재사용합니다.

# 린트 실행
pnpm lint

# 코드 포맷팅
pnpm format
```

## 🔧 설정

### 환경 변수

공식 환경 변수 정의와 기본값, 실행 시 주의사항은 `src/lib/env/README.md`에서 관리합니다. 이 문서에서는 표 대신 해당 문서를 참조하도록 유지합니다.

### 주요 설정값

**환경 변수 접근** (`lib/env/index.ts`):

```typescript
import { env, userSeq, isMSWEnabled } from "@/lib/env";

// 환경 변수는 Zod로 검증된 env 객체를 통해 접근
const reviewBaseUrl = env.NEXT_PUBLIC_REVIEW_API_BASE_URL;
const catalogBaseUrl = env.NEXT_PUBLIC_CATALOG_API_BASE_URL;
const userId = userSeq; // 개발 환경에서 사용자 식별용
```

**API 설정** (`lib/config/`):

```typescript
import { reviewConfig } from "@/lib/config/review.config";
import { catalogConfig } from "@/lib/config/catalog.config";

// Review API 설정
const reviewBaseUrl = reviewConfig.baseUrl;
const reviewTimeout = reviewConfig.timeout; // 기본값: 10000ms
const reviewRetry = reviewConfig.retry; // 기본값: 3

// Catalog API 설정
const catalogBaseUrl = catalogConfig.baseUrl;
const catalogTimeout = catalogConfig.timeout; // 기본값: 10000ms
const catalogRetry = catalogConfig.retry; // 기본값: 3
```

**React Query 설정** (`app/providers.tsx`):

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### ESLint 정책

- `src/app/**`, `src/components/**`, `src/domains/**` 등 UI 계층에서는 `@/lib/api/client`를 직접 import 할 수 없습니다.
- 모든 API 호출은 `domains/{domain}/services.ts`의 서비스 함수를 통해 이루어져야 하며, 위 규칙은 `eslint.config.mjs`의 `no-restricted-imports`로 강제됩니다.
- Storybook/테스트 파일(`*.stories.*`, `*.test.*`, `__tests__/**`)만 예외입니다.

## 📚 주요 기능

### 현재 구현된 기능

- ✅ 기본 라우팅 구조 (홈, 리뷰 목록, 카탈로그)
- ✅ 반응형 레이아웃 (데스크톱/모바일)
- ✅ 리뷰 작성 UI
- ✅ API 클라이언트 및 환경 변수 관리
- ✅ MSW 기반 개발 환경 모킹
- ✅ React Query 통합
- ✅ 테마 지원 (다크모드)
- ✅ 기본 레이아웃 (Header)

### 향후 구현 예정

- 리뷰 수정/삭제 UI
- 영화 검색 및 상세 정보
- 리뷰 필터링 및 정렬
- 사용자 인증 및 권한 관리
- 리뷰 분석 대시보드

## 🔍 참고사항

- **백엔드 연동**: 현재는 기본 기능 검증 수준의 연동만 구현
- **아키텍처 중심**: 실제 와이어프레임은 적용하지 않음, 아키텍처 구성에 집중
- **MSW 활용**: 개발 환경에서 백엔드 없이도 프론트엔드 개발 가능
- **타입 안전성**: TypeScript로 API 응답 타입 보장
