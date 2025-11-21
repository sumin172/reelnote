# 로깅 가이드

> ReelNote MSA 프로젝트의 로깅 표준 및 구현 가이드
>
> - 목적: 프레임워크 차이를 인정하되, 로그 출력 형식 & 공통 필드 & 레벨 규칙을 통일하여 관찰성 확보
> - 대상: 모든 마이크로서비스 (NestJS, Spring Boot)
> - 원칙: 로깅 라이브러리/패턴 자체는 통일하지 않음. 출력 형식과 규칙만 통일

---

## 📋 목차

1. [로깅 원칙](#1-로깅-원칙)
2. [로그 레벨 매핑](#2-로그-레벨-매핑)
3. [구조화 로깅](#3-구조화-로깅)
4. [에러 로깅 구조화](#4-에러-로깅-구조화)
5. [TraceId 전파](#5-traceid-전파)
6. [공통 필드 정의](#6-공통-필드-정의)
7. [구현 예시](#7-구현-예시)

---

## 1. 로깅 원칙

### 1-1. 핵심 원칙

**프레임워크 차이는 인정, 관찰성은 통일**

- ✅ **통일하는 것**: 로그 출력 형식, 공통 필드, 레벨 사용 규칙
- ❌ **통일하지 않는 것**: 로깅 라이브러리/패턴 자체
  - NestJS는 Nest Logger 사용
  - Spring Boot는 SLF4J LoggerFactory 사용

### 1-2. 목표

1. **요청 추적**: `traceId`를 통한 분산 추적
2. **에러 분석**: 구조화된 에러 로그로 빠른 문제 진단
3. **모니터링**: 공통 필드로 로그 집계/검색 가능
4. **향후 확장**: ELK/Loki 계열 중앙 집계 스택으로의 전환 준비

---

## 2. 로그 레벨 매핑

### 2-1. 레벨 매핑표

프레임워크 간 로그 레벨을 일관되게 사용하기 위한 매핑표입니다.

| NestJS    | Spring Boot | 용도                                | 예시                    |
|-----------|-------------|-----------------------------------|-----------------------|
| `verbose` | `TRACE`     | 매우 상세한 디버깅 정보 (쿼리 바인딩 값, 내부 상태 등) | SQL 바인딩 파라미터 값        |
| `debug`   | `DEBUG`     | 개발/디버깅용 상세 정보 (중간 상태, 파라미터 값 등)   | 캐시 HIT/MISS, 요청 파라미터  |
| `log`     | `INFO`      | 일반적인 정보 (요청 시작/완료, 중요한 상태 변경 등)   | "리뷰 생성 완료: id=123"    |
| `warn`    | `WARN`      | 경고 (비즈니스 예외, 검증 실패, 재시도 가능한 실패 등) | "리뷰를 찾을 수 없음: id=123" |
| `error`   | `ERROR`     | 에러 (예상치 못한 예외, 시스템 오류, 처리 필요한 문제) | 예외 스택 트레이스 포함         |

### 2-2. 레벨별 사용 기준

#### TRACE / verbose
- **사용 시나리오**: 매우 상세한 디버깅 정보가 필요한 경우
- **예시**:
  - SQL 쿼리의 바인딩 파라미터 값
  - 복잡한 알고리즘의 중간 단계 값
  - 내부 상태 변경의 상세 흐름
- **주의**: 프로덕션에서는 일반적으로 비활성화

#### DEBUG / debug
- **사용 시나리오**: 개발/디버깅 중에만 필요한 상세 정보
- **예시**:
  - 캐시 HIT/MISS 여부
  - 요청 파라미터 값 (민감 정보 제외)
  - 중간 처리 단계의 결과
- **주의**: 프로덕션에서 선택적 활성화 가능

#### INFO / log
- **사용 시나리오**: 정상적인 비즈니스 로직의 중요한 이벤트
- **예시**:
  - "리뷰 생성 완료: id=123, userId=456, movieId=789"
  - "영화 동기화 완료: tmdbId=12345"
  - "캐시 초기화 완료"
- **주의**: 과도한 로깅은 피하고, 중요한 이벤트만 기록

#### WARN / warn
- **사용 시나리오**: 비즈니스 예외, 검증 실패, 재시도 가능한 실패
- **예시**:
  - "리뷰를 찾을 수 없음: id=123, traceId=xxx"
  - "검증 실패: rating은 1-5 사이여야 합니다"
  - "외부 API 호출 실패 (재시도 예정): tmdbId=12345"
- **주의**: 4xx 에러는 일반적으로 WARN 레벨

#### ERROR / error
- **사용 시나리오**: 예상치 못한 예외, 시스템 오류
- **예시**:
  - "예상치 못한 예외 발생: Database connection failed"
  - "외부 API 호출 실패 (Circuit Breaker Open): tmdbId=12345"
- **주의**: 5xx 에러는 일반적으로 ERROR 레벨, 스택 트레이스 포함

### 2-3. 레벨 매핑 활용

**팀 내 커뮤니케이션:**
- "Nest에서 verbose로 찍은 건, Spring으로 치면 TRACE다"
- "로깅 기준 문서화로 팀 간 감각 통일"

**모니터링/알람 기준:**
- ERROR 레벨 로그 → 즉시 알람
- WARN 레벨 로그 → 주기적 리뷰
- INFO 레벨 이상 → 통계 수집

---

## 3. 구조화 로깅

### 3-1. JSON 포맷 사용

로그 출력은 **JSON 포맷**을 기본 타겟으로 합니다.

**목적:**
- 중앙 집계 도구(ELK/Loki)와의 호환성
- 구조화된 데이터로 검색/필터링 용이
- 파싱 및 분석 자동화

### 3-2. 기본 로그 구조

```json
{
  "@timestamp": "2025-01-15T10:30:45.123Z",
  "level": "INFO",
  "service": "catalog-service",
  "message": "리뷰 생성 완료",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "reviewId": 123,
    "userId": 456,
    "movieId": 789
  }
}
```

### 3-3. 프레임워크별 구현

#### NestJS

**옵션 1: Winston 어댑터 사용 (권장)**
```typescript
// main.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.json(),
        }),
      ],
    }),
  });
}
```

**옵션 2: Pino 사용**
```typescript
import { Logger } from 'nestjs-pino';

const app = await NestFactory.create(AppModule, {
  bufferLogs: true,
});
app.useLogger(app.get(Logger));
```

#### Spring Boot

**logback-spring.xml 설정**
```xml
<configuration>
  <appender name="JSON_CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
      <providers>
        <timestamp/>
        <version/>
        <logLevel/>
        <message/>
        <mdc/>
        <stackTrace/>
      </providers>
    </encoder>
  </appender>

  <root level="INFO">
    <appender-ref ref="JSON_CONSOLE" />
  </root>
</configuration>
```

**필요 의존성:**
```kotlin
implementation("net.logstash.logback:logstash-logback-encoder:7.4")
```

### 3-4. 구조화 로깅 사용 예시

**문자열 기반 (비권장):**
```typescript
// ❌ 비권장: 구조화되지 않은 로그
this.logger.log(`리뷰 생성 완료: movieId=${movieId}, reviewId=${reviewId}`);
```

**필드 기반 (권장):**
```typescript
// ✅ 권장: 구조화된 로그
this.logger.log({
  message: "리뷰 생성 완료",
  movieId,
  reviewId,
});
```

**Spring Boot (SLF4J)**
```kotlin
// ✅ 권장: 구조화된 로그 (MDC 사용)
logger.info("리뷰 생성 완료: movieId={}, reviewId={}", movieId, reviewId)

// 또는 JSON 로깅 라이브러리 사용 시
logger.info("리뷰 생성 완료", mapOf("movieId" to movieId, "reviewId" to reviewId))
```

---

## 4. 에러 로깅 구조화

### 4-1. 에러 로그 구조

에러 로그는 다음 구조를 따릅니다:

```json
{
  "@timestamp": "2025-01-15T10:30:45.123Z",
  "level": "ERROR",
  "service": "catalog-service",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "errorCode": "CATALOG_MOVIE_NOT_FOUND",
  "errorType": "BUSINESS",
  "message": "Movie not found",
  "metadata": {
    "movieId": 123,
    "userId": 456
  },
  "stack": "..."
}
```

### 4-2. 필드 설명

| 필드          | 타입       | 필수 | 설명                                   |
|-------------|----------|----|--------------------------------------|
| `errorCode` | `string` | ✅  | 에러 코드 (예: `CATALOG_MOVIE_NOT_FOUND`) |
| `errorType` | `string` | ✅  | 에러 타입: `BUSINESS` 또는 `SYSTEM`        |
| `message`   | `string` | ✅  | 에러 메시지                               |
| `metadata`  | `object` | ❌  | 에러 컨텍스트 (movieId, userId 등)          |
| `stack`     | `string` | ❌  | 스택 트레이스 (SYSTEM 에러 또는 필요 시 포함)       |

### 4-3. errorType 구분 규칙

**BUSINESS (비즈니스 에러)**
- **판단 기준**: HTTP 4xx 상태 코드
- **특징**: 사용자 입력 문제, 비즈니스 규칙 위반 등
- **예시**:
  - `REVIEW_NOT_FOUND` (404)
  - `VALIDATION_ERROR` (400)
  - `REVIEW_ALREADY_EXISTS` (409)
- **용도**: 비즈니스 에러만 묶어서 모니터링 가능

**SYSTEM (시스템 에러)**
- **판단 기준**: HTTP 5xx 상태 코드
- **특징**: 서버 내부 오류, 외부 시스템 오류 등
- **예시**:
  - `INTERNAL_ERROR` (500)
  - `EXTERNAL_API_ERROR` (502)
  - `SERVICE_UNAVAILABLE` (503)
- **용도**: 시스템 에러만 묶어서 즉시 알람 가능

### 4-4. metadata 규칙

**포함 가능한 정보:**
- 리소스 ID (movieId, reviewId 등)
- 사용자 ID (userId - 일반 식별자)
- 요청 파라미터 (민감 정보 제외)

**포함 불가 정보 (PII):**
- 이메일 주소
- 전화번호
- 주소
- 기타 개인 식별 정보

### 4-5. stack 필드 처리

- **SYSTEM 에러**: 스택 트레이스 포함
- **BUSINESS 에러**: 스택 트레이스 생략 가능
- **프로덕션**: 필요 시에만 포함하거나 요약하여 기록

---

## 5. TraceId 전파

### 5-1. TraceId란?

**TraceId (분산 추적 ID)**
- 하나의 요청이 여러 서비스를 거쳐갈 때 모든 로그를 연결하는 고유 ID
- Gateway → Catalog Service → Review Service 전체 흐름 추적 가능

### 5-2. TraceId 전파 규칙

1. **헤더 이름**: `X-Trace-Id` 또는 `X-Request-Id`
2. **생성 규칙**: 요청에 `X-Trace-Id` 헤더가 없으면 새로 생성 (UUID v4)
3. **전파 규칙**: 서비스 간 HTTP 호출 시 자동으로 헤더에 포함

### 5-3. 구현 예시

#### NestJS - 인터셉터로 TraceId 주입

```typescript
// trace-id.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TraceIdInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // TraceId 생성 또는 조회
    let traceId = request.headers['x-trace-id'] || request.headers['x-request-id'];
    if (!traceId) {
      traceId = uuidv4();
    }

    // 요청 객체에 traceId 추가
    request.traceId = traceId;

    // Logger에 traceId 컨텍스트 설정 (Winston/Pino 사용 시)
    // 또는 미들웨어에서 AsyncLocalStorage 사용

    return next.handle();
  }
}

// app.module.ts
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceIdInterceptor,
    },
  ],
})
export class AppModule {}
```

#### Spring Boot - MDC 필터로 TraceId 설정

```kotlin
// TraceIdFilter.kt
@Component
class TraceIdFilter : OncePerRequestFilter() {
    private val logger = LoggerFactory.getLogger(TraceIdFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // TraceId 생성 또는 조회
        val traceId = request.getHeader("X-Trace-Id")
            ?: request.getHeader("X-Request-Id")
            ?: UUID.randomUUID().toString()

        // MDC에 traceId 설정 (로깅 시 자동 포함)
        MDC.put("traceId", traceId)

        // 응답 헤더에도 포함 (선택사항)
        response.setHeader("X-Trace-Id", traceId)

        try {
            filterChain.doFilter(request, response)
        } finally {
            // 요청 완료 후 MDC 정리
            MDC.clear()
        }
    }
}

// WebClient 설정 - 서비스 간 호출 시 자동 전파
@Bean
fun webClient(builder: WebClient.Builder): WebClient {
    return builder
        .filter { request, next ->
            val traceId = MDC.get("traceId")
            if (traceId != null) {
                val modifiedRequest = ClientRequest.from(request)
                    .header("X-Trace-Id", traceId)
                    .build()
                next.exchange(modifiedRequest)
            } else {
                next.exchange(request)
            }
        }
        .build()
}
```

### 5-4. 로그에 TraceId 포함

#### NestJS (Logger 사용 시)
```typescript
// traceId를 로그 메시지에 포함
this.logger.log(`리뷰 생성 완료: id=${reviewId}, traceId=${request.traceId}`);

// 또는 구조화 로깅 사용 시
this.logger.log({
  message: "리뷰 생성 완료",
  reviewId,
  traceId: request.traceId,
});
```

#### Spring Boot (MDC 사용)
```kotlin
// MDC에 설정된 traceId가 자동으로 로그에 포함됨
logger.info("리뷰 생성 완료: id={}", reviewId)
// 출력: [INFO] [traceId=xxx] [ReviewService] 리뷰 생성 완료: id=123
```

---

## 6. 공통 필드 정의

### 6-1. 필수 공통 필드

모든 로그에 포함되어야 하는 필수 필드:

| 필드           | 타입       | 설명                          | 예시                         |
|--------------|----------|-----------------------------|----------------------------|
| `@timestamp` | `string` | ISO 8601 형식 타임스탬프           | `2025-01-15T10:30:45.123Z` |
| `service`    | `string` | 서비스 이름                      | `catalog-service`          |
| `level`      | `string` | 로그 레벨 (ERROR, WARN, INFO 등) | `INFO`                     |
| `message`    | `string` | 로그 메시지                      | `"리뷰 생성 완료"`               |
| `traceId`    | `string` | 분산 추적 ID (요청 추적용)           | `550e8400-...`             |

### 6-2. 선택 공통 필드

서비스별로 추가 가능한 선택 필드:

| 필드        | 타입       | 설명                 | 예시           |
|-----------|----------|--------------------|--------------|
| `spanId`  | `string` | 스팬 ID (분산 추적 시)    | `abc123`     |
| `userId`  | `string` | 사용자 식별자 (일반 ID)    | `456`        |
| `actor`   | `string` | 행위자 (사용자 또는 시스템)   | `user:456`   |
| `env`     | `string` | 환경 (dev, prod 등)   | `prod`       |
| `profile` | `string` | 프로파일 (Spring Boot) | `production` |

### 6-3. 중앙 집계 전제

> **참고**: 로그 포맷은 향후 ELK/Loki 계열 스택으로의 중앙 집계를 전제하고, JSON 기반 공통 필드를 유지합니다.
>
> - 현재는 각 서비스에서 로컬 출력
> - 향후 중앙 집계 도구 도입 시 필드 구조 유지
> - 공통 필드로 서비스 간 로그 검색/필터링 가능

---

## 7. 구현 예시

### 7-1. 일반 로깅 예시

#### NestJS
```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  async createReview(request: CreateReviewRequest, userId: number) {
    // INFO 레벨 로그 (구조화된 형태)
    this.logger.log({
      message: '리뷰 생성 요청',
      userId,
      movieId: request.movieId,
      rating: request.rating,
    });

    // ... 비즈니스 로직 ...

    this.logger.log({
      message: '리뷰 생성 완료',
      reviewId: savedReview.id,
      userId,
      movieId: request.movieId,
    });
  }
}
```

#### Spring Boot
```kotlin
import org.slf4j.LoggerFactory

@Service
class ReviewService {
    private val logger = LoggerFactory.getLogger(ReviewService::class.java)

    fun createReview(request: CreateReviewRequest, userId: Long): ReviewResponse {
        // INFO 레벨 로그 (구조화된 형태)
        logger.info(
            "리뷰 생성 요청: userId={}, movieId={}, rating={}",
            userId,
            request.movieId,
            request.rating
        )

        // ... 비즈니스 로직 ...

        logger.info("리뷰 생성 완료: reviewId={}, userId={}, movieId={}",
            savedReview.id, userId, request.movieId)
    }
}
```

### 7-2. 에러 로깅 예시

#### NestJS - 구조화된 에러 로깅
```typescript
// http-exception.filter.ts
catch(exception: unknown, host: ArgumentsHost): void {
  const ctx = host.switchToHttp();
  const request = ctx.getRequest<Request>();
  const traceId = this.getOrCreateTraceId(request);

  if (exception instanceof BaseAppException) {
    const errorType = exception.httpStatus >= 500 ? 'SYSTEM' : 'BUSINESS';

    // 구조화된 에러 로그
    this.logger.error({
      message: exception.message,
      traceId,
      errorCode: exception.errorCode,
      errorType,
      metadata: exception.details,
      stack: exception.stack, // SYSTEM 에러 시 포함
    });

    // ... 에러 응답 처리 ...
  }
}
```

#### Spring Boot - 구조화된 에러 로깅
```kotlin
// GlobalExceptionHandler.kt
@ExceptionHandler(BaseAppException::class)
fun handleBaseAppException(
    ex: BaseAppException,
    request: WebRequest,
): ResponseEntity<ErrorDetail> {
    val traceId = getOrCreateTraceId(request)
    val errorType = if (ex.httpStatus.is5xxServerError) "SYSTEM" else "BUSINESS"

    // 구조화된 에러 로그
    if (ex.httpStatus.is5xxServerError) {
        logger.error(
            "예외 발생: errorCode={}, errorType={}, message={}, traceId={}",
            ex.errorCode,
            errorType,
            ex.message,
            traceId,
            ex  // 스택 트레이스 포함
        )
    } else {
        logger.warn(
            "예외 발생: errorCode={}, errorType={}, message={}, traceId={}",
            ex.errorCode,
            errorType,
            ex.message,
            traceId
        )
    }

    // ... 에러 응답 처리 ...
}
```

---

## 📚 관련 문서

- [에러 처리 스펙](../specs/error-handling.md) - 에러 응답 형식 및 로깅 정책
- [개발 표준 가이드](development-standards.md) - 실시간 참조 체크리스트
- [개선 사항 모음](../improvements.md) - 향후 로깅 개선 계획

---

## ✅ 체크리스트

새로운 기능 추가 시 로깅 체크리스트:

- [ ] 모든 로그에 `traceId` 포함
- [ ] 로그 레벨 적절히 사용 (INFO/WARN/ERROR)
- [ ] 구조화 로깅 사용 (필드 기반)
- [ ] 에러 로그에 `errorCode`, `errorType`, `metadata` 포함
- [ ] PII(개인정보) 로그에 포함하지 않음
- [ ] 서비스 간 호출 시 `X-Trace-Id` 헤더 자동 전파

