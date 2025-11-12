package app.reelnote.review.infrastructure.config

import org.springframework.boot.autoconfigure.condition.ConditionalOnClass
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.data.domain.AuditorAware
import org.springframework.data.jpa.repository.config.EnableJpaAuditing

@Configuration
@ConditionalOnClass(name = ["jakarta.persistence.EntityManager"])
@EnableJpaAuditing
@Profile("!test")
class AuditingConfig {
    @Bean
    fun auditorAware(): AuditorAware<Long> = SecurityAuditorAware()
}
