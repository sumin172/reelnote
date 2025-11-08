# 환경 변수 관리

단순하고 실용적인 환경 변수 관리 시스템입니다.

## 사용법

```typescript
import { config, isMSWEnabled } from "@/lib/env";

// 환경 변수 접근
const apiUrl = config.apiBaseUrl;
const isDev = config.isDevelopment;

// MSW 활성화 여부
if (isMSWEnabled) {
  console.log("MSW가 활성화되어 있습니다");
}
```

## 환경별 .env 파일 설정

### .env.local (개발 환경)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_ENABLE_MSW=true
NEXT_PUBLIC_USER_SEQ=1
NEXT_PUBLIC_APP_NAME=ReelNote (Dev)
NEXT_PUBLIC_APP_VERSION=0.1.0
```

### .env.production (프로덕션 환경)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.reelnote.com
NEXT_PUBLIC_ENABLE_MSW=false
NEXT_PUBLIC_USER_SEQ=
NEXT_PUBLIC_APP_NAME=ReelNote
NEXT_PUBLIC_APP_VERSION=0.1.0
```

### .env.test (테스트 환경)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_ENABLE_MSW=false
NEXT_PUBLIC_USER_SEQ=1
NEXT_PUBLIC_APP_NAME=ReelNote (Test)
NEXT_PUBLIC_APP_VERSION=0.1.0
```

## 런타임 동작

- `NEXT_PUBLIC_ENABLE_MSW`를 명시하지 않으면 프로덕션에서는 자동으로 `false`, 그 외 환경에서는 `true`로 동작합니다.
- `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`가 비어 있으면 서버 사이드에서 안전한 기본값을 적용하고, 개발 모드일 때만 경고를 출력합니다.
- 환경 변수 검증과 경고는 서버에서만 실행되므로 브라우저 콘솔에는 나타나지 않습니다.

## 환경 변수

| 변수명                     | 필수 | 설명                              |
| -------------------------- | ---- | --------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | ✅   | API 기본 URL                      |
| `NEXT_PUBLIC_ENABLE_MSW`   | ❌   | MSW 활성화 여부 (개발 환경에서만) |
| `NEXT_PUBLIC_USER_SEQ`     | ❌   | 사용자 시퀀스                     |
| `NEXT_PUBLIC_APP_NAME`     | ✅   | 앱 이름                           |
| `NEXT_PUBLIC_APP_VERSION`  | ✅   | 앱 버전                           |

## 장점

- **단순함**: 복잡한 추상화 없이 직관적인 사용
- **성능**: 프로덕션에서 불필요한 코드 제외
- **유지보수**: 간단한 구조로 쉬운 수정
- **환경별 관리**: 각 환경에 맞는 설정 파일
- **필수 변수 검증**: 누락된 환경 변수 자동 감지
