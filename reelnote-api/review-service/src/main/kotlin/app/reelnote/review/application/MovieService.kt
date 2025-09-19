package app.reelnote.review.application

import app.reelnote.review.domain.Movie
import app.reelnote.review.domain.MovieSearchResult
import app.reelnote.review.interfaces.dto.*
import app.reelnote.review.shared.exception.ExternalApiException
import app.reelnote.review.shared.exception.MovieNotFoundException
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.WebClientResponseException
import org.springframework.web.reactive.function.client.awaitBody

/**
 * 영화 서비스
 */
@Service
class MovieService(
    private val tmdbWebClient: WebClient
) {
    
    private val logger = LoggerFactory.getLogger(MovieService::class.java)
    
    /**
     * 영화 검색
     */
    @Cacheable(value = ["movieSearch"], key = "#request.query + '_' + #request.page + '_' + #request.language")
    suspend fun searchMovies(request: MovieSearchRequest): MovieSearchResponse {
        logger.info("영화 검색 요청: query={}, page={}, language={}", request.query, request.page, request.language)
        
        return try {
            val searchResult = tmdbWebClient.get()
                .uri { builder ->
                    builder.path("/search/movie")
                        .queryParam("query", request.query)
                        .queryParam("page", request.page)
                        .queryParam("language", request.language)
                        .build()
                }
                .retrieve()
                .awaitBody<MovieSearchResult>()
            
            logger.info("영화 검색 완료: 총 {}개 결과", searchResult.totalResults)
            MovieSearchResponse.from(searchResult)
            
        } catch (ex: WebClientResponseException) {
            logger.error("TMDB API 호출 실패: status={}, body={}", ex.statusCode, ex.responseBodyAsString)
            throw ExternalApiException("TMDB", ex)
        } catch (ex: Exception) {
            logger.error("영화 검색 중 예외 발생", ex)
            throw ExternalApiException("TMDB", ex)
        }
    }
    
    /**
     * 영화 상세 정보 조회
     */
    @Cacheable(value = ["movieDetail"], key = "#request.movieId + '_' + #request.language")
    suspend fun getMovieDetail(request: MovieDetailRequest): MovieResponse {
        logger.info("영화 상세 조회 요청: movieId={}, language={}", request.movieId, request.language)
        
        return try {
            val movie = tmdbWebClient.get()
                .uri { builder ->
                    builder.path("/movie/{id}")
                        .queryParam("language", request.language)
                        .build(request.movieId)
                }
                .retrieve()
                .awaitBody<Movie>()
            
            logger.info("영화 상세 조회 완료: title={}", movie.title)
            MovieResponse.from(movie)
            
        } catch (ex: WebClientResponseException) {
            when (ex.statusCode.value()) {
                404 -> {
                    logger.warn("영화를 찾을 수 없음: movieId={}", request.movieId)
                    throw MovieNotFoundException(request.movieId)
                }
                else -> {
                    logger.error("TMDB API 호출 실패: status={}, body={}", ex.statusCode, ex.responseBodyAsString)
                    throw ExternalApiException("TMDB", ex)
                }
            }
        } catch (ex: Exception) {
            logger.error("영화 상세 조회 중 예외 발생", ex)
            throw ExternalApiException("TMDB", ex)
        }
    }
    
    /**
     * 인기 영화 목록 조회
     */
    @Cacheable(value = ["popularMovies"], key = "#page + '_' + #language")
    suspend fun getPopularMovies(page: Int = 1, language: String = "ko-KR"): MovieSearchResponse {
        logger.info("인기 영화 조회 요청: page={}, language={}", page, language)
        
        return try {
            val searchResult = tmdbWebClient.get()
                .uri { builder ->
                    builder.path("/movie/popular")
                        .queryParam("page", page)
                        .queryParam("language", language)
                        .build()
                }
                .retrieve()
                .awaitBody<MovieSearchResult>()
            
            logger.info("인기 영화 조회 완료: 총 {}개 결과", searchResult.totalResults)
            MovieSearchResponse.from(searchResult)
            
        } catch (ex: WebClientResponseException) {
            logger.error("TMDB API 호출 실패: status={}, body={}", ex.statusCode, ex.responseBodyAsString)
            throw ExternalApiException("TMDB", ex)
        } catch (ex: Exception) {
            logger.error("인기 영화 조회 중 예외 발생", ex)
            throw ExternalApiException("TMDB", ex)
        }
    }
}


