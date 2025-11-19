package app.reelnote.review.application

import app.reelnote.review.domain.Rating
import app.reelnote.review.domain.Review
import app.reelnote.review.domain.ReviewContent
import app.reelnote.review.domain.ReviewRepository
import app.reelnote.review.interfaces.dto.CreateReviewRequest
import app.reelnote.review.interfaces.dto.ReviewResponse
import app.reelnote.review.interfaces.dto.UpdateReviewRequest
import app.reelnote.review.shared.exception.ReviewException
import app.reelnote.review.shared.exception.ReviewNotFoundException
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.CacheEvict
import org.springframework.context.MessageSource
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.Locale

/** 리뷰 서비스 */
@Service
@Transactional(readOnly = true)
class ReviewService(
    private val reviewRepository: ReviewRepository,
    private val messageSource: MessageSource,
) {
    private val logger = LoggerFactory.getLogger(ReviewService::class.java)

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

    /** 리뷰 생성 */
    @Transactional
    @CacheEvict(value = ["reviews", "popularTags", "ratingStats"], allEntries = true)
    fun createReview(
        request: CreateReviewRequest,
        userSeq: Long,
    ): ReviewResponse {
        logger.info(
            "리뷰 생성 요청: userSeq={}, movieId={}, rating={}",
            userSeq,
            request.movieId,
            request.rating,
        )

        // 중복 리뷰 체크
        val existingReview = reviewRepository.findByUserSeqAndMovieId(userSeq, request.movieId)
        if (existingReview.isPresent) {
            throw ReviewException.alreadyExists(userSeq, request.movieId)
        }

        // 도메인 객체 생성 (비즈니스 로직은 도메인에)
        val review =
            Review.create(
                userSeq = userSeq,
                movieId = request.movieId,
                content =
                    ReviewContent(
                        rating = Rating.of(request.rating),
                        reason = request.reason,
                        tags = request.tags,
                        watchedAt = request.watchedAt,
                    ),
            )

        val savedReview = reviewRepository.save(review)

        logger.info("리뷰 생성 완료: id={}", savedReview.id)
        return ReviewResponse.from(savedReview)
    }

    /** 리뷰 수정 */
    @Transactional
    @CacheEvict(value = ["reviews", "popularTags", "ratingStats"], allEntries = true)
    fun updateReview(
        id: Long,
        request: UpdateReviewRequest,
        userSeq: Long,
    ): ReviewResponse {
        logger.info("리뷰 수정 요청: id={}, userSeq={}", id, userSeq)

        val existingReview =
            reviewRepository.findById(id).orElseThrow { ReviewNotFoundException(id) }

        // 권한 체크
        if (existingReview.userSeq != userSeq) {
            throw ReviewException.unauthorizedUpdate(id, userSeq)
        }

        // 기존 인스턴스 수정 (필드 값 변경 감지)
        existingReview.updateContent(
            rating = request.rating?.let { Rating.of(it) } ?: existingReview.rating,
            reason = request.reason,
            tags = request.tags ?: existingReview.tags,
            watchedAt = request.watchedAt,
        )

        // 트랜잭션 커밋 시 자동 저장되지만, 반환값 획득 및 명시적 의도 표현을 위해 호출
        val savedReview = reviewRepository.save(existingReview)

        logger.info("리뷰 수정 완료: id={}", savedReview.id)
        return ReviewResponse.from(savedReview)
    }

    /** 리뷰 삭제 (소프트 삭제) */
    @Transactional
    @CacheEvict(value = ["reviews", "popularTags", "ratingStats"], allEntries = true)
    fun deleteReview(
        id: Long,
        userSeq: Long,
    ) {
        logger.info("리뷰 삭제 요청: id={}, userSeq={}", id, userSeq)

        val existingReview =
            reviewRepository.findById(id).orElseThrow { ReviewNotFoundException(id) }

        // 권한 체크
        if (existingReview.userSeq != userSeq) {
            throw ReviewException.unauthorizedDelete(id, userSeq)
        }

        // @SQLDelete 어노테이션이 자동으로 soft delete 처리
        reviewRepository.delete(existingReview)

        logger.info("리뷰 삭제 완료: id={}", id)
    }
}
