package app.reelnote.review.infrastructure.config

import org.springframework.beans.factory.config.ConfigurableListableBeanFactory
import org.springframework.context.ApplicationContextInitializer
import org.springframework.context.ConfigurableApplicationContext
import org.springframework.core.env.Environment
import javax.sql.DataSource

/**
 * 테스트 환경에서 로컬 개발 데이터베이스 연결을 방지하는 보호 메커니즘
 *
 * 이 클래스는 test 프로파일에서 실행되는 모든 테스트에 자동으로 적용됩니다. 데이터소스 URL이 로컬 개발 DB를 가리키면 테스트가 즉시 실패합니다.
 *
 * ⚠️ 매우 중요:
 * - 모든 @SpringBootTest는 반드시 TestcontainersBase를 상속받아야 합니다.
 * - @DynamicPropertySource를 통해 Testcontainers의 격리된 DB를 사용해야 합니다.
 * - 로컬 개발 DB에 연결되면 테스트가 실패합니다.
 */
class TestDataSourceProtection : ApplicationContextInitializer<ConfigurableApplicationContext> {
    companion object {
        // 로컬 개발 DB URL 패턴 (application.yml의 기본값)
        private val LOCAL_DEV_DB_PATTERNS =
            listOf(
                "jdbc:postgresql://localhost:5433/review_db",
                "jdbc:postgresql://127.0.0.1:5433/review_db",
            )

        // Testcontainers URL 패턴 (허용)
        private const val TESTCONTAINERS_PATTERN = "jdbc:postgresql://.*:\\d+/test"
    }

    override fun initialize(applicationContext: ConfigurableApplicationContext) {
        val environment = applicationContext.environment

        if (!shouldValidate(environment, applicationContext.beanFactory)) {
            return
        }

        val datasourceUrl = environment.getProperty("spring.datasource.url")
        validateDataSource(datasourceUrl)
    }

    private fun shouldValidate(
        environment: Environment,
        beanFactory: ConfigurableListableBeanFactory,
    ): Boolean {
        // test 프로파일이 활성화되어 있는지 확인
        if (!environment.activeProfiles.contains("test")) {
            return false // test 프로파일이 아니면 검증하지 않음
        }

        // Testcontainers가 활성화되어 있는지 확인
        val testContainersEnabled =
            environment.getProperty("test.containers.enabled", "false").toBoolean()
        if (testContainersEnabled) {
            return false // Testcontainers가 활성화되어 있으면 검증 통과
        }

        // 슬라이스 테스트(@WebMvcTest, @DataJpaTest 등)는 데이터소스 빈이 없음
        // @WebMvcTest는 데이터소스 빈을 자동으로 제외하므로, 데이터소스 빈이 없으면 슬라이스 테스트로 간주
        // getBeanNamesForType은 예외를 던지지 않고 빈 배열을 반환하므로 try-catch 불필요
        val hasDataSourceBean =
            beanFactory.getBeanNamesForType(DataSource::class.java, false, false).isNotEmpty()

        if (!hasDataSourceBean) {
            // 슬라이스 테스트로 간주하고 검증하지 않음
            return false
        }

        return true
    }

    private fun validateDataSource(datasourceUrl: String?) {
        // 데이터소스 URL이 설정되지 않았으면 @DynamicPropertySource가 없음
        // 하지만 슬라이스 테스트는 데이터소스가 없어도 되므로 shouldValidate에서 이미 처리됨
        if (datasourceUrl == null) {
            throw IllegalStateException(createMissingDataSourceErrorMessage())
        }

        // 로컬 개발 DB를 가리키는지 확인
        val isLocalDevDb =
            LOCAL_DEV_DB_PATTERNS.any { pattern ->
                datasourceUrl.contains(pattern, ignoreCase = true)
            }

        if (isLocalDevDb) {
            throw IllegalStateException(createLocalDevDbErrorMessage(datasourceUrl))
        }

        // Testcontainers URL인지 확인 (선택적 검증)
        val isTestcontainersDb = datasourceUrl.matches(Regex(TESTCONTAINERS_PATTERN))
        if (!isTestcontainersDb) {
            // 경고만 출력 (다른 테스트 DB를 사용할 수도 있으므로)
            println(
                """
                ⚠️ 경고: 테스트 데이터소스가 Testcontainers 패턴과 일치하지 않습니다.
                URL: $datasourceUrl
                Testcontainers를 사용하는 것이 권장됩니다.
                """.trimIndent(),
            )
        }
    }

    private fun createMissingDataSourceErrorMessage(): String =
        """
        ⚠️⚠️⚠️ 치명적 오류: 테스트 데이터소스가 설정되지 않았습니다! ⚠️⚠️⚠️

        test 프로파일에서 실행되는 모든 @SpringBootTest는 반드시 TestcontainersBase를 상속받아야 합니다.

        해결 방법:
        1. 테스트 클래스가 TestcontainersBase를 상속받도록 수정:
           class MyTest : TestcontainersBase() {
               // 테스트 코드
           }

        2. 또는 @DynamicPropertySource를 직접 사용:
           companion object {
               @DynamicPropertySource
               @JvmStatic
               fun configureProperties(registry: DynamicPropertyRegistry) {
                   TestcontainersConfig.configureProperties(registry)
               }
           }

        이 검증은 로컬 개발 데이터베이스가 실수로 삭제되는 것을 방지하기 위한 것입니다.
        """.trimIndent()

    private fun createLocalDevDbErrorMessage(datasourceUrl: String): String =
        """
        ⚠️⚠️⚠️ 치명적 오류: 테스트가 로컬 개발 데이터베이스에 연결하려고 합니다! ⚠️⚠️⚠️

        데이터소스 URL: $datasourceUrl

        이는 매우 위험합니다! 테스트 실행 시 로컬 개발 DB의 데이터가 삭제될 수 있습니다.

        해결 방법:
        1. 테스트 클래스가 TestcontainersBase를 상속받도록 수정:
           class MyTest : TestcontainersBase() {
               // 테스트 코드
           }

        2. 또는 @DynamicPropertySource를 통해 Testcontainers DB를 사용:
           companion object {
               @DynamicPropertySource
               @JvmStatic
               fun configureProperties(registry: DynamicPropertyRegistry) {
                   TestcontainersConfig.configureProperties(registry)
               }
           }

        이 검증은 로컬 개발 데이터베이스가 실수로 삭제되는 것을 방지하기 위한 것입니다.
        """.trimIndent()
}
