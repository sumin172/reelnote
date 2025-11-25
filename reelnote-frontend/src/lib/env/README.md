# 환경 변수 관리

Zod 기반 런타임 검증을 통한 타입 안전한 환경 변수 관리 시스템입니다.

## 사용법

### 도메인별 Config 사용 (권장)

```typescript
import { reviewConfig } from "@/lib/config/review.config";
import { catalogConfig } from "@/lib/config/catalog.config";

// Review API 설정
const reviewBaseUrl = reviewConfig.baseUrl;
const reviewTimeout = reviewConfig.timeout;
const reviewRetry = reviewConfig.retry;

// Catalog API 설정
const catalogBaseUrl = catalogConfig.baseUrl;
const catalogTimeout = catalogConfig.timeout;
const catalogRetry = catalogConfig.retry;
```

### 검증된 env 객체 직접 사용

```typescript
import { env } from "@/lib/env";

// 모든 환경 변수는 Zod로 검증되어 타입 안전합니다
const reviewApiUrl = env.NEXT_PUBLIC_REVIEW_API_BASE_URL;
const reviewTimeout = env.NEXT_PUBLIC_REVIEW_API_TIMEOUT;
```

### 기타 설정

```typescript
import { userSeq, isMSWEnabled } from "@/lib/env";

// 사용자 시퀀스
const userId = userSeq;

// MSW 활성화 여부
if (isMSWEnabled) {
  console.log("MSW가 활성화되어 있습니다");
}
```

## 환경별 .env 파일 설정

### .env.local (개발 환경)

```env
# Review API 설정
NEXT_PUBLIC_REVIEW_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_REVIEW_API_TIMEOUT=10000
NEXT_PUBLIC_REVIEW_API_RETRY=3

# Catalog API 설정
NEXT_PUBLIC_CATALOG_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_CATALOG_API_TIMEOUT=10000
NEXT_PUBLIC_CATALOG_API_RETRY=3

# MSW 설정
NEXT_PUBLIC_ENABLE_MSW=true

# 사용자 설정
NEXT_PUBLIC_USER_SEQ=1

# 앱 설정
NEXT_PUBLIC_APP_NAME=ReelNote (Dev)
NEXT_PUBLIC_APP_VERSION=0.1.0
```

### .env.production (프로덕션 환경)

```env
# Review API 설정
NEXT_PUBLIC_REVIEW_API_BASE_URL=https://review.reelnote.com/api
NEXT_PUBLIC_REVIEW_API_TIMEOUT=10000
NEXT_PUBLIC_REVIEW_API_RETRY=3

# Catalog API 설정
NEXT_PUBLIC_CATALOG_API_BASE_URL=https://catalog.reelnote.com/api
NEXT_PUBLIC_CATALOG_API_TIMEOUT=10000
NEXT_PUBLIC_CATALOG_API_RETRY=3

# MSW 설정
NEXT_PUBLIC_ENABLE_MSW=false

# 사용자 설정
NEXT_PUBLIC_USER_SEQ=

# 앱 설정
NEXT_PUBLIC_APP_NAME=ReelNote
NEXT_PUBLIC_APP_VERSION=0.1.0
```

### .env.test (테스트 환경)

```env
# Review API 설정
NEXT_PUBLIC_REVIEW_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_REVIEW_API_TIMEOUT=10000
NEXT_PUBLIC_REVIEW_API_RETRY=3

# Catalog API 설정
NEXT_PUBLIC_CATALOG_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_CATALOG_API_TIMEOUT=10000
NEXT_PUBLIC_CATALOG_API_RETRY=3

# MSW 설정
NEXT_PUBLIC_ENABLE_MSW=false

# 사용자 설정
NEXT_PUBLIC_USER_SEQ=1

# 앱 설정
NEXT_PUBLIC_APP_NAME=ReelNote (Test)
NEXT_PUBLIC_APP_VERSION=0.1.0
```

