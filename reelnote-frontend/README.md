# ReelNote Frontend

> Next.js 16과 최신 React 생태계를 활용한 영화 리뷰 플랫폼 프론트엔드

마이크로서비스 백엔드와 연동하는 현대적인 웹 애플리케이션으로, 타입 안전성과 개발자 경험을 중시한 프론트엔드 아키텍처를 구현했습니다.

## 🛠 기술 스택

- **Next.js 16.0.1** (App Router) + **React 19.2.0** + **TypeScript 5.9.3**
- **Tailwind CSS 4.1.17** + **shadcn/ui** (Radix UI 기반)
- **React Query 5** (@tanstack/react-query) + **Zustand**
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

### 계층형 아키텍처

- **Presentation Layer**: Next.js App Router + React 컴포넌트
- **Application Layer**: React Query + 커스텀 훅 (비즈니스 로직)
- **Infrastructure Layer**: API 클라이언트 + 환경 설정
- **Domain Layer**: 도메인별 모듈 분리 (domains 폴더)

### 관심사 분리

- **API 통신**: `lib/api/client.ts`에서 중앙 관리
- **환경 변수**: `lib/env`에서 타입 안전하게 관리
- **모킹**: MSW를 통한 개발 환경 독립성 확보
- **상태 관리**: React Query (서버 상태) + Zustand (클라이언트 상태)

```typescript
// API 클라이언트: 표준 HTTP 응답 처리
export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const res = await fetch(url, { ... });

  // 성공 응답: 리소스를 그대로 반환 (래퍼 없음)
  // 에러 응답: 표준 에러 스키마 { code, message, details, traceId } 처리
  return json as T;
}
```

### 마이크로서비스 연동

- **API Gateway 패턴**: 단일 API 클라이언트로 여러 서비스 통합
- **MSW 모킹**: 백엔드 서비스 없이도 프론트엔드 개발 가능
- **타입 안전성**: TypeScript로 API 응답 타입 보장

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

## 🔧 구현 예시

### 환경 변수 관리: 타입 안전한 설정

```typescript
// lib/env/index.ts
export const config = {
  // API 설정 (안전한 접근자 사용)
  get reviewApiBaseUrl() {
    return getReviewApiBaseUrl();
  },

  // MSW 설정 (개발 환경에서만)
  get enableMSW() {
    return process.env.NEXT_PUBLIC_ENABLE_MSW === "true" && isDevelopment;
  },

  // 앱 설정
  get appName() {
    return getAppName();
  },
  get appVersion() {
    return getAppVersion();
  },

  // 환경 감지
  isDevelopment,
  isProduction,
  isTest,
} as const;

// 사용 예시
import { config } from "@/lib/env";
const reviewApiUrl = config.reviewApiBaseUrl; // 타입 안전하게 접근
```

**장점:**

- **타입 안전성**: TypeScript로 환경 변수 접근 보장
- **지연 검증**: 개발 환경에서만 필수 변수 검증
- **기본값 처리**: 누락된 변수에 대한 안전한 기본값 제공

### MSW를 활용한 개발 환경 독립성

```typescript
// lib/msw/manager.ts
export async function initializeMSW(handlers: RequestHandler[]): Promise<void> {
  if (!isMSWEnabled) return;

  const worker = setupWorker(...handlers);
  await worker.start({
    onUnhandledRequest: "bypass", // 처리되지 않은 요청은 그대로 통과
  });
}

// app/providers.tsx
React.useEffect(() => {
  if (process.env.NODE_ENV === "development") {
    import("@/lib/msw")
      .then(({ initializeMSW, createHandlers }) =>
        initializeMSW(createHandlers()),
      )
      .catch((error) => console.warn("MSW 초기화 실패:", error));
  }
}, []);
```

**장점:**

- **개발 독립성**: 백엔드 서비스 없이도 프론트엔드 개발 가능
- **점진적 통합**: 실제 API와 모킹 간 전환 용이
- **에러 처리**: MSW 초기화 실패 시에도 애플리케이션 동작 보장

## 🤔 기술적 의사결정

### 아키텍처 선택

- **Next.js App Router 선택 이유**: 최신 React 기능 활용 및 서버 컴포넌트 지원
- **React Query 선택 이유**: 서버 상태 관리와 캐싱 전략의 표준화
- **Zustand 선택 이유**: 간단한 클라이언트 상태 관리가 필요한 경우 활용

### 기술 스택 선택

- **Next.js 16**: React 19 지원 및 성능 최적화 기능 활용
- **Tailwind CSS 4.1**: 유틸리티 퍼스트 CSS로 빠른 개발
- **shadcn/ui**: 접근성과 커스터마이징이 용이한 컴포넌트 라이브러리
- **MSW 2.12**: 실제 네트워크 레벨에서의 모킹으로 현실적인 테스트 환경 제공

### 개발 경험 최적화

- **타입 안전성**: TypeScript로 런타임 에러 방지
- **환경 변수 검증**: 개발 환경에서 필수 변수 누락 감지
- **에러 처리**: React Query의 에러 핸들링과 재시도 로직 활용

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

```typescript
// lib/api/client.ts
const config = {
  reviewApiBaseUrl:
    process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL || "http://localhost:8080/api",
  catalogApiBaseUrl:
    process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL || "http://localhost:3001/api",
  userSeq: process.env.NEXT_PUBLIC_USER_SEQ
    ? parseInt(process.env.NEXT_PUBLIC_USER_SEQ, 10)
    : null,
};

// React Query 설정
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
