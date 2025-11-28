import org.gradle.api.tasks.testing.Test

plugins {
    kotlin("jvm")
    id("io.gitlab.arturbosch.detekt")
    id("org.jlleitschuh.gradle.ktlint")
}

// 공통 그룹 및 버전
group = "app.reelnote"
version = "0.0.1-SNAPSHOT"

// Java toolchain 통일
kotlin {
    jvmToolchain(21)
}

// 공통 저장소
repositories {
    mavenCentral()
}

// 전역 의존성 버전 관리 (취약점 보완)
configurations.all {
    resolutionStrategy {
        // CVE-2025-48924 취약점 보완: commons-lang3 3.18.0 이상 강제
        force("org.apache.commons:commons-lang3:3.19.0")
        // WS-2019-0379 취약점 보완: commons-codec 1.13-RC1 이상 강제
        force("commons-codec:commons-codec:1.16.1")
    }
}

// 공통 테스트 설정
tasks.withType<Test> {
    useJUnitPlatform()
}

// 공통 detekt 설정
detekt {
    buildUponDefaultConfig = true
    config.setFrom(files("$rootDir/tools/kotlin/detekt.yml"))
    autoCorrect = false
    parallel = true
}

// 공통 ktlint 설정
ktlint {
    version.set("1.7.1")
    verbose.set(true)
    filter {
        exclude("**/generated/**")
    }
}

// 공통 lint task
tasks.register("lint") {
    group = "verification"
    description = "Runs static analysis and style checks."
    dependsOn("ktlintCheck")
    dependsOn("detekt")
}


