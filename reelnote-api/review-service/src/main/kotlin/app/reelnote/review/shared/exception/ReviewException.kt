package app.reelnote.review.shared.exception

import app.reelnote.review.shared.response.ErrorCodes
import org.springframework.http.HttpStatus

/**
 * 리뷰 관련 비즈니스 예외
 *
 * BaseAppException을 상속하여 프레임워크 독립성을 유지합니다.
 * GlobalExceptionHandler에서 자동으로 HTTP 응답으로 변환됩니다.
 *
 * @see ERROR_HANDLING_GUIDE.md
 */
sealed class ReviewException(
    message: String,
    errorCode: String,
    httpStatus: HttpStatus,
    details: Map<String, Any>? = null,
    cause: Throwable? = null,
) : BaseAppException(message, errorCode, httpStatus, details, cause) {
    companion object {
        /**
         * 리뷰를 찾을 수 없을 때 발생하는 예외 생성
         */
        fun notFound(
            reviewId: Long,
            userSeq: Long? = null,
            movieId: Long? = null,
        ): ReviewNotFoundException = ReviewNotFoundException(reviewId, userSeq, movieId)

        /**
         * 영화 정보를 찾을 수 없을 때 발생하는 예외 생성
         */
        fun movieNotFound(movieId: Long): MovieNotFoundException = MovieNotFoundException(movieId)

        /**
         * 외부 API 호출 실패 시 발생하는 예외 생성
         */
        fun externalApiFailed(
            apiName: String,
            cause: Throwable? = null,
        ): ExternalApiException = ExternalApiException(apiName, cause)
    }
}

/**
 * 리뷰를 찾을 수 없을 때 발생하는 예외
 */
class ReviewNotFoundException(
    reviewId: Long,
    userSeq: Long? = null,
    movieId: Long? = null,
) : ReviewException(
        message = reviewNotFoundMessage(reviewId, userSeq, movieId),
        errorCode = ErrorCodes.NOT_FOUND,
        httpStatus = HttpStatus.NOT_FOUND,
        details =
            buildMap {
                put("reviewId", reviewId)
                userSeq?.let { put("userSeq", it) }
                movieId?.let { put("movieId", it) }
            },
    )

/**
 * 영화 정보를 찾을 수 없을 때 발생하는 예외
 */
class MovieNotFoundException(
    movieId: Long,
) : ReviewException(
        message = "영화 정보를 찾을 수 없습니다. ID: $movieId",
        errorCode = ErrorCodes.NOT_FOUND,
        httpStatus = HttpStatus.NOT_FOUND,
        details = mapOf("movieId" to movieId),
    )

/**
 * 외부 API 호출 실패 시 발생하는 예외
 */
class ExternalApiException(
    apiName: String,
    cause: Throwable? = null,
) : ReviewException(
        message = "외부 API 호출에 실패했습니다. API: $apiName",
        errorCode = ErrorCodes.EXTERNAL_API_ERROR,
        httpStatus = HttpStatus.BAD_GATEWAY,
        details = mapOf("apiName" to apiName),
        cause = cause,
    )

private fun reviewNotFoundMessage(
    reviewId: Long,
    userSeq: Long?,
    movieId: Long?,
): String =
    if (userSeq != null && movieId != null) {
        "해당 조건의 리뷰가 존재하지 않습니다 (userSeq: $userSeq, movieId: $movieId)"
    } else {
        "리뷰를 찾을 수 없습니다. ID: $reviewId"
    }
