package app.reelnote.review.infrastructure.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.actuate.health.Health
import org.springframework.boot.actuate.health.HealthIndicator
import org.springframework.stereotype.Component
import java.time.Instant

/**
 * 서비스 메타 정보를 제공하는 Health Indicator
 *
 * Actuator의 health 응답에 서비스 메타 정보를 추가
 */
@Component("serviceMeta")
class ServiceMetaHealthIndicator(
    @Value("\${spring.application.name}") private val appName: String,
    @Value("\${app.version:unknown}") private val appVersion: String,
) : HealthIndicator {
    override fun health(): Health =
        Health
            .up()
            .withDetail("service", appName)
            .withDetail("timestamp", Instant.now().toString())
            .withDetail("version", appVersion)
            .build()
}
