package app.reelnote.review

import app.reelnote.review.infrastructure.config.TestcontainersBase
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/**
 * Spring Boot 애플리케이션 컨텍스트 로드 테스트
 *
 * ⚠️ 중요: Testcontainers를 사용하여 격리된 테스트 데이터베이스를 사용합니다. 로컬 개발 데이터베이스에 영향을 주지 않도록 합니다.
 */
@SpringBootTest
@ActiveProfiles("test")
class ReviewServiceApplicationTests : TestcontainersBase() {
    @Test fun contextLoads() = Unit
}
