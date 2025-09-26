package app.reelnote.review.interfaces.rest

import app.reelnote.review.application.ReviewService
import app.reelnote.review.interfaces.dto.*
import app.reelnote.review.shared.response.ApiResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.responses.ApiResponses
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.slf4j.LoggerFactory
import org.springframework.context.MessageSource
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * 리뷰 REST API 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/reviews")
@Validated
@Tag(name = "Reviews", description = "영화 리뷰 관리 API")
class ReviewController(
    private val reviewService: ReviewService,
    private val messageSource: MessageSource
) {
    
    private val logger = LoggerFactory.getLogger(ReviewController::class.java)
    
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
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
        summary = "리뷰 생성",
        description = "새로운 영화 리뷰를 생성합니다"
    )
    @ApiResponses(
        value = [
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "201",
                description = "리뷰 생성 성공",
                content = [Content(schema = Schema(implementation = ReviewResponse::class))]
            ),
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "400",
                description = "잘못된 요청 데이터"
            )
        ]
    )
    fun createReview(
        @Valid @RequestBody request: CreateReviewRequest,
        @RequestHeader("X-User-Seq") userSeq: Long
    ): ResponseEntity<ApiResponse<ReviewResponse>> {
        logger.info("리뷰 생성 API 호출: userSeq={}, movieId={}", userSeq, request.movieId)
        
        val review = reviewService.createReview(request, userSeq)
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.success(review, getMessage("review.create.success")))
    }
    
    /**
     * 유저+영화 단건 리뷰 조회
     */
    @GetMapping
    @Operation(
        summary = "단건 리뷰 조회",
        description = "userSeq와 movieId에 해당하는 리뷰 1건을 조회합니다"
    )
    fun searchReviews(
        @Parameter(description = "사용자 ID", required = true)
        @RequestParam @Min(1) userSeq: Long,

        @Parameter(description = "영화 ID", required = true)
        @RequestParam @Min(1) movieId: Long
    ): ResponseEntity<ApiResponse<ReviewResponse>> {
        logger.debug("단건 리뷰 검색 API 호출: userSeq={}, movieId={}", userSeq, movieId)

        val review = reviewService.getUserMovieReview(userSeq, movieId)
        return ResponseEntity.ok(ApiResponse.success(review))
    }

    /**
     * 개인 리뷰 목록 조회 (다중 필터링 지원)
     */
    @GetMapping("/my")
    @Operation(
        summary = "개인 리뷰 목록 조회",
        description = "본인의 리뷰 목록을 다중 필터링과 함께 조회합니다"
    )
    suspend fun searchMyReviews(
        @RequestHeader("X-User-Seq") userSeq: Long,

        @Parameter(description = "영화 제목으로 필터링")
        @RequestParam(required = false) movieTitle: String?,
        @RequestParam(defaultValue = "ko-KR") language: String,

        @Parameter(description = "태그로 필터링 (쉼표로 구분)")
        @RequestParam(required = false) tags: String?,

        @Parameter(description = "최소 평점")
        @RequestParam(required = false) @Min(1) @Max(5) minRating: Int?,

        @Parameter(description = "최대 평점")
        @RequestParam(required = false) @Min(1) @Max(5) maxRating: Int?,

        @Parameter(description = "시작 날짜 (yyyy-MM-dd)")
        @RequestParam(required = false) startDate: String?,

        @Parameter(description = "종료 날짜 (yyyy-MM-dd)")
        @RequestParam(required = false) endDate: String?,

        @Parameter(description = "정렬 기준 (createdAt, updatedAt, rating, watchedAt)")
        @RequestParam(defaultValue = "createdAt") sortBy: SortBy,

        @Parameter(description = "정렬 방향 (asc, desc)")
        @RequestParam(defaultValue = "desc") sortDirection: Direction,

        @Parameter(description = "페이지 번호 (0부터 시작)")
        @RequestParam(defaultValue = "0") @Min(0) page: Int,

        @Parameter(description = "페이지 크기")
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) size: Int
    ): ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> {
        logger.debug("개인 리뷰 검색 API 호출: userSeq={}, movieTitle={}, tags={}, page={}, size={}",
            userSeq, movieTitle, tags, page, size)

        val request = MyReviewSearchRequest(
            userSeq = userSeq,
            movieTitle = movieTitle,
            language = language,
            tags = tags?.split(",")?.map { it.trim() }?.toSet() ?: emptySet(),
            minRating = minRating,
            maxRating = maxRating,
            startDate = startDate?.let { java.time.LocalDate.parse(it) },
            endDate = endDate?.let { java.time.LocalDate.parse(it) },
            sortBy = sortBy,
            sortDirection = sortDirection,
            page = page,
            size = size
        )

        val result = reviewService.searchMyReviews(request)
        return ResponseEntity.ok(ApiResponse.success(result))
    }

    /**
     * 영화별 리뷰 목록 조회 (다른 사람들의 리뷰, 다중 필터링 지원)
     */
    @GetMapping("/movie/{movieId}")
    @Operation(
        summary = "영화별 리뷰 목록 조회",
        description = "특정 영화의 다른 사람들의 리뷰를 다중 필터링과 함께 조회합니다"
    )
    fun searchMovieReviews(
        @Parameter(description = "영화 ID", required = true)
        @PathVariable @Min(1) movieId: Long,

        @Parameter(description = "제외할 사용자 ID (본인 리뷰 제외)")
        @RequestHeader(value = "X-User-Seq", required = false) excludeUserSeq: Long?,

        @Parameter(description = "최소 평점")
        @RequestParam(required = false) @Min(1) @Max(5) minRating: Int?,

        @Parameter(description = "최대 평점")
        @RequestParam(required = false) @Min(1) @Max(5) maxRating: Int?,

        @Parameter(description = "시작 날짜 (yyyy-MM-dd)")
        @RequestParam(required = false) startDate: String?,

        @Parameter(description = "종료 날짜 (yyyy-MM-dd)")
        @RequestParam(required = false) endDate: String?,

        @Parameter(description = "정렬 기준 (createdAt, updatedAt, rating, watchedAt)")
        @RequestParam(defaultValue = "createdAt") sortBy: SortBy,

        @Parameter(description = "정렬 방향 (asc, desc)")
        @RequestParam(defaultValue = "desc") sortDirection: Direction,

        @Parameter(description = "페이지 번호 (0부터 시작)")
        @RequestParam(defaultValue = "0") @Min(0) page: Int,

        @Parameter(description = "페이지 크기")
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) size: Int
    ): ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> {
        logger.debug("영화별 리뷰 검색 API 호출: movieId={}, excludeUserSeq={}, page={}, size={}",
            movieId, excludeUserSeq, page, size)

        val request = MovieReviewSearchRequest(
            movieId = movieId,
            excludeUserSeq = excludeUserSeq,
            minRating = minRating,
            maxRating = maxRating,
            startDate = startDate?.let { java.time.LocalDate.parse(it) },
            endDate = endDate?.let { java.time.LocalDate.parse(it) },
            sortBy = sortBy,
            sortDirection = sortDirection,
            page = page,
            size = size
        )

        val result = reviewService.searchMovieReviews(request)
        return ResponseEntity.ok(ApiResponse.success(result))
    }
    
    /**
     * 리뷰 수정
     */
    @PutMapping("/{id}")
    @Operation(
        summary = "리뷰 수정",
        description = "기존 리뷰의 정보를 수정합니다"
    )
    @ApiResponses(
        value = [
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "200",
                description = "리뷰 수정 성공"
            ),
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "404",
                description = "리뷰를 찾을 수 없음"
            )
        ]
    )
    fun updateReview(
        @Parameter(description = "리뷰 ID", required = true)
        @PathVariable id: Long,
        @RequestHeader("X-User-Seq") userSeq: Long,
        @Valid @RequestBody request: UpdateReviewRequest
    ): ResponseEntity<ApiResponse<ReviewResponse>> {
        logger.info("리뷰 수정 API 호출: id={}, userSeq={}", id, userSeq)
        
        val review = reviewService.updateReview(id, request, userSeq)
        return ResponseEntity.ok(ApiResponse.success(review, getMessage("review.update.success")))
    }
    
    /**
     * 리뷰 삭제
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
        summary = "리뷰 삭제",
        description = "리뷰를 삭제합니다"
    )
    @ApiResponses(
        value = [
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "204",
                description = "리뷰 삭제 성공"
            ),
            io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "404",
                description = "리뷰를 찾을 수 없음"
            )
        ]
    )
    fun deleteReview(
        @Parameter(description = "리뷰 ID", required = true)
        @PathVariable id: Long,
        @RequestHeader("X-User-Seq") userSeq: Long
    ): ResponseEntity<ApiResponse<Nothing>> {
        logger.info("리뷰 삭제 API 호출: id={}, userSeq={}", id, userSeq)
        
        reviewService.deleteReview(id, userSeq)
        return ResponseEntity
            .status(HttpStatus.NO_CONTENT)
            .body(ApiResponse.success(getMessage("review.delete.success")))
    }
    
    /**
     * 최근 리뷰 조회
     */
    @GetMapping("/recent")
    @Operation(
        summary = "최근 리뷰 조회",
        description = "최근 생성된 리뷰 10개를 조회합니다"
    )
    fun getRecentReviews(): ResponseEntity<ApiResponse<List<ReviewResponse>>> {
        logger.debug("최근 리뷰 조회 API 호출")
        
        val reviews = reviewService.getRecentReviews()
        return ResponseEntity.ok(ApiResponse.success(reviews))
    }
    
    /**
     * 인기 태그 조회
     */
    @GetMapping("/tags/popular")
    @Operation(
        summary = "인기 태그 조회",
        description = "사용 빈도가 높은 태그 목록을 조회합니다"
    )
    fun getPopularTags(): ResponseEntity<ApiResponse<Map<String, Long>>> {
        logger.debug("인기 태그 조회 API 호출")
        
        val tags = reviewService.getPopularTags()
        return ResponseEntity.ok(ApiResponse.success(tags))
    }
    
    /**
     * 평점 통계 조회
     */
    @GetMapping("/statistics/rating")
    @Operation(
        summary = "평점 통계 조회",
        description = "평점별 리뷰 수 통계를 조회합니다"
    )
    fun getRatingStatistics(): ResponseEntity<ApiResponse<Map<Int, Long>>> {
        logger.debug("평점 통계 조회 API 호출")
        
        val stats = reviewService.getRatingStatistics()
        return ResponseEntity.ok(ApiResponse.success(stats))
    }
}


