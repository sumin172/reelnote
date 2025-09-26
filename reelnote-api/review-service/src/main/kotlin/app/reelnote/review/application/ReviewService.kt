package app.reelnote.review.application

import app.reelnote.review.domain.ReviewRepository
import app.reelnote.review.domain.Rating
import app.reelnote.review.interfaces.dto.*
import app.reelnote.review.shared.exception.ReviewNotFoundException
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Cacheable
import org.springframework.context.MessageSource
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

/**
 * 리뷰 서비스
 */
@Service
@Transactional(readOnly = true)
class ReviewService(
    private val reviewRepository: ReviewRepository,
    private val movieService: MovieService,
    private val messageSource: MessageSource
) {
    
    private val logger = LoggerFactory.getLogger(ReviewService::class.java)
    
    /**
     * 메시지 조회 헬퍼 메서드
     */
    private fun getMessage(key: String, vararg args: Any): String {
        return try {
            messageSource.getMessage(key, args, Locale.getDefault())
        } catch (_: Exception) {
            key
        }
    }
    
    /**
     * 리뷰 생성
     */
    @Transactional
    @CacheEvict(value = ["reviews", "popularTags", "ratingStats"], allEntries = true)
    fun createReview(request: CreateReviewRequest, userSeq: Long): ReviewResponse {
        logger.info("리뷰 생성 요청: userSeq={}, movieId={}, rating={}", userSeq, request.movieId, request.rating)
        
        // 중복 리뷰 체크
        val existingReview = reviewRepository.findByUserSeqAndMovieId(userSeq, request.movieId)
        if (existingReview.isPresent) {
            throw IllegalArgumentException(getMessage("error.review.already.exists"))
        }
        
        val review = request.toDomain(userSeq)
        val savedReview = reviewRepository.save(review)
        
        logger.info("리뷰 생성 완료: id={}", savedReview.id)
        return ReviewResponse.from(savedReview)
    }
    
    private fun toSort(sortBy: SortBy, direction: Direction): Sort {
        val property = when (sortBy) {
            SortBy.CREATED_AT -> "createdAt"
            SortBy.UPDATED_AT -> "updatedAt"
            SortBy.RATING -> "rating.value"
            SortBy.WATCHED_AT -> "watchedAt"
        }
        val sortDirection = if (direction == Direction.DESC) Sort.Direction.DESC else Sort.Direction.ASC
        return Sort.by(sortDirection, property)
    }
    
    /**
     * 단건 리뷰 조회 (userSeq + movieId)
     */
    fun getUserMovieReview(userSeq: Long, movieId: Long): ReviewResponse {
        logger.debug("단건 리뷰 검색 요청: userSeq={}, movieId={}", userSeq, movieId)

        val review = reviewRepository.findByUserSeqAndMovieId(userSeq, movieId)
            .orElseThrow { 
                ReviewNotFoundException(0L, userSeq, movieId)
            }

        return ReviewResponse.from(review)
    }

    /**
     * 개인 리뷰 검색 (다중 필터링 지원)
     */
    suspend fun searchMyReviews(request: MyReviewSearchRequest): PageResponse<ReviewResponse> {
        logger.debug("개인 리뷰 검색 요청: {}", request)

        val sort = toSort(request.sortBy, request.sortDirection)
        val pageable = PageRequest.of(request.page, request.size, sort)

        // movieTitle이 있으면 TMDB에서 영화 ID 목록을 해석한다
        val movieIds: List<Long>? = if (!request.movieTitle.isNullOrBlank()) {
            val searchResp = movieService.searchMovies(
                MovieSearchRequest(query = request.movieTitle, page = 1, language = request.language)
            )
            searchResp.results.map { it.id }.take(request.maxMovieIds)
        } else null

        val page = reviewRepository.findMyReviewsWithFilters(
            userSeq = request.userSeq,
            movieIds = if (movieIds.isNullOrEmpty()) null else movieIds,
            tags = request.tags.ifEmpty { null },
            minRating = request.minRating,
            maxRating = request.maxRating,
            startDate = request.startDate,
            endDate = request.endDate,
            pageable = pageable
        )

        return PageResponse.from(page.map { ReviewResponse.from(it) })
    }

    /**
     * 영화별 리뷰 검색 (다른 사람들의 리뷰, 다중 필터링 지원)
     */
    fun searchMovieReviews(request: MovieReviewSearchRequest): PageResponse<ReviewResponse> {
        logger.debug("영화별 리뷰 검색 요청: {}", request)

        val sort = toSort(request.sortBy, request.sortDirection)
        val pageable = PageRequest.of(request.page, request.size, sort)

        val page = reviewRepository.findMovieReviewsWithFilters(
            movieId = request.movieId,
            excludeUserSeq = request.excludeUserSeq,
            minRating = request.minRating,
            maxRating = request.maxRating,
            startDate = request.startDate,
            endDate = request.endDate,
            pageable = pageable
        )

        return PageResponse.from(page.map { ReviewResponse.from(it) })
    }
    
    /**
     * 리뷰 수정
     */
    @Transactional
    @CacheEvict(value = ["reviews", "popularTags", "ratingStats"], allEntries = true)
    fun updateReview(id: Long, request: UpdateReviewRequest, userSeq: Long): ReviewResponse {
        logger.info("리뷰 수정 요청: id={}, userSeq={}", id, userSeq)
        
        val existingReview = reviewRepository.findById(id)
            .orElseThrow { ReviewNotFoundException(id) }
        
        // 권한 체크
        if (existingReview.userSeq != userSeq) {
            throw IllegalArgumentException(getMessage("error.review.unauthorized.update"))
        }
        
        val updatedReview = existingReview.updateContent(
            rating = request.rating?.let { Rating.of(it) } ?: existingReview.rating,
            reason = request.reason,
            tags = request.tags ?: existingReview.tags,
            watchedAt = request.watchedAt
        )
        
        val savedReview = reviewRepository.save(updatedReview)
        
        logger.info("리뷰 수정 완료: id={}", savedReview.id)
        return ReviewResponse.from(savedReview)
    }
    
    /**
     * 리뷰 삭제 (소프트 삭제)
     */
    @Transactional
    @CacheEvict(value = ["reviews", "popularTags", "ratingStats"], allEntries = true)
    fun deleteReview(id: Long, userSeq: Long) {
        logger.info("리뷰 삭제 요청: id={}, userSeq={}", id, userSeq)
        
        val existingReview = reviewRepository.findById(id)
            .orElseThrow { ReviewNotFoundException(id) }
        
        // 권한 체크
        if (existingReview.userSeq != userSeq) {
            throw IllegalArgumentException(getMessage("error.review.unauthorized.delete"))
        }
        
        // @SQLDelete 어노테이션이 자동으로 soft delete 처리
        reviewRepository.delete(existingReview)
        
        logger.info("리뷰 삭제 완료: id={}", id)
    }
    
    /**
     * 최근 리뷰 조회
     */
    @Cacheable(value = ["recentReviews"])
    fun getRecentReviews(): List<ReviewResponse> {
        logger.debug("최근 리뷰 조회 요청")
        
        return reviewRepository.findTop10ByOrderByCreatedAtDesc()
            .map { ReviewResponse.from(it) }
    }
    
    /**
     * 인기 태그 조회
     */
    @Cacheable(value = ["popularTags"])
    fun getPopularTags(): Map<String, Long> {
        logger.debug("인기 태그 조회 요청")
        
        return reviewRepository.findPopularTags()
            .associate { (tag, count) -> tag as String to (count as Long) }
    }
    
    /**
     * 평점 통계 조회
     */
    @Cacheable(value = ["ratingStats"])
    fun getRatingStatistics(): Map<Int, Long> {
        logger.debug("평점 통계 조회 요청")
        
        return reviewRepository.findRatingStatistics()
            .associate { (rating, count) -> (rating as Int) to (count as Long) }
    }
}
