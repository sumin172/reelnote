pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
    includeBuild("build-logic")
}

rootProject.name = "reelnote"

include("review-service")
include("e2e-review")

project(":review-service").projectDir = file("reelnote-api/review-service")
project(":e2e-review").projectDir = file("tests/e2e-review")
