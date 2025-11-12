package app.reelnote.review.infrastructure.catalog

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties(prefix = "catalog.api")
data class CatalogApiProperties(
    var baseUrl: String = "http://localhost:3001/api",
    var timeout: Duration = Duration.ofSeconds(5),
    var connectTimeout: Duration = Duration.ofSeconds(5),
)
