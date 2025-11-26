# 프로젝트 문서

> ReelNote 프로젝트의 문서 인덱스 및 시작 가이드

## 📋 빠른 링크

### 공통 스펙 문서 (`specs/`)

프로젝트 전체에서 공통으로 사용하는 스펙 문서입니다.

- **[에러 처리 스펙](specs/error-handling.md)** – 에러 응답 형식, 에러 코드 목록, TraceId 정책, 로깅 정책, 프레임워크별 구현 가이드
- **[헬스 체크 스펙](specs/health-check.md)** – Health Check 응답 형식 및 엔드포인트 표준

### 가이드 문서 (`guides/`)

개발 시 참고할 가이드 문서입니다.

- **[Micro Service 개발 표준 가이드](guides/development-standards.md)** ⭐ **실시간 참조** – 기능 추가/개선 시 항상 고려할 표준 (TraceId, 에러 처리, 로깅 등)
- **[Frontend 개발 표준 가이드](guides/frontend-development-standards.md)** ⭐ **실시간 참조** – 기능 추가/개선 시 항상 고려할 표준 (React Query 패턴, 에러 처리, API 통신 등)
- **[로깅 가이드](guides/logging.md)** – 로그 레벨 매핑, 구조화 로깅, TraceId 전파 등 로깅 표준
- **[신규 서비스 체크리스트](guides/new-service.md)** – 새 마이크로서비스 추가 시 전체 체크리스트

### 기타 문서

- **[기술 개선 사항](improvements.md)** – 당장 작업하지 않지만 향후 개선하면 좋을 내용들

---

## 📁 문서 구조

```
docs/
├── README.md                    # 이 문서 (문서 인덱스)
├── specs/                       # 공통 스펙 문서
│   ├── error-handling.md        # 에러 처리 스펙 및 가이드
│   └── health-check.md          # 헬스 체크 스펙
├── guides/                      # 가이드 문서
│   ├── development-standards.md # Micro Service 개발 표준 가이드 (실시간 참조) ⭐
│   ├── frontend-development-standards.md # Frontend 개발 표준 가이드 (실시간 참조) ⭐
│   ├── logging.md               # 로깅 가이드 (로그 레벨, 구조화 로깅, TraceId 전파)
│   └── new-service.md           # 신규 서비스 체크리스트
└── improvements.md              # 기술 개선 사항 모음
```

---

## 🎯 온보딩 가이드

### 구조 이해를 원한다면

1. **프로젝트 개요**: 루트 `README.md`를 먼저 읽어보세요.
2. **공통 스펙 이해**:
   - [에러 처리 스펙](specs/error-handling.md) - 에러 응답 형식, TraceId 정책 등
   - [헬스 체크 스펙](specs/health-check.md) - Health Check 엔드포인트 구현
3. **서비스별 문서**: 각 서비스의 `README.md`와 `ARCHITECTURE.md`를 참고하세요.
   - `reelnote-api/review-service/README.md`, `ARCHITECTURE.md`
   - `reelnote-api/catalog-service/README.md`, `ARCHITECTURE.md`
   - `reelnote-frontend/README.md`, `ARCHITECTURE.md`

### 새 서비스를 추가한다면

1. **[신규 서비스 체크리스트](guides/new-service.md)**를 따라 진행하세요.
2. 공통 스펙 문서를 참고하여 구현하세요:
   - 에러 처리 스펙
   - 헬스 체크 스펙

---

## 📝 문서 작성 가이드

### 위치 결정 기준

- **공통 스펙** (`specs/`): 모든 서비스에서 공통으로 사용하는 스펙 문서
  - 예: 에러 응답 형식, Health Check 형식, API 버전 전략
- **가이드 문서** (`guides/`): 개발 시 참고할 가이드 문서
  - 예: 체크리스트, 개발 가이드, 배포 가이드
- **서비스별 문서**: 각 서비스 디렉터리의 `README.md`, `ARCHITECTURE.md`
  - 예: 서비스 개요, 아키텍처, 환경 변수 설정

### 문서 링크 규칙

- **상대 경로 사용**: `docs/` 폴더 내에서는 상대 경로 사용
  - 예: `[에러 처리 스펙](specs/error-handling.md)`
- **루트 기준 경로**: 코드 파일의 주석에서는 루트 기준 경로 사용
  - 예: `docs/specs/error-handling.md`

---

## 🔗 관련 문서

### 프로젝트 루트

- [README.md](../README.md) – 프로젝트 개요 및 시작 가이드

### 서비스별 문서

각 서비스의 상세 문서:

- **Review Service** (Spring Boot)
  - [README](../reelnote-api/review-service/README.md) – 서비스 개요
  - [ARCHITECTURE.md](../reelnote-api/review-service/ARCHITECTURE.md) – 아키텍처 상세

- **Catalog Service** (NestJS)
  - [README](../reelnote-api/catalog-service/README.md) – 서비스 개요
  - [ARCHITECTURE.md](../reelnote-api/catalog-service/ARCHITECTURE.md) – 아키텍처 상세

- **Frontend** (Next.js)
  - [README](../reelnote-frontend/README.md) – 프론트엔드 개요
  - [ARCHITECTURE.md](../reelnote-frontend/ARCHITECTURE.md) – 아키텍처 상세

---

## 📌 참고사항

- 문서는 지속적으로 업데이트됩니다. 변경사항은 PR을 통해 제안해주세요.
- 기술 부채나 개선 사항은 [improvements.md](improvements.md)에 기록되어 있습니다.

