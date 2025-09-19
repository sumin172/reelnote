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
    fun findByUserSeqAndMovieId(userSeq: Long, movieId: Long): Optional<Review>

    /**
     * 개인 리뷰 다중 필터링 검색
     */
    @Query("""
        SELECT DISTINCT r FROM Review r 
        LEFT JOIN r.tags t
        WHERE r.userSeq = :userSeq
        AND r.deleted = false
        AND (:movieIds IS NULL OR r.movieId IN (:movieIds))
        AND (:tags IS NULL OR t IN :tags)
        AND (:minRating IS NULL OR r.rating.value >= :minRating)
        AND (:maxRating IS NULL OR r.rating.value <= :maxRating)
        AND (:startDate IS NULL OR r.watchedAt >= :startDate)
        AND (:endDate IS NULL OR r.watchedAt <= :endDate)
    """)
    fun findMyReviewsWithFilters(
        @Param("userSeq") userSeq: Long,
        @Param("movieIds") movieIds: List<Long>?,
        @Param("tags") tags: Set<String>?,
        @Param("minRating") minRating: Int?,
        @Param("maxRating") maxRating: Int?,
        @Param("startDate") startDate: LocalDate?,
        @Param("endDate") endDate: LocalDate?,
        pageable: Pageable
    ): Page<Review>

    /**
     * 영화별 리뷰 다중 필터링 검색 (다른 사람들의 리뷰, 태그 제외)
     */
    @Query("""
        SELECT r FROM Review r
        WHERE r.movieId = :movieId
        AND r.deleted = false
        AND (:excludeUserSeq IS NULL OR r.userSeq != :excludeUserSeq)
        AND (:minRating IS NULL OR r.rating.value >= :minRating)
        AND (:maxRating IS NULL OR r.rating.value <= :maxRating)
        AND (:startDate IS NULL OR r.watchedAt >= :startDate)
        AND (:endDate IS NULL OR r.watchedAt <= :endDate)
    """)
    fun findMovieReviewsWithFilters(
        @Param("movieId") movieId: Long,
        @Param("excludeUserSeq") excludeUserSeq: Long?,
        @Param("minRating") minRating: Int?,
        @Param("maxRating") maxRating: Int?,
        @Param("startDate") startDate: LocalDate?,
        @Param("endDate") endDate: LocalDate?,
        pageable: Pageable
    ): Page<Review>
    
    /**
     * 최근 리뷰 조회 (생성일 기준)
     */
    fun findTop10ByOrderByCreatedAtDesc(): List<Review>
    
    /**
     * 인기 태그 조회 (사용 빈도 기준)
     */
    @Query("""
        SELECT t, COUNT(t) as count 
          FROM Review r JOIN r.tags t 
         GROUP BY t 
         ORDER BY count DESC
    """)
    fun findPopularTags(): List<Array<Any>>
    
    /**
     * 평점 통계 조회
     */
    @Query("""
        SELECT r.rating.value, COUNT(r) 
          FROM Review r 
         GROUP BY r.rating.value 
         ORDER BY r.rating.value
    """)
    fun findRatingStatistics(): List<Array<Any>>

    /**
     * 이벤트 미발행 리뷰 조회 (Analysis 서비스용)
     */
    @Query("SELECT r FROM Review r WHERE r.eventPublished = false AND r.deleted = false")
    fun findUnpublishedReviews(pageable: Pageable): Page<Review>

    /**
     * 특정 시점 이후 변경된 리뷰 조회 (Analysis 서비스용)
     */
    @Query("SELECT r FROM Review r WHERE r.updatedAt > :since AND r.deleted = false")
    fun findReviewsUpdatedAfter(@Param("since") since: Instant, pageable: Pageable): Page<Review>
}


