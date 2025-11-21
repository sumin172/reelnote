pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
    includeBuild("build-logic")
}

rootProject.name = "reelnote"

include("review-service")

project(":review-service").projectDir = file("reelnote-api/review-service")

// e2e-review는 디렉토리와 build.gradle.kts가 존재할 때만 포함
val e2eReviewDir = file("tests/e2e-review")
val e2eReviewBuildFile = file("tests/e2e-review/build.gradle.kts")
if (e2eReviewDir.exists() && e2eReviewDir.isDirectory && e2eReviewBuildFile.exists()) {
    include("e2e-review")
    project(":e2e-review").projectDir = e2eReviewDir
}
