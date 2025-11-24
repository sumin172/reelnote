package app.reelnote.review.interfaces.rest

import app.reelnote.review.application.ReviewQueryService
import app.reelnote.review.application.ReviewService
import app.reelnote.review.infrastructure.config.SecurityConfig
import app.reelnote.review.infrastructure.config.WebMvcConfig
import app.reelnote.review.interfaces.dto.CreateReviewRequest
import app.reelnote.review.interfaces.dto.PageResponse
import app.reelnote.review.interfaces.dto.ReviewResponse
import app.reelnote.review.interfaces.dto.UpdateReviewRequest
import com.ninjasquad.springmockk.MockkBean
import io.mockk.coEvery
import io.mockk.every
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.request
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.Instant
import java.time.LocalDate

@WebMvcTest(ReviewController::class)
@ActiveProfiles("test")
@Import(SecurityConfig::class, WebMvcConfig::class)
class ReviewControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @MockkBean(relaxed = true)
    private lateinit var reviewService: ReviewService

    @MockkBean(relaxed = true)
    private lateinit var reviewQueryService: ReviewQueryService

    @Test
    fun `리뷰 생성 API 테스트`() {
        // Given
        val request =
            """
            {
                "movieId": 12345,
                "rating": 5,
                "reason": "정말 재미있었습니다",
                "tags": ["액션", "SF"],
                "watchedAt": "2024-01-01"
            }
            """.trimIndent()

        val response =
            ReviewResponse(
                id = 1L,
                userSeq = 1L,
                movieId = 12345L,
                rating = 5,
                reason = "정말 재미있었습니다",
                tags = setOf("액션", "SF"),
                watchedAt = LocalDate.parse("2024-01-01"),
                createdAt = Instant.now().toString(),
                updatedAt = Instant.now().toString(),
                version = 0L,
            )
        every { reviewService.createReview(any<CreateReviewRequest>(), any()) } returns response

        // When & Then
        mockMvc
            .perform(
                post("/api/v1/reviews")
                    .header("X-User-Seq", "1")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(request)
                    .with(csrf()),
            ).andExpect(status().isCreated)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.movieId").value(12345))
            .andExpect(jsonPath("$.rating").value(5))
    }

    @Test
    fun `단건 리뷰 조회 API 테스트 - userSeq+movieId`() {
        // Given
        val response =
            ReviewResponse(
                id = 10L,
                userSeq = 1L,
                movieId = 12345L,
                rating = 4,
                reason = "좋은 영화였습니다",
                tags = emptySet(),
                watchedAt = null,
                createdAt = Instant.now().toString(),
                updatedAt = Instant.now().toString(),
                version = 0L,
            )
        every { reviewQueryService.getUserMovieReview(1L, 12345L) } returns response

        // When & Then
        mockMvc
            .perform(
                get("/api/v1/reviews")
                    .param("userSeq", "1")
                    .param("movieId", "12345")
                    .contentType(MediaType.APPLICATION_JSON),
            ).andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.movieId").value(12345))
    }

    @Test
    fun `내 리뷰 목록 조회 API 테스트 - my`() {
        // Given
        val pageResponse =
            PageResponse(
                content =
                    listOf(
                        ReviewResponse(
                            id = 1L,
                            userSeq = 1L,
                            movieId = 100L,
                            rating = 5,
                            reason = null,
                            tags = emptySet(),
                            watchedAt = null,
                            createdAt = Instant.now().toString(),
                            updatedAt = Instant.now().toString(),
                            version = 0L,
                        ),
                    ),
                page = 0,
                size = 20,
                totalElements = 1,
                totalPages = 1,
                first = true,
                last = true,
            )
        coEvery { reviewQueryService.searchMyReviews(any()) } returns pageResponse

        // When & Then (suspend 함수 → async 디스패치 필요)
        val mvcResult =
            mockMvc
                .perform(
                    get("/api/v1/reviews/my")
                        .header("X-User-Seq", "1")
                        .param("sortBy", "CREATED_AT")
                        .param("sortDirection", "DESC")
                        .param("page", "0")
                        .param("size", "20")
                        .contentType(MediaType.APPLICATION_JSON),
                ).andExpect(request().asyncStarted())
                .andReturn()

        mockMvc
            .perform(asyncDispatch(mvcResult))
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.content[0].userSeq").value(1))
    }

    @Test
    fun `리뷰 수정 API 테스트`() {
        // Given
        val reviewId = 1L
        val request =
            """
            {
                "rating": 5,
                "reason": "정말 좋았습니다"
            }
            """.trimIndent()

        val response =
            ReviewResponse(
                id = reviewId,
                userSeq = 1L,
                movieId = 12345L,
                rating = 5,
                reason = "정말 좋았습니다",
                tags = emptySet(),
                watchedAt = null,
                createdAt = Instant.now().toString(),
                updatedAt = Instant.now().toString(),
                version = 0L,
            )
        every { reviewService.updateReview(reviewId, any<UpdateReviewRequest>(), 1L) } returns
            response

        // When & Then
        mockMvc
            .perform(
                put("/api/v1/reviews/{id}", reviewId)
                    .header("X-User-Seq", "1")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(request)
                    .with(csrf()),
            ).andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.rating").value(5))
    }

    @Test
    fun `리뷰 삭제 API 테스트`() {
        // Given
        val reviewId = 1L
        every { reviewService.deleteReview(reviewId, 1L) } returns Unit

        // When & Then
        mockMvc
            .perform(
                delete("/api/v1/reviews/{id}", reviewId)
                    .header("X-User-Seq", "1")
                    .contentType(MediaType.APPLICATION_JSON)
                    .with(csrf()),
            ).andExpect(status().isNoContent)
    }

    @Test
    fun `최근 리뷰 조회 API 테스트`() {
        // Given
        every { reviewQueryService.getRecentReviews() } returns
            listOf(
                ReviewResponse(
                    id = 1L,
                    userSeq = 99L,
                    movieId = 100L,
                    rating = 3,
                    reason = null,
                    tags = emptySet(),
                    watchedAt = null,
                    createdAt = Instant.now().toString(),
                    updatedAt = Instant.now().toString(),
                    version = 0L,
                ),
            )
        // When & Then
        mockMvc
            .perform(
                get("/api/v1/reviews/recent").contentType(MediaType.APPLICATION_JSON),
            ).andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$[0].movieId").value(100))
    }

    @Test
    fun `인기 태그 조회 API 테스트`() {
        // Given
        every { reviewQueryService.getPopularTags() } returns mapOf("액션" to 10L, "드라마" to 5L)
        // When & Then
        mockMvc
            .perform(
                get("/api/v1/reviews/tags/popular").contentType(MediaType.APPLICATION_JSON),
            ).andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.액션").exists())
    }

    @Test
    fun `평점 통계 조회 API 테스트`() {
        // Given
        every { reviewQueryService.getRatingStatistics() } returns mapOf(1 to 2L, 5 to 7L)
        // When & Then
        mockMvc
            .perform(
                get("/api/v1/reviews/statistics/rating")
                    .contentType(MediaType.APPLICATION_JSON),
            ).andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$['1']").value(2))
            .andExpect(jsonPath("$['5']").value(7))
    }
}
