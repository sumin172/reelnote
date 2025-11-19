package app.reelnote.review.shared.response

import com.fasterxml.jackson.annotation.JsonInclude
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 표준 에러 응답 스키마
 * HTTP status code와 함께 사용되며, 성공 응답에는 사용되지 않습니다.
 * ERROR_SPECIFICATION.md와 일치해야 함
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(
    name = "ErrorDetail",
    description = "표준 에러 응답 스키마 (공통)",
    example = """
        {
          "code": "VALIDATION_ERROR",
          "message": "입력 데이터 검증에 실패했습니다",
          "details": {
            "path": "/api/v1/reviews",
            "fieldErrors": {
              "rating": "평점은 1-5 사이여야 합니다."
            }
          },
          "traceId": "550e8400-e29b-41d4-a716-446655440000"
        }
    """,
)
data class ErrorDetail(
    @Schema(description = "에러 코드 (머신/사람이 같이 읽기 좋은 짧은 코드)", example = "VALIDATION_ERROR")
    val code: String,
    @Schema(description = "사람 친화적 에러 메시지", example = "입력 데이터 검증에 실패했습니다")
    val message: String,
    @Schema(description = "추가 상세 정보 (필드별 에러, 컨텍스트 등)", required = false)
    val details: Map<String, Any>? = null,
    @Schema(description = "분산 트레이싱 / 로그 상관관계용 추적 ID", example = "550e8400-e29b-41d4-a716-446655440000", required = false)
    val traceId: String? = null,
)

/**
 * 에러 코드 상수
 * ERROR_SPECIFICATION.md와 일치해야 함
 */
object ErrorCodes {
    const val VALIDATION_ERROR = "VALIDATION_ERROR"
    const val NOT_FOUND = "NOT_FOUND"
    const val INTERNAL_ERROR = "INTERNAL_ERROR"
    const val EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    const val CONFLICT = "CONFLICT"
    const val UNAUTHORIZED = "UNAUTHORIZED"
    const val FORBIDDEN = "FORBIDDEN"
    const val SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
}
