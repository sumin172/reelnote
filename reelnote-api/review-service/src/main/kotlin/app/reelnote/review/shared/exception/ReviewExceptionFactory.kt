package app.reelnote.review.shared.exception

import org.springframework.context.MessageSource
import org.springframework.stereotype.Service
import java.util.Locale

/**
 * Review 예외 생성 팩토리 서비스
 *
 * 에러 코드, 메시지, HTTP 상태를 중앙에서 관리합니다. MessageSource를 사용하여 국제화된 메시지를 제공합니다. 나중에 로깅/메트릭을 공통으로 추가할 때 여기만
 * 수정하면 됩니다.
 */
@Service
class ReviewExceptionFactory(
    private val messageSource: MessageSource,
) {
    /** 메시지 조회 헬퍼 메서드 */
    private fun getMessage(
        key: String,
        vararg args: Any,
    ): String =
        try {
            messageSource.getMessage(key, args, Locale.getDefault())
        } catch (_: Exception) {
            key
        }

    /** 리뷰를 찾을 수 없을 때 발생하는 예외 생성 */
    fun notFound(
        reviewId: Long,
        userSeq: Long? = null,
        movieId: Long? = null,
    ): ReviewNotFoundException {
        val message =
            if (userSeq != null && movieId != null) {
                // userSeq와 movieId가 모두 있는 경우는 messages.properties에 별도 키가 없으므로
                // 기존 로직 유지
                "해당 조건의 리뷰가 존재하지 않습니다 (userSeq: $userSeq, movieId: $movieId)"
            } else {
                getMessage("error.review.not.found", reviewId)
            }

        return ReviewNotFoundException(
            reviewId = reviewId,
            userSeq = userSeq,
            movieId = movieId,
            message = message,
        )
    }

    /** 리뷰가 이미 존재할 때 발생하는 예외 생성 (중복 생성 시도) */
    fun alreadyExists(
        userSeq: Long,
        movieId: Long,
    ): ReviewAlreadyExistsException {
        val message = getMessage("error.review.already.exists")
        return ReviewAlreadyExistsException(
            userSeq = userSeq,
            movieId = movieId,
            message = message,
        )
    }

    /** 리뷰 수정 권한이 없을 때 발생하는 예외 생성 */
    fun unauthorizedUpdate(
        reviewId: Long,
        userSeq: Long,
    ): ReviewUnauthorizedUpdateException {
        val message = getMessage("error.review.unauthorized.update")
        return ReviewUnauthorizedUpdateException(
            reviewId = reviewId,
            userSeq = userSeq,
            message = message,
        )
    }

    /** 리뷰 삭제 권한이 없을 때 발생하는 예외 생성 */
    fun unauthorizedDelete(
        reviewId: Long,
        userSeq: Long,
    ): ReviewUnauthorizedDeleteException {
        val message = getMessage("error.review.unauthorized.delete")
        return ReviewUnauthorizedDeleteException(
            reviewId = reviewId,
            userSeq = userSeq,
            message = message,
        )
    }

    /** 영화 정보를 찾을 수 없을 때 발생하는 예외 생성 */
    fun movieNotFound(movieId: Long): MovieNotFoundException {
        val message = getMessage("error.movie.not.found", movieId)
        return MovieNotFoundException(
            movieId = movieId,
            message = message,
        )
    }

    /** 외부 API 호출 실패 시 발생하는 예외 생성 */
    fun externalApiFailed(
        apiName: String,
        cause: Throwable? = null,
    ): ExternalApiException {
        val message = getMessage("error.external.api.failed", apiName)
        return ExternalApiException(
            apiName = apiName,
            message = message,
            cause = cause,
        )
    }
}
