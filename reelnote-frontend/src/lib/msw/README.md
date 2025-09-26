# MSW 관리

단순하고 실용적인 MSW(Mock Service Worker) 관리 시스템입니다.

## 사용법

```typescript
import { initializeMSW, createHandlers } from '@/lib/msw';

// MSW 초기화
await initializeMSW(createHandlers());
```

## 구조

```
src/lib/msw/
├── index.ts      # 메인 인터페이스
├── manager.ts    # MSW 초기화 및 설정
├── handlers.ts   # API 핸들러 정의
└── README.md     # 이 문서
```

## 현재 지원하는 API

- `GET /api/v1/movies/search` - 영화 검색
- `GET /api/v1/reviews/my` - 내 리뷰 목록
- `POST /api/v1/reviews` - 리뷰 생성

## 핸들러 추가

```typescript
// handlers.ts에 새로운 핸들러 추가
export function createHandlers(): RequestHandler[] {
  return [
    // 기존 핸들러들...
    
    // 새로운 핸들러
    http.get('/api/v1/new-endpoint', () => {
      return HttpResponse.json({ data: 'mock' });
    }),
  ];
}
```

## 핸들러 분리 전략

### 현재 상태 (권장)
- **단일 파일**: 3개 엔드포인트로 관리하기 적합
- **장점**: 단순함, 빠른 수정, 충돌 없음

### 미래 확장 시 고려사항
- **10개 이상 엔드포인트**: 도메인별 분리 검토
- **복잡한 비즈니스 로직**: 핸들러별 파일 분리
- **대규모 팀**: 충돌 방지를 위한 분리

## 장점

- **단순함**: 복잡한 추상화 없이 직관적인 사용
- **성능**: 개발 환경에서만 동작
- **유지보수**: 간단한 구조로 쉬운 수정
- **확장성**: 필요시 점진적 개선 가능
