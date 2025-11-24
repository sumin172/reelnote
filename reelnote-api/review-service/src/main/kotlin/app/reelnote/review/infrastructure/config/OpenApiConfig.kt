package app.reelnote.review.infrastructure.config

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * OpenAPI/Swagger 설정
 *
 * SpringDoc OpenAPI 2.x에서는 springdoc.info.* 프로퍼티가 제대로 동작하지 않을 수 있어 코드에서 직접 OpenAPI Bean을 생성합니다.
 */
@Configuration
class OpenApiConfig {
    @Bean
    fun openAPI(): OpenAPI =
            OpenAPI()
                    .info(
                            Info().title("Review Service API")
                                    .description(
                                            """
                        ReelNote Review Service - 영화 리뷰 관리

                        ## Error Codes

                        ### 공통 에러 코드
                        - `VALIDATION_ERROR`: 입력 데이터 검증 실패
                        - `NOT_FOUND`: 리소스를 찾을 수 없음
                        - `INTERNAL_ERROR`: 내부 서버 오류
                        - `UNKNOWN_ERROR`: 알 수 없는 오류
                        - `UNAUTHORIZED`: 인증 필요
                        - `FORBIDDEN`: 접근 금지
                        - `CONFLICT`: 리소스 충돌
                        - `EXTERNAL_API_ERROR`: 외부 API 오류
                        - `SERVICE_UNAVAILABLE`: 서비스 사용 불가

                        ### 도메인 에러 코드 (REVIEW_*)
                        - `REVIEW_NOT_FOUND`: 리뷰를 찾을 수 없음
                        - `REVIEW_ALREADY_EXISTS`: 리뷰가 이미 존재함 (중복 생성 시도)
                        - `REVIEW_UNAUTHORIZED_UPDATE`: 리뷰 수정 권한 없음 (본인의 리뷰만 수정 가능)
                        - `REVIEW_UNAUTHORIZED_DELETE`: 리뷰 삭제 권한 없음 (본인의 리뷰만 삭제 가능)
                        """.trimIndent(),
                                    )
                                    .version("1.0"),
                    )
}
