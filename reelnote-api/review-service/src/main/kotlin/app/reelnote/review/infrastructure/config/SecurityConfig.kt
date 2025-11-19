package app.reelnote.review.infrastructure.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.core.userdetails.User
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

/** Spring Security 설정 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(CorsProperties::class)
class SecurityConfig(
    private val corsProperties: CorsProperties,
    private val environment: Environment,
) {
    @Bean fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun userDetailsService(): InMemoryUserDetailsManager {
        val admin =
            User
                .builder()
                .username("admin")
                .password(passwordEncoder().encode("admin123"))
                .roles("ADMIN")
                .build()

        val monitor =
            User
                .builder()
                .username("monitor")
                .password(passwordEncoder().encode("monitor123"))
                .roles("MONITOR")
                .build()

        return InMemoryUserDetailsManager(admin, monitor)
    }

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain =
        http
            .cors {}
            .authorizeHttpRequests { authz ->
                authz
                    // K8s 프로브용 헬스 체크는 인증 없음 (내부망 전제)
                    .requestMatchers("/health/**")
                    .permitAll()
                    // Actuator 엔드포인트는 인증 필요 (사람/모니터링 도구 전용)
                    .requestMatchers("/actuator/**")
                    .hasRole("ADMIN")
                    // 나머지는 모두 허용
                    .anyRequest()
                    .permitAll()
            }.httpBasic {} // Basic Authentication 사용
            .csrf { it.disable() } // CSRF 비활성화 (API 서버이므로)
            .build()

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration()

        // 개발 환경이고 allowedOrigins가 비어있으면 localhost 패턴 허용
        val activeProfiles = environment.activeProfiles
        val isDevProfile = activeProfiles.contains("dev")
        val hasConfiguredOrigins = corsProperties.allowedOrigins.isNotEmpty()

        // 프로파일이 없거나 dev이고, 설정된 origin이 없으면 localhost 패턴 허용
        if ((activeProfiles.isEmpty() || isDevProfile) && !hasConfiguredOrigins) {
            // development: localhost:* 패턴 허용 (유연성)
            config.allowedOriginPatterns = listOf("http://localhost:*", "http://127.0.0.1:*")
        } else {
            // e2e / prod: 설정된 origin만 허용 (엄격)
            config.allowedOrigins = corsProperties.allowedOrigins
        }

        config.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
        config.allowedHeaders =
            listOf(
                "Content-Type",
                "Authorization",
                "Accept",
                "Origin",
                "X-Requested-With",
                "X-User-Seq",
                "X-Trace-Id",
            )
        config.exposedHeaders = listOf("Location")
        config.allowCredentials = corsProperties.allowCredentials
        config.maxAge = 3600

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)
        return source
    }
}

@ConfigurationProperties(prefix = "app.cors")
data class CorsProperties(
    var allowedOrigins: List<String> = emptyList(),
    var allowCredentials: Boolean = true,
)
