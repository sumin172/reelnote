plugins {
    kotlin("jvm") version "2.0.21"
    kotlin("plugin.spring") version "2.0.21"
    kotlin("plugin.jpa") version "2.0.21"
    id("org.springframework.boot") version "3.5.7"
    id("io.spring.dependency-management") version "1.1.7"
    id("org.springdoc.openapi-gradle-plugin") version "1.9.0"
    id("io.gitlab.arturbosch.detekt") version "1.23.8"
    id("org.jlleitschuh.gradle.ktlint") version "14.0.1"
    id("com.github.ben-manes.versions") version "0.53.0"
}

group = "app.reelnote"
version = "0.0.1-SNAPSHOT"
description = "review-service"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
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

// Apache Commons Compress 취약점 해결 (CVE-2024-25710, CVE-2024-26308)
configurations.all {
    resolutionStrategy {
        force("org.apache.commons:commons-compress:1.28.0")
    }
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

allOpen {
    // Spring과 JPA 어노테이션들은 kotlin("plugin.spring")와 kotlin("plugin.jpa")가 자동 처리
    // 커스텀 어노테이션이 필요할 때 여기에 추가
    // annotation("jakarta.persistence.Entity")
    // annotation("jakarta.persistence.MappedSuperclass")
    // annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.named("generateOpenApiDocs") {
    doNotTrackState("OpenAPI generation spawns a forked Spring Boot process.")
}

tasks.matching { it.name == "forkedSpringBootRun" }.configureEach {
    doNotTrackState("Forked Spring Boot process is not cache friendly for OpenAPI generation.")
}

openApi {
    apiDocsUrl.set("http://localhost:8080/api-docs")
    outputDir.set(file("/openapi"))
    outputFileName.set("review-service-openapi.json")
}

detekt {
    buildUponDefaultConfig = true
    config.setFrom(files("$projectDir/detekt.yml"))
    autoCorrect = false // lint는 검사만 수행 (포맷팅은 ktlintFormat 사용)
    parallel = true
}

tasks.withType<io.gitlab.arturbosch.detekt.Detekt>().configureEach {
    jvmTarget = "21"
}

ktlint {
    version.set("1.7.1")
    verbose.set(true)
    filter {
        exclude("**/generated/**")
    }
}

tasks.register("lint") {
    group = "verification"
    description = "Runs static analysis and style checks."
    dependsOn("ktlintCheck")
    dependsOn("detekt")
}
