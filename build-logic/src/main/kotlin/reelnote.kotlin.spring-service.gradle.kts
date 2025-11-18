plugins {
    id("reelnote.kotlin.base")
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
    id("org.springframework.boot")
    id("io.spring.dependency-management")
    id("com.github.ben-manes.versions")
}

// Spring Boot 특화 Kotlin 컴파일러 옵션
kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}


