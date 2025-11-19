# Health Check 표준 스펙

> 마이크로서비스 간 Health Check 응답 형식 및 엔드포인트 표준화 문서

## 📋 목차

1. [공통 스펙](#1-공통-스펙)
2. [엔드포인트 설계 원칙](#2-엔드포인트-설계-원칙)
3. [서비스별 구현](#3-서비스별-구현)
4. [원칙 및 가이드라인](#4-원칙-및-가이드라인)
5. [구현 우선순위](#5-구현-우선순위)

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

### 1-3. checks 구조 가이드라인

#### 포함 기준
- **readiness에 포함**: 서비스가 트래픽을 받을 수 있는지 판단하는 핵심 의존성
  - 데이터베이스 연결
  - 필수 캐시 (Redis 등)

- **제외 또는 별도 처리**: 외부 API, 선택적 의존성
  - 외부 API는 실패해도 서비스 전체를 `DOWN`으로 보지 않음
  - 필요시 `checks`에 `DEGRADED` 상태로 표시하거나 별도 엔드포인트 제공

#### 타임아웃 및 보호
- 외부 연동 체크는 **짧은 타임아웃** (예: 1초 이내)
- 실패해도 전체 `status`는 `UP` 유지
- 헬스 체크가 서비스 DDOS가 되지 않도록 주의

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

### 2-3. 게이트웨이 전략

> **게이트웨이가 생겨도 K8s의 readiness/liveness는 각 서비스로 직접 날린다.**

- **인프라/오케스트레이션**: 서비스별 `/health/**` 직접 호출
- **외부/사람**: 게이트웨이 `/health/**` (집계/가공된 버전)
- 게이트웨이만 보고 전체 상태를 판단하지 않음

---

## 3. 서비스별 구현

### 3-1. Catalog Service (NestJS)

#### 엔드포인트
- ✅ `/health/live` - Liveness 체크
- ✅ `/health/ready` - Readiness 체크

#### 구현 요구사항
- `status`: `UP`/`DOWN` 사용 (기존 `ok`/`error` 제거)
- `version`: `package.json`에서 읽어서 애플리케이션 시작 시 메모리에 캐시
- `checks`: readiness에만 포함 (database 등)

#### 버전 읽기 방식
```typescript
// 애플리케이션 시작 시 한 번만 읽기
const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
const version = packageJson.version; // 메모리에 저장
```

### 3-2. Review Service (Spring Boot)

#### 엔드포인트
- ✅ `/health/live` - Liveness 체크 (신규, PublicHealthController)
- ✅ `/health/ready` - Readiness 체크 (신규, PublicHealthController)
- ✅ `/actuator/health/**` - 상세 Health (기존 유지, 인증 필요)

#### 구현 요구사항
- `PublicHealthController` 추가: Actuator health를 공통 스펙 형식으로 변환
- `ServiceMetaHealthIndicator` 추가: 서비스 메타 정보 제공
- `status`: Actuator 표준 (`UP`/`DOWN`) 사용
- `version`: `build.gradle.kts` → `application.yml` 또는 `META-INF/build-info.properties`

#### SecurityConfig
```kotlin
requestMatchers("/health/**").permitAll()  // liveness/readiness
requestMatchers("/actuator/**").hasRole("ADMIN")  // 상세 health
```

#### 버전 읽기 방식
- **방법 1**: `build.gradle.kts`에서 `application.yml`로 주입
- **방법 2**: `META-INF/build-info.properties` 생성 후 Spring Boot `BuildProperties` 사용
- **원칙**: 빌드 아티팩트에 박힌 값을 읽고, 실행 중 환경변수로 override 하지 않음

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

> **checks는 "장난감처럼 막 늘리기"보다**
>
> **서비스 SLA 기준으로 "이게 죽으면 진짜로 이 서비스를 죽었다고 볼 거냐"를 먼저 정의하고 넣자.**

- **포함**: DB, 필수 캐시 (서비스가 동작하지 못하는 핵심 의존성)
- **제외 또는 별도 처리**: 외부 API (실패해도 서비스는 동작 가능)
- **타임아웃**: 외부 연동 체크는 1초 이내, 실패해도 전체 status는 UP 유지

### 4-3. 인증 정책

- **환경별 정책 차이 금지**: 운영/개발 환경에 따라 정책이 달라지면 혼란과 사고의 근원
- **엔드포인트별 고정**:
  - `/health/**`: 항상 인증 없음 (내부망 전제)
  - `/actuator/**`: 항상 인증 필요 (ADMIN/MONITOR)

### 4-4. 프레임워크 독립성

- 각 서비스는 프레임워크 표준 도구 사용 (Actuator, NestJS Health 등)
- 응답 형식만 공통 스펙으로 통일
- 프레임워크 전환 시에도 `/health/**` 경로는 유지

### 4-5. 로깅 및 메트릭

#### 로깅 정책
- **성공 로그**: 남기지 않음 (너무 많이 호출되므로)
- **실패 로그**: `warn` 또는 `error` 레벨로만 기록
- 실패 시 컨텍스트 정보 포함 (어떤 체크가 실패했는지)

#### 메트릭
- **헬스 체크 실패 카운터** 추가
  - 메트릭 이름: `health_check_failures_total` (또는 프레임워크별 표준)
  - 태그: `endpoint` (live/ready), `service`, `check` (database 등)
- 목적: "헬스 체크가 흔들렸다"를 바로 확인 가능
- 예시:
  - Spring Boot: Micrometer `Counter` 사용
  - NestJS: Prometheus 메트릭 또는 커스텀 카운터

---

## 5. 구현 우선순위

### Phase 1: 즉시 (서비스 확장 전) ✅ **완료**
- [x] Review Service: `PublicHealthController` 추가
- [x] Review Service: `/health/live`, `/health/ready` 엔드포인트 제공
- [x] Review Service: `ServiceMetaHealthIndicator` 추가
- [x] Review Service: `SecurityConfig` 수정 (심플 버전)
- [x] Review Service: 버전 읽기 방식 구현 (`build-info.properties`)
- [x] Review Service: 로깅 및 메트릭 추가 (Micrometer Counter)

### Phase 2: 단기 (1-2주 내) ✅ **완료**
- [x] Catalog Service: `/health/live`, `/health/ready` 추가
- [x] Catalog Service: `status` 값 `UP`/`DOWN`으로 변경
- [x] Catalog Service: 버전 읽기 및 캐싱 구현 (`VersionService`)
- [x] Catalog Service: 로깅 및 메트릭 추가 (`HealthMetricsService`)
- [x] Catalog Service: `/api/v1/health` 제거 완료

### Phase 3: 중기 (1개월 내) 🔄 **진행 예정**
- [ ] checks 구조 확장 (필요한 경우)
  - 현재: `database` 체크만 구현됨
  - 향후: `cache`, `external-api` 등 추가 검토 필요
- [ ] 모니터링 도구 연동
  - Review Service: Micrometer Counter 구현 완료 (Prometheus 연동 대기)
  - Catalog Service: `HealthMetricsService` 구현 완료 (Prometheus 연동 대기)
- [ ] 게이트웨이 연동 (게이트웨이 도입 시)
  - 게이트웨이 도입 시 각 서비스 `/health/**` 집계 엔드포인트 제공

---

## 📝 참고사항

- 이 스펙은 **서비스 확장 계획의 일부**로 점진적으로 적용
- 지금 당장 밤새서 할 일은 아니지만, 서비스 늘리기 전에 정리해두면 미래의 유지보수 비용 절감
- 각 Phase 완료 후 문서 업데이트 및 팀 공유

---

## 6. 구현 현황 요약

### ✅ 완료된 작업 (Phase 1, 2)

#### Review Service
- ✅ `PublicHealthController`: `/health/live`, `/health/ready` 엔드포인트 제공
- ✅ `ServiceMetaHealthIndicator`: Actuator health에 메타 정보 추가
- ✅ `SecurityConfig`: `/health/**`는 `permitAll`, `/actuator/**`는 `ADMIN` 역할 필요
- ✅ 버전 읽기: `build-info.properties` 생성 및 `app.version`으로 읽기
- ✅ 로깅: 실패 시에만 `warn` 로그 기록
- ✅ 메트릭: Micrometer `Counter`로 `health_check_failures_total` 구현

#### Catalog Service
- ✅ `/health/live`, `/health/ready` 엔드포인트 추가 (루트 레벨)
- ✅ `status` 값: `UP`/`DOWN`으로 변경 (Actuator 표준)
- ✅ `VersionService`: `package.json`에서 버전 읽어서 메모리 캐싱
- ✅ 로깅: 실패 시에만 `warn` 로그 기록
- ✅ 메트릭: `HealthMetricsService`로 실패 카운터 관리
- ✅ `/api/v1/health`: 제거 완료

### 🔄 남은 작업 (Phase 3)

1. **checks 구조 확장**
   - 현재는 `database` 체크만 구현
   - 필요 시 `cache` (Redis), `external-api` (TMDB) 등 추가 검토

2. **모니터링 도구 연동**
   - Review Service: Micrometer Counter → Prometheus 연동
   - Catalog Service: `HealthMetricsService` → Prometheus 연동
   - Grafana 대시보드 구성

3. **게이트웨이 연동**
   - 게이트웨이 도입 시 각 서비스 `/health/**` 집계 엔드포인트 제공
   - 외부 노출용 통합 health 엔드포인트 구성

### 📌 다음 단계 권장사항

1. **즉시 테스트**: 구현된 엔드포인트 동작 확인
   - `GET /health/live` - 두 서비스 모두
   - `GET /health/ready` - 두 서비스 모두
   - 응답 형식이 공통 스펙과 일치하는지 확인

2. **단기 (1-2주)**: 모니터링 연동
   - Prometheus 설정 및 메트릭 수집 확인
   - 기본 알람 규칙 설정 (헬스 체크 실패 시)

3. **중기 (1개월)**: 게이트웨이 도입 시 연동

