package app.reelnote.review.interfaces.dto

import app.reelnote.review.domain.Review
import app.reelnote.review.domain.Rating
import jakarta.validation.constraints.*
import java.time.LocalDate
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue

/**
 * 리뷰 생성 요청 DTO
 */
data class CreateReviewRequest(
    @field:NotNull
    @field:Positive
    val movieId: Long,

    @field:Min(value = 1)
    @field:Max(value = 5)
    val rating: Int,
    
    @field:Size(max = 1000)
    val reason: String? = null,
    
    @field:Size(max = 10)
    val tags: Set<String> = emptySet(),
    
    val watchedAt: LocalDate? = null
) {
    fun toDomain(userSeq: Long): Review = Review(
        userSeq = userSeq,
        movieId = movieId,
        rating = Rating.of(rating),
        reason = reason,
        tags = tags,
        watchedAt = watchedAt
    )
}

/**
 * 개인 리뷰 검색 요청 DTO (userSeq 필수)
 */
data class MyReviewSearchRequest(
    val userSeq: Long,

    val movieTitle: String? = null,  // 영화 제목으로 필터링 (옵션)
    val language: String = "ko-KR",

    val tags: Set<String> = emptySet(),  // 다중 태그 필터링 (개인 리뷰 전용)

    val minRating: Int? = null,
    val maxRating: Int? = null,

    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val sortBy: SortBy = SortBy.CREATED_AT,
    val sortDirection: Direction = Direction.DESC,

    val page: Int = 0,
    val size: Int = 20,
    val maxMovieIds: Int = 100
)

/**
 * 영화별 리뷰 검색 요청 DTO (다른 사람들의 리뷰)
 */
data class MovieReviewSearchRequest(
    val movieId: Long,

    val excludeUserSeq: Long? = null,  // 특정 사용자 제외 (본인 리뷰 제외)

    val minRating: Int? = null,
    val maxRating: Int? = null,

    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val sortBy: SortBy = SortBy.CREATED_AT,
    val sortDirection: Direction = Direction.DESC,

    val page: Int = 0,
    val size: Int = 20
)

/**
 * 리뷰 수정 요청 DTO
 */
data class UpdateReviewRequest(
    @field:Min(value = 1)
    @field:Max(value = 5)
    val rating: Int? = null,
    
    @field:Size(max = 1000)
    val reason: String? = null,
    
    @field:Size(max = 10)
    val tags: Set<String>? = null,
    
    val watchedAt: LocalDate? = null
)

/**
 * 리뷰 응답 DTO
 */
data class ReviewResponse(
    val id: Long,
    val userSeq: Long,
    val movieId: Long,
    val rating: Int,
    val reason: String?,
    val tags: Set<String>,
    val watchedAt: LocalDate?,
    val createdAt: String,
    val updatedAt: String,
    val version: Long
) {
    companion object {
        fun from(review: Review): ReviewResponse = ReviewResponse(
            id = review.id,
            userSeq = review.userSeq,
            movieId = review.movieId,
            rating = review.rating.value,
            reason = review.reason,
            tags = review.tags,
            watchedAt = review.watchedAt,
            createdAt = review.createdAt.toString(),
            updatedAt = review.updatedAt.toString(),
            version = review.version
        )
    }
}

/**
 * 페이지네이션 응답 DTO
 */
data class PageResponse<T>(
    val content: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val first: Boolean,
    val last: Boolean
) {
    companion object {
        fun <T> from(page: org.springframework.data.domain.Page<T>): PageResponse<T> = PageResponse(
            content = page.content,
            page = page.number,
            size = page.size,
            totalElements = page.totalElements,
            totalPages = page.totalPages,
            first = page.isFirst,
            last = page.isLast
        )
    }
}

enum class SortBy(val value: String) {
    CREATED_AT("createdAt"),
    UPDATED_AT("updatedAt"),
    RATING("rating"),
    WATCHED_AT("watchedAt");

    @JsonValue
    fun toJson(): String = value

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromJson(value: String): SortBy = entries.firstOrNull {
            it.value.equals(value, ignoreCase = true)
        } ?: CREATED_AT
    }
}

enum class Direction(val value: String) {
    ASC("asc"),
    DESC("desc");

    @JsonValue
    fun toJson(): String = value

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromJson(value: String): Direction = entries.firstOrNull {
            it.value.equals(value, ignoreCase = true)
        } ?: DESC
    }
}