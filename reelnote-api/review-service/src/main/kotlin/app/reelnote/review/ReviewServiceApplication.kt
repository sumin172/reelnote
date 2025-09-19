package app.reelnote.review

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.cache.annotation.EnableCaching
import org.springframework.transaction.annotation.EnableTransactionManagement
 

/**
 * ReelNote Review Service 메인 애플리케이션
 * 
 * 개인 영화 리뷰 서비스의 마이크로 서비스로,
 * 영화 리뷰 CRUD 및 TMDB API 연동 기능(임시)을 제공합니다.
 */
@SpringBootApplication
@EnableTransactionManagement
@EnableCaching
@ConfigurationPropertiesScan
class ReviewServiceApplication

fun main(args: Array<String>) {
    runApplication<ReviewServiceApplication>(*args)
}
