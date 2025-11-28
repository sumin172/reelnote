# Review Service Dockerfile
# Spring Boot 3.5.7 + Kotlin + Java 21
# 모노레포 구조를 고려한 빌드

# 빌드 스테이지
FROM gradle:8.11-jdk21-alpine AS builder

WORKDIR /app

# 루트 Gradle 설정 파일 복사 (모노레포)
COPY settings.gradle.kts ./
COPY build-logic/ ./build-logic/

# Review Service Gradle 설정 및 소스 복사
COPY reelnote-api/review-service/build.gradle.kts ./reelnote-api/review-service/
COPY reelnote-api/review-service/src ./reelnote-api/review-service/src

# 빌드 실행 (루트에서)
RUN gradle :review-service:bootJar --no-daemon

# 런타임 스테이지
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# 빌드된 JAR 파일 복사
COPY --from=builder /app/reelnote-api/review-service/build/libs/review-service-*.jar app.jar

# 포트 노출
EXPOSE 5100

# 헬스체크 (curl 설치)
RUN apk add --no-cache curl

# 실행
ENTRYPOINT ["java", "-jar", "app.jar"]

