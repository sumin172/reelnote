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


