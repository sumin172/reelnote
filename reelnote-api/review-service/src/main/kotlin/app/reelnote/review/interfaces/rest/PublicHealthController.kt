package app.reelnote.review.interfaces.rest

import io.micrometer.core.instrument.Counter
import io.micrometer.core.instrument.MeterRegistry
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.actuate.health.Health
import org.springframework.boot.actuate.health.HealthEndpoint
import org.springframework.boot.actuate.health.Status
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

/**
 * Public Health Check Controller
 *
 * K8s 프로브용 공개 헬스 체크 엔드포인트
 * - /health/live: Liveness 체크 (프로세스/스레드 상태) - WebMvcConfig에서 제외되어 /api prefix 없음
 * - /health/ready: Readiness 체크 (DB 등 핵심 의존성) - WebMvcConfig에서 제외되어 /api prefix 없음
 *
 * Actuator의 health를 공통 스펙 형식으로 변환하여 제공
 */
@RestController
@RequestMapping("/health")
@Tag(name = "Health", description = "헬스 체크 API (K8s 프로브용)")
class PublicHealthController(
    private val healthEndpoint: HealthEndpoint,
    private val meterRegistry: MeterRegistry,
    @Value("\${spring.application.name}") private val appName: String,
    @Value("\${app.version:unknown}") private val appVersion: String,
) {
    private val logger = LoggerFactory.getLogger(PublicHealthController::class.java)

    /**
     * 헬스 체크 실패 카운터 반환
     * @param endpoint 엔드포인트 (예: "live", "ready")
     * @param check 체크 대상 (예: "database", "tmdb", "redis") - 선택적
     */
    private fun getFailureCounter(
        endpoint: String,
        check: String? = null,
    ): Counter {
        val builder =
            Counter
                .builder("health_check_failures_total")
                .description("Total number of health check failures")
                .tag("endpoint", endpoint)
                .tag("service", appName)

        // check가 제공된 경우에만 라벨 추가
        if (check != null) {
            builder.tag("check", check)
        }

        return builder.register(meterRegistry)
    }

    /** Liveness 체크 서비스가 살아있는지 확인 (프로세스/스레드 상태) */
    @GetMapping("/live")
    @Operation(
        summary = "Liveness 체크",
        description = "서비스가 살아있는지 확인합니다 (K8s liveness probe용)",
    )
    fun liveness(): ResponseEntity<Map<String, Any>> {
        // Liveness는 가볍게, Actuator의 liveness health 사용
        val health = healthEndpoint.healthForPath("liveness")
        val status = mapStatus(health.status)

        val response =
            mapOf(
                "status" to status,
                "timestamp" to Instant.now().toString(),
                "service" to appName,
                "version" to appVersion, // 항상 포함 (없으면 "unknown")
            )

        // 실패 시에만 로그 및 메트릭 기록
        if (status != "UP") {
            logger.warn("Liveness check failed: status={}", status)
            getFailureCounter("live").increment()
        }

        return ResponseEntity.ok(response)
    }

    /** Readiness 체크 서비스가 트래픽을 받을 준비가 되었는지 확인 (DB 등 핵심 의존성) */
    @GetMapping("/ready")
    @Operation(
        summary = "Readiness 체크",
        description = "서비스가 트래픽을 받을 준비가 되었는지 확인합니다 (K8s readiness probe용)",
    )
    fun readiness(): ResponseEntity<Map<String, Any>> {
        val health = healthEndpoint.healthForPath("readiness")
        val status = mapStatus(health.status)

        // checks: health details를 공통 스펙 형식으로 변환
        val checks = extractChecks((health as? Health)?.details)

        val response =
            buildMap {
                put("status", status)
                put("timestamp", Instant.now().toString())
                put("service", appName)
                put("version", appVersion) // 항상 포함 (없으면 "unknown")
                put("checks", checks) // 항상 포함 (최소 빈 객체)
            }

        // 실패 시에만 로그 및 메트릭 기록
        if (status != "UP") {
            logger.warn(
                "Readiness check failed: status={}, checks={}",
                status,
                response["checks"],
            )
            getFailureCounter("ready").increment()

            // 실패한 체크별로도 메트릭 기록
            checks.forEach { (checkName, checkStatus) ->
                if (checkStatus != "UP") {
                    getFailureCounter("ready", checkName).increment()
                }
            }
        }

        return ResponseEntity.ok(response)
    }

    /** Actuator Status를 공통 스펙 status로 변환 */
    private fun mapStatus(status: Status): String =
        when (status.code) {
            "UP" -> "UP"
            "DOWN" -> "DOWN"
            "OUT_OF_SERVICE" -> "OUT_OF_SERVICE"
            else -> "UNKNOWN"
        }

    /** Actuator health details를 checks 형식으로 변환 */
    @Suppress("UNCHECKED_CAST")
    private fun extractChecks(details: Map<String, Any>?): Map<String, String> {
        if (details == null) return emptyMap()

        val checks = mutableMapOf<String, String>()

        // details에서 각 컴포넌트의 status 추출
        details.forEach { (key, value) ->
            when (value) {
                is Map<*, *> -> {
                    // 중첩된 health indicator (예: db, diskSpace 등)
                    val nestedStatus = value["status"] as? Map<*, *>
                    val statusCode = nestedStatus?.get("code") as? String
                    if (statusCode != null) {
                        checks[key] = statusCode
                    }
                }
                is String -> {
                    // 단순 문자열 값
                    checks[key] = value
                }
            }
        }

        return checks
    }
}
