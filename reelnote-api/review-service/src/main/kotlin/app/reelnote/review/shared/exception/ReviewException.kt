package app.reelnote.review.shared.exception

import app.reelnote.review.shared.response.ErrorCodes
import org.springframework.http.HttpStatus

/**
 * 리뷰 관련 비즈니스 예외
 *
 * BaseAppException을 상속하여 프레임워크 독립성을 유지합니다. GlobalExceptionHandler에서 자동으로 HTTP 응답으로 변환됩니다.
 *
 * @see ERROR_HANDLING_GUIDE.md
 */
sealed class ReviewException(
    message: String,
    errorCode: String,
    httpStatus: HttpStatus,
    details: Map<String, Any>? = null,
    cause: Throwable? = null,
) : BaseAppException(message, errorCode, httpStatus, details, cause)

/** 리뷰를 찾을 수 없을 때 발생하는 예외 */
class ReviewNotFoundException(
    val reviewId: Long,
    val userSeq: Long? = null,
    val movieId: Long? = null,
    message: String,
) : ReviewException(
        message = message,
        errorCode = ErrorCodes.REVIEW_NOT_FOUND,
        httpStatus = HttpStatus.NOT_FOUND,
        details =
            buildMap {
                put("reviewId", reviewId)
                userSeq?.let { put("userSeq", it) }
                movieId?.let { put("movieId", it) }
            },
    )

/** 리뷰가 이미 존재할 때 발생하는 예외 (중복 생성 시도) */
class ReviewAlreadyExistsException(
    val userSeq: Long,
    val movieId: Long,
    message: String,
) : ReviewException(
        message = message,
        errorCode = ErrorCodes.REVIEW_ALREADY_EXISTS,
        httpStatus = HttpStatus.CONFLICT,
        details =
            mapOf(
                "userSeq" to userSeq,
                "movieId" to movieId,
            ),
    )

/** 리뷰 수정 권한이 없을 때 발생하는 예외 */
class ReviewUnauthorizedUpdateException(
    val reviewId: Long,
    val userSeq: Long,
    message: String,
) : ReviewException(
        message = message,
        errorCode = ErrorCodes.REVIEW_UNAUTHORIZED_UPDATE,
        httpStatus = HttpStatus.FORBIDDEN,
        details =
            mapOf(
                "reviewId" to reviewId,
                "userSeq" to userSeq,
            ),
    )

/** 리뷰 삭제 권한이 없을 때 발생하는 예외 */
class ReviewUnauthorizedDeleteException(
    val reviewId: Long,
    val userSeq: Long,
    message: String,
) : ReviewException(
        message = message,
        errorCode = ErrorCodes.REVIEW_UNAUTHORIZED_DELETE,
        httpStatus = HttpStatus.FORBIDDEN,
        details =
            mapOf(
                "reviewId" to reviewId,
                "userSeq" to userSeq,
            ),
    )

/** 영화 정보를 찾을 수 없을 때 발생하는 예외 */
class MovieNotFoundException(
    val movieId: Long,
    message: String,
) : ReviewException(
        message = message,
        errorCode = ErrorCodes.NOT_FOUND,
        httpStatus = HttpStatus.NOT_FOUND,
        details = mapOf("movieId" to movieId),
    )

/** 외부 API 호출 실패 시 발생하는 예외 */
class ExternalApiException(
    val apiName: String,
    message: String,
    cause: Throwable? = null,
) : ReviewException(
        message = message,
        errorCode = ErrorCodes.EXTERNAL_API_ERROR,
        httpStatus = HttpStatus.BAD_GATEWAY,
        details = mapOf("apiName" to apiName),
        cause = cause,
    )
