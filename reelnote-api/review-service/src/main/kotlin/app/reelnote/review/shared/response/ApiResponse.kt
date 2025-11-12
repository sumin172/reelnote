package app.reelnote.review.shared.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant

/**
 * API 응답 표준 형식
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val error: ErrorDetail? = null,
    val timestamp: String = Instant.now().toString(),
) {
    companion object {
        fun <T> success(
            data: T,
            message: String? = null,
        ): ApiResponse<T> =
            ApiResponse(
                success = true,
                data = data,
                message = message,
            )

        fun <T> success(message: String): ApiResponse<T> =
            ApiResponse(
                success = true,
                message = message,
            )

        fun <T> error(
            error: ErrorDetail,
            message: String? = null,
        ): ApiResponse<T> =
            ApiResponse(
                success = false,
                error = error,
                message = message,
            )
    }
}

/**
 * 에러 상세 정보
 */
data class ErrorDetail(
    val code: String,
    val message: String,
    val field: String? = null,
    val details: Map<String, Any>? = null,
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
