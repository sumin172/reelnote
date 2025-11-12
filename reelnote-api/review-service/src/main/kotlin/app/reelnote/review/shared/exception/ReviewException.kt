package app.reelnote.review.shared.exception

import app.reelnote.review.shared.response.ErrorCodes
import org.springframework.http.HttpStatus

/**
 * 리뷰 관련 비즈니스 예외
 */
sealed class ReviewException(
    message: String,
    val errorCode: String,
    val httpStatus: HttpStatus,
) : RuntimeException(message)

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
    ) {
    init {
        cause?.let { initCause(it) }
    }
}

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
