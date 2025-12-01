plugins {
    id("reelnote.kotlin.spring-service")
    id("org.springdoc.openapi-gradle-plugin") version "1.9.0"
    id("org.springframework.boot") version "3.5.7"
    id("jacoco")
}

description = "review-service"

// 버전 정보를 application.yml에 주입
// build-info.properties는 빌드 시 자동 생성됩니다 (build/resources/main/META-INF/build-info.properties)
springBoot {
    buildInfo {
        properties {
            version.set(project.version.toString())
            // 추가 정보도 설정 가능
            // group.set(project.group.toString())
            // artifact.set(project.name)
        }
    }
}

// 개발 환경에서도 build-info.properties가 생성되도록 bootRun 전에 buildInfo 생성
tasks.named("bootRun") {
    dependsOn("bootBuildInfo")
}

// generateOpenApiDocs 태스크에서 사용하는 forkedSpringBootRun에 환경 변수 전달
// springdoc-openapi-gradle-plugin이 내부적으로 이 태스크를 사용하여 애플리케이션을 시작함
// JavaExecFork 타입이지만 ProcessForkOptions를 구현하므로 environment 속성 사용 가능
tasks.configureEach {
    if (name == "forkedSpringBootRun") {
        val env = (this as? ProcessForkOptions)?.environment
        env?.putAll(System.getenv())
    }
}

dependencyManagement {
    imports {
        mavenBom("com.fasterxml.jackson:jackson-bom:2.20.1")
        mavenBom("org.testcontainers:testcontainers-bom:2.0.1")
    }
    dependencies {
        // CVE-2025-48924 취약점 보완: commons-lang3 3.18.0 이상 강제
        dependency("org.apache.commons:commons-lang3:3.19.0")
        // WS-2019-0379 취약점 보완: commons-codec 1.13-RC1 이상 강제
        dependency("commons-codec:commons-codec:1.16.1")
    }
}

dependencies {
    // Spring Boot Starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-security")

    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor:1.10.2")

    // Jackson (BOM으로 버전 관리)
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")

    // JSON 로깅 (logstash-logback-encoder)
    implementation("net.logstash.logback:logstash-logback-encoder:7.4")

    // OpenAPI Documentation
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.7")

    // Database
    runtimeOnly("org.postgresql:postgresql:42.7.8")
    implementation("org.flywaydb:flyway-core:11.17.0")
    implementation("org.flywaydb:flyway-database-postgresql:11.17.0")

    // Development
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testImplementation("io.mockk:mockk:1.14.5")
    testImplementation("com.ninja-squad:springmockk:4.0.2")
    testImplementation("org.springframework.security:spring-security-test")

    // Testcontainers (BOM으로 버전 관리)
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
}

openApi {
    // 환경 변수 SERVER_PORT를 읽어서 동적으로 포트 설정 (기본값: 5000)
    // CI 도커 환경에서는 docker-compose.yml에서 SERVER_PORT=5100이 설정됨
    val serverPort = System.getenv("SERVER_PORT")?.toIntOrNull() ?: 5000
    apiDocsUrl.set("http://localhost:$serverPort/api/docs-json")
    // workspace 루트 기준으로 최종 위치에 직접 생성 (catalog-service와 통일)
    outputDir.set(file("../../packages/api-schema/generated"))
    outputFileName.set("review-service-openapi.json")
}

// JaCoCo 설정
jacoco {
    toolVersion = "0.8.11"
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        xml.outputLocation.set(file("test-output/jacoco/coverage/jacocoTestReport.xml"))
        html.required.set(true)
        html.outputLocation.set(file("test-output/jacoco/coverage/html"))
    }
    finalizedBy(tasks.jacocoTestCoverageVerification)
}

tasks.jacocoTestCoverageVerification {
    dependsOn(tasks.jacocoTestReport)
    violationRules {
        rule {
            limit {
                minimum = "0.0".toBigDecimal()
            }
        }
    }
}

// test 태스크 실행 후 자동으로 커버리지 리포트 생성
tasks.test {
    // CI 모드 감지: -Pci 프로퍼티가 있으면 CI 모드
    val isCi = project.hasProperty("ci")

    // 병렬도 제어: CI에서는 순차 실행, 로컬에서는 병렬 실행
    if (isCi) {
        maxParallelForks = 1
        systemProperty("ci", "true")
    } else {
        maxParallelForks = Runtime.getRuntime().availableProcessors()
    }

    finalizedBy(tasks.jacocoTestReport)
}
