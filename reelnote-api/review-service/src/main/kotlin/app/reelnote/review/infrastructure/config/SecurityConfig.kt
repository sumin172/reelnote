package app.reelnote.review.infrastructure.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
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

/**
 * Spring Security 설정
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(CorsProperties::class)
class SecurityConfig(
    private val corsProperties: CorsProperties,
) {
    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

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
            .cors { }
            .authorizeHttpRequests { authz ->
                authz
                    // Actuator 엔드포인트는 인증 필요
                    .requestMatchers("/actuator/health")
                    .hasAnyRole("ADMIN", "MONITOR")
                    .requestMatchers("/actuator/**")
                    .hasRole("ADMIN")
                    // 나머지는 모두 허용
                    .anyRequest()
                    .permitAll()
            }.httpBasic { } // Basic Authentication 사용
            .csrf { it.disable() } // CSRF 비활성화 (API 서버이므로)
            .build()

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration()
        config.allowedOrigins =
            corsProperties.allowedOrigins.ifEmpty {
                listOf("http://localhost:3000", "http://localhost:3900") // 개발 환경 기본값
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
