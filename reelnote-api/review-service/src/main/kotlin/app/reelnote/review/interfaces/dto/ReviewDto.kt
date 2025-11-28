package app.reelnote.review.interfaces.dto

import app.reelnote.review.domain.Review
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonValue
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.time.format.DateTimeParseException

/** 리뷰 생성 요청 DTO */
data class CreateReviewRequest(
    @field:NotNull @field:Positive val movieId: Long,
    @field:Min(value = 1) @field:Max(value = 5) val rating: Int,
    @field:Size(max = 1000) val reason: String? = null,
    @field:Size(max = 10) val tags: Set<String> = emptySet(),
    val watchedAt: LocalDate? = null,
)

/** 개인 리뷰 검색 요청 DTO (userSeq 필수) */
data class MyReviewSearchRequest(
    val userSeq: Long,
    val movieTitle: String? = null, // 영화 제목으로 필터링 (옵션)
    val language: String = "ko-KR",
    val tags: Set<String> = emptySet(), // 다중 태그 필터링 (개인 리뷰 전용)
    val minRating: Int? = null,
    val maxRating: Int? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val sortBy: SortBy = SortBy.CREATED_AT,
    val sortDirection: Direction = Direction.DESC,
    val page: Int = 0,
    val size: Int = 20,
    val maxMovieIds: Int = 100,
)

/** 영화별 리뷰 검색 요청 DTO (다른 사람들의 리뷰) */
data class MovieReviewSearchRequest(
    val movieId: Long,
    val excludeUserSeq: Long? = null, // 특정 사용자 제외 (본인 리뷰 제외)
    val minRating: Int? = null,
    val maxRating: Int? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val sortBy: SortBy = SortBy.CREATED_AT,
    val sortDirection: Direction = Direction.DESC,
    val page: Int = 0,
    val size: Int = 20,
)

/** 개인 리뷰 검색 파라미터 바인딩 DTO */
data class MyReviewSearchCriteria(
    val movieTitle: String? = null,
    val language: String = "ko-KR",
    val tags: String? = null,
    @field:Min(1) @field:Max(5) val minRating: Int? = null,
    @field:Min(1) @field:Max(5) val maxRating: Int? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val sortBy: SortBy = SortBy.CREATED_AT,
    val sortDirection: Direction = Direction.DESC,
    @field:Min(0) val page: Int = 0,
    @field:Min(1) @field:Max(100) val size: Int = 20,
    @field:Min(1) val maxMovieIds: Int = 100,
) {
    fun toRequest(userSeq: Long): MyReviewSearchRequest =
        MyReviewSearchRequest(
            userSeq = userSeq,
            movieTitle = movieTitle,
            language = language,
            tags = splitTags(),
            minRating = minRating,
            maxRating = maxRating,
            startDate = startDate?.takeIf { it.isNotBlank() }?.let { parseDateOrNull(it) },
            endDate = endDate?.takeIf { it.isNotBlank() }?.let { parseDateOrNull(it) },
            sortBy = sortBy,
            sortDirection = sortDirection,
            page = page,
            size = size,
            maxMovieIds = maxMovieIds,
        )

    private fun splitTags(): Set<String> =
        tags
            ?.split(",")
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?.toSet() ?: emptySet()
}

/** 영화 리뷰 검색 파라미터 바인딩 DTO */
data class MovieReviewSearchCriteria(
    @field:Min(1) @field:Max(5) val minRating: Int? = null,
    @field:Min(1) @field:Max(5) val maxRating: Int? = null,
    val startDate: String? = null,
    val endDate: String? = null,
    val sortBy: SortBy = SortBy.CREATED_AT,
    val sortDirection: Direction = Direction.DESC,
    @field:Min(0) val page: Int = 0,
    @field:Min(1) @field:Max(100) val size: Int = 20,
) {
    fun toRequest(
        movieId: Long,
        excludeUserSeq: Long?,
    ): MovieReviewSearchRequest =
        MovieReviewSearchRequest(
            movieId = movieId,
            excludeUserSeq = excludeUserSeq,
            minRating = minRating,
            maxRating = maxRating,
            startDate = startDate?.takeIf { it.isNotBlank() }?.let { parseDateOrNull(it) },
            endDate = endDate?.takeIf { it.isNotBlank() }?.let { parseDateOrNull(it) },
            sortBy = sortBy,
            sortDirection = sortDirection,
            page = page,
            size = size,
        )
}

/** 리뷰 수정 요청 DTO */
data class UpdateReviewRequest(
    @field:Min(value = 1) @field:Max(value = 5) val rating: Int? = null,
    @field:Size(max = 1000) val reason: String? = null,
    @field:Size(max = 10) val tags: Set<String>? = null,
    val watchedAt: LocalDate? = null,
)

/** 리뷰 응답 DTO */
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
    val version: Long,
) {
    companion object {
        fun from(review: Review): ReviewResponse =
            ReviewResponse(
                id = review.id,
                userSeq = review.userSeq,
                movieId = review.movieId,
                rating = review.rating.value,
                reason = review.reason,
                // 지연 로딩 컬렉션을 명시적으로 복사하여 LazyInitializationException 방지
                tags = review.tags.toSet(),
                watchedAt = review.watchedAt,
                createdAt = review.createdAt.toString(),
                updatedAt = review.updatedAt.toString(),
                version = review.version,
            )
    }
}

/** 페이지네이션 응답 DTO */
data class PageResponse<T>(
    val content: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val first: Boolean,
    val last: Boolean,
) {
    companion object {
        fun <T> from(page: org.springframework.data.domain.Page<T>): PageResponse<T> =
            PageResponse(
                content = page.content,
                page = page.number,
                size = page.size,
                totalElements = page.totalElements,
                totalPages = page.totalPages,
                first = page.isFirst,
                last = page.isLast,
            )
    }
}

enum class SortBy(
    val value: String,
) {
    CREATED_AT("createdAt"),
    UPDATED_AT("updatedAt"),
    RATING("rating"),
    WATCHED_AT("watchedAt"),
    ;

    @JsonValue fun toJson(): String = value

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromJson(value: String): SortBy = entries.firstOrNull { it.value.equals(value, ignoreCase = true) } ?: CREATED_AT
    }
}

enum class Direction(
    val value: String,
) {
    ASC("asc"),
    DESC("desc"),
    ;

    @JsonValue fun toJson(): String = value

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromJson(value: String): Direction = entries.firstOrNull { it.value.equals(value, ignoreCase = true) } ?: DESC
    }
}

/** 날짜 문자열을 LocalDate로 안전하게 파싱합니다. 파싱에 실패하거나 빈 문자열인 경우 null을 반환합니다. */
private fun parseDateOrNull(dateString: String): LocalDate? =
    try {
        LocalDate.parse(dateString)
    } catch (_: DateTimeParseException) {
        null
    }
