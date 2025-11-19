package app.reelnote.review.infrastructure.config

import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer

/**
 * Testcontainers 설정을 공유하는 싱글톤 객체
 *
 * 모든 데이터베이스 통합 테스트는 이 객체의 컨테이너를 공유합니다. 하나의 PostgreSQL 컨테이너를 모든 테스트가 재사용하여 테스트 속도를 향상시킵니다.
 *
 * 사용 예시:
 * ```kotlin
 * @SpringBootTest
 * @ActiveProfiles("test")
 * class MyTest {
 *     companion object {
 *         @DynamicPropertySource
 *         @JvmStatic
 *         fun configureProperties(registry: DynamicPropertyRegistry) {
 *             TestcontainersConfig.configureProperties(registry)
 *         }
 *     }
 * }
 * ```
 *
 * 또는 베이스 클래스를 상속받아 사용:
 * ```kotlin
 * @SpringBootTest
 * @ActiveProfiles("test")
 * class MyTest : TestcontainersBase() {
 *     // 테스트 코드
 * }
 * ```
 *
 * ⚠️ 중요:
 * - 컨테이너는 `withReuse(true)`로 설정되어 있어 여러 테스트 간 재사용됩니다.
 * - 모든 테스트는 격리된 테스트 데이터베이스를 사용합니다.
 * - 로컬 개발 데이터베이스에 영향을 주지 않습니다.
 */
object TestcontainersConfig {
    private val postgres: PostgreSQLContainer<*> =
        PostgreSQLContainer("postgres:16-alpine").apply {
            withReuse(true) // 컨테이너 재사용으로 테스트 속도 향상
        }

    init {
        // 컨테이너 시작
        postgres.start()

        // 스키마 생성 (PostgreSQL에서는 스키마가 먼저 존재해야 함)
        val connection =
            java.sql.DriverManager.getConnection(
                postgres.jdbcUrl,
                postgres.username,
                postgres.password,
            )
        try {
            connection
                .createStatement()
                .execute("CREATE SCHEMA IF NOT EXISTS ${SoftDeleteConfig.SOFT_DELETE_SCHEMA}")
        } finally {
            connection.close()
        }
    }

    /** Spring Boot 테스트에서 사용할 동적 프로퍼티 설정 */
    fun configureProperties(registry: DynamicPropertyRegistry) {
        // 데이터소스 설정
        registry.add("spring.datasource.url") { postgres.jdbcUrl }
        registry.add("spring.datasource.username") { postgres.username }
        registry.add("spring.datasource.password") { postgres.password }
        registry.add("spring.datasource.driver-class-name") { "org.postgresql.Driver" }

        // Flyway 비활성화 (테스트에서는 DDL 사용)
        registry.add("spring.flyway.enabled") { "false" }

        // 보호 메커니즘: TestDataSourceProtection이 검증할 수 있도록 마커 설정
        registry.add("test.containers.enabled") { "true" }
    }
}

/**
 * Testcontainers 설정을 자동으로 적용하는 베이스 클래스
 *
 * 이 클래스를 상속받으면 자동으로 Testcontainers 설정이 적용됩니다. 각 테스트 클래스마다 companion object를 만들 필요가 없습니다.
 *
 * ⚠️ 중요: 모든 @SpringBootTest는 반드시 이 클래스를 상속받아야 합니다. 그렇지 않으면 TestDataSourceProtection이 로컬 개발 DB 연결을
 * 차단하여 테스트가 실패합니다.
 */
abstract class TestcontainersBase {
    companion object {
        @DynamicPropertySource
        @JvmStatic
        fun configureProperties(registry: DynamicPropertyRegistry) {
            TestcontainersConfig.configureProperties(registry)
        }
    }
}
