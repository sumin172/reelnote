package app.reelnote.review.shared.response

import com.fasterxml.jackson.annotation.JsonInclude

/**
 * 표준 에러 응답 스키마
 * HTTP status code와 함께 사용되며, 성공 응답에는 사용되지 않습니다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ErrorDetail(
    val code: String,
    val message: String,
    val details: Map<String, Any>? = null,
    val traceId: String? = null,
)

/**
 * 에러 코드 상수
 */
object ErrorCodes {
    const val VALIDATION_ERROR = "VALIDATION_ERROR"
    const val NOT_FOUND = "NOT_FOUND"
    const val INTERNAL_ERROR = "INTERNAL_ERROR"
    const val EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    const val CONFLICT = "CONFLICT"
    const val UNAUTHORIZED = "UNAUTHORIZED"
    const val FORBIDDEN = "FORBIDDEN"
}
