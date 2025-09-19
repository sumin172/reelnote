package app.reelnote.review.domain

import com.fasterxml.jackson.annotation.JsonProperty

/**
 * TMDB API에서 받아오는 영화 정보를 나타내는 데이터 클래스
 */
data class Movie(
    val id: Long,
    val title: String,
    @get:JsonProperty("original_title")
    @param:JsonProperty("original_title")
    val originalTitle: String,
    val overview: String?,
    @get:JsonProperty("release_date")
    @param:JsonProperty("release_date")
    val releaseDate: String?,
    @get:JsonProperty("poster_path")
    @param:JsonProperty("poster_path")
    val posterPath: String?,
    @get:JsonProperty("backdrop_path")
    @param:JsonProperty("backdrop_path")
    val backdropPath: String?,
    @get:JsonProperty("vote_average")
    @param:JsonProperty("vote_average")
    val voteAverage: Double?,
    @get:JsonProperty("vote_count")
    @param:JsonProperty("vote_count")
    val voteCount: Int?,
    val adult: Boolean = false,
    val video: Boolean = false,
    val popularity: Double? = null,
    @get:JsonProperty("genre_ids")
    @param:JsonProperty("genre_ids")
    val genreIds: List<Int> = emptyList()
)

/**
 * TMDB API 검색 결과를 나타내는 데이터 클래스
 */
data class MovieSearchResult(
    val page: Int,
    val results: List<Movie>,
    @get:JsonProperty("total_pages")
    @param:JsonProperty("total_pages")
    val totalPages: Int,
    @get:JsonProperty("total_results")
    @param:JsonProperty("total_results")
    val totalResults: Int
)


