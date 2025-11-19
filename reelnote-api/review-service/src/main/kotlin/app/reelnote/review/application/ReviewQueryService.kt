package app.reelnote.review.application

import app.reelnote.review.domain.MovieReviewFilter
import app.reelnote.review.domain.MyReviewFilter
import app.reelnote.review.domain.ReviewRepository
import app.reelnote.review.infrastructure.catalog.CatalogClient
import app.reelnote.review.interfaces.dto.Direction
import app.reelnote.review.interfaces.dto.MovieReviewSearchRequest
import app.reelnote.review.interfaces.dto.MyReviewSearchRequest
import app.reelnote.review.interfaces.dto.PageResponse
import app.reelnote.review.interfaces.dto.ReviewResponse
import app.reelnote.review.interfaces.dto.SortBy
import app.reelnote.review.shared.exception.ExternalApiException
import app.reelnote.review.shared.exception.ReviewExceptionFactory
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.Cacheable
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class ReviewQueryService(
    private val reviewRepository: ReviewRepository,
    private val catalogClient: CatalogClient,
    private val exceptionFactory: ReviewExceptionFactory,
) {
    private val logger = LoggerFactory.getLogger(ReviewQueryService::class.java)

    fun getUserMovieReview(
        userSeq: Long,
        movieId: Long,
    ): ReviewResponse {
        logger.debug("단건 리뷰 검색 요청: userSeq={}, movieId={}", userSeq, movieId)

        val review =
            reviewRepository
                .findByUserSeqAndMovieId(userSeq, movieId)
                .orElseThrow {
                    exceptionFactory.notFound(0L, userSeq, movieId)
                }

        return ReviewResponse.from(review)
    }

    suspend fun searchMyReviews(request: MyReviewSearchRequest): PageResponse<ReviewResponse> {
        logger.debug("개인 리뷰 검색 요청: {}", request)

        val sort = toSort(request.sortBy, request.sortDirection)
        val pageable = PageRequest.of(request.page, request.size, sort)

        val movieIds: List<Long>? =
            if (!request.movieTitle.isNullOrBlank()) {
                try {
                    val response =
                        catalogClient.searchMovies(
                            query = request.movieTitle,
                            page = 1,
                            language = request.language,
                        )
                    response.aggregateMovieIds().take(request.maxMovieIds)
                } catch (ex: ExternalApiException) {
                    logger.warn("Catalog 서비스 검색 실패로 영화 ID 필터를 생략합니다.", ex)
                    null
                }
            } else {
                null
            }

        val page =
            reviewRepository.findMyReviewsWithFilters(request.toFilter(movieIds), pageable)

        return PageResponse.from(page.map { ReviewResponse.from(it) })
    }

    fun searchMovieReviews(request: MovieReviewSearchRequest): PageResponse<ReviewResponse> {
        logger.debug("영화별 리뷰 검색 요청: {}", request)

        val sort = toSort(request.sortBy, request.sortDirection)
        val pageable = PageRequest.of(request.page, request.size, sort)

        val page =
            reviewRepository.findMovieReviewsWithFilters(request.toFilter(), pageable)

        return PageResponse.from(page.map { ReviewResponse.from(it) })
    }

    @Cacheable(value = ["recentReviews"])
    fun getRecentReviews(): List<ReviewResponse> {
        logger.debug("최근 리뷰 조회 요청")

        return reviewRepository
            .findTop10ByOrderByCreatedAtDesc()
            .map { ReviewResponse.from(it) }
    }

    @Cacheable(value = ["popularTags"])
    fun getPopularTags(): Map<String, Long> {
        logger.debug("인기 태그 조회 요청")

        return reviewRepository
            .findPopularTags()
            .associate { (tag, count) -> tag as String to (count as Long) }
    }

    @Cacheable(value = ["ratingStats"])
    fun getRatingStatistics(): Map<Int, Long> {
        logger.debug("평점 통계 조회 요청")

        return reviewRepository
            .findRatingStatistics()
            .associate { (rating, count) -> (rating as Int) to (count as Long) }
    }

    private fun toSort(
        sortBy: SortBy,
        direction: Direction,
    ): Sort {
        val property =
            when (sortBy) {
                SortBy.CREATED_AT -> "createdAt"
                SortBy.UPDATED_AT -> "updatedAt"
                SortBy.RATING -> "rating.value"
                SortBy.WATCHED_AT -> "watchedAt"
            }
        val sortDirection = if (direction == Direction.DESC) Sort.Direction.DESC else Sort.Direction.ASC
        return Sort.by(sortDirection, property)
    }
}

private fun MyReviewSearchRequest.toFilter(movieIds: List<Long>?): MyReviewFilter =
    MyReviewFilter(
        userSeq = userSeq,
        movieIds = movieIds,
        tags = tags.takeUnless { it.isEmpty() },
        minRating = minRating,
        maxRating = maxRating,
        startDate = startDate,
        endDate = endDate,
    )

private fun MovieReviewSearchRequest.toFilter(): MovieReviewFilter =
    MovieReviewFilter(
        movieId = movieId,
        excludeUserSeq = excludeUserSeq,
        minRating = minRating,
        maxRating = maxRating,
        startDate = startDate,
        endDate = endDate,
    )
