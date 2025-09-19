package app.reelnote.review.interfaces.rest

import app.reelnote.review.application.MovieService
import app.reelnote.review.interfaces.dto.*
import app.reelnote.review.shared.response.ApiResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.responses.ApiResponses
import io.swagger.v3.oas.annotations.tags.Tag
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank

/**
 * 영화 정보 REST API 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/movies")
@Validated
@Tag(name = "Movies", description = "영화 정보 조회 API")
class MovieController(
    private val movieService: MovieService
) {
    
    private val logger = LoggerFactory.getLogger(MovieController::class.java)
    
    /**
     * 영화 검색
     */
    @GetMapping("/search")
    @Operation(
        summary = "영화 검색",
        description = "TMDB API를 통해 영화를 검색합니다"
    )
    @ApiResponses(
        value = [
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "200",
                description = "영화 검색 성공"
            ),
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "400",
                description = "잘못된 요청"
            ),
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "502",
                description = "외부 API 호출 실패"
            )
        ]
    )
    suspend fun searchMovies(
        @Parameter(description = "검색어", required = true)
        @RequestParam @NotBlank query: String,
        
        @Parameter(description = "페이지 번호")
        @RequestParam(defaultValue = "1") @Min(1) page: Int,
        
        @Parameter(description = "언어 코드")
        @RequestParam(defaultValue = "ko-KR") language: String
    ): ResponseEntity<ApiResponse<MovieSearchResponse>> {
        logger.info("영화 검색 API 호출: query={}, page={}, language={}", query, page, language)
        
        val request = MovieSearchRequest(query = query, page = page, language = language)
        val result = movieService.searchMovies(request)
        
        return ResponseEntity.ok(ApiResponse.success(result))
    }
    
    /**
     * 영화 상세 정보 조회
     */
    @GetMapping("/{movieId}")
    @Operation(
        summary = "영화 상세 정보 조회",
        description = "TMDB API를 통해 특정 영화의 상세 정보를 조회합니다"
    )
    @ApiResponses(
        value = [
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "200",
                description = "영화 상세 정보 조회 성공"
            ),
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "404",
                description = "영화를 찾을 수 없음"
            ),
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "502",
                description = "외부 API 호출 실패"
            )
        ]
    )
    suspend fun getMovieDetail(
        @Parameter(description = "영화 ID", required = true)
        @PathVariable @Min(1) movieId: Long,
        
        @Parameter(description = "언어 코드")
        @RequestParam(defaultValue = "ko-KR") language: String
    ): ResponseEntity<ApiResponse<MovieResponse>> {
        logger.info("영화 상세 조회 API 호출: movieId={}, language={}", movieId, language)
        
        val request = MovieDetailRequest(movieId = movieId, language = language)
        val result = movieService.getMovieDetail(request)
        
        return ResponseEntity.ok(ApiResponse.success(result))
    }
    
    /**
     * 인기 영화 목록 조회
     */
    @GetMapping("/popular")
    @Operation(
        summary = "인기 영화 목록 조회",
        description = "TMDB API를 통해 현재 인기 있는 영화 목록을 조회합니다"
    )
    @ApiResponses(
        value = [
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "200",
                description = "인기 영화 목록 조회 성공"
            ),
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "502",
                description = "외부 API 호출 실패"
            )
        ]
    )
    suspend fun getPopularMovies(
        @Parameter(description = "페이지 번호")
        @RequestParam(defaultValue = "1") page: Int,
        
        @Parameter(description = "언어 코드")
        @RequestParam(defaultValue = "ko-KR") language: String
    ): ResponseEntity<ApiResponse<MovieSearchResponse>> {
        logger.info("인기 영화 조회 API 호출: page={}, language={}", page, language)
        
        val result = movieService.getPopularMovies(page, language)
        return ResponseEntity.ok(ApiResponse.success(result))
    }
}