## 런타임 동작

- `NEXT_PUBLIC_ENABLE_MSW`를 명시하지 않으면 프로덕션에서는 자동으로 `false`, 그 외 환경에서는 `true`로 동작합니다.
- `NEXT_PUBLIC_REVIEW_API_BASE_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`가 비어 있으면 서버 사이드에서 안전한 기본값을 적용하고, 개발 모드일 때만 경고를 출력합니다.
- 환경 변수 검증과 경고는 서버에서만 실행되므로 브라우저 콘솔에는 나타나지 않습니다.

## 환경 변수

### Review API 설정

| 변수명                            | 필수 | 기본값 | 설명                   |
| --------------------------------- | ---- | ------ | ---------------------- |
| `NEXT_PUBLIC_REVIEW_API_BASE_URL` | ✅   | -      | Review API 기본 URL    |
| `NEXT_PUBLIC_REVIEW_API_TIMEOUT`  | ❌   | 10000  | API 요청 타임아웃 (ms) |
| `NEXT_PUBLIC_REVIEW_API_RETRY`    | ❌   | 3      | API 요청 재시도 횟수   |

### Catalog API 설정

| 변수명                             | 필수 | 기본값 | 설명                   |
| ---------------------------------- | ---- | ------ | ---------------------- |
| `NEXT_PUBLIC_CATALOG_API_BASE_URL` | ✅   | -      | Catalog API 기본 URL   |
| `NEXT_PUBLIC_CATALOG_API_TIMEOUT`  | ❌   | 10000  | API 요청 타임아웃 (ms) |
| `NEXT_PUBLIC_CATALOG_API_RETRY`    | ❌   | 3      | API 요청 재시도 횟수   |

### 기타 설정

| 변수명                    | 필수 | 설명                              |
| ------------------------- | ---- | --------------------------------- |
| `NEXT_PUBLIC_ENABLE_MSW`  | ❌   | MSW 활성화 여부 (개발 환경에서만) |
| `NEXT_PUBLIC_USER_SEQ`    | ❌   | 사용자 시퀀스                     |
| `NEXT_PUBLIC_APP_NAME`    | ❌   | 앱 이름                           |
| `NEXT_PUBLIC_APP_VERSION` | ❌   | 앱 버전                           |

## 아키텍처 원칙

### 검증 위치 1곳, 사용처 여러 곳

- **모든 환경 변수는 `validation.ts`의 Zod 스키마에서 검증**
- 도메인별 Config 객체는 검증된 `env` 객체만 참조
- `process.env` 직접 접근 금지 (단일 소스 오브 트루스 유지)

### 서버/클라이언트 분리

- 클라이언트 컴포넌트에서는 `NEXT_PUBLIC_*` 접두사가 있는 환경 변수만 접근 가능
- 서버 전용 환경 변수는 이 모듈에서 export하지 않음
- 클라이언트에서 접근 불가능한 환경 변수 사용 시 빌드 타임 에러 발생

### 도메인별 Config 패턴

- 각 도메인(Review, Catalog)별로 독립적인 Config 객체 제공
- 백엔드 서비스와 동일한 개념적 구조 유지
- 확장 가능: timeout, retry 등 추가 설정 용이

## 장점

- **타입 안전성**: Zod 기반 런타임 검증으로 타입 안전 보장
- **조기 실패**: 빌드/런타임 시점에 검증하여 프로덕션 배포 전 오류 발견
- **도메인 분리**: 각 API별 설정을 독립적으로 관리
- **확장성**: 새로운 설정 추가 시 스키마에만 추가하면 자동 검증
- **테스트 용이성**: Config 객체를 Mock으로 대체 가능
- **유지보수**: 간단한 구조로 쉬운 수정
- **환경별 관리**: 각 환경에 맞는 설정 파일
- **필수 변수 검증**: 누락된 환경 변수 자동 감지
