plugins {
    id("reelnote.kotlin.spring-service")
    id("org.springdoc.openapi-gradle-plugin") version "1.9.0"
    id("org.springframework.boot") version "3.5.7"
}

description = "review-service"

// 버전 정보를 application.yml에 주입
springBoot {
    buildInfo {
        properties {
            version.set(project.version.toString())
        }
    }
}

dependencyManagement {
    imports {
        mavenBom("com.fasterxml.jackson:jackson-bom:2.20.1")
        mavenBom("org.testcontainers:testcontainers-bom:2.0.1")
    }
}

dependencies {
    implementation("org.apache.commons:commons-lang3:3.19.0")

    // Spring Boot Starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-security")

    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor:1.10.2")

    // Jackson (BOM으로 버전 관리)
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")

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
    apiDocsUrl.set("http://localhost:8080/api-docs")
    outputDir.set(file("/openapi"))
    outputFileName.set("review-service-openapi.json")
}
