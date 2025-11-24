package app.reelnote.review.infrastructure.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

/** Web MVC 전역 설정 API 경로에 전역 prefix /api 추가 RestController가 있는 컨트롤러에만 적용 헬스 체크와 액추에이터는 자동으로 제외됨 */
@Configuration
class WebMvcConfig : WebMvcConfigurer {
    override fun configurePathMatch(configurer: PathMatchConfigurer) {
        // RestController가 있는 컨트롤러에만 /api prefix 추가
        // 예: RequestMapping("/v1/reviews") -> /api/v1/reviews
        configurer.addPathPrefix("/api") { clazz ->
            clazz.isAnnotationPresent(RestController::class.java)
        }
    }
}
