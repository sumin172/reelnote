plugins {
    `kotlin-dsl`
}

repositories {
    gradlePluginPortal()
    mavenCentral()
}

// Clean task to remove bin directory that can cause file lock issues
tasks.register("cleanBin") {
    doLast {
        val binDir = file("bin")
        if (binDir.exists()) {
            binDir.deleteRecursively()
        }
    }
}

tasks.named("clean") {
    dependsOn("cleanBin")
}

dependencies {
    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-gradle-plugin:2.0.21")
    implementation("org.jetbrains.kotlin.plugin.spring:org.jetbrains.kotlin.plugin.spring.gradle.plugin:2.0.21")
    implementation("org.jetbrains.kotlin.plugin.jpa:org.jetbrains.kotlin.plugin.jpa.gradle.plugin:2.0.21")

    // Spring Boot
    implementation("org.springframework.boot:spring-boot-gradle-plugin:3.5.7")
    implementation("io.spring.gradle:dependency-management-plugin:1.1.7")

    // Code Quality
    implementation("io.gitlab.arturbosch.detekt:detekt-gradle-plugin:1.23.8")
    implementation("org.jlleitschuh.gradle:ktlint-gradle:14.0.1")

    // Version Management
    implementation("com.github.ben-manes:gradle-versions-plugin:0.53.0")
}

