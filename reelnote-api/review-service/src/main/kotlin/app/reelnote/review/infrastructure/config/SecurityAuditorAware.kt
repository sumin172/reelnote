package app.reelnote.review.infrastructure.config

import org.slf4j.LoggerFactory
import org.springframework.data.domain.AuditorAware
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import java.util.Optional

/**
 * 현재 인증된 사용자의 ID(userSeq)를 감사자(Auditor)로 제공
 * 인증 정보가 없거나 ID를 파싱할 수 없는 경우 1L을 반환 (시스템 사용자)
 */
class SecurityAuditorAware : AuditorAware<Long> {
    private val logger = LoggerFactory.getLogger(SecurityAuditorAware::class.java)

    override fun getCurrentAuditor(): Optional<Long> {
        val result =
            runCatching { resolveCurrentAuditor() }
                .onFailure { ex -> logger.debug("Failed to resolve current auditor: {}", ex.message) }
                .getOrDefault(1L)
        return Optional.of(result)
    }

    private fun resolveCurrentAuditor(): Long {
        val authentication: Authentication? = SecurityContextHolder.getContext().authentication
        if (authentication == null || !authentication.isAuthenticated) {
            return 1L
        }

        val userId: Long? =
            when (val principal = authentication.principal) {
                is Long -> principal
                is Number -> principal.toLong()
                is String -> principal.toLongOrNull() ?: authentication.name.toLongOrNull()
                else -> authentication.name.toLongOrNull()
            }
        return userId ?: 1L
    }
}
