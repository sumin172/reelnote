package app.reelnote.review.interfaces.dto

import app.reelnote.review.domain.Movie
import app.reelnote.review.domain.MovieSearchResult

/**
 * 영화 검색 요청 DTO
 */
data class MovieSearchRequest(
    val query: String,
    val page: Int = 1,
    
    val language: String = "ko-KR"
)

/**
 * 영화 상세 조회 요청 DTO
 */
data class MovieDetailRequest(
    val movieId: Long,
    
    val language: String = "ko-KR"
)

/**
 * 영화 응답 DTO
 */
data class MovieResponse(
    val id: Long,
    val title: String,
    val originalTitle: String,
    val overview: String?,
    val releaseDate: String?,
    val posterPath: String?,
    val backdropPath: String?,
    val voteAverage: Double?,
    val voteCount: Int?,
    val adult: Boolean,
    val video: Boolean,
    val popularity: Double?,
    val genreIds: List<Int>
) {
    companion object {
        fun from(movie: Movie): MovieResponse = MovieResponse(
            id = movie.id,
            title = movie.title,
            originalTitle = movie.originalTitle,
            overview = movie.overview,
            releaseDate = movie.releaseDate,
            posterPath = movie.posterPath,
            backdropPath = movie.backdropPath,
            voteAverage = movie.voteAverage,
            voteCount = movie.voteCount,
            adult = movie.adult,
            video = movie.video,
            popularity = movie.popularity,
            genreIds = movie.genreIds
        )
    }
}

/**
 * 영화 검색 결과 응답 DTO
 */
data class MovieSearchResponse(
    val page: Int,
    val results: List<MovieResponse>,
    val totalPages: Int,
    val totalResults: Int
) {
    companion object {
        fun from(searchResult: MovieSearchResult): MovieSearchResponse = MovieSearchResponse(
            page = searchResult.page,
            results = searchResult.results.map { MovieResponse.from(it) },
            totalPages = searchResult.totalPages,
            totalResults = searchResult.totalResults
        )
    }
}


