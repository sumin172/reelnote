package app.reelnote.review.infrastructure.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.core.userdetails.User
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain

/**
 * Spring Security 설정
 */
@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        return BCryptPasswordEncoder()
    }

    @Bean
    fun userDetailsService(): InMemoryUserDetailsManager {
        val admin = User.builder()
            .username("admin")
            .password(passwordEncoder().encode("admin123"))
            .roles("ADMIN")
            .build()

        val monitor = User.builder()
            .username("monitor")
            .password(passwordEncoder().encode("monitor123"))
            .roles("MONITOR")
            .build()

        return InMemoryUserDetailsManager(admin, monitor)
    }

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        return http
            .authorizeHttpRequests { authz ->
                authz
                    // Actuator 엔드포인트는 인증 필요
                    .requestMatchers("/actuator/health").hasAnyRole("ADMIN", "MONITOR")
                    .requestMatchers("/actuator/**").hasRole("ADMIN")
                    // 나머지는 모두 허용
                    .anyRequest().permitAll()
            }
            .httpBasic { } // Basic Authentication 사용
            .csrf { it.disable() } // CSRF 비활성화 (API 서버이므로)
            .build()
    }
}
