package app.reelnote.review.infrastructure.config

import org.springframework.cache.CacheManager
import org.springframework.cache.annotation.EnableCaching
import org.springframework.cache.concurrent.ConcurrentMapCacheManager
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile

/**
 * 캐시 설정
 */
@Configuration
@EnableCaching
class CacheConfig {
    
    /**
     * 개발 환경용 인메모리 캐시 매니저
     */
    @Bean
    fun cacheManager(): CacheManager = ConcurrentMapCacheManager().apply {
        setCacheNames(
            listOf(
                "reviews",
                "recentReviews", 
                "popularTags",
                "ratingStats",
                "movieSearch",
                "movieDetail",
                "popularMovies"
            )
        )
    }
}


