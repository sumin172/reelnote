package app.reelnote.review.infrastructure.config

import org.slf4j.LoggerFactory
import org.springframework.data.domain.AuditorAware
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import java.util.Optional

/**
 * 현재 인증된 사용자의 ID(userSeq)를 감사자(Auditor)로 제공
 * 인증 정보가 없거나 ID를 파싱할 수 없는 경우 0을 반환
 */
class SecurityAuditorAware : AuditorAware<Long> {

    private val logger = LoggerFactory.getLogger(SecurityAuditorAware::class.java)

    override fun getCurrentAuditor(): Optional<Long> {
        return try {
            val authentication: Authentication? = SecurityContextHolder.getContext().authentication
            if (authentication == null || !authentication.isAuthenticated) {
                Optional.of(0L)
            } else {
                // Principal에서 userSeq 추출 규약: Long 캐스팅 가능하면 사용, 아니면 이름을 Long으로 파싱 시도
                val principal = authentication.principal
                val userId: Long? = when (principal) {
                    is Long -> principal
                    is Number -> principal.toLong()
                    is String -> principal.toLongOrNull() ?: authentication.name.toLongOrNull()
                    else -> authentication.name.toLongOrNull()
                }
                Optional.of(userId ?: 0L)
            }
        } catch (ex: Exception) {
            logger.debug("Failed to resolve current auditor: {}", ex.message)
            Optional.of(0L)
        }
    }
}


