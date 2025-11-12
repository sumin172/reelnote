package app.reelnote.review.domain

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.Instant
import java.time.LocalDate
import java.util.Optional

/**
 * 리뷰 리포지토리 인터페이스
 */
@Repository
interface ReviewRepository : JpaRepository<Review, Long> {
    /**
     * 사용자별 영화 리뷰 검색
     */
    fun findByUserSeqAndMovieId(
        userSeq: Long,
        movieId: Long,
    ): Optional<Review>

    /**
     * 개인 리뷰 다중 필터링 검색
     */
    @Query(
        """
        SELECT DISTINCT r FROM Review r
          LEFT JOIN r.tags t
         WHERE r.userSeq = :#{#filter.userSeq}
           AND (:#{#filter.movieIds}   IS NULL OR r.movieId IN :#{#filter.movieIds})
           AND (:#{#filter.tags}       IS NULL OR t IN :#{#filter.tags})
           AND (:#{#filter.minRating}  IS NULL OR r.rating.value >= :#{#filter.minRating})
           AND (:#{#filter.maxRating}  IS NULL OR r.rating.value <= :#{#filter.maxRating})
           AND (:#{#filter.startDate}  IS NULL OR r.watchedAt >= :#{#filter.startDate})
           AND (:#{#filter.endDate}    IS NULL OR r.watchedAt <= :#{#filter.endDate})
    """,
    )
    fun findMyReviewsWithFilters(
        @Param("filter") filter: MyReviewFilter,
        pageable: Pageable,
    ): Page<Review>

    /**
     * 영화별 리뷰 다중 필터링 검색 (다른 사람들의 리뷰, 태그 제외)
     */
    @Query(
        """
        SELECT r FROM Review r
         WHERE r.movieId = :#{#filter.movieId}
           AND (:#{#filter.excludeUserSeq} IS NULL OR r.userSeq != :#{#filter.excludeUserSeq})
           AND (:#{#filter.minRating}      IS NULL OR r.rating.value >= :#{#filter.minRating})
           AND (:#{#filter.maxRating}      IS NULL OR r.rating.value <= :#{#filter.maxRating})
           AND (:#{#filter.startDate}      IS NULL OR r.watchedAt >= :#{#filter.startDate})
           AND (:#{#filter.endDate}        IS NULL OR r.watchedAt <= :#{#filter.endDate})
    """,
    )
    fun findMovieReviewsWithFilters(
        @Param("filter") filter: MovieReviewFilter,
        pageable: Pageable,
    ): Page<Review>

    /**
     * 최근 리뷰 조회 (생성일 기준)
     */
    fun findTop10ByOrderByCreatedAtDesc(): List<Review>

    /**
     * 인기 태그 조회 (사용 빈도 기준)
     */
    @Query(
        """
        SELECT t, COUNT(t) as count
          FROM Review r JOIN r.tags t
         GROUP BY t
         ORDER BY count DESC
    """,
    )
    fun findPopularTags(): List<Array<Any>>

    /**
     * 평점 통계 조회
     */
    @Query(
        """
        SELECT r.rating.value, COUNT(r)
          FROM Review r
         GROUP BY r.rating.value
         ORDER BY r.rating.value
    """,
    )
    fun findRatingStatistics(): List<Array<Any>>

    /**
     * 이벤트 미발행 리뷰 조회 (Analysis 서비스용)
     */
    @Query("SELECT r FROM Review r WHERE r.eventPublished = false")
    fun findUnpublishedReviews(pageable: Pageable): Page<Review>

    /**
     * 특정 시점 이후 변경된 리뷰 조회 (Analysis 서비스용)
     */
    @Query("SELECT r FROM Review r WHERE r.updatedAt > :since")
    fun findReviewsUpdatedAfter(
        @Param("since") since: Instant,
        pageable: Pageable,
    ): Page<Review>
}

data class MyReviewFilter(
    val userSeq: Long,
    val movieIds: List<Long>?,
    val tags: Set<String>?,
    val minRating: Int?,
    val maxRating: Int?,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
)

data class MovieReviewFilter(
    val movieId: Long,
    val excludeUserSeq: Long?,
    val minRating: Int?,
    val maxRating: Int?,
    val startDate: LocalDate?,
    val endDate: LocalDate?,
)
