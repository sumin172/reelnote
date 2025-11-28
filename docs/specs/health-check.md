# Health Check 표준 스펙

> 마이크로서비스 간 Health Check 응답 형식 및 엔드포인트 표준화 문서

## 📋 목차

1. [공통 스펙](#1-공통-스펙)
2. [엔드포인트 설계 원칙](#2-엔드포인트-설계-원칙)
3. [서비스별 구현](#3-서비스별-구현)
4. [원칙 및 가이드라인](#4-원칙-및-가이드라인)

---

## 1. 공통 스펙

### 1-1. JSON 응답 형식

```json
{
  "status": "UP",                       // 필수: "UP" | "DOWN" | "OUT_OF_SERVICE" | "UNKNOWN"
  "timestamp": "2025-01-19T04:00:00Z",  // 필수: ISO 8601 형식 (UTC 기준)
  "service": "catalog-service",         // 필수: 서비스 이름
  "checks": {                           // 선택: 하위 컴포넌트 상태
    "database": "UP",
    "cache": "UP"
  },
  "version": "1.2.3"                    // 선택: 서비스 버전
}
```

**timestamp 규칙**:
- 모든 서비스에서 **UTC 기준**으로 통일 (`Instant.now().toString()`)
- 로그/메트릭/알람과 비교 시 시간대 불일치 방지

### 1-2. status 값 규칙

- **Actuator 표준 사용**: `UP`, `DOWN`, `OUT_OF_SERVICE`, `UNKNOWN`
- 커스텀 값(`ok`, `error` 등) 사용 금지
- 프레임워크별 변환은 상위 레이어(게이트웨이/모니터링)에서 처리

### 1-3. checks 구조

`checks`는 readiness에만 포함하며, 서비스가 트래픽을 받을 수 있는지 판단하는 핵심 의존성(DB, 필수 캐시)만 포함합니다.

---

## 2. 엔드포인트 설계 원칙

### 2-1. 경로 통일 원칙

> **K8s는 항상 `/health/live`, `/health/ready`만 본다.**
>
> `/actuator/health/**`는 사람/모니터링 도구 전용이다.

- **인프라/오케스트레이션 관점**: 프레임워크별 경로나 Actuator 세부 구조에 의존하지 않음
- **공통 계약**: `/health/**`를 서비스 공통 계약으로 정의
- **프레임워크 독립성**: Spring → 다른 프레임워크로 전환 시에도 프로브 설정 유지 가능

### 2-2. 엔드포인트 분류

#### Liveness Probe (`/health/live`)
- **목적**: 서비스가 살아있는지 확인 (프로세스/스레드 상태)
- **체크 범위**: 최소한의 메모리/이벤트 루프 확인
- **인증**: 없음 (내부망 전제)
- **응답**: 빠르고 가벼워야 함

#### Readiness Probe (`/health/ready`)
- **목적**: 서비스가 트래픽을 받을 준비가 되었는지 확인
- **체크 범위**: DB 연결, 필수 캐시 등 핵심 의존성
- **인증**: 없음 (내부망 전제)
- **응답**: checks 포함 가능

#### 상세 Health (`/actuator/health/**`)
- **목적**: 사람/모니터링 도구용 상세 정보
- **체크 범위**: DB 상태, 외부 연동 상태, 큐 상태 등 상세 정보
- **인증**: 필요 (ADMIN/MONITOR 역할)
- **응답**: Actuator 표준 형식 유지

#### Prometheus 메트릭 (`/actuator/prometheus`, `/metrics`)
- **목적**: Prometheus 스크래핑용 메트릭
- **인증**:
  - Review Service: ADMIN 권한 필요 (`/actuator/prometheus`)
  - Catalog Service: 인증 없음 (`/metrics`)
- **응답**: Prometheus 형식 (text/plain)

### 2-3. 게이트웨이 전략

> **게이트웨이가 생겨도 K8s의 readiness/liveness는 각 서비스로 직접 날린다.**

- **인프라/오케스트레이션**: 서비스별 `/health/**` 직접 호출
- **외부/사람**: 게이트웨이 `/health/**` (집계/가공된 버전)
- 게이트웨이만 보고 전체 상태를 판단하지 않음

---

## 3. 서비스별 구현

### 3-1. Catalog Service (NestJS)

#### 엔드포인트
- `/health/live` - Liveness 체크
- `/health/ready` - Readiness 체크
- `/metrics` - Prometheus 메트릭

#### 구현 요구사항
- `status`: `UP`/`DOWN` 사용
- `version`: `package.json`에서 읽어서 시작 시 메모리에 캐시
- `checks`: readiness에만 포함 (database 등)

### 3-2. Review Service (Spring Boot)

#### 엔드포인트
- `/health/live` - Liveness 체크
- `/health/ready` - Readiness 체크
- `/actuator/health/**` - 상세 Health (인증 필요)
- `/actuator/prometheus` - Prometheus 메트릭 (인증 필요)

#### 구현 요구사항
- `PublicHealthController`: Actuator health를 공통 스펙 형식으로 변환
- `ServiceMetaHealthIndicator`: 서비스 메타 정보 제공
- `status`: Actuator 표준 (`UP`/`DOWN`) 사용
- `version`: `build.gradle.kts` → `application.yml` 또는 `META-INF/build-info.properties`

#### SecurityConfig
```kotlin
requestMatchers("/health/**").permitAll()
requestMatchers("/actuator/**").hasRole("ADMIN")
```

---

## 4. 원칙 및 가이드라인

### 4-1. 버전 관리 원칙

> **버전은 빌드 아티팩트에 박힌 값을 읽는다.**
>
> **실행 중에 환경변수로 override 하지 않는다.**

- Catalog: `package.json` → 시작 시 메모리 캐시
- Review: `build.gradle.kts` → `application.yml` 또는 `build-info.properties`
- 일관된 규칙 유지로 혼종 지옥 방지

### 4-2. checks 포함 기준

> **checks는 "장난감처럼 막 늘리기"보다 서비스 SLA 기준으로 "이게 죽으면 진짜로 이 서비스를 죽었다고 볼 거냐"를 먼저 정의하고 넣자.**

- **포함**: DB, 필수 캐시 (서비스가 동작하지 못하는 핵심 의존성)
- **제외**: 외부 API (실패해도 서비스는 동작 가능)
- **타임아웃**: 외부 연동 체크는 1초 이내, 실패해도 전체 status는 UP 유지

### 4-3. 인증 정책

- **환경별 정책 차이 금지**: 운영/개발 환경에 따라 정책이 달라지면 혼란과 사고의 근원
- **엔드포인트별 고정**:
  - `/health/**`: 항상 인증 없음 (내부망 전제)
  - `/actuator/**`: 항상 인증 필요 (ADMIN/MONITOR)
  - `/metrics` (Catalog Service): 인증 없음

### 4-4. 프레임워크 독립성

각 서비스는 프레임워크 표준 도구를 사용하되, 응답 형식만 공통 스펙으로 통일합니다. 프레임워크 전환 시에도 `/health/**` 경로는 유지됩니다.

### 4-5. 로깅 및 메트릭

#### 로깅 정책
- **성공 로그**: 남기지 않음 (너무 많이 호출되므로)
- **실패 로그**: `warn` 또는 `error` 레벨로만 기록
- 실패 시 컨텍스트 정보 포함 (어떤 체크가 실패했는지)

#### 메트릭 컨벤션

**기본 원칙**: 공통 개념은 메트릭 이름 공유 + 라벨(태그)로 구분

- **메트릭 이름**: `health_check_failures_total` (모든 서비스 공통)
- **필수 라벨**: `service` (catalog-service, review-service), `endpoint` (live, ready)
- **선택 라벨**: `check` (database, tmdb, redis 등, 필요할 때만 사용)
- **타입**: Counter (실패 횟수 누적)

**예시**:
```promql
health_check_failures_total{service="catalog-service", endpoint="ready", check="database"}
health_check_failures_total{service="review-service", endpoint="live"}
```

---

### 📝 향후 개선 사항

추가 개선 사항(checks 구조 확장, 모니터링 연동, 게이트웨이 연동)은 [docs/improvements.md](../improvements.md)의 "중간 우선순위" 섹션을 참고하세요.

