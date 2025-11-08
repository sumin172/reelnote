package app.reelnote.review.application

import app.reelnote.review.domain.Rating
import app.reelnote.review.domain.Review
import app.reelnote.review.domain.ReviewRepository
import app.reelnote.review.infrastructure.catalog.CatalogClient
import app.reelnote.review.interfaces.dto.CreateReviewRequest
import app.reelnote.review.interfaces.dto.UpdateReviewRequest
import app.reelnote.review.shared.exception.ReviewNotFoundException
import io.mockk.Called
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.context.MessageSource
import java.time.Instant
import java.time.LocalDate
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class ReviewServiceTest {
    
    private val reviewRepository = mockk<ReviewRepository>()
    private val catalogClient = mockk<CatalogClient>()
    private val messageSource = mockk<MessageSource>()
    private val reviewService = ReviewService(reviewRepository, catalogClient, messageSource)
    
    @Test
    fun `리뷰 생성 성공`() {
        // Given
        val userSeq = 1L
        val request = CreateReviewRequest(
            movieId = 12345L,
            rating = 5,
            reason = "정말 재미있었습니다",
            tags = setOf("액션", "SF"),
            watchedAt = LocalDate.now()
        )
        
        val savedReview = Review.create(
            userSeq = userSeq,
            movieId = 12345L,
            rating = Rating.of(5),
            reason = "정말 재미있었습니다",
            tags = setOf("액션", "SF"),
            watchedAt = LocalDate.now()
        ).apply {
            // 메타 필드 기본값 보정
            updatedAt = Instant.now()
        }
        
        every { reviewRepository.findByUserSeqAndMovieId(userSeq, 12345L) } returns Optional.empty()
        every { reviewRepository.save(any()) } returns savedReview
        
        // When
        val result = reviewService.createReview(request, userSeq)
        
        // Then
        assertNotNull(result)
        assertEquals(0L, result.id)
        assertEquals(userSeq, result.userSeq)
        assertEquals(12345L, result.movieId)
        assertEquals(5, result.rating)
        assertEquals("정말 재미있었습니다", result.reason)
        assertEquals(setOf("액션", "SF"), result.tags)
        
        verify { reviewRepository.findByUserSeqAndMovieId(userSeq, 12345L) }
        verify { reviewRepository.save(any()) }
        // 외부 호출 없음
        verify { catalogClient wasNot Called }
    }
    
    @Test
    fun `리뷰 생성 실패 - 중복 리뷰`() {
        // Given
        val userSeq = 1L
        val request = CreateReviewRequest(
            movieId = 12345L,
            rating = 5,
            reason = "정말 재미있었습니다"
        )
        
        val existingReview = Review.create(
            userSeq = userSeq,
            movieId = 12345L,
            rating = Rating.of(4),
            reason = "기존 리뷰"
        )
        
        every { reviewRepository.findByUserSeqAndMovieId(userSeq, 12345L) } returns Optional.of(existingReview)
        every { messageSource.getMessage("error.review.already.exists", any(), any()) } returns "이미 해당 영화에 대한 리뷰가 존재합니다."
        
        // When & Then
        assertThrows<IllegalArgumentException> {
            reviewService.createReview(request, userSeq)
        }
        
        verify { reviewRepository.findByUserSeqAndMovieId(userSeq, 12345L) }
        verify { catalogClient wasNot Called }
    }
    
    @Test
    fun `리뷰 수정 성공`() {
        // Given
        val reviewId = 1L
        val userSeq = 1L
        val existingReview = Review.create(
            userSeq = userSeq,
            movieId = 12345L,
            rating = Rating.of(3),
            reason = "보통이었습니다"
        )
        
        val updateRequest = UpdateReviewRequest(
            rating = 5,
            reason = "정말 좋았습니다"
        )

        existingReview.updateContent(
            rating = Rating.of(5),
            reason = "정말 좋았습니다"
        )
        
        every { reviewRepository.findById(reviewId) } returns Optional.of(existingReview)
        every { reviewRepository.save(any()) } returns existingReview
        
        // When
        val result = reviewService.updateReview(reviewId, updateRequest, userSeq)
        
        // Then
        assertNotNull(result)
        assertEquals(12345L, result.movieId)
        assertEquals(5, result.rating)
        assertEquals("정말 좋았습니다", result.reason)
        
        verify { reviewRepository.findById(reviewId) }
        verify { reviewRepository.save(any()) }
        verify { catalogClient wasNot Called }
    }
    
    @Test
    fun `리뷰 수정 실패 - 권한 없음`() {
        // Given
        val reviewId = 1L
        val userSeq = 1L
        val otherUserSeq = 2L
        val existingReview = Review.create(
            userSeq = otherUserSeq,  // 다른 사용자의 리뷰
            movieId = 12345L,
            rating = Rating.of(3),
            reason = "보통이었습니다"
        )
        
        val updateRequest = UpdateReviewRequest(
            rating = 5,
            reason = "정말 좋았습니다"
        )
        
        every { reviewRepository.findById(reviewId) } returns Optional.of(existingReview)
        
        // When & Then
        assertThrows<IllegalArgumentException> {
            reviewService.updateReview(reviewId, updateRequest, userSeq)
        }
        
        verify { reviewRepository.findById(reviewId) }
        verify { catalogClient wasNot Called }
    }
    
    @Test
    fun `리뷰 삭제 성공`() {
        // Given
        val reviewId = 1L
        val userSeq = 1L
        val existingReview = Review.create(
            userSeq = userSeq,
            movieId = 12345L,
            rating = Rating.of(3),
            reason = "보통이었습니다"
        )
        
        every { reviewRepository.findById(reviewId) } returns Optional.of(existingReview)
        every { reviewRepository.delete(any<Review>()) } returns Unit
        
        // When
        reviewService.deleteReview(reviewId, userSeq)
        
        // Then
        verify { reviewRepository.findById(reviewId) }
        verify { reviewRepository.delete(existingReview) }  // @SQLDelete가 자동으로 소프트 삭제 처리
        verify { catalogClient wasNot Called }
    }
    
    @Test
    fun `리뷰 삭제 실패 - 권한 없음`() {
        // Given
        val reviewId = 1L
        val userSeq = 1L
        val otherUserSeq = 2L
        val existingReview = Review.create(
            userSeq = otherUserSeq,  // 다른 사용자의 리뷰
            movieId = 12345L,
            rating = Rating.of(3),
            reason = "보통이었습니다"
        )
        
        every { reviewRepository.findById(reviewId) } returns Optional.of(existingReview)
        
        // When & Then
        assertThrows<IllegalArgumentException> {
            reviewService.deleteReview(reviewId, userSeq)
        }
        
        verify { reviewRepository.findById(reviewId) }
        verify { catalogClient wasNot Called }
    }
    
    @Test
    fun `리뷰 삭제 실패 - 존재하지 않는 리뷰`() {
        // Given
        val reviewId = 999L
        val userSeq = 1L
        every { reviewRepository.findById(reviewId) } returns Optional.empty()
        
        // When & Then
        assertThrows<ReviewNotFoundException> {
            reviewService.deleteReview(reviewId, userSeq)
        }
        
        verify { reviewRepository.findById(reviewId) }
        verify { catalogClient wasNot Called }
    }
    
}
